// src/systems/CatFoodManager.ts

// --- VERIFICAR ESTAS RUTAS DE IMPORTACIÓN ---
import { GameManager } from '../game/GameManager';
import { PlayerData } from '../game/PlayerData';
import { PhysicsManager } from './PhysicsManager';
import { CatManager } from './CatManager';
// ELIMINADO: import { CatEntity } from '../game/entities/CatEntity'; // No se usaba
import { AudioManager } from './AudioManager';
// ------------------------------------------
import Matter from 'matter-js';

// --- Constantes ---
const FOOD_PELLET_SIZE = 8;
// ELIMINADO: const FOOD_PELLET_COLOR = '#A0522D'; // Estilo manejado por CSS
const FOOD_PELLET_DURATION = 3500; // ms
const FOOD_PELLET_COLLISION_CATEGORY = 0x0008; // Asegúrate que sea único
const CAT_COLLISION_CATEGORY = 0x0002; // Asegúrate que coincida
const CAT_ATTRACTION_FORCE = 0.0004; // Increased attraction
const MAX_ATTRACTION_DISTANCE_SQ = 500 * 500; // Max distance cats are attracted from
const GROWTH_PER_PELLET = 1; // How much size a cat gains per pellet
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
    public isActive: boolean = false; // Hacer público para que GameManager pueda leerlo
    private activePellets: Map<string, ActivePellet> = new Map();
    private nextPelletId: number = 0;

    // Referencias UI
    private catFoodButton: HTMLElement | null = null;
    // ELIMINADO: private catFoodBarFill: HTMLElement | null = null; // UIManager obtiene por ID
    private catFoodContainer: HTMLElement | null = null; // Container for bar+label
    private catContainerElement: HTMLElement | null = null; // Container where pellets are added

    // Listeners
    private clickListener: ((event: MouseEvent | TouchEvent) => void) | null = null;
    // private buttonListener: (() => void) | null = null; // Ya no se usa directamente

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
            // Ya no necesitamos guardar catFoodBarFill aquí
            this.catFoodContainer = document.getElementById('cat-food-ui-container'); // ID del contenedor padre

            // Verificar referencias cruciales
            if (!this.physicsManager) throw new Error("PhysicsManager no disponible.");
            if (!this.playerData) throw new Error("PlayerData no disponible.");
            if (!this.catManager) throw new Error("CatManager no disponible.");
            if (!this.audioManager) throw new Error("AudioManager no disponible.");
            if (!this.catContainerElement) throw new Error("Elemento #cat-container no encontrado.");
            // catFoodButton y catFoodContainer son necesarios para la interacción/visibilidad
            if (!this.catFoodButton) throw new Error("Elemento #cat-food-button no encontrado.");
            if (!this.catFoodContainer) throw new Error("Elemento #cat-food-ui-container no encontrado.");


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

        // Reintentar obtener UI (aunque init ya debería haber fallado si no estaban)
        if (!this.catFoodButton) this.catFoodButton = document.getElementById('cat-food-button');
        if (!this.catFoodContainer) this.catFoodContainer = document.getElementById('cat-food-ui-container');

        if (this.catFoodButton && this.catFoodContainer) {
            // *** CAMBIO: El listener ahora llama a GameManager ***
            const foodButtonHandler = () => this.gameManager.activateCatFood();
            // Limpiar listener anterior si existiera (aunque no debería si destroy funciona)
            // if (this.buttonListener) this.catFoodButton.removeEventListener('click', this.buttonListener);
            // this.buttonListener = foodButtonHandler; // Guardar referencia si es necesario limpiarlo explícitamente en destroy
            this.catFoodButton.addEventListener('click', foodButtonHandler);
            // *** FIN CAMBIO ***

            // Mostrar contenedor padre de botón y barra
            this.catFoodContainer.classList.remove('hidden');
            console.log(" -> Listener añadido al botón de comida (llama a GameManager) y UI mostrada.");
        } else { console.warn("CatFoodManager: Botón de comida o contenedor UI no encontrado al habilitar."); }

         this.gameManager.updateCatFoodUI(); // Actualizar barra inicial
    }

    /**
     * Activa/Desactiva el modo lanzar comida.
     * @param forceState - (Opcional) Booleano para forzar el estado (true=activo, false=inactivo). Si no se provee, alterna.
     */
    public toggleActive(forceState?: boolean): void {
        if (!this.isEnabled || !this.isInitializedSuccessfully) return;

        const newState = (forceState !== undefined) ? forceState : !this.isActive;
        const oldState = this.isActive; // Guardar estado anterior para log

        // Log punto de entrada y estado forzado
        console.log(`[CatFoodManager.toggleActive] Called. Current state: ${oldState}, Forced state: ${forceState}, New target state: ${newState}`); // LOG A

        // Si se intenta activar pero no está habilitado o no hay comida, no hacer nada
        if (newState === true && (!this.isEnabled || (this.playerData && this.playerData.currentCatFood <= 0))) {
             console.log(`[CatFoodManager.toggleActive] Cannot activate. Enabled: ${this.isEnabled}, Food: ${this.playerData?.currentCatFood}`); // LOG B
             // Asegurarse que esté visualmente desactivado si se intentó forzar a true
             if (this.isActive) {
                 this.isActive = false;
                 this.updateActiveVisuals();
                 this.removeClickListener(); // Asegurar que el listener se quite si se fuerza a false
                 console.log(`[CatFoodManager.toggleActive] Forced visual deactivation due to activation constraints.`); // LOG C
             }
             return;
        }

        // Si el estado no cambia, no hacer nada más
        if (newState === this.isActive) {
            console.log(`[CatFoodManager.toggleActive] State already ${newState}. No change needed.`); // LOG D
            return;
        }

        // Actualizar estado
        this.isActive = newState;
        console.log(`[CatFoodManager.toggleActive] State CHANGED from ${oldState} to ${this.isActive}`); // LOG E

        this.updateActiveVisuals(); // Actualiza clase CSS del botón

        // Añadir o quitar listener de click/touch
        if (this.isActive) {
            console.log(`[CatFoodManager.toggleActive] Adding click listener.`); // LOG F
            this.addClickListener();
        } else {
            console.log(`[CatFoodManager.toggleActive] Removing click listener.`); // LOG G
            this.removeClickListener();
        }
    }

    /** Actualiza la clase 'active' del botón. */
    private updateActiveVisuals(): void {
         if (this.catFoodButton) {
             const wasActive = this.catFoodButton.classList.contains('active');
             this.catFoodButton.classList.toggle('active', this.isActive);
             const isNowActive = this.catFoodButton.classList.contains('active');
             // Log del intento y resultado de la actualización visual
             console.log(`[CatFoodManager.updateActiveVisuals] Setting button active class to ${this.isActive}. Was active: ${wasActive}, Is now active: ${isNowActive}`); // LOG H
         } else {
             console.warn("[CatFoodManager.updateActiveVisuals] catFoodButton not found."); // LOG I
         }
    }


    /** Añade listener de click/touch. */
    private addClickListener(): void {
        if (this.clickListener || !this.isInitializedSuccessfully) return;
        // Escuchar en el body para capturar clicks en cualquier lugar
        const listenArea = document.body;
        if (!listenArea) return;

        this.clickListener = (event: MouseEvent | TouchEvent) => {
            // Importante: Verificar si el click fue EN el botón de comida o pincel
            // para evitar que se desactive inmediatamente después de activarlo.
            const targetElement = event.target as HTMLElement;
            if (targetElement.closest('#cat-food-button') || targetElement.closest('#toggle-brush-button')) {
                console.log("CatFood Click Listener: Click en botón de control ignorado para spawn.");
                return; // No spawnees comida si se hizo click en los propios botones
            }

            if (!this.isActive || !this.isEnabled) return; // Salir si no está activo/habilitado

            event.preventDefault(); // Prevenir scroll/zoom si está activo y no fue en un botón

            if (!this.playerData) { console.error("ClickListener: PlayerData no disponible."); return; }

            if (this.playerData.currentCatFood > 0) {
                const pos = this.getClickPosition(event, listenArea);
                this.spawnFoodPellet(pos);
                this.applyAttractionForce(pos);
                if (this.playerData.spendCatFoodUnit()) {
                     this.gameManager.updateCatFoodUI(); // Actualizar barra
                     // event.stopPropagation(); // Detener SOLO si se lanzó comida - OJO: puede interferir con otros listeners
                     console.log("[CatFood Click Listener] Comida lanzada.");
                } else {
                     // Esto no debería pasar si el chequeo inicial de currentCatFood > 0 funciona
                     console.warn("[CatFood Click Listener] spendCatFoodUnit falló inesperadamente.");
                     this.toggleActive(false); // Desactivar si falla el gasto
                }
            } else {
                // Se quedó sin comida mientras estaba activo
                console.log("[CatFood Click Listener] Sin comida. Desactivando modo.");
                this.toggleActive(false); // Desactivar automáticamente
            }
        };
        console.log("CatFoodManager: Añadiendo listener de click/touch para comida a document.body.");
        // Usar capture: true para intentar capturar el evento antes que otros listeners (como el del canvas de dibujo)
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
    // Corrección: Añadir guion bajo a '_relativeTo'
    private getClickPosition(event: MouseEvent | TouchEvent, _relativeTo: HTMLElement): { x: number, y: number } {
        let clientX = 0, clientY = 0;
        // Handle both mouse and touch events
        if (event instanceof MouseEvent) {
            clientX = event.clientX;
            clientY = event.clientY;
        } else if (event.touches && event.touches[0]) {
            clientX = event.touches[0].clientX;
            clientY = event.touches[0].clientY;
        } else if ((event as TouchEvent).changedTouches && (event as TouchEvent).changedTouches[0]) {
             // Fallback for touchend/touchcancel if needed, though usually called on start/move
            clientX = (event as TouchEvent).changedTouches[0].clientX;
            clientY = (event as TouchEvent).changedTouches[0].clientY;
        }
         // We usually want coordinates relative to the viewport for physics, not a specific element
         return { x: clientX, y: clientY };
    }

    /** Aplica fuerza de atracción a gatos. */
    private applyAttractionForce(targetPos: { x: number, y: number }): void {
        if (!this.catManager || !this.physicsManager) return;
        const cats = this.catManager.getAllCats();
        const world = this.physicsManager.getWorld();
        cats.forEach(cat => {
            if (cat.physics.body && !cat.physics.body.isStatic && Matter.Composite.get(world, cat.physics.body.id, 'body')) {
                const body = cat.physics.body;
                const direction = Matter.Vector.sub(targetPos, body.position);
                const distanceSq = Matter.Vector.magnitudeSquared(direction);
                // Apply force only if within range and not too close
                if (distanceSq > 1 && distanceSq < MAX_ATTRACTION_DISTANCE_SQ) {
                    const distance = Math.sqrt(distanceSq);
                    // Force proportional to distance (stronger further away within range) or inverse square? Let's try proportional first.
                    const forceMagnitude = CAT_ATTRACTION_FORCE * distance;
                    const force = Matter.Vector.mult(Matter.Vector.normalise(direction), forceMagnitude);
                    try {
                         Matter.Body.applyForce(body, body.position, force);
                    } catch (error) {
                         console.warn(`Error applying attraction force to cat ${cat.id}:`, error);
                    }
                }
            }
        });
    }

    /** Crea bolita de comida. */
    public spawnFoodPellet(position: { x: number, y: number }): void {
        // console.log(`[SpawnFoodPellet] Intentando en (${position.x.toFixed(0)}, ${position.y.toFixed(0)})`);
        if (!this.isInitializedSuccessfully || !this.physicsManager || !this.catContainerElement) {
            console.error("Cannot spawn pellet: Falló chequeo inicial.");
            console.error(` -> Estado: Initialized=${this.isInitializedSuccessfully}, Physics=${!!this.physicsManager}, Container=${!!this.catContainerElement}`);
            return;
        }

        const pelletId = `food_${this.nextPelletId++}`;
        const body = Matter.Bodies.circle(position.x, position.y, FOOD_PELLET_SIZE / 2, {
            label: 'foodPellet',
            isSensor: true, // Detect collision but don't cause physical reaction
            density: 0.0001,
            frictionAir: 0.02,
            collisionFilter: {
                category: FOOD_PELLET_COLLISION_CATEGORY,
                mask: CAT_COLLISION_CATEGORY // Only check collisions with cats
            },
            plugin: { pelletId: pelletId } // Store ID for easy retrieval in collision handler
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
        // Styles are in CSS now
        // element.style.backgroundColor = FOOD_PELLET_COLOR; element.style.borderRadius = '50%';
        // element.style.position = 'absolute'; element.style.zIndex = '12'; element.style.pointerEvents = 'none';
        element.style.left = `-9999px`; element.style.top = `-9999px`; // Position off-screen initially

        try {
            this.catContainerElement.appendChild(element);
            // console.log(`[SpawnFoodPellet] Elemento visual ${pelletId} añadido.`); // Log opcional
        } catch (error) {
            console.error(`[SpawnFoodPellet] Error añadiendo elemento ${pelletId} al DOM:`, error);
            // Clean up physics body if DOM insertion fails
            try { Matter.World.remove(this.physicsManager.getWorld(), body); } catch (e) {}
            return;
        }

        const pelletData: ActivePellet = { body: body, element: element, creationTime: performance.now(), id: pelletId };
        this.activePellets.set(pelletId, pelletData);
        // console.log(`[SpawnFoodPellet] Pellet ${pelletId} creado.`); // Log opcional
    }

    /** Actualiza bolitas (posición, expiración). */
    // Corrección: Añadir guion bajo a 'deltaTime'
    public update(_deltaTime: number): void {
        if (!this.isEnabled || !this.isInitializedSuccessfully || this.activePellets.size === 0) return;

        const now = performance.now();
        const pelletsToRemove: string[] = [];

        this.activePellets.forEach((pellet) => {
            // Check for expiration
            if (now - pellet.creationTime > FOOD_PELLET_DURATION) {
                pelletsToRemove.push(pellet.id);
            } else {
                // Update visual position based on physics body
                if (pellet.element && pellet.body) {
                    const halfSize = FOOD_PELLET_SIZE / 2;
                    // Use transform for smoother updates
                    pellet.element.style.transform = `translate(${pellet.body.position.x - halfSize}px, ${pellet.body.position.y - halfSize}px)`;
                    // Clear initial off-screen positioning if needed
                    pellet.element.style.left = ``;
                    pellet.element.style.top = ``;
                }
            }
        });

        // Remove expired pellets
        pelletsToRemove.forEach(pelletId => this.removeFoodPellet(pelletId));
    }

    /** Elimina una bolita. */
    // Corrección: Añadir guion bajo a 'consumed'
    public removeFoodPellet(pelletId: string, _consumed: boolean = false): void {
        const pellet = this.activePellets.get(pelletId);
        if (pellet) {
            // Remove physics body safely
            if (this.physicsManager && pellet.body) {
                 try {
                     // Check if body still exists in the world before removing
                     if (Matter.Composite.get(this.physicsManager.getWorld(), pellet.body.id, 'body')) {
                         Matter.World.remove(this.physicsManager.getWorld(), pellet.body);
                     }
                 } catch (error) { console.warn(`Error removing food pellet body ${pelletId}:`, error); }
            }
            // Remove DOM element
            pellet.element?.remove();
            // Remove from active map
            this.activePellets.delete(pelletId);
            // Optional log: console.log(`Removed food pellet ${pelletId}. Consumed: ${consumed}`);
        }
    }

    /** Procesa colisión gato-comida. */
    public processCatFoodCollision(catBodyId: number, foodBody: Matter.Body): void {
        const pelletId = foodBody.plugin?.pelletId as string | undefined;
        // Ensure all managers and IDs are valid, and pellet still exists
        if (!pelletId || !this.activePellets.has(pelletId) || !this.catManager || !this.playerData || !this.audioManager || !this.physicsManager) {
            // console.warn("Collision ignored: Invalid state or pellet already removed.");
            return;
        }

        const catEntityId = this.catManager.bodyIdToEntityIdMap.get(catBodyId);
        if (!catEntityId) {
            // console.warn(`Collision ignored: Cat entity ID not found for body ID ${catBodyId}`);
             return;
        }

        const cat = this.catManager.getCat(catEntityId);
        // Ensure cat entity and its components exist
        if (!cat || !cat.value || !cat.physics.body || !cat.render?.element) {
            // console.warn(`Collision ignored: Cat entity or components missing for ID ${catEntityId}`);
             return;
        }

        // console.log(`Collision detected: Cat ${cat.id} and Food ${pelletId}`); // Log opcional

        const currentSize = cat.value.currentSize;
        const maxSizeLimit = this.playerData.getCurrentMaxSizeLimit();
        let newSize = Math.min(maxSizeLimit, currentSize + GROWTH_PER_PELLET);

        // Only apply growth if there's a noticeable change
        const scaleFactor = newSize / currentSize;
        if (scaleFactor > 1.0001) { // Use a small threshold to avoid tiny scales
             cat.value.currentSize = newSize;
             try {
                 // Ensure body exists in the world before scaling
                 if (Matter.Composite.get(this.physicsManager.getWorld(), cat.physics.body.id, 'body')) {
                      Matter.Body.scale(cat.physics.body, scaleFactor, scaleFactor);
                 } else {
                      throw new Error("Body not found in world");
                 }
             } catch (error) {
                  console.error(`Error scaling cat ${cat.id} after eating food:`, error);
                  // Revert size if scaling failed
                  cat.value.currentSize = currentSize;
             }
             // console.log(` -> Cat ${cat.id} ate food ${pelletId} and grew to ${newSize.toFixed(1)}px`); // Log opcional
        } else {
             // console.log(` -> Cat ${cat.id} ate food ${pelletId} but reached size limit or growth too small.`); // Log opcional
        }

        this.audioManager.playSound('eat'); // Play eat sound
        this.removeFoodPellet(pelletId, true); // Remove the consumed pellet
    }

    /** Limpia listeners y bolitas. */
    public destroy(): void {
        console.log("CatFoodManager: destroy");
        this.removeClickListener();
        // No need to remove button listener here as it's managed by enable/disable now
        // if (this.buttonListener && this.catFoodButton) {
        //     this.catFoodButton.removeEventListener('click', this.buttonListener);
        // }
        // Remove all active pellets
        this.activePellets.forEach(pellet => this.removeFoodPellet(pellet.id));
        this.activePellets.clear();
        this.isEnabled = false;
        this.isActive = false;
    }

} // Fin clase CatFoodManager