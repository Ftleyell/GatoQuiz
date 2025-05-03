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
import { CatFoodManager } from '../systems/CatFoodManager';

// Importaciones de Estados
import { LoadingState } from './states/LoadingState';
import { MainMenuState } from './states/MainMenuState';
import { QuizGameplayState } from './states/QuizGameplayState';
import { ResultsState } from './states/ResultsState';
import { GameOverState } from './states/GameOverState';

// Constante Global
const SHOP_POPUP_ID = 'shop-popup'; // Asegúrate que esté definida o impórtala

// Tipos locales
type ControlElements = {
    controlsContainer: HTMLElement | null;
    shopButton: HTMLElement | null;
    drawingButtonsContainer: HTMLElement | null;
    catFoodUiContainer: HTMLElement | null;
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

    // Referencias a elementos de control (para visibilidad)
    private controlElements: ControlElements;

    constructor(container: HTMLElement) {
        this.containerElement = container; // Guardar #app
        console.log("GameManager: Constructor iniciado.");
        // Crear instancias de todos los managers
        this.audioManager = new AudioManager();
        this.quizSystem = new QuizSystem();
        this.playerData = new PlayerData();
        this.themeManager = new ThemeManager('body'); // Aplica temas al body
        // Pasar 'this' (GameManager) a los managers que lo necesiten
        this.catManager = new CatManager(this.audioManager, this);
        this.uiManager = new UIManager(this);
        this.shopManager = new ShopManager(this.playerData, this);
        this.inkManager = new InkManager(this);
        this.catFoodManager = new CatFoodManager(this);
        this.physicsManager = new PhysicsManager(this.catManager, this.catFoodManager);
        this.stateMachine = new StateMachine();

        // Inyección de dependencias post-construcción
        this.catManager.setPhysicsManager(this.physicsManager);
        this.inkManager.setPhysicsManager(this.physicsManager);

        // Obtener referencias a controles una vez
        this.controlElements = {
            controlsContainer: document.getElementById('right-controls'),
            shopButton: document.getElementById('shop-button'),
            drawingButtonsContainer: document.getElementById('drawing-buttons-container'),
            catFoodUiContainer: document.getElementById('cat-food-ui-container')
        };
        // Verificar si se encontraron los elementos principales de control
        if (!this.controlElements.controlsContainer) console.warn("GameManager: #right-controls no encontrado.");
        if (!this.controlElements.shopButton) console.warn("GameManager: #shop-button no encontrado.");

        this.setupStates(); // Configurar la máquina de estados
        console.log("GameManager: Constructor finalizado.");
    }

    // --- Funciones para controlar visibilidad de controles ---
    /** Muestra los controles principales del juego (barra y botón tienda). */
    private showGameControls(): void {
        // console.log("Attempting to SHOW Game Controls..."); // Log opcional
        // --- CORRECCIÓN: Variables eliminadas ---
        // let controlsShown = false;
        // let shopShown = false;
        // --- FIN CORRECCIÓN ---
        // Mostrar contenedor principal de herramientas y botón de tienda
        if (this.controlElements.controlsContainer) {
            this.controlElements.controlsContainer.style.display = 'flex';
            // controlsShown = true; // Eliminado
        }
        if (this.controlElements.shopButton) {
            this.controlElements.shopButton.style.display = 'flex';
            // shopShown = true; // Eliminado
        }
        // Actualizar visibilidad de sub-contenedores según unlocks
        this.updateControlVisibilityBasedOnUnlocks();
        // console.log(`Game Controls Shown: ToolbarContainer=${controlsShown}, ShopBtn=${shopShown}`); // Log opcional (eliminado)
    }

    /** Oculta los controles principales del juego. */
    private hideGameControls(): void {
        // console.log("Attempting to HIDE Game Controls..."); // Log opcional
        if (this.controlElements.controlsContainer) this.controlElements.controlsContainer.style.display = 'none';
        if (this.controlElements.shopButton) this.controlElements.shopButton.style.display = 'none';
        // console.log("Game Controls Hidden"); // Log opcional
    }

    /** Actualiza la visibilidad de los botones de dibujo y comida según PlayerData. */
    public updateControlVisibilityBasedOnUnlocks(): void {
        const drawingUnlocked = this.playerData.isDrawingUnlocked;
        const catFoodUnlocked = this.playerData.isCatFoodUnlocked;
        // <<< LOGS AÑADIDOS >>>
        console.log(`[GM.updateVis] Status: DrawingUnlocked=${drawingUnlocked}, CatFoodUnlocked=${catFoodUnlocked}`);

        // --- Contenedor Dibujo ---
        const drawingContainer = this.controlElements.drawingButtonsContainer;
        if (drawingContainer) {
            console.log(`[GM.updateVis] #drawing-buttons-container ENCONTRADO. ¿Tiene clase 'hidden' ANTES? ${drawingContainer.classList.contains('hidden')}`);
            // La lógica es: ocultar si NO está desbloqueado (!drawingUnlocked)
            const shouldBeHidden = !drawingUnlocked;
            drawingContainer.classList.toggle('hidden', shouldBeHidden);
            console.log(`[GM.updateVis] -> ¿Debería estar oculto? ${shouldBeHidden}. ¿Tiene clase 'hidden' DESPUÉS? ${drawingContainer.classList.contains('hidden')}`);
        } else {
            console.error("[GM.updateVis] #drawing-buttons-container NO ENCONTRADO."); // << ERROR si no lo encuentra
        }

        // --- Contenedor Comida ---
        const foodContainer = this.controlElements.catFoodUiContainer;
        if (foodContainer) {
            // console.log(`[GM.updateVis] #cat-food-ui-container ENCONTRADO. ¿Tiene clase 'hidden' ANTES? ${foodContainer.classList.contains('hidden')}`);
            const shouldBeHidden = !catFoodUnlocked;
            foodContainer.classList.toggle('hidden', shouldBeHidden);
            // console.log(`[GM.updateVis] -> ¿Debería estar oculto (Comida)? ${shouldBeHidden}. ¿Tiene clase 'hidden' DESPUÉS? ${foodContainer.classList.contains('hidden')}`);
        } else {
             console.warn("[GM.updateVis] #cat-food-ui-container NO ENCONTRADO.");
        }
        // <<< FIN LOGS >>>
    }
    // --- FIN Funciones Visibilidad ---


    /** Inicializa el juego, carga assets y configura listeners. */
    public async init(): Promise<void> {
        console.log('GameManager: init');
        this.playerData.reset(); // Resetear datos antes de todo
        this.physicsManager.init(document.body); // Usar body para físicas
        this.catFoodManager.init();
        this.addKeyboardListener();
        this.hideGameControls(); // Ocultar al inicio
        await this.preload();
        console.log("GameManager init completado.");
    }

    /** Carga los datos externos necesarios (preguntas, plantillas, tienda, temas). */
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
        this.hideGameControls(); // Ocultar antes de ir al menú
        this.stateMachine.changeState('MainMenu');
    }

    /** Configura la máquina de estados y modifica enter/exit para visibilidad. */
    private setupStates(): void {
        const loadingState = new LoadingState(this);
        const mainMenuState = new MainMenuState(this);
        const quizGameplayState = new QuizGameplayState(this);
        const resultsState = new ResultsState(this);
        const gameOverState = new GameOverState(this);

        // Wrapper para asegurar que hide/show se llamen correctamente
        const wrapEnter = (state: IState, showControls: boolean) => {
            const originalEnter = state.enter.bind(state);
            return (params?: any) => {
                console.log(`Entering state: ${state.constructor.name}, Controls should be: ${showControls ? 'Shown' : 'Hidden'}`);
                if (showControls) this.showGameControls(); else this.hideGameControls();
                try { originalEnter(params); }
                catch (e) { console.error(`Error in original enter for ${state.constructor.name}:`, e); }
                // Llamar a updateCatFoodUI al entrar al juego para estado inicial
                if (showControls && state instanceof QuizGameplayState) { this.updateCatFoodUI(); }
                 // Actualizar visibilidad general de controles al entrar a Gameplay
                 if (showControls && state instanceof QuizGameplayState) { this.updateControlVisibilityBasedOnUnlocks(); }
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

        // Aplicar wrappers
        loadingState.enter = wrapEnter(loadingState, false); loadingState.exit = wrapExit(loadingState);
        mainMenuState.enter = wrapEnter(mainMenuState, false); mainMenuState.exit = wrapExit(mainMenuState);
        quizGameplayState.enter = wrapEnter(quizGameplayState, true); quizGameplayState.exit = wrapExit(quizGameplayState, true); // Ocultar controles al salir del juego
        resultsState.enter = wrapEnter(resultsState, false); resultsState.exit = wrapExit(resultsState);
        gameOverState.enter = wrapEnter(gameOverState, false); gameOverState.exit = wrapExit(gameOverState);

        // Añadir estados a la máquina
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

    /** Inicia el bucle principal del juego y la física. */
    public start(): void { if (this.isRunning) return; console.log('GameManager: Starting game loop...'); this.isRunning = true; this.lastTimestamp = performance.now(); this.physicsManager.start(); this.gameLoopRequestId = requestAnimationFrame(this.gameLoop.bind(this)); }
    /** Detiene el bucle principal del juego y la física. */
    public stop(): void { if (!this.isRunning) return; console.log('GameManager: Stopping game loop...'); this.isRunning = false; if (this.gameLoopRequestId) cancelAnimationFrame(this.gameLoopRequestId); this.gameLoopRequestId = undefined; this.physicsManager.stop(); }
    /** Bucle principal del juego, actualiza sistemas. */
    private gameLoop(timestamp: number): void { if (!this.isRunning) return; const deltaTime = (timestamp - this.lastTimestamp) / 1000.0; this.lastTimestamp = timestamp; const clampedDeltaTime = Math.min(deltaTime, 0.1); this.update(clampedDeltaTime); this.gameLoopRequestId = requestAnimationFrame(this.gameLoop.bind(this)); }
    /** Actualiza los sistemas en cada frame. */
    public update(deltaTime: number): void { try { this.stateMachine.update(deltaTime); this.catManager.updateCats(deltaTime); this.catFoodManager.update(deltaTime); } catch (error) { console.error("Error during game update loop:", error); this.stop(); } }
    /** Limpia recursos y detiene el juego. */
    public shutdown(): void { console.log('GameManager: shutdown'); this.stop(); this.hideGameControls(); this.removeKeyboardListener(); this.physicsManager.shutdown(); const currentStateName = this.stateMachine.getCurrentStateName(); if (currentStateName && currentStateName !== '__shutdown__') { try { const currentState = this.stateMachine.getCurrentState(); currentState?.exit(); } catch (e) { console.warn("Error in state exit() during shutdown:", e) } } this.stateMachine.changeState('__shutdown__'); this.catManager.removeAllCats(); this.inkManager.destroy(); this.shopManager.destroy(); this.catFoodManager.destroy(); this.containerElement.innerHTML = ''; this.setBodyStateClass(null); console.log("GameManager: Shutdown complete."); }

    /** Configura el listener de teclado para acciones globales. */
    private addKeyboardListener(): void {
        if (this.keydownListener) return;
        this.keydownListener = (event: KeyboardEvent) => {
            if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return;
            const currentStateName = this.stateMachine.getCurrentStateName();
            const isShopOpen = document.getElementById(SHOP_POPUP_ID)?.classList.contains('visible');
            const isExplanationOpen = document.getElementById('explanation-overlay')?.classList.contains('visible');
            if (event.key === 'Escape') { if (isShopOpen) { this.closeShop(); return; } if (isExplanationOpen) { /* UI Manager debería manejar */ return; } }
            if (currentStateName === 'QuizGameplay') {
                if (event.key.toLowerCase() === 'p') { this.themeManager.cycleTheme(); const currentState = this.stateMachine.getCurrentState(); if (currentState instanceof QuizGameplayState) { currentState.rebuildInterface(); } }
                else if (event.key.toLowerCase() === 'b') { if (!isShopOpen && !isExplanationOpen && this.playerData.isDrawingUnlocked) { this.activateBrush(); } }
                else if (event.key.toLowerCase() === 'f') { if (!isShopOpen && !isExplanationOpen && this.playerData.isCatFoodUnlocked) { this.activateCatFood(); } }
                else if (event.key.toLowerCase() === 'c') { if (!isShopOpen && !isExplanationOpen && this.playerData.isDrawingUnlocked && this.playerData.inkSpentSinceLastClear > 0) { this.inkManager.clearInkLines(); } }
                else if (event.key.toLowerCase() === 's') { if (!isExplanationOpen) { isShopOpen ? this.closeShop() : this.openShop(); } }
            }
        };
        window.addEventListener('keydown', this.keydownListener);
        console.log("GameManager: Keyboard listener added.");
    }
    /** Remueve el listener de teclado. */
    private removeKeyboardListener(): void { if (this.keydownListener) { window.removeEventListener('keydown', this.keydownListener); this.keydownListener = null; console.log("GameManager: Keyboard listener removed."); } }

    // --- Métodos para interacción desde Estados u otros Managers ---
    public getLives(): number { return this.playerData.lives; }
    public decrementLives(): void { if (this.playerData.lives > 0) { this.playerData.lives--; this.updateExternalLivesUI(); } }
    public incrementLives(): void { this.playerData.lives++; this.updateExternalLivesUI(); }
    public openShop(): void { console.log("[GameManager] openShop llamado"); this.shopManager.openShop(); }
    public closeShop(): void { console.log("[GameManager] closeShop llamado"); this.shopManager.closeShop(); }

    /** Acción llamada DESPUÉS de que ShopManager actualice el flag de PlayerData */
    // <<< CORRECCIÓN: Ya no verifica el flag, solo inicializa/habilita >>>
    public enableDrawingFeature(): boolean {
        console.log("[GameManager] LLAMANDO a enableDrawingFeature (para inicializar InkManager)...");
        // --- QUITAR VERIFICACIÓN ---
        // if (this.playerData.isDrawingUnlocked) {
        //     console.log(" -> Dibujo ya desbloqueado. Actualizando UI.");
        //     this.updateControlVisibilityBasedOnUnlocks();
        //     return true;
        // }
        // --- FIN QUITAR VERIFICACIÓN ---
        try {
            console.log(" -> Llamando a inkManager.init()...");
            this.inkManager.init(); // InkManager tiene su propio check 'isInitialized'
            this.updateInkUI();
            // Llamar a updateControlVisibility para asegurar que los botones sean visibles si estaban ocultos
            this.updateControlVisibilityBasedOnUnlocks();
            console.log(" -> InkManager inicializado via enableDrawingFeature.");
            return true;
        } catch(e) {
            console.error(" -> Error durante inkManager.init() llamado desde enableDrawingFeature:", e);
            // Considerar revertir el flag en PlayerData si falla aquí? (Probablemente no, la compra ya se hizo)
            return false;
        }
    }

    /** Acción llamada DESPUÉS de que ShopManager actualice el flag de PlayerData */
     // <<< CORRECCIÓN: Ya no verifica el flag, solo habilita >>>
    public enableCatFoodFeature(): void {
        console.log("[GameManager] LLAMANDO a enableCatFoodFeature (para habilitar CatFoodManager)...");
        // --- QUITAR VERIFICACIÓN ---
        // if (this.playerData.isCatFoodUnlocked) {
        //      console.log(" -> Comida ya desbloqueada. Actualizando UI.");
        //      this.updateControlVisibilityBasedOnUnlocks();
        //      this.updateCatFoodUI();
        //      return;
        // }
         // --- FIN QUITAR VERIFICACIÓN ---
        try {
            console.log(" -> Llamando a catFoodManager.enable()...");
            this.catFoodManager.enable(); // CatFoodManager tiene su propio check 'isEnabled'
            this.updateCatFoodUI();
             // Llamar a updateControlVisibility para asegurar que los botones sean visibles
            this.updateControlVisibilityBasedOnUnlocks();
            console.log(" -> CatFoodManager habilitado via enableCatFoodFeature.");
        } catch(e) {
             console.error(" -> Error durante catFoodManager.enable() llamado desde enableCatFoodFeature:", e);
              // Considerar revertir el flag en PlayerData si falla aquí? (Probablemente no)
        }
    }

    // Actualizar UIs externas
    public updateInkUI(): void { this.inkManager.updateInkUI(); }
    public updateExternalLivesUI(): void { this.uiManager.updateLivesDisplay(this.playerData.lives); }
    public updateExternalShieldUI(isActive: boolean): void { this.uiManager.updateShieldIcon(isActive); }
    public updateExternalHintUI(charges: number): void { this.uiManager.updateHintIcon(charges); }
    public updateExternalScoreUI(): void { this.uiManager.updateScoreDisplay(this.playerData.score); }
    public updateCatFoodUI(): void { this.uiManager.updateCatFoodBar(this.playerData.currentCatFood, this.playerData.getMaxCatFood()); }

    // --- Acciones de activación exclusiva (CON LOGS MEJORADOS) ---
    public activateBrush(): void {
        // <<< LOG AÑADIDO >>>
        console.log("[GameManager] INTENTO activateBrush");
        if (!this.playerData.isDrawingUnlocked) {
            console.log(" -> Bloqueado: Dibujo no desbloqueado.");
            return;
        }
        // <<< LOG AÑADIDO >>>
        console.log(` -> Estado ANTES: CatFood Active = ${this.catFoodManager.isActive}, InkBrush Active = ${this.inkManager.isBrushActive}`);

        if (this.catFoodManager.isActive) {
            console.log(" -> Desactivando CatFood (porque Brush se activará)..."); // << LOG AÑADIDO
            this.catFoodManager.toggleActive(false); // Llama a toggleActive de CatFoodManager
        }

        console.log(" -> Llamando a inkManager.toggleBrush()..."); // << LOG AÑADIDO
        this.inkManager.toggleBrush(); // Llama al toggle del InkManager
        // <<< LOG AÑADIDO >>>
        console.log(` -> Estado DESPUÉS: CatFood Active = ${this.catFoodManager.isActive}, InkBrush Active = ${this.inkManager.isBrushActive}`);
    }

    public activateCatFood(): void {
        // <<< LOG AÑADIDO >>>
        console.log("[GameManager] INTENTO activateCatFood");
        if (!this.playerData.isCatFoodUnlocked) {
            console.log(" -> Bloqueado: Comida no desbloqueada.");
            return;
        }
         // <<< LOG AÑADIDO >>>
         console.log(` -> Estado ANTES: CatFood Active = ${this.catFoodManager.isActive}, InkBrush Active = ${this.inkManager.isBrushActive}`);

        if (this.inkManager.isBrushActive) {
             console.log(" -> Desactivando InkBrush (porque CatFood se activará)..."); // << LOG AÑADIDO
            this.inkManager.toggleBrush(false); // Llama a toggleBrush de InkManager
        }

        console.log(" -> Llamando a catFoodManager.toggleActive()..."); // << LOG AÑADIDO
        this.catFoodManager.toggleActive(); // Llama al toggle del CatFoodManager
        // <<< LOG AÑADIDO >>>
         console.log(` -> Estado DESPUÉS: CatFood Active = ${this.catFoodManager.isActive}, InkBrush Active = ${this.inkManager.isBrushActive}`);
    }

    // --- Getters (sin cambios) ---
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

} // Fin clase GameManager