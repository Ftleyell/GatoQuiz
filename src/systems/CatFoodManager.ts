// src/systems/CatFoodManager.ts

import { GameManager } from '../game/GameManager';
import { PlayerData } from '../game/PlayerData';
import { PhysicsManager } from './PhysicsManager';
import { CatManager } from './CatManager';
import { AudioManager } from './AudioManager';
import Matter from 'matter-js';

// --- Constantes ---
const FOOD_PELLET_SIZE = 8;
const FOOD_PELLET_DURATION = 3500; // ms
const FOOD_PELLET_COLLISION_CATEGORY = 0x0008;
const CAT_COLLISION_CATEGORY = 0x0002;
const CAT_ATTRACTION_FORCE = 0.0004;
const MAX_ATTRACTION_DISTANCE_SQ = 500 * 500;
const GROWTH_PER_PELLET = 1;
// ------------------

interface ActivePellet {
    body: Matter.Body;
    element: HTMLElement;
    creationTime: number;
    id: string;
}

export class CatFoodManager {
    private gameManager: GameManager;
    private physicsManager: PhysicsManager | null = null;
    private playerData: PlayerData | null = null;
    private catManager: CatManager | null = null;
    private audioManager: AudioManager | null = null;

    private isInitializedSuccessfully: boolean = false;
    private isEnabled: boolean = false;
    public isActive: boolean = false;
    private activePellets: Map<string, ActivePellet> = new Map();
    private nextPelletId: number = 0;

    // Referencias UI
    private catFoodButton: HTMLElement | null = null;
    private catFoodContainer: HTMLElement | null = null;
    private catContainerElement: HTMLElement | null = null;

    // Listeners
    private clickListener: ((event: MouseEvent | TouchEvent) => void) | null = null;
    private buttonListenerInfo: { click: (e: MouseEvent) => void, touchstart?: (e: TouchEvent) => void } | null = null;
    private lastInteractionTime: number = 0;
    private readonly DEBOUNCE_THRESHOLD = 300;

    constructor(gameManager: GameManager) {
        console.log("CatFoodManager: Constructor iniciado.");
        this.gameManager = gameManager;
    }

    public init(): void {
        this.isInitializedSuccessfully = false;
        console.log("CatFoodManager: init");
        try {
            this.physicsManager = this.gameManager.getPhysicsManager();
            this.playerData = this.gameManager.getPlayerData();
            this.catManager = this.gameManager.getCatManager();
            this.audioManager = this.gameManager.getAudioManager();
            this.catContainerElement = document.getElementById('cat-container');
            this.catFoodButton = document.getElementById('cat-food-button');
            this.catFoodContainer = document.getElementById('cat-food-ui-container');

            if (!this.physicsManager) throw new Error("PhysicsManager no disponible.");
            if (!this.playerData) throw new Error("PlayerData no disponible.");
            if (!this.catManager) throw new Error("CatManager no disponible.");
            if (!this.audioManager) throw new Error("AudioManager no disponible.");
            if (!this.catContainerElement) throw new Error("Elemento #cat-container no encontrado.");
            if (!this.catFoodButton) throw new Error("Elemento #cat-food-button no encontrado.");
            if (!this.catFoodContainer) throw new Error("Elemento #cat-food-ui-container no encontrado.");

            console.log("CatFoodManager: Inicialización exitosa.");
            this.isInitializedSuccessfully = true;

        } catch (error) {
            console.error("CatFoodManager: Error CRÍTICO durante la inicialización:", error);
            this.isEnabled = false;
        }
    }

    public enable(): void {
        if (!this.isInitializedSuccessfully) {
            console.error("CatFoodManager: No se puede habilitar, inicialización falló.");
            return;
        }
        if (this.isEnabled) return;
        console.log("CatFoodManager: Habilitando...");
        this.isEnabled = true;

        if (!this.catFoodButton) this.catFoodButton = document.getElementById('cat-food-button');
        if (!this.catFoodContainer) this.catFoodContainer = document.getElementById('cat-food-ui-container');

        if (this.catFoodButton) {
            this.removeButtonListener();

            const foodButtonHandler = (event: MouseEvent | TouchEvent) => {
                const now = Date.now();
                if (now - this.lastInteractionTime < this.DEBOUNCE_THRESHOLD) {
                    return;
                }
                this.lastInteractionTime = now;

                if (event.type === 'touchstart') {
                    event.preventDefault();
                }
                this.gameManager.activateCatFood();
            };

            this.buttonListenerInfo = { click: foodButtonHandler, touchstart: foodButtonHandler };
            this.catFoodButton.addEventListener('click', this.buttonListenerInfo.click);
            this.catFoodButton.addEventListener('touchstart', this.buttonListenerInfo.touchstart!, { passive: false });
            console.log(" -> Listeners (click, touchstart) con debounce añadidos al botón de comida.");
        } else {
            console.warn("CatFoodManager: Botón de comida no encontrado al habilitar, listener no añadido.");
        }
    }

    private removeButtonListener(): void {
        if (this.buttonListenerInfo && this.catFoodButton) {
            this.catFoodButton.removeEventListener('click', this.buttonListenerInfo.click);
            if (this.buttonListenerInfo.touchstart) {
                this.catFoodButton.removeEventListener('touchstart', this.buttonListenerInfo.touchstart);
            }
        }
        this.buttonListenerInfo = null;
    }

    /**
     * Cambia el estado activo/inactivo de la herramienta de comida.
     * @param forceState - (Opcional) Booleano para forzar un estado específico.
     */
    public toggleActive(forceState?: boolean): void {
        if (!this.isEnabled || !this.isInitializedSuccessfully) return;

        const newState = (forceState !== undefined) ? forceState : !this.isActive;

        // Previene activación si no hay comida (pero permite desactivar si estaba activo)
        if (newState === true && (!this.isEnabled || (this.playerData && this.playerData.currentCatFood <= 0))) {
             if (this.isActive) { // Solo desactivar si estaba activo
                 this.isActive = false;
                 this.updateActiveVisuals(); // Actualiza visuales específicos de este manager (si los hay)
                 this.removeClickListener(); // Quita listener para soltar comida
                 this.gameManager.updateToolButtonStates(); // Notifica a GameManager (actualización inmediata)
             }
             return; // Sale porque no se puede activar
        }

        // Si el estado no cambia, no hace nada
        if (newState === this.isActive) return;

        // Actualiza el estado interno
        this.isActive = newState;
        // Actualiza visuales específicos de este manager (si los hay)
        this.updateActiveVisuals();
        // Notifica a GameManager para que actualice TODOS los botones (actualización inmediata)
        this.gameManager.updateToolButtonStates();

        // --- LLAMADA EXTRA CON setTimeout ELIMINADA ---

        // Añade o remueve el listener para soltar comida
        if (this.isActive) {
            this.addClickListener();
        } else {
            this.removeClickListener();
        }
    }

    private updateActiveVisuals(): void {
         // Ya no maneja la clase 'active' del botón, GameManager lo hace.
         console.log(`[CatFoodManager] updateActiveVisuals (isActive: ${this.isActive}) - No cambia clases directamente.`);
    }

    private addClickListener(): void {
        if (this.clickListener || !this.isInitializedSuccessfully) return;
        const listenArea = document.body; if (!listenArea) return;

        this.clickListener = (event: MouseEvent | TouchEvent) => {
            const targetElement = event.target as HTMLElement;
            // Ignora clics en CUALQUIER tool-button o botón de tienda
            if (targetElement.closest('tool-button, #shop-button')) return;
            if (!this.isActive || !this.isEnabled) return;
            event.preventDefault();

            if (!this.playerData) { console.error("ClickListener: PlayerData no disponible."); return; }
            if (this.playerData.currentCatFood > 0) {
                const pos = this.getClickPosition(event);
                this.spawnFoodPellet(pos);
                this.applyAttractionForce(pos);
                if (this.playerData.spendCatFoodUnit()) {
                     this.gameManager.updateCatFoodUI(); // Llama a updateToolButtonStates
                } else {
                     console.warn("[CatFood Interaction Listener] spendCatFoodUnit falló.");
                     this.toggleActive(false); // Llama a updateToolButtonStates
                }
            } else {
                this.toggleActive(false); // Llama a updateToolButtonStates
            }
        };
        listenArea.addEventListener('mousedown', this.clickListener, { capture: true });
        listenArea.addEventListener('touchstart', this.clickListener, { passive: false, capture: true });
    }

    private removeClickListener(): void {
        if (!this.clickListener) return;
        const listenArea = document.body;
        listenArea.removeEventListener('mousedown', this.clickListener, { capture: true });
        listenArea.removeEventListener('touchstart', this.clickListener, { capture: true });
        this.clickListener = null;
    }

    private getClickPosition(event: MouseEvent | TouchEvent): { x: number, y: number } {
        let clientX = 0, clientY = 0;
        if (event instanceof MouseEvent) { clientX = event.clientX; clientY = event.clientY; }
        else if (event.touches && event.touches[0]) { clientX = event.touches[0].clientX; clientY = event.touches[0].clientY; }
        else if ((event as TouchEvent).changedTouches && (event as TouchEvent).changedTouches[0]) { clientX = (event as TouchEvent).changedTouches[0].clientX; clientY = (event as TouchEvent).changedTouches[0].clientY; }
        return { x: clientX, y: clientY };
    }

    private applyAttractionForce(targetPos: { x: number, y: number }): void {
        if (!this.catManager || !this.physicsManager) return;
        const cats = this.catManager.getAllCats();
        const world = this.physicsManager.getWorld();
        cats.forEach(cat => {
            if (cat.physics.body && !cat.physics.body.isStatic && Matter.Composite.get(world, cat.physics.body.id, 'body')) {
                const body = cat.physics.body;
                const direction = Matter.Vector.sub(targetPos, body.position);
                const distanceSq = Matter.Vector.magnitudeSquared(direction);
                if (distanceSq > 1 && distanceSq < MAX_ATTRACTION_DISTANCE_SQ) {
                    const distance = Math.sqrt(distanceSq);
                    const forceMagnitude = CAT_ATTRACTION_FORCE * distance;
                    const force = Matter.Vector.mult(Matter.Vector.normalise(direction), forceMagnitude);
                    try { Matter.Body.applyForce(body, body.position, force); } catch (error) { /* Ignorar */ }
                }
            }
        });
    }

    public spawnFoodPellet(position: { x: number, y: number }): void {
        if (!this.isInitializedSuccessfully || !this.physicsManager || !this.catContainerElement) { return; }
        const pelletId = `food_${this.nextPelletId++}`;
        const body = Matter.Bodies.circle(position.x, position.y, FOOD_PELLET_SIZE / 2, {
            label: 'foodPellet', isSensor: true, density: 0.0001, frictionAir: 0.02,
            collisionFilter: { category: FOOD_PELLET_COLLISION_CATEGORY, mask: CAT_COLLISION_CATEGORY },
            plugin: { pelletId: pelletId }
        });
        try { Matter.World.add(this.physicsManager.getWorld(), body); } catch (error) { return; }
        const element = document.createElement('div');
        element.id = pelletId; element.classList.add('food-pellet');
        element.style.width = `${FOOD_PELLET_SIZE}px`; element.style.height = `${FOOD_PELLET_SIZE}px`;
        element.style.left = `-9999px`; element.style.top = `-9999px`;
        try { this.catContainerElement.appendChild(element); } catch (error) { try { Matter.World.remove(this.physicsManager.getWorld(), body); } catch (e) {} return; }
        const pelletData: ActivePellet = { body: body, element: element, creationTime: performance.now(), id: pelletId };
        this.activePellets.set(pelletId, pelletData);
    }

    public update(_deltaTime: number): void {
        if (!this.isEnabled || !this.isInitializedSuccessfully || this.activePellets.size === 0) return;
        const now = performance.now();
        const pelletsToRemove: string[] = [];
        this.activePellets.forEach((pellet) => {
            if (now - pellet.creationTime > FOOD_PELLET_DURATION) {
                pelletsToRemove.push(pellet.id);
            } else if (pellet.element && pellet.body) {
                const halfSize = FOOD_PELLET_SIZE / 2;
                pellet.element.style.transform = `translate(${pellet.body.position.x - halfSize}px, ${pellet.body.position.y - halfSize}px)`;
                if (pellet.element.style.left !== '') { pellet.element.style.left = ''; pellet.element.style.top = ''; }
            }
        });
        pelletsToRemove.forEach(pelletId => this.removeFoodPellet(pelletId));
    }

    public removeFoodPellet(pelletId: string, _consumed: boolean = false): void {
        const pellet = this.activePellets.get(pelletId);
        if (pellet) {
            if (this.physicsManager && pellet.body) {
                 try { if (Matter.Composite.get(this.physicsManager.getWorld(), pellet.body.id, 'body')) { Matter.World.remove(this.physicsManager.getWorld(), pellet.body); } } catch (error) {}
            }
            pellet.element?.remove();
            this.activePellets.delete(pelletId);
        }
    }

    public processCatFoodCollision(catBodyId: number, foodBody: Matter.Body): void {
        const pelletId = foodBody.plugin?.pelletId as string | undefined;
        if (!pelletId || !this.activePellets.has(pelletId) || !this.catManager || !this.playerData || !this.audioManager || !this.physicsManager) { return; }
        const catEntityId = this.catManager.bodyIdToEntityIdMap.get(catBodyId); if (!catEntityId) { return; }
        const cat = this.catManager.getCat(catEntityId); if (!cat || !cat.value || !cat.physics.body || !cat.render?.element) { return; }

        const currentSize = cat.value.currentSize;
        const maxSizeLimit = this.playerData.getCurrentMaxSizeLimit();
        let newSize = Math.min(maxSizeLimit, currentSize + GROWTH_PER_PELLET);
        const scaleFactor = newSize / currentSize;

        if (scaleFactor > 1.0001) {
             cat.value.currentSize = newSize;
             try { if (Matter.Composite.get(this.physicsManager.getWorld(), cat.physics.body.id, 'body')) { Matter.Body.scale(cat.physics.body, scaleFactor, scaleFactor); } else { throw new Error("Body not found"); } } catch (error) { cat.value.currentSize = currentSize; }
        }
        this.audioManager.playSound('eat');
        this.removeFoodPellet(pelletId, true);
    }

    public destroy(): void {
        console.log("CatFoodManager: destroy");
        this.removeClickListener();
        this.removeButtonListener();
        const currentPelletIds = Array.from(this.activePellets.keys());
        currentPelletIds.forEach(pelletId => this.removeFoodPellet(pelletId));
        this.activePellets.clear();
        this.isEnabled = false;
        this.isActive = false;
    }

} // Fin clase CatFoodManager
