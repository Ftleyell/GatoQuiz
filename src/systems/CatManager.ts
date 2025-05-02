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
const SIZE_SIMILARITY_THRESHOLD = 1.02;
const RARITY_GLOW_MAP: { [key: number]: string | null } = {
    0: null, 1: 'glow-gray', 2: 'glow-green',
    3: 'glow-blue', 4: 'glow-violet', 5: 'glow-orange',
};
const SIZE_INCREMENT_PER_CORRECT = 1;
const MAX_CORRECT_ANSWER_GROWTH = 4;

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

  // MODIFICADO: Ajusta la máscara de colisión del gato
  public addCat(templateId: string, initialPosition?: { x: number; y: number }): CatEntity | null {
    if (!this.gameManager) { console.error("CatManager: GameManager no disponible."); return null; }
    const currentCatCount = this.cats.size;
    const maxAllowed = this.gameManager.getPlayerData().getMaxCatsAllowed();
    if (currentCatCount >= maxAllowed) {
        // console.log(`Max cats limit reached (${currentCatCount}/${maxAllowed}).`); // Log opcional
        return null;
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

    // *** ¡CAMBIO IMPORTANTE AQUÍ! ***
    const bodyOptions: Matter.IBodyDefinition = {
        ...defaultPhysics,
        ...(template.physicsOptions ?? {}),
        label: 'cat',
        collisionFilter: {
            category: CAT_COLLISION_CATEGORY, // El gato pertenece a la categoría GATO
            // El gato PUEDE COLISIONAR con: PAREDES, OTROS GATOS, TINTA y ¡COMIDA!
            mask: WALL_COLLISION_CATEGORY | CAT_COLLISION_CATEGORY | INK_COLLISION_CATEGORY | FOOD_PELLET_COLLISION_CATEGORY
        },
    };
    // *******************************

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
    const valueComp = new ValueComponent(rarity, scoreValue, initialSize, 0);
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
    // ... (sin cambios) ...
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
    // ... (sin cambios) ...
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
          } else { /* Ignorar */ }
      } else { /* Ignorar */ }
  }

  private handleCatVsCatCollision(draggerCat: CatEntity, targetCat: CatEntity): void {
    // ... (sin cambios) ...
      if (!draggerCat.physics.body || !draggerCat.value || !targetCat.physics.body || !targetCat.value || !this.gameManager) { return; }
      if (draggerCat.id === targetCat.id) return;
      const draggerSize = draggerCat.value.currentSize;
      const draggerRarity = draggerCat.value.rarity;
      const targetSize = targetCat.value.currentSize;
      const targetRarity = targetCat.value.rarity;
      const currentMaxSizeLimit = this.gameManager.getPlayerData().getCurrentMaxSizeLimit();
      const isDraggerAtLimit = draggerSize >= currentMaxSizeLimit;
      let canEat = false; let stealTier = false; let eatForGrowth = false;
      if (draggerSize > targetSize * SIZE_SIMILARITY_THRESHOLD) {
          if (!isDraggerAtLimit) {
              canEat = true; eatForGrowth = true; stealTier = draggerRarity < targetRarity;
          } else {
              if (draggerRarity < targetRarity) {
                  canEat = true; eatForGrowth = false; stealTier = true;
              }
          }
      }
      if (canEat) { this.performEat(draggerCat, targetCat, stealTier, eatForGrowth); }
  }

  private performEat(eater: CatEntity, eaten: CatEntity, stealTier: boolean, applyGrowth: boolean): void {
    // ... (sin cambios) ...
      if (!eater.physics.body || !eater.value || !eater.render.element || !eaten.value ) { return; }
      const eatenId = eaten.id; const eatenRarity = eaten.value.rarity;
      this.removeCat(eatenId);
      if (applyGrowth) {
          const currentSize = eater.value.currentSize;
          const currentMaxSizeLimit = this.gameManager.getPlayerData().getCurrentMaxSizeLimit();
          let newSize = Math.min(currentMaxSizeLimit, currentSize * CAT_GROWTH_FACTOR);
          const scaleFactor = newSize / currentSize;
          if (scaleFactor > 1.001) {
              eater.value.currentSize = newSize;
              try {
                  if (this.physicsManager.getWorld && Matter.Composite.get(this.physicsManager.getWorld(), eater.physics.body.id, 'body')) {
                       Matter.Body.scale(eater.physics.body, scaleFactor, scaleFactor);
                  } else { throw new Error("Body not found"); }
              } catch (error) { console.error(`Error scaling body ${eater.id}:`, error); eater.value.currentSize = currentSize; }
              eater.render.element.style.width = `${newSize}px`; eater.render.element.style.height = `${newSize}px`;
          }
      }
      if (stealTier && eatenRarity > eater.value.rarity) {
          const currentEaterGlow = RARITY_GLOW_MAP[eater.value.rarity];
          if (currentEaterGlow && eater.render.element) { eater.render.element.classList.remove(currentEaterGlow); }
          eater.value.rarity = eatenRarity;
          const newGlowClass = RARITY_GLOW_MAP[eatenRarity];
          if (newGlowClass && eater.render.element) { eater.render.element.classList.add(newGlowClass); }
      }
      try { this.audioManager.playSound('eat'); } catch (e) { console.error("Error playing 'eat' sound:", e)}
  }

  public updateCats(deltaTime: number): void {
    // ... (sin cambios) ...
    this.cats.forEach((cat) => {
      const body = cat.physics.body; const element = cat.render.element; const value = cat.value;
      if (!body || !element || !value) return;
      const size = value.currentSize;
      if (cat.render.isVisible) {
         if (element.style.display === 'none') element.style.display = '';
         const halfSize = size / 2;
         element.style.transform = `translate(${body.position.x - halfSize}px, ${body.position.y - halfSize}px) rotate(${body.angle}rad)`;
         const currentVisualSize = parseFloat(element.style.width);
         if (isNaN(currentVisualSize) || Math.abs(currentVisualSize - size) > 0.1) {
            element.style.width = `${size}px`; element.style.height = `${size}px`;
         }
      } else { if (element.style.display !== 'none') element.style.display = 'none'; }
    });
  }

  public getCat(catId: string): CatEntity | undefined { return this.cats.get(catId); }
  public getAllCats(): CatEntity[] { return Array.from(this.cats.values()); }

  public removeAllCats(): void {
    // ... (sin cambios) ...
       const catIds = Array.from(this.cats.keys());
       catIds.forEach(catId => this.removeCat(catId));
       if (this.cats.size > 0) { console.warn("CatManager: Faltaron gatos por eliminar."); this.cats.clear(); }
       this.bodyIdToEntityIdMap.clear();
       this.nextCatIdCounter = 0;
   }

  public growExistingCats(amount: number, maxGrowthLevel: number): void {
    // ... (sin cambios) ...
    let grownCount = 0;
    this.cats.forEach((cat) => {
        if (!cat.value || !cat.physics.body || !this.physicsManager || !this.gameManager) { return; }
        if (cat.value.rarity === 0 && cat.value.growthLevel < maxGrowthLevel) {
            const currentSize = cat.value.currentSize;
            const currentMaxSizeLimit = this.gameManager.getPlayerData().getCurrentMaxSizeLimit();
            let newSize = Math.min(currentMaxSizeLimit, currentSize + amount);
            const scaleFactor = newSize / currentSize;
            if (scaleFactor > 1.0001) {
                 cat.value.growthLevel++; cat.value.currentSize = newSize;
                 try {
                     const body = cat.physics.body;
                     if (this.physicsManager.getWorld && Matter.Composite.get(this.physicsManager.getWorld(), body.id, 'body')) {
                          Matter.Body.scale(body, scaleFactor, scaleFactor); grownCount++;
                     } else { throw new Error("Body not found"); }
                 } catch(error) {
                      console.error(` -> Error escalando gato ${cat.id} (crecimiento por acierto):`, error);
                      cat.value.growthLevel--; cat.value.currentSize = currentSize;
                 }
            }
        }
    });
  }

} // Fin CatManager
