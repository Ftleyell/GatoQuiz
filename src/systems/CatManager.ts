// src/systems/CatManager.ts

import { CatEntity } from '../game/entities/CatEntity';
import { PhysicsComponent } from '../game/components/PhysicsComponent';
import { RenderComponent } from '../game/components/RenderComponent';
import { ValueComponent } from '../game/components/ValueComponent';
import { PhysicsManager } from './PhysicsManager';
import { AudioManager } from './AudioManager';
import { CatTemplate } from '../types/CatTemplate';
import Matter from 'matter-js';

// --- Constantes de Colisión (Asegúrate que sean consistentes con otros archivos) ---
const WALL_COLLISION_CATEGORY = 0x0001;
const CAT_COLLISION_CATEGORY = 0x0002;
const INK_COLLISION_CATEGORY = 0x0004; // Categoría para la tinta
// --------------------------------------------------------------------------------

const CAT_GROWTH_FACTOR = 1.15;
const MAX_CAT_SIZE = 300;
const SIZE_SIMILARITY_THRESHOLD = 1.02;

const RARITY_GLOW_MAP: { [key: number]: string | null } = {
    0: null, // o 'glow-common' si existe
    1: 'glow-gray',
    2: 'glow-green',
    3: 'glow-blue',
    4: 'glow-violet',
    5: 'glow-orange',
};

/**
 * CatManager: Gestiona gatos, incluyendo creación, eliminación,
 * actualización visual y lógica de colisión/fusión iniciada por el jugador.
 */
export class CatManager {
  private cats: Map<string, CatEntity> = new Map(); // Usar entityId (string) como clave
  private physicsManager!: PhysicsManager; // Se inyecta post-constructor
  private audioManager: AudioManager;
  private bodyIdToEntityIdMap: Map<number, string> = new Map(); // Mapa body.id -> entity.id
  private nextCatIdCounter: number = 0;
  private catContainerElement: HTMLElement | null = null;
  private templates: Map<string, CatTemplate> = new Map();

  /**
   * Crea una instancia de CatManager.
   * @param audioManager - Instancia del AudioManager para reproducir sonidos.
   */
  constructor(audioManager: AudioManager) {
    this.audioManager = audioManager;
    this.catContainerElement = document.getElementById('cat-container');
    if (!this.catContainerElement) {
        console.error("CatManager: Elemento '#cat-container' no encontrado en el DOM!");
    }
    console.log('CatManager Creado.');
  }

  /**
   * Inyecta la instancia de PhysicsManager después de la construcción.
   * @param physicsManager - La instancia de PhysicsManager.
   */
  public setPhysicsManager(physicsManager: PhysicsManager): void {
       this.physicsManager = physicsManager;
       // console.log("CatManager: PhysicsManager inyectado."); // Log menos verboso
  }

  /**
   * Carga y almacena las plantillas de gato desde un array de datos.
   * @param templateData - Array de objetos CatTemplate.
   */
  public loadTemplates(templateData: CatTemplate[]): void {
      this.templates.clear();
      if (!Array.isArray(templateData)) {
          console.error("CatManager: Formato de datos de plantilla inválido.");
          return;
      }
      templateData.forEach(template => {
          if (template?.id) {
              // Asegurar que spawnWeight tenga un valor por defecto si no está en JSON
              if (typeof template.spawnWeight !== 'number' || template.spawnWeight <= 0) {
                  // console.warn(`Plantilla ${template.id} sin spawnWeight válido, usando 1.`);
                  template.spawnWeight = 1; // Default weight
              }
              this.templates.set(template.id, template);
          } else {
              console.warn("CatManager: Plantilla inválida o sin ID.", template);
          }
      });
      // console.log(`CatManager: ${this.templates.size} plantillas de gato cargadas/registradas.`);
  }

  /**
   * Devuelve una lista de IDs de plantillas y sus pesos de aparición.
   * Útil para la selección aleatoria ponderada.
   * @returns Un array de objetos { id: string, weight: number }.
   */
  public getSpawnableTemplatesWeighted(): { id: string; weight: number }[] {
    const weightedTemplates: { id: string; weight: number }[] = [];
    this.templates.forEach((template) => {
        // Usar spawnWeight si existe y es mayor que 0, sino un peso por defecto (ej: 1)
        const weight = template.spawnWeight && template.spawnWeight > 0 ? template.spawnWeight : 1;
        weightedTemplates.push({ id: template.id, weight: weight });
    });
    return weightedTemplates;
  }

  /**
   * Crea una nueva entidad Gato basada en el ID de una plantilla cargada.
   * @param templateId - El ID de la CatTemplate a usar.
   * @param initialPosition - (Opcional) Posición inicial {x, y}.
   * @returns La entidad CatEntity creada o null si falla.
   */
  public addCat(templateId: string, initialPosition?: { x: number; y: number }): CatEntity | null {
    if (!this.catContainerElement || !this.physicsManager) {
        console.error("CatManager: No se puede añadir gato, falta #cat-container o PhysicsManager.");
        return null;
    }

    const template = this.templates.get(templateId);
    if (!template) {
        console.error(`CatManager: Plantilla con ID '${templateId}' no encontrada.`);
        return null;
    }

    const entityId = `cat_entity_${this.nextCatIdCounter++}`;
    const initialSize = template.initialSize;
    const rarity = template.rarity;
    const scoreValue = template.scoreValue ?? 0;
    const x = initialPosition?.x ?? Math.random() * (window.innerWidth - initialSize) + initialSize / 2;
    const y = initialPosition?.y ?? initialSize / 2 + 10; // Empezar un poco más abajo

    // Propiedades físicas por defecto y las de la plantilla
    const defaultPhysics: Matter.IBodyDefinition = { restitution: 0.6, friction: 0.1, frictionAir: 0.01, density: 0.005 };

    // Configuración de colisión
    const bodyOptions: Matter.IBodyDefinition = {
        ...defaultPhysics,
        ...(template.physicsOptions ?? {}),
        label: 'cat', // Etiqueta para identificar en colisiones
        collisionFilter: {
            category: CAT_COLLISION_CATEGORY, // Pertenece a la categoría GATO
            // Puede colisionar con: PAREDES, OTROS GATOS, y TINTA
            mask: WALL_COLLISION_CATEGORY | CAT_COLLISION_CATEGORY | INK_COLLISION_CATEGORY
        },
    };

    // Crear cuerpo físico circular
    const body = Matter.Bodies.circle(x, y, initialSize / 2, bodyOptions);
    Matter.Body.setAngularVelocity(body, (Math.random() - 0.5) * 0.2); // Pequeña rotación inicial
    const physicsComp = new PhysicsComponent(body);

    // Mapear ID del cuerpo físico al ID de la entidad para referencias rápidas
    this.bodyIdToEntityIdMap.set(body.id, entityId);

    // Crear elemento visual HTML
    const element = document.createElement('div');
    element.id = entityId;
    element.classList.add('cat');
    element.style.width = `${initialSize}px`;
    element.style.height = `${initialSize}px`;

    // Aplicar opciones de renderizado de la plantilla
    const renderOpts = template.renderOptions ?? {};
    const glowClass = renderOpts.glowClass ?? RARITY_GLOW_MAP[rarity]; // Usar glow de plantilla o mapeo
    if (glowClass) {
        element.classList.add(glowClass);
    }

    // Intentar cargar imagen, usar fallback si falla o no se especifica
    let finalImageUrl = renderOpts.imageUrl;
    const fallbackColor = renderOpts.backgroundColor ?? '#cccccc'; // Color gris por defecto
    if (!finalImageUrl) { // Usar Cataas si no hay URL definida
        finalImageUrl = `https://cataas.com/cat?${Date.now()}&width=${Math.round(initialSize)}&height=${Math.round(initialSize)}`;
    }

    if (finalImageUrl) {
        element.style.backgroundImage = `url('${finalImageUrl}')`;
        element.style.backgroundSize = 'cover';
        element.style.backgroundPosition = 'center';
        // Añadir manejo de error para la imagen
        const img = new Image();
        img.onerror = () => {
            console.warn(`CatManager: Fallo al cargar imagen: ${finalImageUrl}. Usando color ${fallbackColor}`);
            element.style.backgroundImage = 'none'; // Quitar imagen fallida
            element.style.backgroundColor = fallbackColor; // Aplicar color de fallback
        };
        img.src = finalImageUrl; // Iniciar carga
    } else { // Si no hay URL de imagen, usar solo el color de fondo
        element.style.backgroundColor = fallbackColor;
    }

    // Añadir elemento visual al contenedor en el DOM
    if (this.catContainerElement) {
        this.catContainerElement.appendChild(element);
    } else {
         console.error("Error Crítico: #cat-container no encontrado al añadir elemento de gato.");
         return null; // No se puede continuar sin contenedor
    }
    const renderComp = new RenderComponent(element);

    // Crear componente de valor (rareza, score, tamaño)
    const valueComp = new ValueComponent(rarity, scoreValue, initialSize);

    // Crear la entidad completa
    const newCat = new CatEntity(entityId, physicsComp, renderComp, valueComp);

    // Añadir cuerpo físico al mundo de Matter.js
    try {
        Matter.World.add(this.physicsManager.getWorld(), body);
    } catch (error) {
        console.error(`CatManager: Error al añadir cuerpo ${entityId} al mundo:`, error);
        if (element.parentNode) element.parentNode.removeChild(element); // Limpiar elemento visual si falla
        this.bodyIdToEntityIdMap.delete(body.id); // Limpiar mapa
        return null; // Falló la creación
    }

    // Añadir entidad al mapa del manager
    this.cats.set(entityId, newCat);
    // console.log(`CatManager: Gato '${templateId}' añadido con ID ${entityId}`); // Log opcional
    return newCat;
  }

  /**
   * Elimina una entidad Gato por su ID, incluyendo su cuerpo físico y elemento visual.
   * @param entityId - El ID de la CatEntity a eliminar.
   */
  public removeCat(entityId: string): void {
    const cat = this.cats.get(entityId);
    if (cat) {
      const body = cat.physics.body;
      // Eliminar cuerpo físico si existe y está en el mundo
      if (body) {
          this.bodyIdToEntityIdMap.delete(body.id); // Limpiar mapeo
          try {
              // Verificar si el cuerpo aún existe en el mundo antes de intentar removerlo
              if (this.physicsManager?.getWorld && Matter.Composite.get(this.physicsManager.getWorld(), body.id, 'body')) {
                  Matter.World.remove(this.physicsManager.getWorld(), body);
              }
          } catch(error) {
              console.warn(`Error eliminando cuerpo físico gato ${entityId}:`, error);
          }
      }
      // Remover elemento visual del DOM si existe y tiene padre
      if (cat.render.element?.parentNode) {
        cat.render.element.parentNode.removeChild(cat.render.element);
      }
      // Eliminar la entidad del mapa del manager
      this.cats.delete(entityId);
      // console.log(`CatManager: Gato ${entityId} removido.`); // Log opcional
    }
  }

  /**
   * Procesa una colisión iniciada por el jugador (arrastrando un gato sobre otro).
   * @param bodyIdA - ID del primer cuerpo Matter involucrado.
   * @param bodyIdB - ID del segundo cuerpo Matter involucrado.
   * @param draggerBodyId - ID del cuerpo Matter que está siendo arrastrado por el jugador.
   */
  public processPlayerInitiatedCollision(bodyIdA: number, bodyIdB: number, draggerBodyId: number): void {
      // console.log(`CatManager: processPlayerInitiatedCollision recibido Body IDs: ${bodyIdA}, ${bodyIdB}. Dragger ID: ${draggerBodyId}`);
      const entityIdA = this.bodyIdToEntityIdMap.get(bodyIdA);
      const entityIdB = this.bodyIdToEntityIdMap.get(bodyIdB);
      // console.log(`  -> Mapped Entity IDs: ${entityIdA ?? 'not found'}, ${entityIdB ?? 'not found'}`);

      if (entityIdA && entityIdB) {
          const catA = this.cats.get(entityIdA);
          const catB = this.cats.get(entityIdB);
           // console.log(`  -> Retrieved Cat Entities: ${catA ? catA.id : 'null'}, ${catB ? catB.id : 'null'}`);

          if (catA && catB) {
              // Determinar quién es el dragger y quién el target
              const draggerCat = (bodyIdA === draggerBodyId) ? catA : catB;
              const targetCat = (bodyIdA === draggerBodyId) ? catB : catA;

              if (draggerCat && targetCat) {
                  // console.log(`    --> Calling handleCatVsCatCollision (Player Initiated). Dragger: ${draggerCat.id}, Target: ${targetCat.id}`);
                  this.handleCatVsCatCollision(draggerCat, targetCat);
              } else {
                  console.error("    --> Error: No se pudo determinar dragger/target cat.");
              }
          } else {
               // Podría pasar si un gato fue removido justo antes
               console.warn(`    --> Collision processed but one cat entity was already removed.`);
          }
      } else {
           console.warn(`    --> Failed to find one or both entity IDs in map.`);
      }
  }

  /**
   * Maneja la lógica específica de colisión entre un gato arrastrado (dragger)
   * y un gato objetivo (target). Determina si el dragger puede comer al target.
   * @param draggerCat - La entidad CatEntity que está siendo arrastrada.
   * @param targetCat - La entidad CatEntity con la que colisiona el dragger.
   */
  private handleCatVsCatCollision(draggerCat: CatEntity, targetCat: CatEntity): void {
      // Verificar componentes necesarios
      if (!draggerCat.physics.body || !draggerCat.value || !targetCat.physics.body || !targetCat.value) {
          console.warn("handleCatVsCatCollision skipped: Missing components.");
          return;
      }
      // Evitar auto-colisión (por si acaso)
      if (draggerCat.id === targetCat.id) {
          // console.log("  -> Self-collision detected during drag, ignoring.");
          return;
      }

      const draggerSize = draggerCat.value.currentSize;
      const draggerRarity = draggerCat.value.rarity;
      const targetSize = targetCat.value.currentSize;
      const targetRarity = targetCat.value.rarity;
      // console.log(`CatManager: handleCatVsCatCollision (Player): Dragger(id:${draggerCat.id}, size:${draggerSize.toFixed(1)}, r:${draggerRarity}) vs Target(id:${targetCat.id}, size:${targetSize.toFixed(1)}, r:${targetRarity})`);
      // console.log(`  -> Checking size difference: Dragger > Target*thresh? ${draggerSize} > ${targetSize * SIZE_SIMILARITY_THRESHOLD} (${draggerSize > targetSize * SIZE_SIMILARITY_THRESHOLD})`);

      let canEat = false;
      let stealTier = false;
      let reason = "Target too large or similar size";

      // Condición: Dragger debe ser suficientemente más grande que Target
      if (draggerSize > targetSize * SIZE_SIMILARITY_THRESHOLD) {
          // Condición 2: Dragger tiene igual o mayor rareza (Normal Eat) O menor rareza (Tier Steal)
          if (draggerRarity >= targetRarity) {
              canEat = true; stealTier = false; reason = "Dragger larger and >= rarity (Normal Eat)";
          } else { // draggerRarity < targetRarity
              canEat = true; stealTier = true; reason = "Dragger larger but < rarity (Tier Steal)";
          }
      }

      if (canEat) {
          // console.log(`  -> Determined Eater: ${draggerCat.id} (Reason: ${reason})`);
          // if (stealTier) console.log(`    --> Calling performEat (Tier Steal). DraggerR:${draggerRarity}, TargetR:${targetRarity}`);
          // else console.log(`    --> Calling performEat (Normal). DraggerR:${draggerRarity}, TargetR:${targetRarity}`);
          this.performEat(draggerCat, targetCat, stealTier);
      }
      // else { console.log(`  -> No eat occurred. Reason: ${reason}`); }
  }

  /**
   * Realiza la acción de comer: elimina al gato 'eaten', hace crecer al 'eater',
   * y opcionalmente transfiere la rareza/apariencia si es 'stealTier'.
   * @param eater - La CatEntity que come.
   * @param eaten - La CatEntity que es comida.
   * @param stealTier - Booleano que indica si se debe robar la rareza/apariencia.
   */
  private performEat(eater: CatEntity, eaten: CatEntity, stealTier: boolean): void {
      // Verificar componentes antes de proceder
      if (!eater.physics.body || !eater.value || !eater.render.element || !eaten.value ) {
           console.error("PerformEat failed: Missing components in eater or eaten."); return;
      }
      // console.log(`CatManager: performEat - Eater: ${eater.id}, Eaten: ${eaten.id}, StealTier: ${stealTier}`);

      const eatenId = eaten.id;
      const eatenRarity = eaten.value.rarity;
      // const eatenGlowClass = RARITY_GLOW_MAP[eatenRarity]; // No se usa directamente aquí

      // 1. Eliminar al gato comido
      this.removeCat(eatenId);
      // console.log(`  -> Eaten cat ${eatenId} removed.`);

      // 2. Calcular y aplicar crecimiento al comedor
      const currentSize = eater.value.currentSize;
      let newSize = Math.min(MAX_CAT_SIZE, currentSize * CAT_GROWTH_FACTOR);
      const scaleFactor = newSize / currentSize;
      // console.log(`  -> Growth Calc: current=${currentSize.toFixed(1)}, new=${newSize.toFixed(1)}, factor=${scaleFactor.toFixed(2)}`);

      if (scaleFactor > 1.001) { // Aplicar solo si hay crecimiento notable
          eater.value.currentSize = newSize; // Actualizar tamaño lógico
          try {
              // Verificar si el cuerpo aún existe en el mundo físico
              if (this.physicsManager.getWorld && Matter.Composite.get(this.physicsManager.getWorld(), eater.physics.body.id, 'body')) {
                   Matter.Body.scale(eater.physics.body, scaleFactor, scaleFactor); // Escalar cuerpo físico
                   // console.log(`    --> Body ${eater.id} scaled.`);
              } else {
                   console.warn(`    --> Body ${eater.id} no encontrado en el mundo para escalar.`);
                   eater.value.currentSize = currentSize; // Revertir si falla
                   return;
              }
          } catch (error) {
               console.error(`Error scaling body ${eater.id}:`, error);
               eater.value.currentSize = currentSize; // Revertir en error
               return;
          }
          // Actualizar tamaño visual
          eater.render.element.style.width = `${newSize}px`;
          eater.render.element.style.height = `${newSize}px`;
           // console.log(`    --> Element ${eater.id} resized.`);
      }
      // else { console.log(`  -> No significant growth needed.`); }

      // 3. Aplicar lógica de "Tier Steal" si corresponde
      if (stealTier && eatenRarity > eater.value.rarity) {
          // console.log(`  -> Attempting Tier Steal: EaterR=${eater.value.rarity}, EatenR=${eatenRarity}`);
          const currentEaterGlow = RARITY_GLOW_MAP[eater.value.rarity];
          // Quitar clase de brillo anterior del elemento visual
          if (currentEaterGlow && eater.render.element) {
              eater.render.element.classList.remove(currentEaterGlow);
          }
          // Actualizar rareza lógica
          eater.value.rarity = eatenRarity;
          // console.log(`    --> Eater rarity updated to ${eatenRarity}`);
          // Añadir nueva clase de brillo (si existe)
          const newGlowClass = RARITY_GLOW_MAP[eatenRarity];
          if (newGlowClass && eater.render.element) {
              eater.render.element.classList.add(newGlowClass);
              // console.log(`    --> Added new glow: ${newGlowClass}`);
          }
      }

      // 4. Reproducir sonido de comer
      try { this.audioManager.playSound('eat'); }
      catch (e) { console.error("Error playing 'eat' sound:", e)}
  }

  /**
   * Actualiza la posición y rotación visual de todos los gatos
   * basándose en el estado de sus cuerpos físicos.
   * Se llama en cada frame desde GameManager.update().
   * @param deltaTime - Tiempo transcurrido desde el último frame (no usado aquí directamente).
   */
  public updateCats(deltaTime: number): void {
    this.cats.forEach((cat) => {
      const body = cat.physics.body;
      const element = cat.render.element;
      const value = cat.value;

      if (!body || !element || !value) return; // Saltar si falta algo

      const size = value.currentSize; // Usar tamaño lógico actual

      if (cat.render.isVisible) {
         if (element.style.display === 'none') element.style.display = ''; // Asegurar visibilidad
         const halfSize = size / 2;
         // Aplicar transformación para sincronizar posición y rotación
         element.style.transform = `translate(${body.position.x - halfSize}px, ${body.position.y - halfSize}px) rotate(${body.angle}rad)`;

         // Sincronizar tamaño visual si difiere del lógico (evita saltos visuales)
         const currentVisualSize = parseFloat(element.style.width);
         if (isNaN(currentVisualSize) || Math.abs(currentVisualSize - size) > 0.1) {
            element.style.width = `${size}px`;
            element.style.height = `${size}px`;
         }
      } else {
        if (element.style.display !== 'none') element.style.display = 'none'; // Ocultar si no es visible
      }
    });
  }

  // --- Getters ---
  public getCat(catId: string): CatEntity | undefined { return this.cats.get(catId); }
  public getAllCats(): CatEntity[] { return Array.from(this.cats.values()); }

  /**
   * Elimina todos los gatos del juego y limpia los registros.
   */
  public removeAllCats(): void {
       // console.log(`CatManager: Eliminando ${this.cats.size} gatos...`);
       const catIds = Array.from(this.cats.keys());
       catIds.forEach(catId => this.removeCat(catId)); // Llama a removeCat para limpieza individual
       if (this.cats.size > 0) { console.warn("CatManager: Faltaron gatos por eliminar al limpiar."); this.cats.clear(); }
       this.bodyIdToEntityIdMap.clear(); // Limpiar mapa
       this.nextCatIdCounter = 0; // Resetear contador
       // console.log("CatManager: Todos los gatos eliminados.");
   }

} // Fin CatManager
