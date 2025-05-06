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

// Importar componente ToolButton y su tipo
import '../game/components/ui/tool-button.ts';
import type { ToolButton } from '../game/components/ui/tool-button';
// <<< CAMBIO: Importar combo-counter para asegurar registro >>>
import '../game/components/ui/combo-counter.ts';
// <<< FIN CAMBIO >>>


// Constante Global
const SHOP_POPUP_ID = 'shop-popup';

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

    constructor(container: HTMLElement) {
        this.containerElement = container;
        console.log("GameManager: Constructor iniciado.");
        // Crear instancias (sin cambios)
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

        // Inyección de dependencias (sin cambios)
        this.catManager.setPhysicsManager(this.physicsManager);
        this.inkManager.setPhysicsManager(this.physicsManager);

        // Obtener referencias a controles y botones Lit (sin cambios)
        this.controlElements = {
            controlsContainer: document.getElementById('right-controls'),
            shopButton: document.getElementById('shop-button'),
            drawingButtonsContainer: document.getElementById('drawing-buttons-container'),
            catFoodUiContainer: document.getElementById('cat-food-ui-container'),
            brushToolButton: document.querySelector('tool-button[toolId="brush"]'),
            clearInkToolButton: document.querySelector('tool-button[toolId="clear-ink"]'),
            catFoodToolButton: document.querySelector('tool-button[toolId="cat-food"]'),
        };
        // Verificar elementos principales (sin cambios)
        if (!this.controlElements.controlsContainer) console.warn("GameManager: #right-controls no encontrado.");
        // ... (otras verificaciones) ...

        this.setupStates();
        console.log("GameManager: Constructor finalizado.");
    }

    // --- Funciones para controlar visibilidad de controles (sin cambios) ---
    private showGameControls(): void { /* ... */
        if (this.controlElements.controlsContainer) {
            this.controlElements.controlsContainer.style.display = 'flex';
        }
        if (this.controlElements.shopButton) {
            this.controlElements.shopButton.style.display = 'flex';
        }
        this.updateControlVisibilityBasedOnUnlocks();
        this.updateToolButtonStates();
    }
    private hideGameControls(): void { /* ... */
        if (this.controlElements.controlsContainer) this.controlElements.controlsContainer.style.display = 'none';
        if (this.controlElements.shopButton) this.controlElements.shopButton.style.display = 'none';
    }
    public updateControlVisibilityBasedOnUnlocks(): void { /* ... */
        const drawingUnlocked = this.playerData.isDrawingUnlocked;
        const catFoodUnlocked = this.playerData.isCatFoodUnlocked;
        if (this.controlElements.drawingButtonsContainer) { this.controlElements.drawingButtonsContainer.classList.toggle('hidden', !drawingUnlocked); }
        if (this.controlElements.catFoodUiContainer) { this.controlElements.catFoodUiContainer.classList.toggle('hidden', !catFoodUnlocked); }
        if (this.controlElements.brushToolButton) { this.controlElements.brushToolButton.disabled = !drawingUnlocked; }
        if (this.controlElements.clearInkToolButton) { this.controlElements.clearInkToolButton.disabled = !drawingUnlocked; }
        if (this.controlElements.catFoodToolButton) { this.controlElements.catFoodToolButton.disabled = !catFoodUnlocked; }
        this.updateToolButtonStates();
    }
    // --- FIN Funciones Visibilidad ---


    /** Inicializa el juego, carga assets y configura listeners. */
    public async init(): Promise<void> { /* ... (código sin cambios) ... */
        console.log('GameManager: init');
        this.playerData.reset();
        this.physicsManager.init(document.body);
        this.catFoodManager.init();
        this.addKeyboardListener();
        this.hideGameControls();
        await this.preload();
        this.setupToolButtonListeners();
        console.log("GameManager init completado.");
    }

    /** Configura los listeners para los eventos 'tool-activated' de los botones Lit. */
    private setupToolButtonListeners(): void { /* ... (código sin cambios) ... */
        console.log("GameManager: Configurando listeners para tool-button...");
        this.controlElements.brushToolButton?.addEventListener('tool-activated', () => this.activateBrush());
        this.controlElements.clearInkToolButton?.addEventListener('tool-activated', () => { if (this.playerData.isDrawingUnlocked && this.playerData.inkSpentSinceLastClear > 0) { this.inkManager.clearInkLines(); this.updateToolButtonStates(); } });
        this.controlElements.catFoodToolButton?.addEventListener('tool-activated', () => this.activateCatFood());
    }

    /** Carga los datos externos necesarios. */
    public async preload(): Promise<void> { /* ... (código sin cambios) ... */
        console.log('GameManager: preload - Cargando assets...');
        const baseUrl = import.meta.env.BASE_URL;
        const cleanBaseUrl = baseUrl.replace(/\/$/, '');
        const questionsUrl = `${cleanBaseUrl}/data/questions.json`;
        const templatesUrl = `${cleanBaseUrl}/data/cat_templates.json`;
        const shopItemsUrl = `${cleanBaseUrl}/data/shop_items.json`;
        const themesUrl = `${cleanBaseUrl}/data/themes.json`;

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
            this.shopManager.init(shopItemJsonData);
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

        // <<< CAMBIO: Añadir <combo-counter> al body si no existe >>>
        if (!document.querySelector('combo-counter')) {
            const comboCounterElement = document.createElement('combo-counter');
            // No necesita ID si siempre hay solo uno y lo buscamos por tag name
            document.body.appendChild(comboCounterElement);
            console.log("GameManager: <combo-counter> añadido al body.");
        }
        // <<< FIN CAMBIO >>>

        this.stateMachine.changeState('MainMenu');
    }

    /** Configura la máquina de estados. */
    private setupStates(): void { /* ... (código sin cambios) ... */
        const loadingState = new LoadingState(this);
        const mainMenuState = new MainMenuState(this);
        const quizGameplayState = new QuizGameplayState(this);
        const resultsState = new ResultsState(this);
        const gameOverState = new GameOverState(this);

        const wrapEnter = (state: IState, showControls: boolean) => {
            const originalEnter = state.enter.bind(state);
            return (params?: any) => {
                if (showControls) this.showGameControls(); else this.hideGameControls();
                try { originalEnter(params); }
                catch (e) { console.error(`Error in original enter for ${state.constructor.name}:`, e); }
                if (showControls && state instanceof QuizGameplayState) { this.updateCatFoodUI(); }
                 if (showControls && state instanceof QuizGameplayState) { this.updateControlVisibilityBasedOnUnlocks(); }
            };
        };
        const wrapExit = (state: IState, hideControlsOnExit: boolean = true) => {
             const originalExit = state.exit.bind(state);
             return () => {
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
    public setBodyStateClass(stateName: string | null): void { /* ... (código sin cambios) ... */
        const body = document.body;
        body.className.split(' ').forEach(cls => { if (cls.startsWith('state-')) { body.classList.remove(cls); } });
        if (stateName) { const newStateClass = `state-${stateName.toLowerCase()}`; body.classList.add(newStateClass); }
     }

    /** Inicia/Detiene el bucle principal del juego. */
    public start(): void { /* ... (código sin cambios) ... */ if (this.isRunning) return; this.isRunning = true; this.lastTimestamp = performance.now(); this.physicsManager.start(); this.gameLoopRequestId = requestAnimationFrame(this.gameLoop.bind(this)); }
    public stop(): void { /* ... (código sin cambios) ... */ if (!this.isRunning) return; this.isRunning = false; if (this.gameLoopRequestId) cancelAnimationFrame(this.gameLoopRequestId); this.gameLoopRequestId = undefined; this.physicsManager.stop(); }
    /** Bucle principal del juego. */
    private gameLoop(timestamp: number): void { /* ... (código sin cambios) ... */ if (!this.isRunning) return; const deltaTime = (timestamp - this.lastTimestamp) / 1000.0; this.lastTimestamp = timestamp; const clampedDeltaTime = Math.min(deltaTime, 0.1); this.update(clampedDeltaTime); this.gameLoopRequestId = requestAnimationFrame(this.gameLoop.bind(this)); }
    /** Actualiza los sistemas en cada frame. */
    public update(deltaTime: number): void { /* ... (código sin cambios) ... */ try { this.stateMachine.update(deltaTime); this.catManager.updateCats(deltaTime); this.catFoodManager.update(deltaTime); } catch (error) { console.error("Error during game update loop:", error); this.stop(); } }
    /** Limpia recursos y detiene el juego. */
    public shutdown(): void { /* ... (código sin cambios) ... */
        console.log('GameManager: shutdown');
        this.stop();
        this.hideGameControls();
        this.removeKeyboardListener();
        this.physicsManager.shutdown();
        const currentStateName = this.stateMachine.getCurrentStateName();
        if (currentStateName && currentStateName !== '__shutdown__') {
            try { this.stateMachine.getCurrentState()?.exit(); } catch (e) { /* Ignorar */ }
        }
        this.stateMachine.changeState('__shutdown__');
        this.catManager.removeAllCats();
        this.inkManager.destroy();
        this.shopManager.destroy();
        this.catFoodManager.destroy();
        this.containerElement.innerHTML = '';
        this.setBodyStateClass(null);
        // <<< CAMBIO: Eliminar combo-counter del body al apagar >>>
        document.querySelector('combo-counter')?.remove();
        // <<< FIN CAMBIO >>>
        console.log("GameManager: Shutdown complete.");
     }

    /** Configura/Remueve el listener de teclado. */
    private addKeyboardListener(): void { /* ... (código sin cambios, llama a los mismos métodos) ... */
        if (this.keydownListener) return;
        this.keydownListener = (event: KeyboardEvent) => {
            if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return;
            const currentStateName = this.stateMachine.getCurrentStateName();
            const isShopOpen = document.getElementById(SHOP_POPUP_ID)?.classList.contains('visible');
            const isExplanationOpen = document.getElementById('explanation-overlay')?.classList.contains('visible');
            if (event.key === 'Escape') { if (isShopOpen) { this.closeShop(); return; } if (isExplanationOpen) { return; } }
            if (currentStateName === 'QuizGameplay') {
                if (event.key.toLowerCase() === 'p') {
                    this.themeManager.cycleTheme();
                    const currentState = this.stateMachine.getCurrentState();
                    if (currentState instanceof QuizGameplayState) { currentState.rebuildInterface(); }
                }
                else if (event.key.toLowerCase() === 'b') { if (!isShopOpen && !isExplanationOpen && this.playerData.isDrawingUnlocked) { this.activateBrush(); } }
                else if (event.key.toLowerCase() === 'f') { if (!isShopOpen && !isExplanationOpen && this.playerData.isCatFoodUnlocked) { this.activateCatFood(); } }
                else if (event.key.toLowerCase() === 'c') {
                    if (!isShopOpen && !isExplanationOpen && this.playerData.isDrawingUnlocked && this.playerData.inkSpentSinceLastClear > 0) {
                        this.inkManager.clearInkLines();
                        this.updateToolButtonStates();
                    }
                }
                else if (event.key.toLowerCase() === 's') { if (!isExplanationOpen) { isShopOpen ? this.closeShop() : this.openShop(); } }
            }
        };
        window.addEventListener('keydown', this.keydownListener);
     }
    private removeKeyboardListener(): void { /* ... (código sin cambios) ... */ if (this.keydownListener) { window.removeEventListener('keydown', this.keydownListener); this.keydownListener = null; } }

    // --- Métodos de interacción (sin cambios) ---
    public getLives(): number { return this.playerData.lives; }
    public decrementLives(): void { if (this.playerData.lives > 0) { this.playerData.lives--; this.updateExternalLivesUI(); } }
    public incrementLives(): void { this.playerData.lives++; this.updateExternalLivesUI(); }
    public openShop(): void { this.shopManager.openShop(); }
    public closeShop(): void { this.shopManager.closeShop(); }
    public enableDrawingFeature(): boolean { try { this.inkManager.init(); this.updateInkUI(); this.updateControlVisibilityBasedOnUnlocks(); return true; } catch(e) { console.error("Error habilitando dibujo:", e); return false; } }
    public enableCatFoodFeature(): void { try { this.catFoodManager.enable(); this.updateCatFoodUI(); this.updateControlVisibilityBasedOnUnlocks(); } catch(e) { console.error("Error habilitando comida:", e); } }

    // --- Actualizar UIs externas (sin cambios) ---
    public updateInkUI(): void { this.inkManager.updateInkUI(); this.updateToolButtonStates(); }
    public updateExternalLivesUI(): void { this.uiManager.updateLivesDisplay(this.playerData.lives); }
    public updateExternalShieldUI(isActive: boolean): void { this.uiManager.updateShieldIcon(isActive); }
    public updateExternalHintUI(charges: number): void { this.uiManager.updateHintIcon(charges); }
    public updateExternalScoreUI(): void { this.uiManager.updateScoreDisplay(this.playerData.score); }
    public updateCatFoodUI(): void { this.uiManager.updateCatFoodBar(this.playerData.currentCatFood, this.playerData.getMaxCatFood()); this.updateToolButtonStates(); }

    // --- Acciones de activación exclusiva (Modificado para llamar updateToolButtonStates) ---
    public activateBrush(): void {
        if (!this.playerData.isDrawingUnlocked) return;
        if (this.catFoodManager.isActive) { this.catFoodManager.toggleActive(false); }
        this.inkManager.toggleBrush();
        this.updateToolButtonStates(); // Actualizar estado visual de botones
    }
    public activateCatFood(): void {
        if (!this.playerData.isCatFoodUnlocked) return;
        if (this.inkManager.isBrushActive) { this.inkManager.toggleBrush(false); }
        this.catFoodManager.toggleActive();
        this.updateToolButtonStates(); // Actualizar estado visual de botones
    }
    // --- FIN Acciones de activación ---

    /** Actualiza los estados 'disabled' y 'active' de los botones de herramienta Lit. */
    public updateToolButtonStates(): void { /* ... (código sin cambios) ... */
        const isDrawingUnlocked = this.playerData.isDrawingUnlocked;
        const isCatFoodUnlocked = this.playerData.isCatFoodUnlocked;
        const canUseBrush = isDrawingUnlocked && this.playerData.currentInk > 0;
        const canClearInk = isDrawingUnlocked && this.playerData.inkSpentSinceLastClear > 0;
        const canUseFood = isCatFoodUnlocked && this.playerData.currentCatFood > 0;

        if (this.controlElements.brushToolButton) {
            this.controlElements.brushToolButton.disabled = !isDrawingUnlocked || (!canUseBrush && !this.inkManager.isBrushActive);
            this.controlElements.brushToolButton.active = this.inkManager.isBrushActive;
        }
        if (this.controlElements.clearInkToolButton) {
            this.controlElements.clearInkToolButton.disabled = !isDrawingUnlocked || !canClearInk;
            this.controlElements.clearInkToolButton.active = false;
        }
        if (this.controlElements.catFoodToolButton) {
            this.controlElements.catFoodToolButton.disabled = !isCatFoodUnlocked || (!canUseFood && !this.catFoodManager.isActive);
            this.controlElements.catFoodToolButton.active = this.catFoodManager.isActive;
        }
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
