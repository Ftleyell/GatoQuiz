// src/systems/InkManager.ts

import { GameManager } from '../game/GameManager';
import { PlayerData } from '../game/PlayerData';
import { PhysicsManager } from './PhysicsManager';
import Matter from 'matter-js';

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
    private physicsManager!: PhysicsManager; // Se asigna en init
    private playerData!: PlayerData;      // Se asigna en constructor

    // Elementos del DOM
    private drawingCanvas: HTMLCanvasElement | null = null;
    private drawingCtx: CanvasRenderingContext2D | null = null;
    private gameContainer: HTMLElement | null = null; // Contenedor principal del quiz para efecto fade

    // Estado del Pincel/Dibujo
    private isBrushActive: boolean = false;
    private isDrawing: boolean = false;
    private currentPath: Point[] = [];
    private lastPoint: Point | null = null;
    private drawnPaths: DrawnPath[] = [];

    // Estado de Inicialización y Listeners
    private isInitialized: boolean = false;
    private listeners: { element: HTMLElement | Window; type: string; handler: (e: any) => void }[] = [];
    private toggleBrushListener: (() => void) | null = null;
    private clearInkListener: (() => void) | null = null;

    constructor(gameManager: GameManager) {
        console.log("InkManager: Constructor iniciado.");
        this.gameManager = gameManager;
        try {
            this.playerData = gameManager.getPlayerData();
            // Intentar obtener canvas ahora, pero verificar de nuevo en init
            this.drawingCanvas = document.getElementById('drawing-canvas') as HTMLCanvasElement | null;
        } catch (e) {
            console.error("InkManager: Error crítico en constructor (PlayerData o Canvas inicial).", e);
            // Considerar lanzar error o marcar como no inicializable
        }
    }

    /**
     * Inicializa el InkManager. Debe llamarse cuando la función de dibujo se desbloquea.
     */
    public init(): void {
        if (this.isInitialized) {
            console.log("InkManager: Ya inicializado, actualizando UI.");
            this.updateInkUI(); // Asegurar UI actualizada
            return;
        }
        console.log("InkManager: init (llamado al desbloquear dibujo)");
        try {
            // Obtener referencias críticas
            this.physicsManager = this.gameManager.getPhysicsManager();
            this.playerData = this.gameManager.getPlayerData(); // Reafirmar referencia

            // Volver a buscar elementos DOM cruciales
            if (!this.drawingCanvas) {
                this.drawingCanvas = document.getElementById('drawing-canvas') as HTMLCanvasElement | null;
            }
            // Obtener el contenedor del juego (puede ser #app o .game-container)
            this.gameContainer = this.gameManager.getContainerElement()?.querySelector('.game-container')
                                ?? this.gameManager.getContainerElement();

            if (!this.physicsManager) throw new Error("PhysicsManager no encontrado.");
            if (!this.playerData) throw new Error("PlayerData no encontrado.");
            if (!this.drawingCanvas) throw new Error("#drawing-canvas no encontrado.");
            // gameContainer es útil pero no estrictamente crítico para la funcionalidad básica

            this.setupDrawingCanvas(); // Configura tamaño y contexto
            this.initUIAndListeners(); // Añade listeners a botones y canvas

            this.isInitialized = true;
            this.updateInkUI(); // Actualiza estado inicial de botones y barra
            console.log("InkManager: Inicialización completa.");

        } catch (error) {
            console.error("InkManager: Error CRÍTICO durante la inicialización:", error);
            this.isInitialized = false; // Marcar como fallido
        }
    }

    /**
     * Configura los listeners para botones y canvas, limpiando los anteriores.
     */
    private initUIAndListeners(): void {
        console.log("InkManager: Configurando listeners...");
        this.removeListeners(); // Limpiar existentes

        const toggleBrushButton = document.getElementById('toggle-brush-button') as HTMLButtonElement | null;
        const clearInkButton = document.getElementById('clear-ink-button') as HTMLButtonElement | null;

        if (toggleBrushButton) {
            this.toggleBrushListener = this.toggleBrush.bind(this);
            this.addListener(toggleBrushButton, 'click', this.toggleBrushListener);
            console.log(" -> Listener añadido a toggleBrushButton");
        } else console.warn("InkManager: toggleBrushButton no encontrado.");

        if (clearInkButton) {
            this.clearInkListener = this.clearInkLines.bind(this);
            this.addListener(clearInkButton, 'click', this.clearInkListener);
            console.log(" -> Listener añadido a clearInkButton");
        } else console.warn("InkManager: clearInkButton no encontrado.");

        if (this.drawingCanvas) {
            const startHandler = this.startDrawing.bind(this);
            const drawHandler = this.draw.bind(this);
            const stopHandler = this.stopDrawing.bind(this);
            this.addListener(this.drawingCanvas, 'mousedown', startHandler);
            this.addListener(this.drawingCanvas, 'mousemove', drawHandler);
            this.addListener(this.drawingCanvas, 'mouseup', stopHandler);
            this.addListener(this.drawingCanvas, 'mouseleave', stopHandler);
            this.addListener(this.drawingCanvas, 'touchstart', startHandler, { passive: false });
            this.addListener(this.drawingCanvas, 'touchmove', drawHandler, { passive: false });
            this.addListener(this.drawingCanvas, 'touchend', stopHandler);
            this.addListener(this.drawingCanvas, 'touchcancel', stopHandler);
            console.log(" -> Listeners de dibujo (mouse/touch) añadidos al canvas.");
        } else {
            console.error("InkManager: No se pudieron añadir listeners de dibujo (canvas no encontrado).");
        }

        // Listener de resize
        this.addListener(window, 'resize', this.handleResize.bind(this));
        console.log(" -> Listener de resize añadido.");
    }

    /** Añade un listener y lo registra para limpieza. */
    private addListener(element: HTMLElement | Window, type: string, handler: (e: any) => void, options?: AddEventListenerOptions): void {
        element.addEventListener(type, handler, options);
        this.listeners.push({ element, type, handler });
    }

    /** Remueve todos los listeners registrados. */
    private removeListeners(): void {
        // console.log(`InkManager: Removiendo ${this.listeners.length} listeners...`);
        this.listeners.forEach(({ element, type, handler }) => {
            try { element.removeEventListener(type, handler); } catch (e) {}
        });
        this.listeners = [];
        // Resetear referencias explícitas si es necesario
        this.toggleBrushListener = null;
        this.clearInkListener = null;
    }

    /** Configura el canvas y su contexto. */
    private setupDrawingCanvas(): void {
        if (!this.drawingCanvas) return;
        this.drawingCtx = this.drawingCanvas.getContext('2d');
        if (this.drawingCtx) {
            this.resizeCanvas(); // Establecer tamaño inicial
            this.applyContextStyles();
            console.log("InkManager: Canvas de dibujo configurado.");
            this.clearCanvas();
            this.redrawPaths(); // Redibujar trazos existentes
        } else {
            console.error("InkManager: No se pudo obtener el contexto 2D.");
        }
    }

    /** Aplica los estilos de línea al contexto. */
    private applyContextStyles(): void {
        if (!this.drawingCtx) return;
        this.drawingCtx.strokeStyle = INK_LINE_COLOR;
        this.drawingCtx.lineWidth = INK_LINE_THICKNESS;
        this.drawingCtx.lineCap = 'round';
        this.drawingCtx.lineJoin = 'round';
    }

    /** Ajusta el tamaño del canvas a la ventana. */
    private resizeCanvas(): void {
        if (!this.drawingCanvas) return;
        this.drawingCanvas.width = window.innerWidth;
        this.drawingCanvas.height = window.innerHeight;
        this.applyContextStyles(); // Reaplicar estilos que se pierden
    }

    /** Manejador para el evento resize. */
    private handleResize(): void {
        this.resizeCanvas();
        this.redrawPaths(); // Redibujar en el nuevo tamaño
    }

    /** Limpia el canvas visualmente. */
    private clearCanvas(): void {
        if (this.drawingCtx && this.drawingCanvas) {
            this.drawingCtx.clearRect(0, 0, this.drawingCanvas.width, this.drawingCanvas.height);
        }
    }

    /** Redibuja todos los trazos guardados. */
    private redrawPaths(): void {
        this.clearCanvas();
        if (!this.drawingCtx) return;
        this.drawnPaths.forEach(pathData => {
            this.drawPathPoints(pathData.points);
        });
    }

    /** Dibuja una serie de puntos conectados. */
    private drawPathPoints(points: Point[]): void {
        if (!this.drawingCtx || points.length < 2) return;
        this.drawingCtx.beginPath();
        this.drawingCtx.moveTo(points[0].x, points[0].y);
        for (let i = 1; i < points.length; i++) {
            this.drawingCtx.lineTo(points[i].x, points[i].y);
        }
        this.drawingCtx.stroke();
    }

    /**
     * Actualiza la UI relacionada con la tinta (visibilidad, estado de botones, barra).
     */
    public updateInkUI(): void {
        if (!this.isInitialized) {
            // console.warn("InkManager: updateInkUI llamado antes de inicializar completamente.");
            return; // No actualizar si no está listo
        }
        if (!this.playerData) {
            console.error("InkManager: PlayerData no disponible en updateInkUI.");
            return;
        }

        const isUnlocked = this.playerData.isDrawingUnlocked;
        const visibilityClass = 'hidden';

        // Buscar elementos (se hace aquí para robustez, por si el DOM cambia)
        const inkLabel = document.getElementById('ink-label');
        const inkBarContainer = document.getElementById('ink-bar-container');
        const inkBarFill = document.getElementById('ink-bar-fill');
        const toggleBrushButton = document.getElementById('toggle-brush-button') as HTMLButtonElement | null;
        const clearInkButton = document.getElementById('clear-ink-button') as HTMLButtonElement | null;

        // 1. Visibilidad de Barra y Etiqueta
        if (inkLabel) inkLabel.classList.toggle(visibilityClass, !isUnlocked);
        if (inkBarContainer) inkBarContainer.classList.toggle(visibilityClass, !isUnlocked);
         // Actualizar clase 'ink-visible' en #score-area
        const scoreArea = document.getElementById('score-area');
        if (scoreArea) scoreArea.classList.toggle('ink-visible', isUnlocked);

        // 2. Actualizar Relleno de Barra
        if (inkBarFill) {
            const maxInk = this.playerData.getMaxInk();
            const currentInk = this.playerData.currentInk;
            const percentage = maxInk > 0 ? Math.max(0, Math.min(100, (currentInk / maxInk) * 100)) : 0;
            (inkBarFill as HTMLElement).style.width = `${percentage}%`;
        }

        // 3. Habilitar/Deshabilitar Botones
        const canUseBrush = isUnlocked && this.playerData.currentInk > 0;
        const canClear = isUnlocked && this.drawnPaths.length > 0;

        if (toggleBrushButton) {
            toggleBrushButton.disabled = !isUnlocked || (!canUseBrush && !this.isBrushActive);
            toggleBrushButton.classList.toggle('active', this.isBrushActive); // Sincroniza clase visual
        }
        if (clearInkButton) {
            clearInkButton.disabled = !isUnlocked || !canClear;
        }

        // 4. Desactivar Pincel si se Queda Sin Tinta
        if (isUnlocked && this.playerData.currentInk <= 0 && this.isBrushActive) {
            console.log("InkManager: Sin tinta con pincel activo. Desactivando.");
            this.toggleBrush(); // Desactiva y actualiza visuales
        }

        // 5. Actualizar Clases del Canvas y Contenedor Principal (Fade UI)
        this.updateBrushVisuals(); // Llama a la función que maneja esto
    }

    /** Activa/desactiva el modo pincel. */
    public toggleBrush(): void {
        if (!this.isInitialized) return; // Salir si no está inicializado

        // Si no está desbloqueado, forzar a desactivado y salir
        if (!this.playerData.isDrawingUnlocked) {
            if (this.isBrushActive) {
                this.isBrushActive = false;
                this.updateBrushVisuals();
            }
            return;
        }

        // No permitir activar si no hay tinta (pero sí permitir desactivar)
        if (this.playerData.currentInk <= 0 && !this.isBrushActive) {
            console.log("InkManager: No se puede activar el pincel, sin tinta.");
            return;
        }

        this.isBrushActive = !this.isBrushActive;
        console.log("InkManager: Pincel activo:", this.isBrushActive);

        // Si se está desactivando mientras se dibujaba, finalizar trazo
        if (!this.isBrushActive && this.isDrawing) {
            this.stopDrawing(null); // Pasar null ya que no hay evento
        }

        this.updateBrushVisuals(); // Actualizar clases CSS relacionadas
        // No es necesario llamar a updateInkUI aquí mismo, ya que updateBrushVisuals
        // maneja la parte visual inmediata, y el estado enabled/disabled se
        // reevaluará en la próxima llamada a updateInkUI (ej. por gasto de tinta).
    }

    /** Actualiza clases CSS para reflejar estado del pincel (active/fade). */
    private updateBrushVisuals(): void {
        if (this.drawingCanvas) this.drawingCanvas.classList.toggle('active', this.isBrushActive);
        const toggleBrushButton = document.getElementById('toggle-brush-button'); // Buscarlo
        if (toggleBrushButton) toggleBrushButton.classList.toggle('active', this.isBrushActive);
        // Usar el gameContainer o un fallback (#app)
        const containerToFade = this.gameContainer ?? document.getElementById('app');
        if (containerToFade) containerToFade.classList.toggle('ui-faded', this.isBrushActive);
    }

    /** Borra líneas de tinta visual y física, rellena tinta. */
    public clearInkLines(): void {
        if (!this.isInitialized || !this.playerData.isDrawingUnlocked || this.drawnPaths.length === 0) return;
        console.log(`InkManager: Borrando ${this.drawnPaths.length} trazos...`);

        const allBodiesToRemove: Matter.Body[] = this.drawnPaths.flatMap(p => p.bodies);

        if (this.physicsManager && allBodiesToRemove.length > 0) {
            console.log(`  Removiendo ${allBodiesToRemove.length} cuerpos físicos...`);
            try {
                const world = this.physicsManager.getWorld();
                const bodiesInWorld = allBodiesToRemove.filter(body => Matter.Composite.get(world, body.id, 'body'));
                if (bodiesInWorld.length > 0) {
                    Matter.World.remove(world, bodiesInWorld);
                    console.log(`   -> ${bodiesInWorld.length} cuerpos removidos.`);
                }
            } catch(error) { console.error("InkManager: Error removiendo cuerpos de tinta:", error); }
        }

        this.drawnPaths = []; // Limpiar array de trazos
        this.clearCanvas();   // Limpiar dibujo visual
        this.playerData.refillInk(); // Rellenar tinta
        this.updateInkUI();   // Actualizar barra y botones
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
        this.drawnPaths = []; // También limpiar trazos guardados
        this.drawingCtx = null;
    }

    // --- Métodos de Dibujo ---

    private startDrawing(event: MouseEvent | TouchEvent): void {
        if (!this.isInitialized || !this.isBrushActive || this.playerData.currentInk <= 0) return;
        event.preventDefault();
        this.isDrawing = true;
        const pos = this.getMousePos(event);
        this.currentPath = [pos];
        this.lastPoint = pos;
        if (this.drawingCtx) { this.drawingCtx.beginPath(); this.drawingCtx.moveTo(pos.x, pos.y); }
        this.gameManager.getAudioManager().playSound('draw_start');
    }

    private draw(event: MouseEvent | TouchEvent): void {
        if (!this.isDrawing || !this.isBrushActive) return;
        event.preventDefault();
        const pos = this.getMousePos(event);
        const distSq = this.lastPoint ? this.distanceSq(this.lastPoint, pos) : MIN_PATH_DISTANCE_SQ;

        if (distSq >= MIN_PATH_DISTANCE_SQ) {
            const dist = Math.sqrt(distSq);
            const inkCost = dist * this.playerData.getCurrentInkCostPerPixel();
            if (this.playerData.spendInk(inkCost)) {
                this.currentPath.push(pos);
                if (this.drawingCtx) {
                    this.drawingCtx.lineTo(pos.x, pos.y);
                    this.drawingCtx.stroke();
                    this.drawingCtx.beginPath(); // Inicia nuevo segmento visual
                    this.drawingCtx.moveTo(pos.x, pos.y);
                }
                this.lastPoint = pos;
                this.updateInkUI(); // Actualiza barra
            } else { this.stopDrawing(event); }
        }
    }

    private stopDrawing(event: MouseEvent | TouchEvent | null): void {
        if (!this.isDrawing) return; // Evitar doble llamada
        event?.preventDefault();
        this.isDrawing = false;
        this.gameManager.getAudioManager().playSound('draw_end');

        if (this.currentPath.length > 1) {
            const inkBodies = this.createInkBodySegments(this.currentPath);
            if (inkBodies.length > 0 && this.physicsManager) {
                try {
                    Matter.World.add(this.physicsManager.getWorld(), inkBodies);
                    this.drawnPaths.push({ points: [...this.currentPath], bodies: inkBodies });
                    this.updateInkUI(); // Actualizar botón de borrar
                } catch (error) { console.error("InkManager: Error añadiendo cuerpos al mundo:", error); }
            } else if (!this.physicsManager) { console.error("InkManager: PhysicsManager no disponible al finalizar trazo."); }
        }
        this.currentPath = []; this.lastPoint = null;
    }

    /** Obtiene coordenadas relativas al canvas. */
    private getMousePos(event: MouseEvent | TouchEvent): Point {
        if (!this.drawingCanvas) return { x: 0, y: 0 };
        const rect = this.drawingCanvas.getBoundingClientRect();
        let clientX = 0, clientY = 0;
        if (event instanceof MouseEvent) { clientX = event.clientX; clientY = event.clientY; }
        else if (event.touches && event.touches[0]) { clientX = event.touches[0].clientX; clientY = event.touches[0].clientY; }
        else if ((event as TouchEvent).changedTouches && (event as TouchEvent).changedTouches[0]) { clientX = (event as TouchEvent).changedTouches[0].clientX; clientY = (event as TouchEvent).changedTouches[0].clientY; }
        return { x: clientX - rect.left, y: clientY - rect.top };
    }

    /** Calcula distancia al cuadrado. */
    private distanceSq(p1: Point, p2: Point): number {
        const dx = p1.x - p2.x; const dy = p1.y - p2.y; return dx * dx + dy * dy;
    }

    /** Crea cuerpos físicos para los segmentos del trazo. */
    private createInkBodySegments(points: Point[]): Matter.Body[] {
        const bodies: Matter.Body[] = [];
        if (points.length < 2 || !this.physicsManager) return bodies;

        for (let i = 1; i < points.length; i++) {
            const startPoint = points[i - 1]; const endPoint = points[i];
            const dx = endPoint.x - startPoint.x; const dy = endPoint.y - startPoint.y;
            const distSq = dx * dx + dy * dy;
            if (distSq < 1) continue; // Ignorar segmentos muy pequeños
            const dist = Math.sqrt(distSq); const angle = Math.atan2(dy, dx);
            const midX = startPoint.x + dx / 2; const midY = startPoint.y + dy / 2;

            try {
                const segmentBody = Matter.Bodies.rectangle( midX, midY, dist, INK_LINE_THICKNESS,
                    { isStatic: true, angle: angle, label: 'inkLine', friction: 0.5, restitution: 0.1,
                      collisionFilter: { category: INK_COLLISION_CATEGORY, mask: INK_COLLISION_MASK },
                      render: { visible: false } // El cuerpo físico no se renderiza
                    });
                if (segmentBody) bodies.push(segmentBody);
            } catch (error) { console.error("InkManager: Error creando cuerpo de tinta:", error); }
        }
        return bodies;
    }

} // Fin clase InkManager