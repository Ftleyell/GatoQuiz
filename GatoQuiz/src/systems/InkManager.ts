// src/systems/InkManager.ts

import { GameManager } from '../game/GameManager';
import { PlayerData } from '../game/PlayerData';
import { PhysicsManager } from './PhysicsManager';
import Matter from 'matter-js';
// No necesitamos importar ToolButton aquí si no lo usamos directamente
// import type { ToolButton } from '../game/components/ui/tool-button';

// --- Constantes de Dibujo ---
const MIN_PATH_DISTANCE_SQ = 25; // 5*5 pixels, distancia mínima al cuadrado para añadir punto
const INK_LINE_THICKNESS = 8;    // Grosor visual y físico de la línea
const INK_LINE_COLOR = '#E5E7EB'; // Color visual de la línea (Blanco-grisáceo)
const INK_PER_CORRECT_ANSWER = 150; // Tinta ganada por respuesta correcta
const INK_COLLISION_CATEGORY = 0x0004; // Categoría de colisión para la tinta
const CAT_COLLISION_CATEGORY = 0x0002; // Categoría de colisión para los gatos
const INK_COLLISION_MASK = CAT_COLLISION_CATEGORY; // La tinta solo colisiona con GATOS

type Point = { x: number; y: number };
type DrawnPath = { points: Point[]; bodies: Matter.Body[] };

/**
 * InkManager: Gestiona el sistema de dibujo con tinta, incluyendo la UI,
 * los eventos de input, la creación de cuerpos físicos y la lógica de gasto/ganancia de tinta.
 */
export class InkManager {
    private gameManager: GameManager;
    private physicsManager!: PhysicsManager; // Se asigna en setPhysicsManager
    private playerData!: PlayerData;      // Se asigna en constructor

    // Elementos del DOM
    private drawingCanvas: HTMLCanvasElement | null = null;
    private drawingCtx: CanvasRenderingContext2D | null = null;
    private gameContainer: HTMLElement | null = null; // Contenedor principal del quiz para efecto fade

    // Estado del Pincel/Dibujo
    public isBrushActive: boolean = false; // Hacer público para que GameManager pueda leerlo
    private isDrawing: boolean = false;
    private currentPath: Point[] = [];
    private lastPoint: Point | null = null;
    private drawnPaths: DrawnPath[] = [];

    // Estado de Inicialización y Listeners
    private isInitialized: boolean = false;
    // Mapa para guardar listeners de botones (ya no se usa aquí)
    private buttonListeners: Map<HTMLElement, { click: (e: MouseEvent) => void, touchstart?: (e: TouchEvent) => void }> = new Map();
    // Array para guardar listeners generales (canvas, window)
    private generalListeners: { element: HTMLElement | Window; type: string; handler: (e: any) => void, options?: AddEventListenerOptions | boolean }[] = [];
    // Timestamp para debounce de botones
    private lastInteractionTime: number = 0;
    private readonly DEBOUNCE_THRESHOLD = 300; // ms


    constructor(gameManager: GameManager) {
        console.log("InkManager: Constructor iniciado.");
        this.gameManager = gameManager;
        try {
            this.playerData = gameManager.getPlayerData();
            this.drawingCanvas = document.getElementById('drawing-canvas') as HTMLCanvasElement | null;
        } catch (e) {
            console.error("InkManager: Error crítico en constructor.", e);
        }
    }

    /** Inyecta el PhysicsManager después de su creación. */
    public setPhysicsManager(physicsManager: PhysicsManager): void {
        this.physicsManager = physicsManager;
    }


    /**
     * Inicializa el InkManager. Debe llamarse cuando la función de dibujo se desbloquea.
     */
    public init(): void {
        if (this.isInitialized) {
            this.updateInkUI(); // Asegura que la UI esté actualizada si ya está inicializado
            return;
        }
        console.log("InkManager: init (llamado al desbloquear dibujo)");
        try {
            // Obtiene referencias a managers y elementos del DOM
            if (!this.physicsManager) {
                this.physicsManager = this.gameManager.getPhysicsManager();
                if (!this.physicsManager) throw new Error("PhysicsManager no asignado.");
            }
            this.playerData = this.gameManager.getPlayerData();
            if (!this.drawingCanvas) {
                this.drawingCanvas = document.getElementById('drawing-canvas') as HTMLCanvasElement | null;
            }
            // Obtiene el contenedor del juego para aplicar el efecto fade
            this.gameContainer = this.gameManager.getContainerElement()?.querySelector('.game-container')
                                ?? this.gameManager.getContainerElement();

            // Verifica que las referencias críticas existan
            if (!this.playerData) throw new Error("PlayerData no encontrado.");
            if (!this.drawingCanvas) throw new Error("#drawing-canvas no encontrado.");

            // Configura el canvas y los listeners
            this.setupDrawingCanvas();
            this.initUIAndListeners(); // Configura listeners

            this.isInitialized = true; // Marca como inicializado
            this.updateInkUI(); // Actualiza la UI inicial de tinta
            console.log("InkManager: Inicialización completa.");

        } catch (error) {
            console.error("InkManager: Error CRÍTICO durante la inicialización:", error);
            this.isInitialized = false; // Asegura que no quede marcado como inicializado si falla
        }
    }

    /**
     * Configura los listeners para canvas y window.
     */
    private initUIAndListeners(): void {
        this.removeListeners(); // Limpiar listeners existentes primero

        // Listeners del canvas para dibujar
        if (this.drawingCanvas) {
            const startHandler = this.startDrawing.bind(this);
            const drawHandler = this.draw.bind(this);
            const stopHandler = this.stopDrawing.bind(this);
            // Añade listeners usando el helper addListener para registro y limpieza
            this.addListener(this.drawingCanvas, 'mousedown', startHandler);
            this.addListener(this.drawingCanvas, 'mousemove', drawHandler);
            this.addListener(this.drawingCanvas, 'mouseup', stopHandler);
            this.addListener(this.drawingCanvas, 'mouseleave', stopHandler);
            this.addListener(this.drawingCanvas, 'touchstart', startHandler, { passive: false });
            this.addListener(this.drawingCanvas, 'touchmove', drawHandler, { passive: false });
            this.addListener(this.drawingCanvas, 'touchend', stopHandler);
            this.addListener(this.drawingCanvas, 'touchcancel', stopHandler);
        } else {
            console.error("InkManager: No se pudieron añadir listeners de dibujo (canvas no encontrado).");
        }

        // Listener de resize
        this.addListener(window, 'resize', this.handleResize.bind(this));
    }

    /** Añade un listener y lo registra para limpieza. */
    private addListener(
        element: HTMLElement | Window,
        type: string,
        handler: (e: any) => void,
        options?: AddEventListenerOptions | boolean
    ): void {
        element.addEventListener(type, handler, options);
        // Guarda la información del listener para poder removerlo después
        this.generalListeners.push({ element, type, handler, options });
    }


    /** Remueve todos los listeners registrados. */
    private removeListeners(): void {
        // Remueve listeners generales (canvas, window)
        this.generalListeners.forEach(({ element, type, handler, options }) => {
            try {
                 element.removeEventListener(type, handler, options);
            } catch (e) {
                 // Ignorar errores si el listener ya no existe
            }
        });
        this.generalListeners = []; // Limpia el array de registro
        this.buttonListeners.clear();
    }

    // --- Métodos de Configuración y Dibujo ---
    private setupDrawingCanvas(): void { if (!this.drawingCanvas) return; this.drawingCtx = this.drawingCanvas.getContext('2d'); if (this.drawingCtx) { this.resizeCanvas(); this.applyContextStyles(); this.clearCanvas(); this.redrawPaths(); } else { console.error("InkManager: No se pudo obtener el contexto 2D."); } }
    private applyContextStyles(): void { if (!this.drawingCtx) return; this.drawingCtx.strokeStyle = INK_LINE_COLOR; this.drawingCtx.lineWidth = INK_LINE_THICKNESS; this.drawingCtx.lineCap = 'round'; this.drawingCtx.lineJoin = 'round'; }
    private resizeCanvas(): void { if (!this.drawingCanvas) return; this.drawingCanvas.width = window.innerWidth; this.drawingCanvas.height = window.innerHeight; this.applyContextStyles(); }
    private handleResize(): void { this.resizeCanvas(); this.redrawPaths(); }
    private clearCanvas(): void { if (this.drawingCtx && this.drawingCanvas) { this.drawingCtx.clearRect(0, 0, this.drawingCanvas.width, this.drawingCanvas.height); } }
    private redrawPaths(): void { this.clearCanvas(); if (!this.drawingCtx) return; this.drawnPaths.forEach(pathData => { this.drawPathPoints(pathData.points); }); }
    private drawPathPoints(points: Point[]): void { if (!this.drawingCtx || points.length < 2) return; this.drawingCtx.beginPath(); this.drawingCtx.moveTo(points[0].x, points[0].y); for (let i = 1; i < points.length; i++) { this.drawingCtx.lineTo(points[i].x, points[i].y); } this.drawingCtx.stroke(); }


    /**
     * Actualiza la UI relacionada con la tinta.
     */
    public updateInkUI(): void {
        if (!this.isInitialized || !this.playerData) return;
        const isUnlocked = this.playerData.isDrawingUnlocked;
        const scoreArea = document.getElementById('score-area');
        if (scoreArea) scoreArea.classList.toggle('ink-visible', isUnlocked);
        this.gameManager.getUIManager().updateInkBar();
        if (isUnlocked && this.playerData.currentInk <= 0 && this.isBrushActive) {
            this.toggleBrush(false);
        }
        this.updateBrushVisuals();
    }

    /**
     * Activa/desactiva el modo pincel.
     * @param forceState - (Opcional) Booleano para forzar el estado.
     */
    public toggleBrush(forceState?: boolean): void {
        if (!this.isInitialized) return;
        const newState = (forceState !== undefined) ? forceState : !this.isBrushActive;

        if (newState === true && (!this.playerData.isDrawingUnlocked || this.playerData.currentInk <= 0)) {
            if (this.isBrushActive) {
                this.isBrushActive = false;
                this.updateBrushVisuals();
                this.gameManager.updateToolButtonStates(); // Notifica a GameManager
            }
            return;
        }

        if (newState === this.isBrushActive) return;
        this.isBrushActive = newState;

        if (!this.isBrushActive && this.isDrawing) {
            this.stopDrawing(null);
        }

        this.updateBrushVisuals();
        this.gameManager.updateToolButtonStates(); // Notifica a GameManager

        // --- requestUpdate() ELIMINADO ---
    }


    /** Actualiza clases CSS para reflejar estado del pincel (active/fade). */
    private updateBrushVisuals(): void {
        if (this.drawingCanvas) this.drawingCanvas.classList.toggle('active', this.isBrushActive);
        const containerToFade = this.gameContainer ?? document.getElementById('app');
        if (containerToFade) {
             const gameContainerElement = containerToFade.querySelector('.game-container') ?? containerToFade;
             gameContainerElement.classList.toggle('ui-faded', this.isBrushActive);
        }
    }

    /** Borra líneas de tinta visual y física, recupera la tinta gastada. */
    public clearInkLines(): void {
        if (!this.isInitialized || !this.playerData.isDrawingUnlocked || this.playerData.inkSpentSinceLastClear <= 0) {
            return;
        }
        console.log(`InkManager: Clearing ${this.drawnPaths.length} strokes...`);
        const allBodiesToRemove: Matter.Body[] = this.drawnPaths.flatMap(p => p.bodies);
        if (this.physicsManager && allBodiesToRemove.length > 0) {
            try {
                const world = this.physicsManager.getWorld();
                const bodiesInWorld = allBodiesToRemove.filter(body => Matter.Composite.get(world, body.id, 'body'));
                if (bodiesInWorld.length > 0) { Matter.World.remove(world, bodiesInWorld); }
            } catch(error) { console.error("InkManager: Error removiendo cuerpos:", error); }
        }
        this.drawnPaths = [];
        this.clearCanvas();
        this.playerData.recoverSpentInk();
        this.updateInkUI();
        this.gameManager.getAudioManager().playSound('clear_ink');
    }

    /** Otorga tinta por respuesta correcta. */
    public gainInkOnCorrectAnswer(): void {
        if (!this.isInitialized || !this.playerData.isDrawingUnlocked) return;
        this.playerData.gainInk(INK_PER_CORRECT_ANSWER);
        this.updateInkUI();
    }

    /** Limpia listeners al destruir. */
     public destroy(): void {
        console.log("InkManager: Destruyendo...");
        this.removeListeners();
        this.isInitialized = false;
        this.isBrushActive = false;
        this.isDrawing = false;
        this.currentPath = [];
        this.drawnPaths = [];
        this.drawingCtx = null;
        this.buttonListeners.clear();
    }

    // --- Métodos de Dibujo ---
    private startDrawing(event: MouseEvent | TouchEvent): void { if (!this.isInitialized || !this.isBrushActive || this.playerData.currentInk <= 0) return; event.preventDefault(); this.isDrawing = true; const pos = this.getMousePos(event); this.currentPath = [pos]; this.lastPoint = pos; if (this.drawingCtx) { this.drawingCtx.beginPath(); this.drawingCtx.moveTo(pos.x, pos.y); } this.gameManager.getAudioManager().playSound('draw_start'); }
    private draw(event: MouseEvent | TouchEvent): void { if (!this.isDrawing || !this.isBrushActive) return; event.preventDefault(); const pos = this.getMousePos(event); const distSq = this.lastPoint ? this.distanceSq(this.lastPoint, pos) : MIN_PATH_DISTANCE_SQ; if (distSq >= MIN_PATH_DISTANCE_SQ) { const dist = Math.sqrt(distSq); const inkCost = dist * this.playerData.getCurrentInkCostPerPixel(); if (this.playerData.spendInk(inkCost)) { this.currentPath.push(pos); if (this.drawingCtx) { this.drawingCtx.lineTo(pos.x, pos.y); this.drawingCtx.stroke(); this.drawingCtx.beginPath(); this.drawingCtx.moveTo(pos.x, pos.y); } this.lastPoint = pos; this.updateInkUI(); } else { this.stopDrawing(event); } } }
    private stopDrawing(event: MouseEvent | TouchEvent | null): void { if (!this.isDrawing) return; event?.preventDefault(); this.isDrawing = false; this.gameManager.getAudioManager().playSound('draw_end'); if (this.currentPath.length > 1) { const inkBodies = this.createInkBodySegments(this.currentPath); if (inkBodies.length > 0 && this.physicsManager) { try { Matter.World.add(this.physicsManager.getWorld(), inkBodies); this.drawnPaths.push({ points: [...this.currentPath], bodies: inkBodies }); this.updateInkUI(); } catch (error) { console.error("InkManager: Error añadiendo cuerpos:", error); } } else if (!this.physicsManager) { console.error("InkManager: PhysicsManager no disponible."); } } this.currentPath = []; this.lastPoint = null; }
    private getMousePos(event: MouseEvent | TouchEvent): Point { if (!this.drawingCanvas) return { x: 0, y: 0 }; const rect = this.drawingCanvas.getBoundingClientRect(); let clientX = 0, clientY = 0; if (event instanceof MouseEvent) { clientX = event.clientX; clientY = event.clientY; } else if (event.touches && event.touches[0]) { clientX = event.touches[0].clientX; clientY = event.touches[0].clientY; } else if ((event as TouchEvent).changedTouches && (event as TouchEvent).changedTouches[0]) { clientX = (event as TouchEvent).changedTouches[0].clientX; clientY = (event as TouchEvent).changedTouches[0].clientY; } return { x: clientX - rect.left, y: clientY - rect.top }; }
    private distanceSq(p1: Point, p2: Point): number { const dx = p1.x - p2.x; const dy = p1.y - p2.y; return dx * dx + dy * dy; }
    private createInkBodySegments(points: Point[]): Matter.Body[] { const bodies: Matter.Body[] = []; if (points.length < 2 || !this.physicsManager) return bodies; for (let i = 1; i < points.length; i++) { const startPoint = points[i - 1]; const endPoint = points[i]; const dx = endPoint.x - startPoint.x; const dy = endPoint.y - startPoint.y; const distSq = dx * dx + dy * dy; if (distSq < 1) continue; const dist = Math.sqrt(distSq); const angle = Math.atan2(dy, dx); const midX = startPoint.x + dx / 2; const midY = startPoint.y + dy / 2; try { const segmentBody = Matter.Bodies.rectangle( midX, midY, dist, INK_LINE_THICKNESS, { isStatic: true, angle: angle, label: 'inkLine', friction: 0.5, restitution: 0.1, collisionFilter: { category: INK_COLLISION_CATEGORY, mask: INK_COLLISION_MASK }, render: { visible: false } } ); if (segmentBody) bodies.push(segmentBody); } catch (error) { console.error("InkManager: Error creando cuerpo:", error); } } return bodies; }

    // Helper para obtener elementos de control (ya no se usa aquí)
    // private getControlElements(): { brushToolButton: ToolButton | null } | null {
    //     const gm = this.gameManager as any; // Acceso temporal a propiedad privada (no ideal)
    //     return gm.controlElements ?? null;
    // }

} // Fin clase InkManager
