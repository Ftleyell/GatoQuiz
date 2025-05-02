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

// --- Constantes ---
const WALL_COLLISION_CATEGORY = 0x0001;
const CAT_COLLISION_CATEGORY = 0x0002;
const INK_COLLISION_CATEGORY = 0x0004;
const CAT_GROWTH_FACTOR = 1.15; // Crecimiento al comer (se aplica si no está al límite)
// const MAX_CAT_SIZE = 300; // Ya no es una constante fija aquí, se obtiene de PlayerData
const SIZE_SIMILARITY_THRESHOLD = 1.02; // Para comer
const RARITY_GLOW_MAP: { [key: number]: string | null } = {
    0: null, 1: 'glow-gray', 2: 'glow-green',
    3: 'glow-blue', 4: 'glow-violet', 5: 'glow-orange',
};
const SIZE_INCREMENT_PER_CORRECT = 1; // Crecimiento por acierto (para growExistingCats)
const MAX_CORRECT_ANSWER_GROWTH = 4;  // Límite de crecimiento por aciertos
// ------------------

/**
 * CatManager: Gestiona gatos, incluyendo creación, eliminación,
 * actualización visual y lógica de colisión/fusión iniciada por el jugador.
 */
export class CatManager {
  private cats: Map<string, CatEntity> = new Map();
  private physicsManager!: PhysicsManager;
  private audioManager: AudioManager;
  private gameManager!: GameManager;
  private bodyIdToEntityIdMap: Map<number, string> = new Map();
  private nextCatIdCounter: number = 0;
  private catContainerElement: HTMLElement | null = null;
  private templates: Map<string, CatTemplate> = new Map();

  constructor(audioManager: AudioManager, gameManager: GameManager) {
    this.audioManager = audioManager;
    this.gameManager = gameManager;
    this.catContainerElement = document.getElementById('cat-container');
    if (!this.catContainerElement) {
        console.error("CatManager: Elemento '#cat-container' no encontrado!");
    }
    console.log('CatManager Creado (con ref a GameManager).');
  }

  public setPhysicsManager(physicsManager: PhysicsManager): void {
       this.physicsManager = physicsManager;
  }

  public loadTemplates(templateData: CatTemplate[]): void {
      this.templates.clear();
      if (!Array.isArray(templateData)) {
          console.error("CatManager: Formato inválido de plantillas."); return;
      }
      templateData.forEach(template => {
          if (template?.id) {
              if (typeof template.spawnWeight !== 'number' || template.spawnWeight <= 0) {
                  template.spawnWeight = 1;
              }
              this.templates.set(template.id, template);
          } else { console.warn("CatManager: Plantilla inválida o sin ID.", template); }
      });
      // console.log(`CatManager: ${this.templates.size} plantillas cargadas.`);
  }

  public getSpawnableTemplatesWeighted(): { id: string; weight: number }[] {
    const weightedTemplates: { id: string; weight: number }[] = [];
    this.templates.forEach((template) => {
        const weight = template.spawnWeight && template.spawnWeight > 0 ? template.spawnWeight : 1;
        weightedTemplates.push({ id: template.id, weight: weight });
    });
    return weightedTemplates;
  }

  public addCat(templateId: string, initialPosition?: { x: number; y: number }): CatEntity | null {
    if (!this.gameManager) { console.error("CatManager: GameManager no disponible."); return null; }
    const currentCatCount = this.cats.size;
    const maxAllowed = this.gameManager.getPlayerData().getMaxCatsAllowed();
    if (currentCatCount >= maxAllowed) {
        console.log(`Max cats limit reached (${currentCatCount}/${maxAllowed}).`); return null;
    }
    if (!this.catContainerElement || !this.physicsManager) { console.error("CatManager: Falta #cat-container o PhysicsManager."); return null; }
    const template = this.templates.get(templateId);
    if (!template) { console.error(`CatManager: Plantilla '${templateId}' no encontrada.`); return null; }

    const entityId = `cat_entity_${this.nextCatIdCounter++}`;
    const initialSize = template.initialSize;
    const rarity = template.rarity;
    const scoreValue = template.scoreValue ?? 0;
    const x = initialPosition?.x ?? Math.random() * (window.innerWidth - initialSize) + initialSize / 2;
    const y = initialPosition?.y ?? initialSize / 2 + 10;

    const defaultPhysics: Matter.IBodyDefinition = { restitution: 0.6, friction: 0.1, frictionAir: 0.01, density: 0.005 };
    const bodyOptions: Matter.IBodyDefinition = {
        ...defaultPhysics, ...(template.physicsOptions ?? {}), label: 'cat',
        collisionFilter: { category: CAT_COLLISION_CATEGORY, mask: WALL_COLLISION_CATEGORY | CAT_COLLISION_CATEGORY | INK_COLLISION_CATEGORY },
    };
    const body = Matter.Bodies.circle(x, y, initialSize / 2, bodyOptions);
    Matter.Body.setAngularVelocity(body, (Math.random() - 0.5) * 0.2);
    const physicsComp = new PhysicsComponent(body);
    this.bodyIdToEntityIdMap.set(body.id, entityId);

    const element = document.createElement('div');
    element.id = entityId; element.classList.add('cat');
    element.style.width = `${initialSize}px`; element.style.height = `${initialSize}px`;

    const renderOpts = template.renderOptions ?? {};
    const glowClass = renderOpts.glowClass ?? RARITY_GLOW_MAP[rarity];
    if (glowClass) { element.classList.add(glowClass); }

    let finalImageUrl = renderOpts.imageUrl;
    const fallbackColor = renderOpts.backgroundColor ?? '#cccccc';
    if (!finalImageUrl) { finalImageUrl = `https://cataas.com/cat?${Date.now()}&width=${Math.round(initialSize)}&height=${Math.round(initialSize)}`; }
    if (finalImageUrl) {
        element.style.backgroundImage = `url('${finalImageUrl}')`; element.style.backgroundSize = 'cover'; element.style.backgroundPosition = 'center';
        const img = new Image();
        img.onerror = () => { element.style.backgroundImage = 'none'; element.style.backgroundColor = fallbackColor; };
        img.src = finalImageUrl;
    } else { element.style.backgroundColor = fallbackColor; }

    if (this.catContainerElement) { this.catContainerElement.appendChild(element); }
    else { console.error("Error Crítico: #cat-container no encontrado."); return null; }
    const renderComp = new RenderComponent(element);
    const valueComp = new ValueComponent(rarity, scoreValue, initialSize, 0); // growthLevel inicia en 0
    const newCat = new CatEntity(entityId, physicsComp, renderComp, valueComp);

    try { Matter.World.add(this.physicsManager.getWorld(), body); }
    catch (error) {
        console.error(`CatManager: Error añadiendo cuerpo ${entityId}:`, error);
        if (element.parentNode) element.parentNode.removeChild(element);
        this.bodyIdToEntityIdMap.delete(body.id);
        return null;
    }
    this.cats.set(entityId, newCat);
    return newCat;
  }

  public removeCat(entityId: string): void {
    const cat = this.cats.get(entityId);
    if (cat) {
      const body = cat.physics.body;
      if (body) {
          this.bodyIdToEntityIdMap.delete(body.id);
          try {
              if (this.physicsManager?.getWorld && Matter.Composite.get(this.physicsManager.getWorld(), body.id, 'body')) {
                  Matter.World.remove(this.physicsManager.getWorld(), body);
              }
          } catch(error) { console.warn(`Error eliminando cuerpo físico gato ${entityId}:`, error); }
      }
      if (cat.render.element?.parentNode) {
        cat.render.element.parentNode.removeChild(cat.render.element);
      }
      this.cats.delete(entityId);
    }
  }

  public processPlayerInitiatedCollision(bodyIdA: number, bodyIdB: number, draggerBodyId: number): void {
      const entityIdA = this.bodyIdToEntityIdMap.get(bodyIdA);
      const entityIdB = this.bodyIdToEntityIdMap.get(bodyIdB);
      if (entityIdA && entityIdB) {
          const catA = this.cats.get(entityIdA);
          const catB = this.cats.get(entityIdB);
          if (catA && catB) {
              const draggerCat = (bodyIdA === draggerBodyId) ? catA : catB;
              const targetCat = (bodyIdA === draggerBodyId) ? catB : catA;
              if (draggerCat && targetCat) {
                  this.handleCatVsCatCollision(draggerCat, targetCat);
              } else { console.error("Error: No se pudo determinar dragger/target cat."); }
          } else { /* Ignorar si un gato ya fue removido */ }
      } else { /* Ignorar si no se encontraron entidades */ }
  }

  // MODIFICADO: Usa el límite de tamaño de PlayerData y ajusta lógica de comer
  private handleCatVsCatCollision(draggerCat: CatEntity, targetCat: CatEntity): void {
      if (!draggerCat.physics.body || !draggerCat.value || !targetCat.physics.body || !targetCat.value || !this.gameManager) {
          console.warn("handleCatVsCatCollision skipped: Missing components or GameManager.");
          return;
      }
      if (draggerCat.id === targetCat.id) return;

      const draggerSize = draggerCat.value.currentSize;
      const draggerRarity = draggerCat.value.rarity;
      const targetSize = targetCat.value.currentSize;
      const targetRarity = targetCat.value.rarity;

      // Obtener el límite de tamaño actual del jugador
      const currentMaxSizeLimit = this.gameManager.getPlayerData().getCurrentMaxSizeLimit();
      const isDraggerAtLimit = draggerSize >= currentMaxSizeLimit;

      let canEat = false;
      let stealTier = false;
      let eatForGrowth = false; // Flag para indicar si el comer implica crecimiento

      // Condición 1: Dragger debe ser suficientemente más grande
      if (draggerSize > targetSize * SIZE_SIMILARITY_THRESHOLD) {
          // Condición 2: ¿Está el dragger por debajo del límite de tamaño?
          if (!isDraggerAtLimit) {
              // Puede comer normalmente (para crecer y/o robar tier)
              canEat = true;
              eatForGrowth = true; // Comer implica crecimiento
              stealTier = draggerRarity < targetRarity; // Robar tier si aplica
              // console.log(` -> Eat Allowed (Below Limit): Growth=true, Steal=${stealTier}`);
          } else {
              // Dragger está en el límite o por encima. Solo puede comer para robar tier.
              if (draggerRarity < targetRarity) {
                  canEat = true;
                  eatForGrowth = false; // Comer NO implica crecimiento
                  stealTier = true;
                  // console.log(` -> Eat Allowed (At Limit - Tier Steal Only): Growth=false, Steal=${stealTier}`);
              } else {
                   // console.log(` -> Eat Blocked (At Limit - No Tier Steal): DraggerR=${draggerRarity}, TargetR=${targetRarity}`);
              }
          }
      } else {
           // console.log(` -> Eat Blocked (Size): DraggerSize=${draggerSize.toFixed(1)}, TargetSize=${targetSize.toFixed(1)}`);
      }

      if (canEat) {
          this.performEat(draggerCat, targetCat, stealTier, eatForGrowth); // Pasar el flag eatForGrowth
      }
  }

  // MODIFICADO: Añade parámetro 'applyGrowth' y lo usa
  private performEat(eater: CatEntity, eaten: CatEntity, stealTier: boolean, applyGrowth: boolean): void {
      if (!eater.physics.body || !eater.value || !eater.render.element || !eaten.value ) {
           console.error("PerformEat failed: Missing components."); return;
      }
      const eatenId = eaten.id;
      const eatenRarity = eaten.value.rarity;
      this.removeCat(eatenId); // Eliminar al comido

      // 1. Aplicar Crecimiento (SOLO si applyGrowth es true)
      if (applyGrowth) {
          const currentSize = eater.value.currentSize;
          // Usar el límite actual para calcular el tamaño máximo al crecer
          const currentMaxSizeLimit = this.gameManager.getPlayerData().getCurrentMaxSizeLimit();
          let newSize = Math.min(currentMaxSizeLimit, currentSize * CAT_GROWTH_FACTOR);
          const scaleFactor = newSize / currentSize;

          if (scaleFactor > 1.001) {
              eater.value.currentSize = newSize;
              try {
                  if (this.physicsManager.getWorld && Matter.Composite.get(this.physicsManager.getWorld(), eater.physics.body.id, 'body')) {
                       Matter.Body.scale(eater.physics.body, scaleFactor, scaleFactor);
                  } else { throw new Error("Body not found in world"); }
              } catch (error) {
                   console.error(`Error scaling body ${eater.id}:`, error);
                   eater.value.currentSize = currentSize; // Revertir si falla el escalado
                   // No continuar si falla el escalado, pero el tier steal sí puede ocurrir
              }
              // Actualizar tamaño visual independientemente de si falló el escalado físico (para consistencia)
              eater.render.element.style.width = `${newSize}px`;
              eater.render.element.style.height = `${newSize}px`;
          }
      } else {
           // console.log(` -> Skipping growth for Eater ${eater.id} (applyGrowth=false)`); // Log opcional
      }

      // 2. Aplicar Tier Steal (Siempre se aplica si stealTier es true)
      if (stealTier && eatenRarity > eater.value.rarity) {
          const currentEaterGlow = RARITY_GLOW_MAP[eater.value.rarity];
          if (currentEaterGlow && eater.render.element) { eater.render.element.classList.remove(currentEaterGlow); }
          eater.value.rarity = eatenRarity;
          const newGlowClass = RARITY_GLOW_MAP[eatenRarity];
          if (newGlowClass && eater.render.element) { eater.render.element.classList.add(newGlowClass); }
          // console.log(` -> Tier Steal applied to Eater ${eater.id}. New Rarity: ${eatenRarity}`); // Log opcional
      }

      // 3. Reproducir sonido
      try { this.audioManager.playSound('eat'); }
      catch (e) { console.error("Error playing 'eat' sound:", e)}
  }

  // updateCats (Sin cambios)
  public updateCats(deltaTime: number): void {
    this.cats.forEach((cat) => {
      const body = cat.physics.body;
      const element = cat.render.element;
      const value = cat.value;
      if (!body || !element || !value) return;

      const size = value.currentSize;
      if (cat.render.isVisible) {
         if (element.style.display === 'none') element.style.display = '';
         const halfSize = size / 2;
         element.style.transform = `translate(${body.position.x - halfSize}px, ${body.position.y - halfSize}px) rotate(${body.angle}rad)`;
         const currentVisualSize = parseFloat(element.style.width);
         if (isNaN(currentVisualSize) || Math.abs(currentVisualSize - size) > 0.1) {
            element.style.width = `${size}px`;
            element.style.height = `${size}px`;
         }
      } else {
        if (element.style.display !== 'none') element.style.display = 'none';
      }
    });
  }

  // Getters (Sin cambios)
  public getCat(catId: string): CatEntity | undefined { return this.cats.get(catId); }
  public getAllCats(): CatEntity[] { return Array.from(this.cats.values()); }

  // removeAllCats (Sin cambios)
  public removeAllCats(): void {
       // console.log(`CatManager: Eliminando ${this.cats.size} gatos...`); // Log opcional
       const catIds = Array.from(this.cats.keys());
       catIds.forEach(catId => this.removeCat(catId));
       if (this.cats.size > 0) { console.warn("CatManager: Faltaron gatos por eliminar."); this.cats.clear(); }
       this.bodyIdToEntityIdMap.clear();
       this.nextCatIdCounter = 0;
       // console.log("CatManager: Todos los gatos eliminados."); // Log opcional
   }

  // growExistingCats (Sin cambios)
  public growExistingCats(amount: number, maxGrowthLevel: number): void {
    let grownCount = 0;
    this.cats.forEach((cat) => {
        if (!cat.value || !cat.physics.body || !this.physicsManager) { return; }
        if (cat.value.rarity === 0 && cat.value.growthLevel < maxGrowthLevel) {
            const currentSize = cat.value.currentSize;
            // Usar el límite actual también aquí para el crecimiento por acierto
            const currentMaxSizeLimit = this.gameManager.getPlayerData().getCurrentMaxSizeLimit();
            let newSize = currentSize + amount;
            newSize = Math.min(newSize, currentMaxSizeLimit); // No exceder el límite actual

            const scaleFactor = newSize / currentSize;
            if (scaleFactor > 1.001) {
                 cat.value.growthLevel++;
                 cat.value.currentSize = newSize;
                 try {
                     const body = cat.physics.body;
                     if (this.physicsManager.getWorld && Matter.Composite.get(this.physicsManager.getWorld(), body.id, 'body')) {
                          Matter.Body.scale(body, scaleFactor, scaleFactor);
                          grownCount++;
                     } else {
                          console.warn(` -> Cuerpo ${cat.id} no encontrado para escalar (crecimiento por acierto), revirtiendo.`);
                          cat.value.growthLevel--;
                          cat.value.currentSize = currentSize;
                     }
                 } catch(error) {
                      console.error(` -> Error escalando cuerpo ${cat.id} (crecimiento por acierto):`, error);
                      cat.value.growthLevel--;
                      cat.value.currentSize = currentSize;
                 }
            }
        }
    });
    // if (grownCount > 0) { console.log(`CatManager: ${grownCount} gatos crecieron por acierto.`); } // Log opcional
  }

} // Fin CatManager
