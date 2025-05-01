// src/game/GameManager.ts

import { PhysicsManager } from '../systems/PhysicsManager';
import { QuizSystem } from '../systems/QuizSystem';
import { StateMachine } from './StateMachine';
import { AudioManager } from '../systems/AudioManager';
import { CatManager } from '../systems/CatManager';
import { ShopManager } from '../systems/ShopManager';
import { PlayerData } from './PlayerData';
import { CatTemplate } from '../types/CatTemplate';
import { ShopItemData } from '../types/ShopItemData';

// Estados
import { LoadingState } from './states/LoadingState';
import { MainMenuState } from './states/MainMenuState';
import { QuizGameplayState } from './states/QuizGameplayState';
import { ResultsState } from './states/ResultsState';
import { GameOverState } from './states/GameOverState';

// --- Definiciones de Ítems de la Tienda (Ejemplo Hardcodeado) ---
const shopItemDefinitions: ShopItemData[] = [
    // --- Consumibles ---
    {
        id: 'life', name: "Comprar 1 Vida", icon: '❤️', isLeveled: false, category: 'consumable',
        getCost: (pd) => 50 + pd.lives * 25, getEffectText: (pd) => `Recupera una vida. Tienes ${pd.lives}.`,
        canPurchaseCheck: (pd) => pd.lives < 5, purchaseAction: (sm) => sm.purchaseLife()
    }, {
        id: 'shield', name: "Escudo Temporal", icon: '🛡️', isLeveled: false, category: 'consumable',
        getCost: (pd) => 75, getEffectText: (pd) => `Absorbe el siguiente error ${pd.hasShield ? '(Activo)' : ''}.`,
        isPurchased: (pd) => pd.hasShield, canPurchaseCheck: (pd) => !pd.hasShield,
        purchaseAction: (sm) => sm.purchaseShield()
    }, {
        id: 'hint', name: "Pista (3 Usos)", icon: '💡', isLeveled: false, category: 'consumable',
        getCost: (pd) => 60, getEffectText: (pd) => `Elimina 1 opción incorrecta por 3 preguntas ${pd.hintCharges > 0 ? `(${pd.hintCharges} restantes)` : ''}.`,
        isPurchased: (pd) => pd.hintCharges > 0, canPurchaseCheck: (pd) => pd.hintCharges <= 0,
        purchaseAction: (sm) => sm.purchaseHint()
    },
    // --- Desbloqueables ---
    {
        id: 'unlockDrawing', name: "Desbloquear Dibujo", icon: '🖌️', isLeveled: false, category: 'unlockable',
        getCost: (pd) => 200, getEffectText: (pd) => `Permite usar el pincel ${pd.isDrawingUnlocked ? '(Desbloqueado)' : ''}.`,
        isPurchased: (pd) => pd.isDrawingUnlocked, canPurchaseCheck: (pd) => !pd.isDrawingUnlocked,
        purchaseAction: (sm) => sm.purchaseUnlockDrawing()
    },
    // --- Mejorables ---
    {
        id: 'comboMultiplier', name: "Multiplicador Combo", icon: '✨', isLeveled: true, maxLevel: 5, category: 'upgradeable',
        getCost: (pd) => 100 * Math.pow(2, pd.comboMultiplierLevel), getLevel: (pd) => pd.comboMultiplierLevel,
        getEffectText: (pd) => `Multiplicador actual: x${pd.getCurrentComboMultiplier().toFixed(1)}`,
        canPurchaseCheck: (pd) => pd.comboMultiplierLevel < 5,
        purchaseAction: (sm) => sm.purchaseComboMultiplier()
    }, {
        id: 'inkCostReduction', name: "Reducción Costo Tinta", icon: '💧', isLeveled: true, maxLevel: 5, category: 'upgradeable',
        getCost: (pd) => 80 * Math.pow(1.8, pd.inkCostReductionLevel), getLevel: (pd) => pd.inkCostReductionLevel,
        getEffectText: (pd) => `Costo de tinta: ${pd.getCurrentInkCostPerPixel().toFixed(2)}/px`,
        canPurchaseCheck: (pd) => pd.isDrawingUnlocked && pd.inkCostReductionLevel < 5,
        purchaseAction: (sm) => sm.purchaseInkCostReduction()
    },
];
// -------------------------------------------------------------

export class GameManager {
  private physicsManager: PhysicsManager;
  private quizSystem: QuizSystem;
  private stateMachine: StateMachine;
  private audioManager: AudioManager;
  private catManager: CatManager;
  private playerData: PlayerData;
  private shopManager: ShopManager;
  private lastTimestamp: number = 0;
  private isRunning: boolean = false;
  private gameLoopRequestId?: number;
  private containerElement: HTMLElement;

  constructor(container: HTMLElement) {
    this.containerElement = container;
    console.log('GameManager Creado');

    // Crear instancias de los sistemas y datos
    this.audioManager = new AudioManager();
    this.quizSystem = new QuizSystem();
    this.playerData = new PlayerData();
    this.catManager = new CatManager(this.audioManager);
    this.physicsManager = new PhysicsManager(this.catManager);
    this.shopManager = new ShopManager(this.playerData, this);
    this.stateMachine = new StateMachine(); // Crear StateMachine

    // Inyectar dependencias si es necesario (ej: PhysicsManager en CatManager)
    this.catManager.setPhysicsManager(this.physicsManager);

    // *** MOVIDO AQUÍ: Configurar estados inmediatamente ***
    this.setupStates();
    // *****************************************************

    console.log("GameManager Constructor finalizado."); // Log opcional
  }

  public async init(): Promise<void> {
    console.log('GameManager: init');
    this.playerData.reset(); // Resetear datos del jugador
    this.physicsManager.init(this.getWorldContainer()); // Inicializar físicas
    // this.setupStates(); // <-- YA NO SE LLAMA AQUÍ

    // Cargar assets asíncronamente
    await this.preload();

    // Inicializar ShopManager DESPUÉS de preload (si depende de datos cargados)
    // O aquí si las definiciones son hardcodeadas como ahora
    this.shopManager.init(shopItemDefinitions);

    console.log("GameManager init completado."); // Log opcional
  }

  public async preload(): Promise<void> {
    console.log('GameManager: preload - Cargando assets...');
    const questionsUrl = '/data/questions.json';
    const templatesUrl = '/data/cat_templates.json';
    try {
        const [questionResponse, templateResponse] = await Promise.all([
            fetch(questionsUrl),
            fetch(templatesUrl)
        ]);

        if (!questionResponse.ok) throw new Error(`HTTP ${questionResponse.status} cargando preguntas`);
        if (!templateResponse.ok) throw new Error(`HTTP ${templateResponse.status} cargando plantillas`);

        const questionData = await questionResponse.json();
        const templateData: CatTemplate[] = await templateResponse.json();

        if (!Array.isArray(questionData)) throw new Error('Formato inválido de preguntas.');
        if (!Array.isArray(templateData)) throw new Error('Formato inválido de plantillas.');

        // Procesar datos cargados
        const questionsLoaded = await this.quizSystem.loadQuestionsData(questionData);
        if (!questionsLoaded) throw new Error("Fallo al procesar preguntas en QuizSystem.");

        this.catManager.loadTemplates(templateData);

        console.log('GameManager: Preload completado exitosamente.');
    } catch (error: any) {
        console.error('GameManager: Error durante preload:', error);
        this.containerElement.innerHTML = `Error al cargar assets: ${error.message}.`;
        throw error;
    }
  }

  public create(): void {
    console.log('GameManager: create');
    this.quizSystem.resetAvailableQuestions(); // Reiniciar preguntas disponibles
    this.catManager.removeAllCats(); // Limpiar gatos existentes
    // PlayerData ya se reseteó en init()
    this.stateMachine.changeState('MainMenu'); // <-- Ahora debería encontrar el estado
  }

  private gameLoop(timestamp: number): void {
    if (!this.isRunning) return;
    const deltaTime = (timestamp - this.lastTimestamp) / 1000.0;
    this.lastTimestamp = timestamp;
    const clampedDeltaTime = Math.min(deltaTime, 0.1);
    this.update(clampedDeltaTime);
    this.gameLoopRequestId = requestAnimationFrame(this.gameLoop.bind(this));
  }

  public update(deltaTime: number): void {
    this.stateMachine.update(deltaTime);
    this.catManager.updateCats(deltaTime);
    // PhysicsManager se actualiza internamente
  }

  public start(): void {
    if (this.isRunning) return;
    console.log('GameManager: Iniciando bucle de juego...');
    this.isRunning = true;
    this.lastTimestamp = performance.now();
    this.physicsManager.start();
    this.gameLoopRequestId = requestAnimationFrame(this.gameLoop.bind(this));
  }

  public stop(): void {
    if (!this.isRunning) return;
    console.log('GameManager: Deteniendo bucle de juego...');
    this.isRunning = false;
    if (this.gameLoopRequestId) cancelAnimationFrame(this.gameLoopRequestId);
    this.gameLoopRequestId = undefined;
    this.physicsManager.stop();
  }

  public shutdown(): void {
    console.log('GameManager: shutdown');
    this.stop();
    this.physicsManager.shutdown();
    if (this.stateMachine.getCurrentStateName() && this.stateMachine.getCurrentStateName() !== '__shutdown__') {
        try { this.stateMachine.changeState('__shutdown__'); }
        catch (e) { console.warn("Error en exit() durante shutdown:", e) }
    }
    this.catManager.removeAllCats();
    this.containerElement.innerHTML = '';
  }

  private getWorldContainer(): HTMLElement { return document.body; }

  /** Configura e instancia todos los estados del juego y los añade a la StateMachine. */
  private setupStates(): void {
    console.log('GameManager: Configurando estados...');
    this.stateMachine.addState('Loading', new LoadingState(this));
    this.stateMachine.addState('MainMenu', new MainMenuState(this));
    this.stateMachine.addState('QuizGameplay', new QuizGameplayState(this));
    this.stateMachine.addState('Results', new ResultsState(this));
    this.stateMachine.addState('GameOver', new GameOverState(this));
    this.stateMachine.addState('__shutdown__', { enter: () => {}, exit: () => {}, update: () => {} });
    console.log('GameManager: Estados configurados.'); // Log adicional
  }

  // --- Métodos para Vidas (delegan a PlayerData) ---
  public getLives(): number { return this.playerData.lives; }
  public decrementLives(): void { if (this.playerData.lives > 0) this.playerData.lives--; }
  public incrementLives(): void { this.playerData.lives++; }
  // ------------------------------------------------------

  // --- Métodos para Tienda ---
  public openShop(): void { this.shopManager.openShop(); }
  public closeShop(): void { this.shopManager.closeShop(); }
  // --------------------------

  // --- Método para habilitar dibujo ---
  public enableDrawingFeature(): void {
      console.log("GameManager: Habilitando función de dibujo...");
      const rightControls = document.getElementById('right-controls');
      const inkLabel = document.getElementById('ink-label');
      const inkBar = document.getElementById('ink-bar-container');
      const scoreArea = document.getElementById('score-area');
      if (rightControls) rightControls.classList.add('drawing-unlocked');
      if (inkLabel) inkLabel.classList.remove('hidden');
      if (inkBar) inkBar.classList.remove('hidden');
      if (scoreArea) scoreArea.classList.add('ink-visible');
      this.updateInkUI(); // Actualizar estado inicial
  }

  // --- Método para actualizar UI de tinta (ejemplo) ---
  public updateInkUI(): void { /* ... (lógica placeholder) ... */ }
  // -------------------------------------------------------------

  // --- Getters ---
  public getQuizSystem(): QuizSystem { return this.quizSystem; }
  public getPhysicsManager(): PhysicsManager { return this.physicsManager; }
  public getStateMachine(): StateMachine { return this.stateMachine; }
  public getAudioManager(): AudioManager { return this.audioManager; }
  public getCatManager(): CatManager { return this.catManager; }
  public getShopManager(): ShopManager { return this.shopManager; }
  public getPlayerData(): PlayerData { return this.playerData; }
  public getContainerElement(): HTMLElement { return this.containerElement; }
}
