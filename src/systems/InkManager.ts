// src/systems/InkManager.ts

import { GameManager } from '../game/GameManager';
import { PlayerData } from '../game/PlayerData';
import { PhysicsManager } from './PhysicsManager';
import Matter from 'matter-js';

// --- Constantes de Dibujo ---
const MIN_PATH_DISTANCE_SQ = 25; // 5*5 pixels
const INK_LINE_THICKNESS = 8;
const INK_LINE_COLOR = '#E5E7EB'; // Blanco-grisáceo
const INK_PER_CORRECT_ANSWER = 150;
const INK_COLLISION_CATEGORY = 0x0004;
const INK_COLLISION_MASK = 0x0002;

type Point = { x: number; y: number };
type DrawnPath = { points: Point[]; bodies: Matter.Body[] };

export class InkManager {
    private gameManager: GameManager;
    private physicsManager!: PhysicsManager;
    private playerData!: PlayerData;

    // Elementos del DOM
    private drawingCanvas: HTMLCanvasElement | null = null;
    private drawingCtx: CanvasRenderingContext2D | null = null;
    private toggleBrushButton: HTMLButtonElement | null = null;
    private clearInkButton: HTMLButtonElement | null = null;
    private rightControlsContainer: HTMLElement | null = null;
    private gameContainer: HTMLElement | null = null;
    private drawingButtonsContainer: HTMLElement | null = null;

    // Estado del Pincel/Dibujo
    private isBrushActive: boolean = false;
    private isDrawing: boolean = false;
    private currentPath: Point[] = [];
    private lastPoint: Point | null = null;
    private drawnPaths: DrawnPath[] = [];

    // Estado de Inicialización
    private isInitialized: boolean = false;

    // Referencias a listeners para limpieza
    private listeners: { element: HTMLElement | Window; type: string; handler: (e: any) => void }[] = [];

    constructor(gameManager: GameManager) {
        console.log("InkManager: Constructor iniciado.");
        this.gameManager = gameManager;
        this.playerData = gameManager.getPlayerData();
        this.drawingCanvas = document.getElementById('drawing-canvas') as HTMLCanvasElement | null;
        this.rightControlsContainer = document.getElementById('right-controls');
        this.gameContainer = document.querySelector('.game-container');
        if (this.rightControlsContainer) {
             this.drawingButtonsContainer = this.rightControlsContainer.querySelector('#drawing-buttons-container');
        }
    }

    public init(): void {
        if (this.isInitialized) {
            console.log("InkManager: Ya inicializado.");
            this.updateInkUI();
            return;
        }
        console.log("InkManager: init (llamado al desbloquear dibujo)");
        try {
            this.physicsManager = this.gameManager.getPhysicsManager();
        } catch (e) {
             console.error("InkManager: Error obteniendo PhysicsManager.", e);
             return;
        }
        if (!this.drawingCanvas) this.drawingCanvas = document.getElementById('drawing-canvas') as HTMLCanvasElement | null;
        if (!this.toggleBrushButton) this.toggleBrushButton = document.getElementById('toggle-brush-button') as HTMLButtonElement | null;
        if (!this.clearInkButton) this.clearInkButton = document.getElementById('clear-ink-button') as HTMLButtonElement | null;
        if (!this.rightControlsContainer) this.rightControlsContainer = document.getElementById('right-controls');
        if (this.rightControlsContainer && !this.drawingButtonsContainer) {
             this.drawingButtonsContainer = this.rightControlsContainer.querySelector('#drawing-buttons-container');
        }
        if (!this.gameContainer) this.gameContainer = document.querySelector('.game-container');

        if (!this.drawingCanvas) { console.error("InkManager: #drawing-canvas no encontrado."); return; }
        if (!this.toggleBrushButton || !this.clearInkButton) { console.error("InkManager: Botones de dibujo no encontrados."); }
        if (!this.drawingButtonsContainer) { console.warn("InkManager: #drawing-buttons-container no encontrado."); }

        this.setupDrawingCanvas();
        this.initUIAndListeners();

        this.isInitialized = true;
        console.log("InkManager: Inicialización completa.");
    }

    private initUIAndListeners(): void {
        this.removeListeners();

        if (this.toggleBrushButton) {
            this.toggleBrushListener = this.toggleBrush.bind(this);
            this.addListener(this.toggleBrushButton, 'click', this.toggleBrushListener);
        } else console.warn("InkManager: toggleBrushButton no encontrado.");

        if (this.clearInkButton) {
            this.clearInkListener = this.clearInkLines.bind(this);
            this.addListener(this.clearInkButton, 'click', this.clearInkListener);
        } else console.warn("InkManager: clearInkButton no encontrado.");

        if (this.drawingCanvas) {
            console.log("[InkManager Init] Añadiendo listeners de dibujo al canvas..."); // Log importante
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
            console.log("[InkManager Init] Listeners de dibujo (mouse/touch) añadidos."); // Log importante
        } else {
            console.error("InkManager: drawingCanvas no encontrado al intentar añadir listeners.");
        }

        this.addListener(window, 'resize', this.handleResize.bind(this));
        this.updateInkUI();
    }

    private addListener(element: HTMLElement | Window, type: string, handler: (e: any) => void, options?: AddEventListenerOptions): void {
        element.addEventListener(type, handler, options);
        this.listeners.push({ element, type, handler });
    }

    private removeListeners(): void {
        this.listeners.forEach(({ element, type, handler }) => {
            element.removeEventListener(type, handler);
        });
        this.listeners = [];
    }

    private setupDrawingCanvas(): void {
        if (!this.drawingCanvas) return;
        this.drawingCtx = this.drawingCanvas.getContext('2d');
        if (this.drawingCtx) {
            this.resizeCanvas();
            this.drawingCtx.strokeStyle = INK_LINE_COLOR;
            this.drawingCtx.lineWidth = INK_LINE_THICKNESS;
            this.drawingCtx.lineCap = 'round';
            this.drawingCtx.lineJoin = 'round';
            console.log("InkManager: Canvas de dibujo configurado.");
            this.clearCanvas();
            this.redrawPaths();
        } else {
            console.error("InkManager: No se pudo obtener el contexto 2D.");
        }
    }

    private resizeCanvas(): void {
        if (!this.drawingCanvas) return;
        this.drawingCanvas.width = window.innerWidth;
        this.drawingCanvas.height = window.innerHeight;
        if (this.drawingCtx) {
            this.drawingCtx.strokeStyle = INK_LINE_COLOR;
            this.drawingCtx.lineWidth = INK_LINE_THICKNESS;
            this.drawingCtx.lineCap = 'round';
            this.drawingCtx.lineJoin = 'round';
        }
    }

    private handleResize(): void {
        this.resizeCanvas();
        this.redrawPaths();
    }

    private clearCanvas(): void {
        if (this.drawingCtx && this.drawingCanvas) {
            this.drawingCtx.clearRect(0, 0, this.drawingCanvas.width, this.drawingCanvas.height);
        }
    }

    private redrawPaths(): void {
        this.clearCanvas();
        if (!this.drawingCtx) return;
        this.drawnPaths.forEach(pathData => {
            this.drawPathPoints(pathData.points);
        });
    }

    private drawPathPoints(points: Point[]): void {
        if (!this.drawingCtx || points.length < 2) return;
        this.drawingCtx.beginPath();
        this.drawingCtx.moveTo(points[0].x, points[0].y);
        for (let i = 1; i < points.length; i++) {
            this.drawingCtx.lineTo(points[i].x, points[i].y);
        }
        this.drawingCtx.stroke();
    }

    public updateInkUI(): void {
        if (!this.playerData) return;
        const isUnlocked = this.playerData.isDrawingUnlocked;
        const maxInk = this.playerData.getMaxInk();
        const currentInk = this.playerData.currentInk;
        const inkLabel = document.getElementById('ink-label');
        const inkBarContainer = document.getElementById('ink-bar-container');
        const inkBarFill = document.getElementById('ink-bar-fill');
        const visibilityClass = 'hidden';

        if (inkLabel) inkLabel.classList.toggle(visibilityClass, !isUnlocked);
        if (inkBarContainer) inkBarContainer.classList.toggle(visibilityClass, !isUnlocked);
        // La visibilidad de drawingButtonsContainer se controla por CSS y la clase en #right-controls

        if (inkBarFill) {
            const percentage = maxInk > 0 ? Math.max(0, Math.min(100, (currentInk / maxInk) * 100)) : 0;
            (inkBarFill as HTMLElement).style.width = `${percentage}%`;
        }
        if (this.toggleBrushButton) {
            this.toggleBrushButton.disabled = !isUnlocked || (currentInk <= 0 && !this.isBrushActive);
        }
        if (this.clearInkButton) {
            this.clearInkButton.disabled = !isUnlocked || this.drawnPaths.length === 0;
        }
        if (isUnlocked && currentInk <= 0 && this.isBrushActive) {
             this.toggleBrush();
        }
    }

    public toggleBrush(): void {
        if (!this.playerData.isDrawingUnlocked) {
            if(this.isBrushActive) this.isBrushActive = false;
            this.updateBrushVisuals();
            return;
        }
        if (this.playerData.currentInk <= 0 && !this.isBrushActive) {
            return;
        }
        this.isBrushActive = !this.isBrushActive;
        console.log("InkManager: Pincel activo:", this.isBrushActive);
        this.updateBrushVisuals();
        if (!this.isBrushActive && this.isDrawing) {
            this.stopDrawing(null);
        }
        this.updateInkUI();
    }

    private updateBrushVisuals(): void {
         if (this.drawingCanvas) this.drawingCanvas.classList.toggle('active', this.isBrushActive);
         if (this.toggleBrushButton) this.toggleBrushButton.classList.toggle('active', this.isBrushActive);
         if (this.gameContainer) this.gameContainer.classList.toggle('ui-faded', this.isBrushActive);
    }

    public clearInkLines(): void {
        if (!this.playerData.isDrawingUnlocked || this.drawnPaths.length === 0) return;
        console.log(`InkManager: Borrando ${this.drawnPaths.length} trazos...`);
        const allBodiesToRemove: Matter.Body[] = [];
        this.drawnPaths.forEach(pathData => {
            if (pathData.bodies?.length > 0) allBodiesToRemove.push(...pathData.bodies);
        });
        if (this.physicsManager && allBodiesToRemove.length > 0) {
            console.log(`  Removiendo ${allBodiesToRemove.length} cuerpos físicos...`);
            try {
                const worldBodies = Matter.Composite.allBodies(this.physicsManager.getWorld());
                const bodiesInWorld = allBodiesToRemove.filter(body => worldBodies.includes(body));
                if(bodiesInWorld.length > 0) Matter.World.remove(this.physicsManager.getWorld(), bodiesInWorld);
            } catch(error) { console.error("InkManager: Error removiendo cuerpos:", error); }
        }
        this.drawnPaths = [];
        this.clearCanvas();
        this.playerData.refillInk();
        this.updateInkUI();
        this.gameManager.getAudioManager().playSound('clear_ink');
    }

    public gainInkOnCorrectAnswer(): void {
        if (this.playerData.isDrawingUnlocked) {
            this.playerData.gainInk(INK_PER_CORRECT_ANSWER);
            this.updateInkUI();
        }
    }

    public destroy(): void {
        console.log("InkManager: Destruyendo...");
        this.removeListeners();
    }

    // --- Métodos de Dibujo ---

    private startDrawing(event: MouseEvent | TouchEvent): void {
        // --- DEBUG LOG INICIAL ---
        console.log(`[InkManager.startDrawing] Handler llamado por evento: ${event.type}`);
        // -------------------------

        if (!this.isBrushActive || this.playerData.currentInk <= 0 || !this.playerData.isDrawingUnlocked) {
            console.log(`[InkManager.startDrawing] Ignorado: BrushActive=${this.isBrushActive}, Ink=${this.playerData.currentInk}, Unlocked=${this.playerData.isDrawingUnlocked}`);
            return;
        }
        event.preventDefault();
        this.isDrawing = true; // <--- Asegurarse que esto se ponga a true
        const pos = this.getMousePos(event);
        this.currentPath = [pos];
        this.lastPoint = pos;

        console.log(`[InkManager.startDrawing] Drawing started at { x: ${pos.x.toFixed(1)}, y: ${pos.y.toFixed(1)} }. isDrawing set to: ${this.isDrawing}`); // Log con isDrawing

        if (this.drawingCtx) {
            this.drawingCtx.beginPath();
            this.drawingCtx.moveTo(pos.x, pos.y);
        }
        this.gameManager.getAudioManager().playSound('draw_start');
    }

    private draw(event: MouseEvent | TouchEvent): void {
        // --- DEBUG LOG INICIAL ---
        console.log(`[InkManager.draw] Handler llamado por evento: ${event.type}`); // <--- AÑADIR ESTE LOG
        // -------------------------

        if (!this.isDrawing || !this.isBrushActive) {
             console.log(`[InkManager.draw] Ignorado: isDrawing=${this.isDrawing}, isBrushActive=${this.isBrushActive}`); // <--- Log si se ignora
             return;
        }

        event.preventDefault();
        const pos = this.getMousePos(event);
        const distSq = this.lastPoint ? this.distanceSq(this.lastPoint, pos) : MIN_PATH_DISTANCE_SQ;

        // console.log(`[InkManager.draw] Current Pos: { x: ${pos.x.toFixed(1)}, y: ${pos.y.toFixed(1)} }`); // Log opcional
        // console.log(`[InkManager.draw] distSq: ${distSq.toFixed(1)}, MIN_PATH_DISTANCE_SQ: ${MIN_PATH_DISTANCE_SQ}`); // Log opcional

        if (distSq >= MIN_PATH_DISTANCE_SQ) {
            const dist = Math.sqrt(distSq);
            const inkCost = dist * this.playerData.getCurrentInkCostPerPixel();
            const spentOk = this.playerData.spendInk(inkCost);

            // console.log(`[InkManager.draw] dist: ${dist.toFixed(1)}, inkCost: ${inkCost.toFixed(2)}, currentInk: ${this.playerData.currentInk.toFixed(1)}`); // Log opcional
            // console.log(`[InkManager.draw] spendInk result: ${spentOk}`); // Log opcional

            if (spentOk) {
                this.currentPath.push(pos);
                if (this.drawingCtx) {
                    this.drawingCtx.lineTo(pos.x, pos.y);
                    this.drawingCtx.stroke();
                    console.log(`[InkManager.draw] Line drawn to { x: ${pos.x.toFixed(1)}, y: ${pos.y.toFixed(1)} }`); // Log importante
                    this.drawingCtx.beginPath();
                    this.drawingCtx.moveTo(pos.x, pos.y);
                } else { console.warn("[InkManager.draw] drawingCtx es null."); }
                this.lastPoint = pos;
                this.updateInkUI();
            } else {
                console.log("InkManager: Sin tinta para continuar.");
                this.stopDrawing(event);
            }
        }
        // else { // Log opcional para ver si la distancia es el problema
        //     console.log(`[InkManager.draw] Distance too small, skipping point.`);
        // }
    }


    private stopDrawing(event: MouseEvent | TouchEvent | null): void {
        console.log(`[InkManager.stopDrawing] Handler llamado por evento: ${event?.type ?? 'null'}`);

        if (!this.isDrawing) return;
        event?.preventDefault();
        this.isDrawing = false; // <--- Asegurarse que esto se ponga a false
        console.log(`[InkManager.stopDrawing] isDrawing set to: ${this.isDrawing}`); // Log con isDrawing
        this.gameManager.getAudioManager().playSound('draw_end');

        if (this.currentPath.length > 1) {
            console.log(`InkManager: Procesando trazo con ${this.currentPath.length} puntos.`);
            const inkBodies = this.createInkBodySegments(this.currentPath);
            if (inkBodies.length > 0 && this.physicsManager) {
                try {
                    Matter.World.add(this.physicsManager.getWorld(), inkBodies);
                    this.drawnPaths.push({ points: [...this.currentPath], bodies: inkBodies });
                    console.log(`InkManager: Trazo añadido con ${inkBodies.length} cuerpos físicos.`);
                    this.updateInkUI();
                } catch (error) {
                     console.error("InkManager: Error añadiendo cuerpos de tinta:", error);
                }
            } else if (!this.physicsManager) {
                console.error("InkManager: PhysicsManager no disponible.");
            } else {
                 console.log("InkManager: Trazo inválido o sin cuerpos físicos creados.");
            }
        } else {
            console.log("InkManager: Trazo descartado (muy corto).");
        }
        this.currentPath = [];
        this.lastPoint = null;
    }

    private getMousePos(event: MouseEvent | TouchEvent): Point {
        if (!this.drawingCanvas) return { x: 0, y: 0 };
        const rect = this.drawingCanvas.getBoundingClientRect();
        let clientX = 0, clientY = 0;
        if (event instanceof MouseEvent) {
            clientX = event.clientX; clientY = event.clientY;
        } else if (event.touches && event.touches[0]) {
            clientX = event.touches[0].clientX; clientY = event.touches[0].clientY;
        } else if ((event as TouchEvent).changedTouches && (event as TouchEvent).changedTouches[0]) {
             clientX = (event as TouchEvent).changedTouches[0].clientX;
             clientY = (event as TouchEvent).changedTouches[0].clientY;
        }
        return { x: clientX - rect.left, y: clientY - rect.top };
    }

    private distanceSq(p1: Point, p2: Point): number {
        const dx = p1.x - p2.x;
        const dy = p1.y - p2.y;
        return dx * dx + dy * dy;
    }

    private createInkBodySegments(points: Point[]): Matter.Body[] {
        const bodies: Matter.Body[] = [];
        if (points.length < 2 || !this.physicsManager) return bodies;
        for (let i = 1; i < points.length; i++) {
            const startPoint = points[i - 1];
            const endPoint = points[i];
            const dx = endPoint.x - startPoint.x;
            const dy = endPoint.y - startPoint.y;
            const distSq = dx * dx + dy * dy;
            if (distSq < 1) continue;
            const dist = Math.sqrt(distSq);
            const angle = Math.atan2(dy, dx);
            const midX = startPoint.x + dx / 2;
            const midY = startPoint.y + dy / 2;
            try {
                const segmentBody = Matter.Bodies.rectangle(
                    midX, midY, dist, INK_LINE_THICKNESS,
                    {
                        isStatic: true, angle: angle, label: 'inkLine',
                        friction: 0.5, restitution: 0.1,
                        collisionFilter: { category: INK_COLLISION_CATEGORY, mask: INK_COLLISION_MASK },
                        render: { visible: false }
                    }
                );
                if (segmentBody) { bodies.push(segmentBody); }
                else { console.warn("InkManager: Falló Matter.Bodies.rectangle."); }
            } catch (error) {
                 console.error("InkManager: Error creando cuerpo de segmento:", error, {startPoint, endPoint});
            }
        }
        return bodies;
    }

} // Fin clase InkManager
