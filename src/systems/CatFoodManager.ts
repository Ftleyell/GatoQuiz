// src/systems/CatFoodManager.ts

// --- VERIFICAR ESTAS RUTAS DE IMPORTACIÓN ---
import { GameManager } from '../game/GameManager';
import { PlayerData } from '../game/PlayerData';
import { PhysicsManager } from './PhysicsManager';
import { CatManager } from './CatManager';
import { CatEntity } from '../game/entities/CatEntity';
import { AudioManager } from './AudioManager';
// ------------------------------------------
import Matter from 'matter-js';

// --- Constantes ---
const FOOD_PELLET_SIZE = 8;
const FOOD_PELLET_COLOR = '#A0522D'; // Sienna Brown
const FOOD_PELLET_DURATION = 3500;
const FOOD_PELLET_COLLISION_CATEGORY = 0x0008; // Asegúrate que sea único
const CAT_COLLISION_CATEGORY = 0x0002; // Asegúrate que coincida
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
    private isActive: boolean = false;
    private activePellets: Map<string, ActivePellet> = new Map();
    private nextPelletId: number = 0;

    // Referencias UI
    private catFoodButton: HTMLElement | null = null;
    private catFoodBarFill: HTMLElement | null = null;
    private catFoodContainer: HTMLElement | null = null;
    private catContainerElement: HTMLElement | null = null;

    // Listeners
    private clickListener: ((event: MouseEvent | TouchEvent) => void) | null = null;
    private buttonListener: (() => void) | null = null;

    constructor(gameManager: GameManager) {
        console.log("CatFoodManager: Constructor iniciado.");
        this.gameManager = gameManager;
    }

    /** Inicializa el manager obteniendo referencias. */
    public init(): void {
        this.isInitializedSuccessfully = false;
        console.log("CatFoodManager: init");
        try {
            // Obtener referencias (lanzarán error si GameManager no los devuelve)
            this.physicsManager = this.gameManager.getPhysicsManager();
            this.playerData = this.gameManager.getPlayerData();
            this.catManager = this.gameManager.getCatManager();
            this.audioManager = this.gameManager.getAudioManager();

            // Obtener elementos DOM
            this.catContainerElement = document.getElementById('cat-container');
            this.catFoodButton = document.getElementById('cat-food-button');
            this.catFoodBarFill = document.getElementById('cat-food-bar-fill');
            this.catFoodContainer = document.getElementById('cat-food-area');

            // Verificar referencias cruciales
            if (!this.physicsManager) throw new Error("PhysicsManager no disponible.");
            if (!this.playerData) throw new Error("PlayerData no disponible.");
            if (!this.catManager) throw new Error("CatManager no disponible.");
            if (!this.audioManager) throw new Error("AudioManager no disponible.");
            if (!this.catContainerElement) throw new Error("Elemento #cat-container no encontrado.");

            console.log("CatFoodManager: Inicialización exitosa.");
            this.isInitializedSuccessfully = true;

        } catch (error) {
            console.error("CatFoodManager: Error CRÍTICO durante la inicialización:", error);
            this.isEnabled = false;
        }
    }

    /** Habilita la funcionalidad. */
    public enable(): void {
        if (!this.isInitializedSuccessfully) {
            console.error("CatFoodManager: No se puede habilitar, inicialización falló.");
            return;
        }
        if (this.isEnabled) return;
        console.log("CatFoodManager: Habilitando...");
        this.isEnabled = true;

        // Reintentar obtener UI
        if (!this.catFoodButton) this.catFoodButton = document.getElementById('cat-food-button');
        if (!this.catFoodContainer) this.catFoodContainer = document.getElementById('cat-food-area'); // Contenedor barra+label

        if (this.catFoodButton) {
            if (this.buttonListener) this.catFoodButton.removeEventListener('click', this.buttonListener);
            this.buttonListener = this.toggleActive.bind(this);
            this.catFoodButton.addEventListener('click', this.buttonListener);
            // Mostrar contenedor padre de botón y barra
            const uiContainer = document.getElementById('cat-food-ui-container');
             if(uiContainer) uiContainer.classList.remove('hidden');
            console.log(" -> Listener añadido al botón de comida y UI mostrada.");
        } else { console.warn("CatFoodManager: Botón de comida no encontrado al habilitar."); }

         this.gameManager.updateCatFoodUI();
    }

    /** Activa/Desactiva el modo lanzar comida. */
    public toggleActive(): void {
        if (!this.isEnabled || !this.isInitializedSuccessfully) return;
        this.isActive = !this.isActive;
        console.log(`CatFoodManager: Modo activo cambiado a: ${this.isActive}`);
        this.catFoodButton?.classList.toggle('active', this.isActive);
        if (this.isActive) { this.addClickListener(); }
        else { this.removeClickListener(); }
    }

    /** Añade listener de click/touch. */
    private addClickListener(): void {
        if (this.clickListener || !this.isInitializedSuccessfully) return;
        const listenArea = document.body;
        if (!listenArea) return;

        this.clickListener = (event: MouseEvent | TouchEvent) => {
            if (!this.isActive || !this.isEnabled) return; // No detener propagación si no está activo
            event.preventDefault(); // Prevenir scroll/zoom si está activo

            if (!this.playerData) { console.error("ClickListener: PlayerData no disponible."); return; }

            if (this.playerData.currentCatFood > 0) {
                const pos = this.getClickPosition(event, listenArea);
                this.spawnFoodPellet(pos);
                this.applyAttractionForce(pos);
                if (this.playerData.spendCatFoodUnit()) {
                     this.gameManager.updateCatFoodUI();
                     event.stopPropagation(); // Detener SOLO si se lanzó comida
                     console.log("[CatFood Click Listener] Comida lanzada, propagación detenida.");
                } else {
                     console.warn("[CatFood Click Listener] spendCatFoodUnit falló.");
                     this.isActive = false;
                     this.catFoodButton?.classList.remove('active');
                     this.removeClickListener();
                }
            } else {
                console.log("[CatFood Click Listener] Sin comida. Desactivando modo.");
                this.isActive = false;
                this.catFoodButton?.classList.remove('active');
                this.removeClickListener();
            }
        };
        console.log("CatFoodManager: Añadiendo listener de click/touch para comida a document.body.");
        listenArea.addEventListener('mousedown', this.clickListener, { capture: true });
        listenArea.addEventListener('touchstart', this.clickListener, { passive: false, capture: true });
    }

    /** Remueve listener de click/touch. */
    private removeClickListener(): void {
        if (!this.clickListener) return;
        const listenArea = document.body;
        console.log("CatFoodManager: Removiendo listener de click/touch para comida de document.body.");
        listenArea.removeEventListener('mousedown', this.clickListener, { capture: true });
        listenArea.removeEventListener('touchstart', this.clickListener, { capture: true });
        this.clickListener = null;
    }

    /** Obtiene coordenadas del evento. */
    private getClickPosition(event: MouseEvent | TouchEvent, relativeTo: HTMLElement): { x: number, y: number } {
        let clientX = 0, clientY = 0;
        if (event instanceof MouseEvent) { clientX = event.clientX; clientY = event.clientY; }
        else if (event.touches && event.touches[0]) { clientX = event.touches[0].clientX; clientY = event.touches[0].clientY; }
        else if ((event as TouchEvent).changedTouches && (event as TouchEvent).changedTouches[0]) { clientX = (event as TouchEvent).changedTouches[0].clientX; clientY = (event as TouchEvent).changedTouches[0].clientY; }
         return { x: clientX, y: clientY };
    }

    /** Aplica fuerza de atracción a gatos. */
    private applyAttractionForce(targetPos: { x: number, y: number }): void {
        if (!this.catManager) return;
        const cats = this.catManager.getAllCats();
        cats.forEach(cat => {
            if (cat.physics.body && !cat.physics.body.isStatic) {
                const body = cat.physics.body;
                const direction = Matter.Vector.sub(targetPos, body.position);
                const distanceSq = Matter.Vector.magnitudeSquared(direction);
                if (distanceSq > 1 && distanceSq < MAX_ATTRACTION_DISTANCE_SQ) {
                    const distance = Math.sqrt(distanceSq);
                    const forceMagnitude = CAT_ATTRACTION_FORCE * distance;
                    const force = Matter.Vector.mult(Matter.Vector.normalise(direction), forceMagnitude);
                    Matter.Body.applyForce(body, body.position, force);
                }
            }
        });
    }

    /** Crea bolita de comida. */
    public spawnFoodPellet(position: { x: number, y: number }): void {
        console.log(`[SpawnFoodPellet] Intentando en (${position.x.toFixed(0)}, ${position.y.toFixed(0)})`);
        if (!this.isInitializedSuccessfully || !this.physicsManager || !this.catContainerElement) {
            console.error("Cannot spawn pellet: Falló chequeo inicial.");
            console.error(` -> Estado: Initialized=${this.isInitializedSuccessfully}, Physics=${!!this.physicsManager}, Container=${!!this.catContainerElement}`);
            return;
        }

        const pelletId = `food_${this.nextPelletId++}`;
        const body = Matter.Bodies.circle(position.x, position.y, FOOD_PELLET_SIZE / 2, {
            label: 'foodPellet', isSensor: true, density: 0.0001, frictionAir: 0.02,
            collisionFilter: { category: FOOD_PELLET_COLLISION_CATEGORY, mask: CAT_COLLISION_CATEGORY },
            plugin: { pelletId: pelletId }
        });

        try {
            Matter.World.add(this.physicsManager.getWorld(), body);
            // console.log(`[SpawnFoodPellet] Cuerpo físico ${pelletId} añadido.`); // Log opcional
        } catch (error) {
            console.error(`[SpawnFoodPellet] Error añadiendo cuerpo ${pelletId}:`, error); return;
        }

        const element = document.createElement('div');
        element.id = pelletId; element.classList.add('food-pellet');
        element.style.width = `${FOOD_PELLET_SIZE}px`; element.style.height = `${FOOD_PELLET_SIZE}px`;
        element.style.backgroundColor = FOOD_PELLET_COLOR; element.style.borderRadius = '50%';
        element.style.position = 'absolute'; element.style.zIndex = '12'; element.style.pointerEvents = 'none';
        element.style.left = `-9999px`; element.style.top = `-9999px`; // Posicionar fuera

        try {
            this.catContainerElement.appendChild(element);
            // console.log(`[SpawnFoodPellet] Elemento visual ${pelletId} añadido.`); // Log opcional
        } catch (error) {
            console.error(`[SpawnFoodPellet] Error añadiendo elemento ${pelletId} al DOM:`, error);
            try { Matter.World.remove(this.physicsManager.getWorld(), body); } catch (e) {}
            return;
        }

        const pelletData: ActivePellet = { body: body, element: element, creationTime: performance.now(), id: pelletId };
        this.activePellets.set(pelletId, pelletData);
        // console.log(`[SpawnFoodPellet] Pellet ${pelletId} creado.`); // Log opcional
    }

    /** Actualiza bolitas (posición, expiración). */
    public update(deltaTime: number): void {
        if (!this.isEnabled || this.activePellets.size === 0) return;
        const now = performance.now();
        const pelletsToRemove: string[] = [];
        this.activePellets.forEach((pellet) => {
            if (now - pellet.creationTime > FOOD_PELLET_DURATION) {
                pelletsToRemove.push(pellet.id);
            } else {
                if (pellet.element && pellet.body) {
                    const halfSize = FOOD_PELLET_SIZE / 2;
                    pellet.element.style.transform = `translate(${pellet.body.position.x - halfSize}px, ${pellet.body.position.y - halfSize}px)`;
                    pellet.element.style.left = ``; pellet.element.style.top = ``; // Limpiar left/top si usamos transform
                }
            }
        });
        pelletsToRemove.forEach(pelletId => this.removeFoodPellet(pelletId));
    }

    /** Elimina una bolita. */
    public removeFoodPellet(pelletId: string, consumed: boolean = false): void {
        const pellet = this.activePellets.get(pelletId);
        if (pellet) {
            if (this.physicsManager && pellet.body) {
                 try {
                     if (Matter.Composite.get(this.physicsManager.getWorld(), pellet.body.id, 'body')) {
                         Matter.World.remove(this.physicsManager.getWorld(), pellet.body);
                     }
                 } catch (error) { console.warn(`Error removing food pellet body ${pelletId}:`, error); }
            }
            pellet.element?.remove();
            this.activePellets.delete(pelletId);
        }
    }

    /** Procesa colisión gato-comida. */
    public processCatFoodCollision(catBodyId: number, foodBody: Matter.Body): void {
        const pelletId = foodBody.plugin?.pelletId as string | undefined;
        if (!pelletId || !this.activePellets.has(pelletId) || !this.catManager || !this.playerData || !this.audioManager) { return; }
        const catEntityId = this.catManager.bodyIdToEntityIdMap.get(catBodyId);
        if (!catEntityId) return;
        const cat = this.catManager.getCat(catEntityId);
        if (!cat || !cat.value || !cat.physics.body || !cat.render?.element) return;

        // console.log(`Collision detected: Cat ${cat.id} and Food ${pelletId}`); // Log opcional

        const currentSize = cat.value.currentSize;
        const maxSizeLimit = this.playerData.getCurrentMaxSizeLimit();
        let newSize = Math.min(maxSizeLimit, currentSize + GROWTH_PER_PELLET);
        const scaleFactor = newSize / currentSize;
        if (scaleFactor > 1.0001) {
             cat.value.currentSize = newSize;
             try {
                 if (this.physicsManager.getWorld && Matter.Composite.get(this.physicsManager.getWorld(), cat.physics.body.id, 'body')) {
                      Matter.Body.scale(cat.physics.body, scaleFactor, scaleFactor);
                 } else { throw new Error("Body not found"); }
             } catch (error) {
                  console.error(`Error scaling cat ${cat.id} after eating food:`, error);
                  cat.value.currentSize = currentSize;
             }
             // console.log(` -> Cat ${cat.id} ate food ${pelletId} and grew to ${newSize.toFixed(1)}px`); // Log opcional
        } else {
             // console.log(` -> Cat ${cat.id} ate food ${pelletId} but reached size limit or growth too small.`); // Log opcional
        }
        this.audioManager.playSound('eat');
        this.removeFoodPellet(pelletId, true);
    }

    /** Limpia listeners y bolitas. */
    public destroy(): void {
        console.log("CatFoodManager: destroy");
        this.removeClickListener();
        if (this.buttonListener && this.catFoodButton) {
            this.catFoodButton.removeEventListener('click', this.buttonListener);
        }
        this.activePellets.forEach(pellet => this.removeFoodPellet(pellet.id));
        this.activePellets.clear();
    }

} // Fin clase CatFoodManager
