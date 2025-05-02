// src/systems/CatManager.ts

import { CatEntity } from '../game/entities/CatEntity';
import { PhysicsComponent } from '../game/components/PhysicsComponent';
import { RenderComponent } from '../game/components/RenderComponent';
import { ValueComponent } from '../game/components/ValueComponent';
import { PhysicsManager } from './PhysicsManager';
import { AudioManager } from './AudioManager';
import { CatTemplate } from '../types/CatTemplate';
import Matter from 'matter-js';
import { GameManager } from '../game/GameManager';

// --- Constantes de Colisión ---
const WALL_COLLISION_CATEGORY = 0x0001;
const CAT_COLLISION_CATEGORY = 0x0002;
const INK_COLLISION_CATEGORY = 0x0004;
const FOOD_PELLET_COLLISION_CATEGORY = 0x0008; // <-- Asegúrate que esta constante exista y sea única
// ----------------------------

const CAT_GROWTH_FACTOR = 1.15;
const MAX_CAT_SIZE = 300; // Límite absoluto (puede ser diferente al límite mejorable)
const SIZE_SIMILARITY_THRESHOLD = 1.02; // Umbral para comer (debe ser ligeramente mayor que el otro)
const RARITY_GLOW_MAP: { [key: number]: string | null } = {
    0: null, 1: 'glow-gray', 2: 'glow-green',
    3: 'glow-blue', 4: 'glow-violet', 5: 'glow-orange',
};
// Constantes para crecimiento por acierto (ajustar según balance)
const SIZE_INCREMENT_PER_CORRECT = 1; // Píxeles a crecer por acierto
const MAX_CORRECT_ANSWER_GROWTH = 4;  // Máximo número de veces que un gato común puede crecer así

// *** CORRECCIÓN: Añadir 'export' aquí ***
export class CatManager {
  private cats: Map<string, CatEntity> = new Map();
  private physicsManager!: PhysicsManager; // Se asigna con setPhysicsManager
  private audioManager: AudioManager;
  private gameManager!: GameManager; // Se asigna en el constructor
  // Mapa para relacionar ID de cuerpo físico con ID de entidad Gato
  public bodyIdToEntityIdMap: Map<number, string> = new Map(); // Hacer público para CatFoodManager
  private nextCatIdCounter: number = 0;
  private catContainerElement: HTMLElement | null = null;
  private templates: Map<string, CatTemplate> = new Map();

  constructor(audioManager: AudioManager, gameManager: GameManager) {
    this.audioManager = audioManager;
    this.gameManager = gameManager; // Guardar referencia a GameManager
    this.catContainerElement = document.getElementById('cat-container');
    if (!this.catContainerElement) {
        console.error("CatManager: Elemento '#cat-container' no encontrado!");
        // Considerar lanzar un error o manejarlo de otra forma si es crítico
    }
    console.log('CatManager Creado (con ref a GameManager).');
  }

  /** Inyecta la dependencia del PhysicsManager después de su creación. */
  public setPhysicsManager(physicsManager: PhysicsManager): void {
       this.physicsManager = physicsManager;
  }

  /** Carga las plantillas de gatos desde los datos JSON pre-cargados. */
  public loadTemplates(templateData: CatTemplate[]): void {
      this.templates.clear();
      if (!Array.isArray(templateData)) {
          console.error("CatManager: Formato inválido de plantillas."); return;
      }
      templateData.forEach(template => {
          if (template?.id) {
              // Asegurar que spawnWeight sea un número positivo
              if (typeof template.spawnWeight !== 'number' || template.spawnWeight <= 0) {
                  // console.warn(`CatManager: Plantilla ${template.id} sin spawnWeight válido, asignando 1.`);
                  template.spawnWeight = 1;
              }
              this.templates.set(template.id, template);
          } else { console.warn("CatManager: Plantilla inválida o sin ID.", template); }
      });
      // console.log(`CatManager: ${this.templates.size} plantillas cargadas.`); // Log menos verboso
  }

  /** Devuelve una lista de IDs de plantillas con sus pesos de aparición. */
  public getSpawnableTemplatesWeighted(): { id: string; weight: number }[] {
    const weightedTemplates: { id: string; weight: number }[] = [];
    this.templates.forEach((template) => {
        // Usar el spawnWeight definido, o 1 como fallback
        const weight = template.spawnWeight && template.spawnWeight > 0 ? template.spawnWeight : 1;
        weightedTemplates.push({ id: template.id, weight: weight });
    });
    return weightedTemplates;
  }

  /**
   * Añade un nuevo gato al juego basado en una plantilla.
   * @param templateId - El ID de la plantilla a usar.
   * @param initialPosition - (Opcional) Posición inicial {x, y}.
   * @returns La entidad CatEntity creada o null si falla.
   */
  public addCat(templateId: string, initialPosition?: { x: number; y: number }): CatEntity | null {
    if (!this.gameManager) { console.error("CatManager: GameManager no disponible."); return null; }
    const currentCatCount = this.cats.size;
    const maxAllowed = this.gameManager.getPlayerData().getMaxCatsAllowed();

    // Verificar límite de gatos
    if (currentCatCount >= maxAllowed) {
        // console.log(`Max cats limit reached (${currentCatCount}/${maxAllowed}). Not spawning.`); // Log opcional
        return null;
    }

    // Verificar dependencias y elementos DOM
    if (!this.catContainerElement || !this.physicsManager) {
        console.error("CatManager: Falta #cat-container o PhysicsManager.");
        return null;
    }

    // Obtener plantilla
    const template = this.templates.get(templateId);
    if (!template) {
        console.error(`CatManager: Plantilla '${templateId}' no encontrada.`);
        return null;
    }

    // Crear ID único para la entidad
    const entityId = `cat_entity_${this.nextCatIdCounter++}`;

    // Obtener valores iniciales de la plantilla
    const initialSize = template.initialSize;
    const rarity = template.rarity;
    const scoreValue = template.scoreValue ?? 0; // Valor por defecto si no está definido

    // Calcular posición inicial (aleatoria si no se provee)
    const x = initialPosition?.x ?? Math.random() * (window.innerWidth - initialSize) + initialSize / 2;
    const y = initialPosition?.y ?? initialSize / 2 + 10; // Ligeramente abajo del borde superior

    // Opciones físicas (combinar defaults con plantilla)
    const defaultPhysics: Matter.IBodyDefinition = {
        restitution: 0.6, friction: 0.1, frictionAir: 0.01, density: 0.005, slop: 0.01, // Añadir slop
    };
    const bodyOptions: Matter.IBodyDefinition = {
        ...defaultPhysics,
        ...(template.physicsOptions ?? {}), // Sobrescribir con opciones de plantilla
        label: 'cat', // Etiqueta para identificación en colisiones
        collisionFilter: {
            category: CAT_COLLISION_CATEGORY,
            // Colisiona con: Paredes, Otros Gatos, Tinta, Comida
            mask: WALL_COLLISION_CATEGORY | CAT_COLLISION_CATEGORY | INK_COLLISION_CATEGORY | FOOD_PELLET_COLLISION_CATEGORY
        },
        // Guardar datos relevantes directamente en el cuerpo físico si es útil
        plugin: {
            entityId: entityId,
            rarity: rarity,
            currentSize: initialSize // Guardar tamaño inicial en plugin
        }
    };

    // Crear cuerpo físico
    const body = Matter.Bodies.circle(x, y, initialSize / 2, bodyOptions);
    Matter.Body.setAngularVelocity(body, (Math.random() - 0.5) * 0.2); // Rotación inicial leve
    const physicsComp = new PhysicsComponent(body);

    // Guardar mapeo ID cuerpo -> ID entidad
    this.bodyIdToEntityIdMap.set(body.id, entityId);

    // Crear elemento DOM
    const element = document.createElement('div');
    element.id = entityId;
    element.classList.add('cat');
    element.style.width = `${initialSize}px`;
    element.style.height = `${initialSize}px`;

    // Aplicar estilos visuales de la plantilla
    const renderOpts = template.renderOptions ?? {};
    // Determinar clase de brillo (desde plantilla o mapa de rareza)
    const glowClass = renderOpts.glowClass ?? RARITY_GLOW_MAP[rarity];
    if (glowClass) {
        element.classList.add(glowClass);
    }

    // Establecer imagen de fondo (con fallback)
    let finalImageUrl = renderOpts.imageUrl;
    const fallbackColor = renderOpts.backgroundColor ?? '#cccccc'; // Gris por defecto
    // Usar cataas como fallback si no hay imageUrl
    if (!finalImageUrl) {
        finalImageUrl = `https://cataas.com/cat?${Date.now()}&width=${Math.round(initialSize)}&height=${Math.round(initialSize)}`;
    }
    // Aplicar imagen o color de fondo
    if (finalImageUrl) {
        element.style.backgroundImage = `url('${finalImageUrl}')`;
        element.style.backgroundSize = 'cover';
        element.style.backgroundPosition = 'center';
        // Añadir manejo de error de imagen
        const img = new Image();
        img.onerror = () => {
            console.warn(`Failed to load cat image: ${finalImageUrl}. Using fallback color.`);
            element.style.backgroundImage = 'none';
            element.style.backgroundColor = fallbackColor;
        };
        img.src = finalImageUrl;
    } else {
        element.style.backgroundColor = fallbackColor; // Usar color si no hay URL
    }

    // Añadir elemento al DOM
    if (this.catContainerElement) {
        this.catContainerElement.appendChild(element);
    } else {
        console.error("Error Crítico: #cat-container no encontrado al añadir gato.");
        this.bodyIdToEntityIdMap.delete(body.id); // Limpiar mapeo si falla
        return null;
    }

    // Crear componentes restantes
    const renderComp = new RenderComponent(element);
    const valueComp = new ValueComponent(rarity, scoreValue, initialSize, 0); // GrowthLevel inicial 0

    // Crear entidad Gato
    const newCat = new CatEntity(entityId, physicsComp, renderComp, valueComp);

    // Añadir cuerpo físico al mundo (manejar errores)
    try {
        Matter.World.add(this.physicsManager.getWorld(), body);
    } catch (error) {
        console.error(`CatManager: Error añadiendo cuerpo físico ${entityId} al mundo:`, error);
        // Limpieza si falla la adición al mundo
        if (element.parentNode) element.parentNode.removeChild(element);
        this.bodyIdToEntityIdMap.delete(body.id);
        return null;
    }

    // Añadir entidad al mapa de gatos activos
    this.cats.set(entityId, newCat);
    // console.log(`Cat added: ${entityId} (Template: ${templateId}, Rarity: ${rarity}, Size: ${initialSize})`); // Log opcional
    return newCat;
  }

  /** Elimina un gato del juego (DOM y física). */
  public removeCat(entityId: string): void {
    const cat = this.cats.get(entityId);
    if (cat) {
      const body = cat.physics.body;
      // Remover cuerpo físico si existe y está en el mundo
      if (body) {
          this.bodyIdToEntityIdMap.delete(body.id); // Limpiar mapeo ID
          try {
              // Verificar que el mundo exista y el cuerpo esté en él antes de remover
              if (this.physicsManager?.getWorld && Matter.Composite.get(this.physicsManager.getWorld(), body.id, 'body')) {
                  Matter.World.remove(this.physicsManager.getWorld(), body);
              }
          } catch(error) { console.warn(`Error eliminando cuerpo físico gato ${entityId}:`, error); }
      }
      // Remover elemento DOM si existe
      if (cat.render.element?.parentNode) {
        cat.render.element.parentNode.removeChild(cat.render.element);
      }
      // Eliminar entidad del mapa
      this.cats.delete(entityId);
      // console.log(`Cat removed: ${entityId}`); // Log opcional
    }
  }

  /**
   * Procesa una colisión iniciada por el jugador (arrastrando un gato).
   * Determina qué gato es el 'dragger' y cuál el 'target' y llama a handleCatVsCatCollision.
   */
  public processPlayerInitiatedCollision(bodyIdA: number, bodyIdB: number, draggerBodyId: number): void {
      const entityIdA = this.bodyIdToEntityIdMap.get(bodyIdA);
      const entityIdB = this.bodyIdToEntityIdMap.get(bodyIdB);

      if (entityIdA && entityIdB) {
          const catA = this.cats.get(entityIdA);
          const catB = this.cats.get(entityIdB);

          if (catA && catB) {
              // Determinar quién es quién
              const draggerCat = (bodyIdA === draggerBodyId) ? catA : catB;
              const targetCat = (bodyIdA === draggerBodyId) ? catB : catA;

              if (draggerCat && targetCat) {
                  this.handleCatVsCatCollision(draggerCat, targetCat);
              } else { console.error("Error: No se pudo determinar dragger/target cat en colisión."); }
          } else {
              // Ignorar si una de las entidades ya no existe (pudo ser comida justo antes)
              // console.warn(`Collision processed but one cat entity missing: A=${!!catA}, B=${!!catB}`);
          }
      } else {
          // Ignorar si no se encuentran los mapeos de ID
          // console.warn(`Collision processed but entity ID mapping missing: A=${entityIdA}, B=${entityIdB}`);
      }
  }

  /** Lógica de colisión entre dos gatos (uno arrastrado por el jugador). */
  private handleCatVsCatCollision(draggerCat: CatEntity, targetCat: CatEntity): void {
      // Validar componentes necesarios
      if (!draggerCat.physics.body || !draggerCat.value || !targetCat.physics.body || !targetCat.value || !this.gameManager) {
          console.warn("handleCatVsCatCollision: Faltan componentes necesarios en dragger o target.");
          return;
      }
      // Evitar auto-colisión lógica
      if (draggerCat.id === targetCat.id) return;

      // Obtener datos relevantes
      const draggerSize = draggerCat.value.currentSize;
      const draggerRarity = draggerCat.value.rarity;
      const targetSize = targetCat.value.currentSize;
      const targetRarity = targetCat.value.rarity;
      const currentMaxSizeLimit = this.gameManager.getPlayerData().getCurrentMaxSizeLimit();
      const isDraggerAtLimit = draggerSize >= currentMaxSizeLimit;

      // Determinar si puede comer
      let canEat = false;
      let stealTier = false; // Robar rareza si es mayor
      let eatForGrowth = false; // Aplicar crecimiento normal

      // Condición 1: Dragger es significativamente más grande
      if (draggerSize > targetSize * SIZE_SIMILARITY_THRESHOLD) {
          // Si el dragger NO está al límite de tamaño, come para crecer
          if (!isDraggerAtLimit) {
              canEat = true;
              eatForGrowth = true;
              stealTier = draggerRarity < targetRarity; // Roba tier si el target es mejor
          }
          // Si el dragger SÍ está al límite, solo come si puede robar un tier mejor
          else {
              if (draggerRarity < targetRarity) {
                  canEat = true;
                  eatForGrowth = false; // No crece más
                  stealTier = true;
              }
          }
      }

      // Ejecutar acción si puede comer
      if (canEat) {
          this.performEat(draggerCat, targetCat, stealTier, eatForGrowth);
      }
  }

  /** Realiza la acción de comer un gato por otro. */
  private performEat(eater: CatEntity, eaten: CatEntity, stealTier: boolean, applyGrowth: boolean): void {
      // Validar componentes necesarios
      if (!eater.physics.body || !eater.value || !eater.render.element || !eaten.value || !this.gameManager) {
          console.warn("performEat: Faltan componentes en eater o eaten.");
          return;
      }

      const eatenId = eaten.id;
      const eatenRarity = eaten.value.rarity;
      const eatenGlowClass = RARITY_GLOW_MAP[eatenRarity]; // Obtener clase de brillo del comido

      // 1. Remover el gato comido
      this.removeCat(eatenId);

      // 2. Aplicar crecimiento al que come (si aplica)
      if (applyGrowth) {
          const currentSize = eater.value.currentSize;
          const currentMaxSizeLimit = this.gameManager.getPlayerData().getCurrentMaxSizeLimit();
          // Calcular nuevo tamaño, limitado por el máximo global y el del jugador
          let newSize = Math.min(currentMaxSizeLimit, MAX_CAT_SIZE, currentSize * CAT_GROWTH_FACTOR);
          const scaleFactor = newSize / currentSize;

          // Solo escalar si hay un cambio significativo
          if (scaleFactor > 1.001) {
              eater.value.currentSize = newSize; // Actualizar valor
              try {
                  // Escalar cuerpo físico (verificar que exista en el mundo)
                  if (this.physicsManager.getWorld && Matter.Composite.get(this.physicsManager.getWorld(), eater.physics.body.id, 'body')) {
                       Matter.Body.scale(eater.physics.body, scaleFactor, scaleFactor);
                       // Actualizar plugin si lo usamos para tamaño
                       if (eater.physics.body.plugin) eater.physics.body.plugin.currentSize = newSize;
                  } else { throw new Error("Body not found in world during scaling"); }
              } catch (error) {
                  console.error(`Error scaling body ${eater.id}:`, error);
                  eater.value.currentSize = currentSize; // Revertir si falla
                  if (eater.physics.body.plugin) eater.physics.body.plugin.currentSize = currentSize;
              }
              // Actualizar tamaño visual
              eater.render.element.style.width = `${newSize}px`;
              eater.render.element.style.height = `${newSize}px`;
          }
      }

      // 3. Robar rareza/brillo (si aplica)
      if (stealTier && eatenRarity > eater.value.rarity) {
          const currentEaterGlow = RARITY_GLOW_MAP[eater.value.rarity];
          // Remover brillo actual del que come
          if (currentEaterGlow && eater.render.element) {
              eater.render.element.classList.remove(currentEaterGlow);
          }
          // Actualizar valor de rareza
          eater.value.rarity = eatenRarity;
          if (eater.physics.body.plugin) eater.physics.body.plugin.rarity = eatenRarity;
          // Añadir nuevo brillo
          const newGlowClass = eatenGlowClass; // Usar la clase del comido
          if (newGlowClass && eater.render.element) {
              eater.render.element.classList.add(newGlowClass);
          }
          console.log(` -> Cat ${eater.id} stole rarity ${eatenRarity} from ${eatenId}`);
      }

      // Reproducir sonido
      try { this.audioManager.playSound('eat'); } catch (e) { console.error("Error playing 'eat' sound:", e)}
  }

  /** Actualiza la posición y rotación visual de los gatos basada en la física. */
  public updateCats(deltaTime: number): void {
    this.cats.forEach((cat) => {
      const body = cat.physics.body;
      const element = cat.render.element;
      const value = cat.value;

      // Validar que todos los componentes necesarios existan
      if (!body || !element || !value) {
          console.warn(`Skipping update for cat ${cat.id}: Missing body, element, or value.`);
          // Podríamos intentar remover el gato si le faltan componentes críticos
          // this.removeCat(cat.id);
          return;
      }

      const size = value.currentSize;

      // Sincronizar visibilidad
      if (cat.render.isVisible) {
         // Asegurar que esté visible si debe estarlo
         if (element.style.display === 'none') element.style.display = '';

         // Actualizar posición y rotación usando transform para mejor rendimiento
         const halfSize = size / 2;
         element.style.transform = `translate(${body.position.x - halfSize}px, ${body.position.y - halfSize}px) rotate(${body.angle}rad)`;

         // Sincronizar tamaño visual solo si ha cambiado significativamente
         const currentVisualSize = parseFloat(element.style.width);
         if (isNaN(currentVisualSize) || Math.abs(currentVisualSize - size) > 0.1) {
            element.style.width = `${size}px`;
            element.style.height = `${size}px`;
         }
      } else {
         // Asegurar que esté oculto si no debe ser visible
         if (element.style.display !== 'none') element.style.display = 'none';
      }
    });
  }

  /** Obtiene una entidad Gato por su ID. */
  public getCat(catId: string): CatEntity | undefined {
      return this.cats.get(catId);
  }

  /** Obtiene todas las entidades Gato activas. */
  public getAllCats(): CatEntity[] {
      return Array.from(this.cats.values());
  }

  /** Elimina todos los gatos del juego. */
  public removeAllCats(): void {
       console.log(`CatManager: Removing all ${this.cats.size} cats...`);
       const catIds = Array.from(this.cats.keys());
       catIds.forEach(catId => this.removeCat(catId)); // Usar el método removeCat individual

       // Doble chequeo por si removeCat falló en algún caso
       if (this.cats.size > 0) {
           console.warn(`CatManager: ${this.cats.size} cats remained after individual removal. Clearing map forcefully.`);
           this.cats.clear();
       }
       this.bodyIdToEntityIdMap.clear(); // Limpiar mapeo
       this.nextCatIdCounter = 0; // Resetear contador
       // Limpiar contenedor DOM por si quedaron elementos huérfanos
       if (this.catContainerElement) this.catContainerElement.innerHTML = '';
       console.log("CatManager: All cats removed.");
   }

  /**
   * Hace crecer a los gatos comunes existentes que no hayan alcanzado su límite de crecimiento por aciertos.
   * @param amount - La cantidad de píxeles a añadir al tamaño.
   * @param maxGrowthLevel - El número máximo de veces que un gato puede crecer por este método.
   */
  public growExistingCats(amount: number, maxGrowthLevel: number): void {
    let grownCount = 0;
    this.cats.forEach((cat) => {
        // Validar componentes y que sea un gato común (rareza 0)
        if (!cat.value || !cat.physics.body || !this.physicsManager || !this.gameManager || cat.value.rarity !== 0) {
            return;
        }

        // Verificar si ya alcanzó el límite de crecimiento por aciertos
        if (cat.value.growthLevel < maxGrowthLevel) {
            const currentSize = cat.value.currentSize;
            const currentMaxSizeLimit = this.gameManager.getPlayerData().getCurrentMaxSizeLimit();
            // Calcular nuevo tamaño, limitado por el máximo del jugador y el absoluto
            let newSize = Math.min(currentMaxSizeLimit, MAX_CAT_SIZE, currentSize + amount);
            const scaleFactor = newSize / currentSize;

            // Solo escalar si hay cambio significativo
            if (scaleFactor > 1.0001) {
                 cat.value.growthLevel++; // Incrementar nivel de crecimiento por acierto
                 cat.value.currentSize = newSize; // Actualizar valor
                 try {
                     const body = cat.physics.body;
                     // Escalar cuerpo físico (verificar que exista)
                     if (this.physicsManager.getWorld && Matter.Composite.get(this.physicsManager.getWorld(), body.id, 'body')) {
                          Matter.Body.scale(body, scaleFactor, scaleFactor);
                          if (body.plugin) body.plugin.currentSize = newSize; // Actualizar plugin si se usa
                          grownCount++;
                     } else { throw new Error("Body not found in world for growth scaling"); }
                 } catch(error) {
                      console.error(` -> Error escalando gato común ${cat.id} (crecimiento por acierto):`, error);
                      // Revertir si falla
                      cat.value.growthLevel--;
                      cat.value.currentSize = currentSize;
                      if (cat.physics.body.plugin) cat.physics.body.plugin.currentSize = currentSize;
                 }
            }
        }
    });
    // if (grownCount > 0) console.log(` -> ${grownCount} common cats grew from correct answer.`); // Log opcional
  }

} // Fin CatManager
