// src/game/GameManager.ts

import { PhysicsManager } from '../systems/PhysicsManager';
import { QuizSystem } from '../systems/QuizSystem';
import { StateMachine, IState } from './StateMachine';
import { AudioManager } from '../systems/AudioManager';
import { CatManager } from '../systems/CatManager';
import { ShopManager } from '../systems/ShopManager';
import { PlayerData } from './PlayerData';
import { CatTemplate } from '../types/CatTemplate';
import { ShopItemJsonData } from '../types/ShopItemData';
import { InkManager } from '../systems/InkManager';
import { UIManager } from '../systems/UIManager';
import { ThemeManager } from '../systems/ThemeManager';
import { Theme } from '../types/Theme';
import { CatFoodManager } from '../systems/CatFoodManager'; // Corregido: Ruta

// Importaciones de Estados
import { LoadingState } from './states/LoadingState';
import { MainMenuState } from './states/MainMenuState';
import { QuizGameplayState } from './states/QuizGameplayState';
import { ResultsState } from './states/ResultsState';
import { GameOverState } from './states/GameOverState';

// Importar componente ToolButton y su tipo
import '../game/components/ui/tool-button.ts';
import type { ToolButton } from '../game/components/ui/tool-button';
// Importar combo-counter para asegurar registro
import '../game/components/ui/combo-counter.ts';


// Constante Global
const SHOP_POPUP_ID = 'shop-popup';
// Constante para Debounce
const TOOL_TOGGLE_DEBOUNCE_MS = 300; // Milisegundos para ignorar activaciones/desactivaciones rápidas

// Tipos locales
type ControlElements = {
    controlsContainer: HTMLElement | null;
    shopButton: HTMLElement | null;
    drawingButtonsContainer: HTMLElement | null;
    catFoodUiContainer: HTMLElement | null;
    brushToolButton: ToolButton | null;
    clearInkToolButton: ToolButton | null;
    catFoodToolButton: ToolButton | null;
}

export class GameManager {
    private physicsManager: PhysicsManager;
    private quizSystem: QuizSystem;
    private stateMachine: StateMachine;
    private audioManager: AudioManager;
    private catManager: CatManager;
    private playerData: PlayerData;
    private shopManager: ShopManager;
    private inkManager: InkManager;
    private uiManager: UIManager;
    private themeManager: ThemeManager;
    private catFoodManager: CatFoodManager;
    private lastTimestamp: number = 0;
    private isRunning: boolean = false;
    private gameLoopRequestId?: number;
    private containerElement: HTMLElement; // Contenedor #app
    private keydownListener: ((event: KeyboardEvent) => void) | null = null;
    private controlElements: ControlElements;

    // Propiedades para Debounce
    private _lastToolToggleTime: number = 0;
    private readonly TOOL_TOGGLE_DEBOUNCE_MS = 300; // ms

    constructor(container: HTMLElement) {
        this.containerElement = container;
        console.log("GameManager: Constructor iniciado.");
        // Crear instancias
        this.audioManager = new AudioManager();
        this.quizSystem = new QuizSystem();
        this.playerData = new PlayerData();
        this.themeManager = new ThemeManager('body');
        this.catManager = new CatManager(this.audioManager, this);
        this.uiManager = new UIManager(this);
        this.shopManager = new ShopManager(this.playerData, this);
        this.inkManager = new InkManager(this);
        this.catFoodManager = new CatFoodManager(this);
        this.physicsManager = new PhysicsManager(this.catManager, this.catFoodManager);
        this.stateMachine = new StateMachine();

        // Inyección de dependencias
        this.catManager.setPhysicsManager(this.physicsManager);
        this.inkManager.setPhysicsManager(this.physicsManager);

        // Obtener referencias a controles y botones Lit
        this.controlElements = {
            controlsContainer: document.getElementById('right-controls'),
            shopButton: document.getElementById('shop-button'),
            drawingButtonsContainer: document.getElementById('drawing-buttons-container'),
            catFoodUiContainer: document.getElementById('cat-food-ui-container'),
            brushToolButton: document.querySelector('tool-button[toolId="brush"]'),
            clearInkToolButton: document.querySelector('tool-button[toolId="clear-ink"]'),
            catFoodToolButton: document.querySelector('tool-button[toolId="cat-food"]'),
        };
        // Verificar elementos principales
        if (!this.controlElements.controlsContainer) console.warn("GameManager: #right-controls no encontrado.");
        if (!this.controlElements.shopButton) console.warn("GameManager: #shop-button no encontrado.");
        if (!this.controlElements.brushToolButton) console.warn("GameManager: Botón Pincel (toolId='brush') no encontrado.");
        if (!this.controlElements.clearInkToolButton) console.warn("GameManager: Botón Borrar Tinta (toolId='clear-ink') no encontrado.");
        if (!this.controlElements.catFoodToolButton) console.warn("GameManager: Botón Comida (toolId='cat-food') no encontrado.");


        this.setupStates();
        console.log("GameManager: Constructor finalizado.");
    }

    // --- Funciones para controlar visibilidad de controles ---
    private showGameControls(): void {
        if (this.controlElements.controlsContainer) { this.controlElements.controlsContainer.style.display = 'flex'; }
        if (this.controlElements.shopButton) { this.controlElements.shopButton.style.display = 'flex'; }
        this.updateControlVisibilityBasedOnUnlocks(); // Llama a la función que actualiza botones
     }
    private hideGameControls(): void {
        if (this.controlElements.controlsContainer) this.controlElements.controlsContainer.style.display = 'none';
        if (this.controlElements.shopButton) this.controlElements.shopButton.style.display = 'none';
    }
    // Esta función ahora solo controla la visibilidad de los *contenedores*
    public updateControlVisibilityBasedOnUnlocks(): void {
        const drawingUnlocked = this.playerData.isDrawingUnlocked;
        const catFoodUnlocked = this.playerData.isCatFoodUnlocked;
        if (this.controlElements.drawingButtonsContainer) { this.controlElements.drawingButtonsContainer.classList.toggle('hidden', !drawingUnlocked); }
        if (this.controlElements.catFoodUiContainer) { this.controlElements.catFoodUiContainer.classList.toggle('hidden', !catFoodUnlocked); }
        // Llamar siempre a updateToolButtonStates para asegurar estado correcto de botones
        this.updateToolButtonStates();
    }
    // --- FIN Funciones Visibilidad ---


    /** Inicializa el juego, carga assets y configura listeners. */
    public async init(): Promise<void> {
        console.log('GameManager: init');
        this.playerData.reset();
        this.physicsManager.init(document.body);
        this.catFoodManager.init();
        this.addKeyboardListener();
        this.hideGameControls();
        await this.preload();
        this.setupToolButtonListeners(); // Configurar listeners de botones Lit aquí
        console.log("GameManager init completado.");
    }

    /** Configura los listeners para los eventos 'tool-activated' de los botones Lit. */
    private setupToolButtonListeners(): void {
        console.log("[GM LOG] Configurando listeners para tool-button...");

        this.controlElements.brushToolButton?.addEventListener('tool-activated', () => {
            console.log("[GM LOG] 'tool-activated' recibido para Pincel. Llamando a activateBrush()...");
            this.activateBrush();
        });

        this.controlElements.clearInkToolButton?.addEventListener('tool-activated', () => {
             console.log("[GM LOG] 'tool-activated' recibido para Borrar Tinta.");
            if (this.playerData.isDrawingUnlocked && this.playerData.inkSpentSinceLastClear > 0) {
                console.log("[GM LOG] Llamando a inkManager.clearInkLines()...");
                this.inkManager.clearInkLines(); // clearInkLines llama a updateInkUI -> updateToolButtonStates
            } else {
                console.log("[GM LOG] Borrar Tinta no ejecutado (condición no cumplida).");
            }
        });

        this.controlElements.catFoodToolButton?.addEventListener('tool-activated', () => {
             console.log("[GM LOG] 'tool-activated' recibido para Comida. Llamando a activateCatFood()...");
            this.activateCatFood();
        });
    }

    /** Carga los datos externos necesarios. */
    public async preload(): Promise<void> {
        console.log('GameManager: preload - Cargando assets...');
        const baseUrl = import.meta.env.BASE_URL;
        const cleanBaseUrl = baseUrl.replace(/\/$/, '');
        const questionsUrl = `${cleanBaseUrl}/data/questions.json`;
        const templatesUrl = `${cleanBaseUrl}/data/cat_templates.json`;
        const shopItemsUrl = `${cleanBaseUrl}/data/shop_items.json`;
        const themesUrl = `${cleanBaseUrl}/data/themes.json`;
        console.log('Base URL:', baseUrl);
        console.log('Loading from:', questionsUrl, templatesUrl, shopItemsUrl, themesUrl);

        try {
            const [questionResponse, templateResponse, shopResponse, themeResponse] = await Promise.all([
                fetch(questionsUrl), fetch(templatesUrl), fetch(shopItemsUrl), fetch(themesUrl)
            ]);
             if (!questionResponse.ok) throw new Error(`HTTP ${questionResponse.status} loading ${questionsUrl}`);
             if (!templateResponse.ok) throw new Error(`HTTP ${templateResponse.status} loading ${templatesUrl}`);
             if (!shopResponse.ok) throw new Error(`HTTP ${shopResponse.status} loading ${shopItemsUrl}`);
             if (!themeResponse.ok) throw new Error(`HTTP ${themeResponse.status} loading ${themesUrl}`);
            const questionData = await questionResponse.json();
            const templateData: CatTemplate[] = await templateResponse.json();
            const shopItemJsonData: ShopItemJsonData[] = await shopResponse.json();
            const themeData: Theme[] = await themeResponse.json();
            if (!Array.isArray(questionData)) throw new Error('Invalid questions format.');
            if (!Array.isArray(templateData)) throw new Error('Invalid templates format.');
            if (!Array.isArray(shopItemJsonData)) throw new Error('Invalid shop items format.');
            if (!Array.isArray(themeData)) throw new Error('Invalid themes format.');
            const questionsLoaded = await this.quizSystem.loadQuestionsData(questionData);
            if (!questionsLoaded) throw new Error("Failed to process questions.");
            this.catManager.loadTemplates(templateData);
            this.shopManager.init(shopItemJsonData); // Llama a init con los datos correctos
            const themesLoaded = await this.themeManager.loadThemesData(themeData);
            if (!themesLoaded) throw new Error("Failed to process themes.");

            console.log('GameManager: Preload completo.');
        } catch (error: any) {
            console.error('GameManager: Error durante preload:', error);
            this.containerElement.innerHTML = `Error loading assets: ${error.message}. Check console and asset URLs.`;
            throw error;
        }
     }

    /** Prepara el estado inicial del juego después de la carga. */
    public create(): void {
        console.log('GameManager: create');
        this.quizSystem.resetAvailableQuestions();
        this.catManager.removeAllCats();
        this.hideGameControls();
        if (!document.querySelector('combo-counter')) {
            const comboCounterElement = document.createElement('combo-counter');
            document.body.appendChild(comboCounterElement);
            console.log("GameManager: <combo-counter> añadido al body.");
        }
        this.stateMachine.changeState('MainMenu');
    }

    /** Configura la máquina de estados. */
    private setupStates(): void {
        const loadingState = new LoadingState(this);
        const mainMenuState = new MainMenuState(this);
        const quizGameplayState = new QuizGameplayState(this);
        const resultsState = new ResultsState(this);
        const gameOverState = new GameOverState(this);

        const wrapEnter = (state: IState, showControls: boolean) => {
            const originalEnter = state.enter.bind(state);
            return (params?: any) => {
                console.log(`Entering state: ${state.constructor.name}, Controls should be: ${showControls ? 'Shown' : 'Hidden'}`);
                if (showControls) this.showGameControls(); else this.hideGameControls();
                try { originalEnter(params); }
                catch (e) { console.error(`Error in original enter for ${state.constructor.name}:`, e); }
                // Asegurar que los botones estén actualizados al entrar a un estado relevante
                if (showControls) {
                    this.updateToolButtonStates();
                    if (state instanceof QuizGameplayState) {
                         this.updateCatFoodUI(); // Actualizar barra de comida
                         // updateControlVisibilityBasedOnUnlocks ya se llama en showGameControls
                    }
                }
            };
        };
        const wrapExit = (state: IState, hideControlsOnExit: boolean = true) => {
             const originalExit = state.exit.bind(state);
             return () => {
                 console.log(`Exiting state: ${state.constructor.name}, Hiding controls: ${hideControlsOnExit}`);
                 try { originalExit(); }
                 catch (e) { console.error(`Error in original exit for ${state.constructor.name}:`, e); }
                 if (hideControlsOnExit) this.hideGameControls();
             };
         };

        loadingState.enter = wrapEnter(loadingState, false); loadingState.exit = wrapExit(loadingState);
        mainMenuState.enter = wrapEnter(mainMenuState, false); mainMenuState.exit = wrapExit(mainMenuState);
        quizGameplayState.enter = wrapEnter(quizGameplayState, true); quizGameplayState.exit = wrapExit(quizGameplayState, true);
        resultsState.enter = wrapEnter(resultsState, false); resultsState.exit = wrapExit(resultsState);
        gameOverState.enter = wrapEnter(gameOverState, false); gameOverState.exit = wrapExit(gameOverState);

        this.stateMachine.addState('Loading', loadingState);
        this.stateMachine.addState('MainMenu', mainMenuState);
        this.stateMachine.addState('QuizGameplay', quizGameplayState);
        this.stateMachine.addState('Results', resultsState);
        this.stateMachine.addState('GameOver', gameOverState);
        this.stateMachine.addState('__shutdown__', { enter: () => { this.hideGameControls(); }, exit: () => {}, update: () => {} });
     }

    /** Añade la clase CSS correspondiente al estado actual al body. */
    public setBodyStateClass(stateName: string | null): void {
        const body = document.body;
        body.className.split(' ').forEach(cls => { if (cls.startsWith('state-')) { body.classList.remove(cls); } });
        if (stateName) { const newStateClass = `state-${stateName.toLowerCase()}`; body.classList.add(newStateClass); }
        else { console.log("Body state class cleared."); }
     }

    /** Inicia/Detiene el bucle principal del juego. */
    public start(): void { if (this.isRunning) return; console.log('GameManager: Starting game loop...'); this.isRunning = true; this.lastTimestamp = performance.now(); this.physicsManager.start(); this.gameLoopRequestId = requestAnimationFrame(this.gameLoop.bind(this)); }
    public stop(): void { if (!this.isRunning) return; console.log('GameManager: Stopping game loop...'); this.isRunning = false; if (this.gameLoopRequestId) cancelAnimationFrame(this.gameLoopRequestId); this.gameLoopRequestId = undefined; this.physicsManager.stop(); }
    /** Bucle principal del juego. */
    private gameLoop(timestamp: number): void { if (!this.isRunning) return; const deltaTime = (timestamp - this.lastTimestamp) / 1000.0; this.lastTimestamp = timestamp; const clampedDeltaTime = Math.min(deltaTime, 0.1); this.update(clampedDeltaTime); this.gameLoopRequestId = requestAnimationFrame(this.gameLoop.bind(this)); }
    /** Actualiza los sistemas en cada frame. */
    public update(deltaTime: number): void { try { this.stateMachine.update(deltaTime); this.catManager.updateCats(deltaTime); this.catFoodManager.update(deltaTime); } catch (error) { console.error("Error during game update loop:", error); this.stop(); } }
    /** Limpia recursos y detiene el juego. */
    public shutdown(): void {
        console.log('GameManager: shutdown');
        this.stop();
        this.hideGameControls();
        this.removeKeyboardListener();
        this.physicsManager.shutdown();
        const currentStateName = this.stateMachine.getCurrentStateName();
        if (currentStateName && currentStateName !== '__shutdown__') {
            try { const currentState = this.stateMachine.getCurrentState(); currentState?.exit(); } catch (e) { console.warn("Error in state exit() during shutdown:", e) } }
        this.stateMachine.changeState('__shutdown__');
        this.catManager.removeAllCats();
        this.inkManager.destroy();
        this.shopManager.destroy();
        this.catFoodManager.destroy();
        this.containerElement.innerHTML = '';
        this.setBodyStateClass(null);
        document.querySelector('combo-counter')?.remove();
        console.log("GameManager: Shutdown complete.");
     }

    /** Configura/Remueve el listener de teclado. */
    private addKeyboardListener(): void {
        if (this.keydownListener) return;
        this.keydownListener = (event: KeyboardEvent) => {
            if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return;
            const currentStateName = this.stateMachine.getCurrentStateName();
            const isShopOpen = document.getElementById(SHOP_POPUP_ID)?.hasAttribute('visible'); // Chequear atributo del componente Lit
            const isExplanationOpen = document.getElementById('explanation-overlay')?.classList.contains('visible');
            if (event.key === 'Escape') { if (isShopOpen) { this.closeShop(); return; } if (isExplanationOpen) { /* UI Manager debería manejar */ return; } }
            if (currentStateName === 'QuizGameplay') {
                if (event.key.toLowerCase() === 'p') {
                    this.themeManager.cycleTheme();
                    const currentState = this.stateMachine.getCurrentState();
                    if (currentState instanceof QuizGameplayState) {
                        currentState.rebuildInterface();
                    }
                }
                // --- USAR activateBrush / activateCatFood (ya tienen debounce) ---
                else if (event.key.toLowerCase() === 'b') {
                    if (!isShopOpen && !isExplanationOpen && this.playerData.isDrawingUnlocked) {
                        this.activateBrush(); // Llamar a la función con debounce
                    }
                }
                else if (event.key.toLowerCase() === 'f') {
                    if (!isShopOpen && !isExplanationOpen && this.playerData.isCatFoodUnlocked) {
                        this.activateCatFood(); // Llamar a la función con debounce
                    }
                }
                // --- FIN USO activateBrush / activateCatFood ---
                else if (event.key.toLowerCase() === 'c') {
                    // La acción de borrar no es un toggle, no necesita el mismo debounce
                    if (!isShopOpen && !isExplanationOpen && this.playerData.isDrawingUnlocked && this.playerData.inkSpentSinceLastClear > 0) {
                        this.inkManager.clearInkLines(); // Llama a updateToolButtonStates internamente
                    }
                }
                else if (event.key.toLowerCase() === 's') { if (!isExplanationOpen) { isShopOpen ? this.closeShop() : this.openShop(); } }
            }
        };
        window.addEventListener('keydown', this.keydownListener);
        console.log("GameManager: Keyboard listener added.");
     }
    private removeKeyboardListener(): void { if (this.keydownListener) { window.removeEventListener('keydown', this.keydownListener); this.keydownListener = null; console.log("GameManager: Keyboard listener removed."); } }

    // --- Métodos para interacción desde Estados u otros Managers ---
    public getLives(): number { return this.playerData.lives; }
    public decrementLives(): void { if (this.playerData.lives > 0) { this.playerData.lives--; this.updateExternalLivesUI(); } }
    public incrementLives(): void { this.playerData.lives++; this.updateExternalLivesUI(); }
    public openShop(): void { console.log("[GameManager] openShop llamado"); this.shopManager.openShop(); }
    public closeShop(): void { console.log("[GameManager] closeShop llamado"); this.shopManager.closeShop(); }
    public enableDrawingFeature(): boolean { try { this.inkManager.init(); this.updateInkUI(); this.updateControlVisibilityBasedOnUnlocks(); return true; } catch(e) { console.error("Error habilitando dibujo:", e); return false; } }
    public enableCatFoodFeature(): void { try { this.catFoodManager.enable(); this.updateCatFoodUI(); this.updateControlVisibilityBasedOnUnlocks(); } catch(e) { console.error("Error habilitando comida:", e); } }

    // Actualizar UIs externas
    public updateInkUI(): void { this.inkManager.updateInkUI(); /* updateToolButtonStates se llama dentro */ }
    public updateExternalLivesUI(): void { this.uiManager.updateLivesDisplay(this.playerData.lives); }
    public updateExternalShieldUI(isActive: boolean): void { this.uiManager.updateShieldIcon(isActive); }
    public updateExternalHintUI(charges: number): void { this.uiManager.updateHintIcon(charges); }
    public updateExternalScoreUI(): void { this.uiManager.updateScoreDisplay(this.playerData.score); }
    public updateCatFoodUI(): void { this.uiManager.updateCatFoodBar(this.playerData.currentCatFood, this.playerData.getMaxCatFood()); this.updateToolButtonStates(); }

    // --- Acciones de activación exclusiva (CON DEBOUNCE) ---
    public activateBrush(): void {
        const now = Date.now();
        if (now - this._lastToolToggleTime < this.TOOL_TOGGLE_DEBOUNCE_MS) {
            console.log("[GM LOG] activateBrush DEBOUNCED (too soon)");
            return;
        }
        this._lastToolToggleTime = now;

        console.log("[GM LOG] INTENTO activateBrush (post-debounce)");
        if (!this.playerData.isDrawingUnlocked) {
             console.log("[GM LOG] -> Ignorado (Dibujo no desbloqueado)");
             return;
        }
        if (this.catFoodManager.isActive) {
            console.log("[GM LOG] -> Desactivando comida...");
            this.catFoodManager.toggleActive(false); // Llama a updateToolButtonStates internamente
        }
        console.log("[GM LOG] -> Llamando a inkManager.toggleBrush()");
        this.inkManager.toggleBrush(); // Llama a updateToolButtonStates internamente
    }

    public activateCatFood(): void {
        const now = Date.now();
        if (now - this._lastToolToggleTime < this.TOOL_TOGGLE_DEBOUNCE_MS) {
            console.log("[GM LOG] activateCatFood DEBOUNCED (too soon)");
            return;
        }
        this._lastToolToggleTime = now;

        console.log("[GM LOG] INTENTO activateCatFood (post-debounce)");
        if (!this.playerData.isCatFoodUnlocked) {
            console.log("[GM LOG] -> Ignorado (Comida no desbloqueada)");
            return;
        }
        if (this.inkManager.isBrushActive) {
            console.log("[GM LOG] -> Desactivando pincel...");
            this.inkManager.toggleBrush(false); // Llama a updateToolButtonStates internamente
        }
        console.log("[GM LOG] -> Llamando a catFoodManager.toggleActive()");
        this.catFoodManager.toggleActive(); // Llama a updateToolButtonStates internamente
    }
    // --- FIN Acciones de activación con Debounce ---


    /** Actualiza los estados 'disabled' y 'active' de los botones de herramienta Lit. */
    public updateToolButtonStates(): void {
        // --- setTimeout ELIMINADO ---
        console.log("--- [GM LOG] updateToolButtonStates START ---");
        const isDrawingUnlocked = this.playerData.isDrawingUnlocked;
        const isCatFoodUnlocked = this.playerData.isCatFoodUnlocked;
        const canClearInk = isDrawingUnlocked && this.playerData.inkSpentSinceLastClear > 0;

        // Estado Pincel
        const brushButton = this.controlElements.brushToolButton;
        if (brushButton) {
            const isDisabled = !isDrawingUnlocked;
            const isActive = this.inkManager.isBrushActive; // Leer estado actual
            console.log(`[GM LOG] -> Pincel Check: isBrushActive=${isActive}`);
            console.log(`[GM LOG] -> Pincel SETTING: disabled=${isDisabled}, active=${isActive}`);
            brushButton.disabled = isDisabled;
            brushButton.active = isActive; // Asignar propiedad
            // Log asíncrono para verificar atributo (se mantiene por ahora)
            setTimeout(() => {
                const hasActiveAttr = brushButton.hasAttribute('active');
                console.log(`[GM LOG] -> Pincel DOM Check (async): Has 'active' attribute? ${hasActiveAttr}. Expected: ${isActive}`);
            }, 0);
        } else {
            console.warn("[GM LOG] -> Brush button element not found.");
        }

        // Estado Borrar Tinta
        const clearInkButton = this.controlElements.clearInkToolButton;
        if (clearInkButton) {
            const isDisabled = !isDrawingUnlocked || !canClearInk;
            clearInkButton.disabled = isDisabled;
            clearInkButton.active = false; // Nunca está "activo"
        } else {
             console.warn("[GM LOG] -> Clear Ink button element not found.");
        }

        // Estado Comida
        const catFoodButton = this.controlElements.catFoodToolButton;
        if (catFoodButton) {
            const isDisabled = !isCatFoodUnlocked;
            const isActive = this.catFoodManager.isActive; // Leer estado actual
            console.log(`[GM LOG] -> Comida Check: catFoodManager.isActive=${isActive}`);
            console.log(`[GM LOG] -> Comida SETTING: disabled=${isDisabled}, active=${isActive}`);
            catFoodButton.disabled = isDisabled;
            catFoodButton.active = isActive; // Asignar propiedad
            // Log asíncrono para verificar atributo (se mantiene por ahora)
            setTimeout(() => {
                const hasActiveAttr = catFoodButton.hasAttribute('active');
                console.log(`[GM LOG] -> Comida DOM Check (async): Has 'active' attribute? ${hasActiveAttr}. Expected: ${isActive}`);
            }, 0);
        } else {
             console.warn("[GM LOG] -> Cat Food button element not found.");
        }
        console.log("--- [GM LOG] updateToolButtonStates END ---");
        // --- FIN setTimeout ELIMINADO ---
     }

    // --- Getters ---
    public getQuizSystem(): QuizSystem { return this.quizSystem; }
    public getPhysicsManager(): PhysicsManager { return this.physicsManager; }
    public getStateMachine(): StateMachine { return this.stateMachine; }
    public getAudioManager(): AudioManager { return this.audioManager; }
    public getCatManager(): CatManager { return this.catManager; }
    public getShopManager(): ShopManager { return this.shopManager; }
    public getPlayerData(): PlayerData { return this.playerData; }
    public getInkManager(): InkManager { return this.inkManager; }
    public getUIManager(): UIManager { if (!this.uiManager) { throw new Error("UIManager no inicializado."); } return this.uiManager; }
    public getThemeManager(): ThemeManager { return this.themeManager; }
    public getCatFoodManager(): CatFoodManager { return this.catFoodManager; }
    public getContainerElement(): HTMLElement { return this.containerElement; }
    public getCurrentState(): IState | null { return this.stateMachine.getCurrentState(); }
    // Getter para los elementos de control
    public getControlElements(): ControlElements | null { return this.controlElements; }


} // Fin clase GameManager
