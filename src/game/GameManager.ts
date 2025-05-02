// src/game/GameManager.ts

// Importaciones de Sistemas y Tipos
import { PhysicsManager } from '../systems/PhysicsManager';
import { QuizSystem } from '../systems/QuizSystem';
import { StateMachine, IState } from './StateMachine';
import { AudioManager } from '../systems/AudioManager';
import { CatManager } from '../systems/CatManager';
import { ShopManager } from '../systems/ShopManager';
import { PlayerData } from './PlayerData';
import { CatTemplate } from '../types/CatTemplate';
// Importamos la interfaz JSON, aunque no la usemos directamente aquí
import { ShopItemJsonData } from '../types/ShopItemData';

// Importaciones de Estados
import { LoadingState } from './states/LoadingState';
import { MainMenuState } from './states/MainMenuState';
import { QuizGameplayState } from './states/QuizGameplayState';
import { ResultsState } from './states/ResultsState';
import { GameOverState } from './states/GameOverState';


/**
 * GameManager: Orquesta los diferentes sistemas y el flujo general del juego.
 */
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
  private previousBodyStateClass: string | null = null; // Para gestionar clase CSS del estado

  /**
   * Constructor de GameManager.
   * @param container - El elemento HTML principal donde se renderizará el juego.
   */
  constructor(container: HTMLElement) {
    this.containerElement = container;
    this.audioManager = new AudioManager();
    this.quizSystem = new QuizSystem();
    this.playerData = new PlayerData();
    this.catManager = new CatManager(this.audioManager);
    this.physicsManager = new PhysicsManager(this.catManager);
    // Pasar 'this' (GameManager) a ShopManager
    this.shopManager = new ShopManager(this.playerData, this);
    this.stateMachine = new StateMachine();
    this.catManager.setPhysicsManager(this.physicsManager);
    this.setupStates();
  }

  /**
   * Inicializa los sistemas principales y carga los assets necesarios.
   */
  public async init(): Promise<void> {
    console.log('GameManager: init');
    this.playerData.reset();
    this.physicsManager.init(this.getWorldContainer());
    await this.preload(); // Carga de datos JSON (incluyendo tienda)
    // *** CORRECCIÓN: Eliminar la llamada redundante a shopManager.init aquí ***
    // this.shopManager.init(shopItemDefinitions); // <-- ELIMINADA
    // ***********************************************************************
    console.log("GameManager init completado (ShopManager inicializado desde preload).");
  }

  /**
   * Carga los archivos de datos externos (preguntas, plantillas, ítems tienda).
   */
  public async preload(): Promise<void> {
    console.log('GameManager: preload - Cargando assets...');
    const questionsUrl = '/data/questions.json';
    const templatesUrl = '/data/cat_templates.json';
    const shopItemsUrl = '/data/shop_items.json'; // URL del JSON de la tienda

    try {
        // Cargar todos los archivos en paralelo
        const [questionResponse, templateResponse, shopResponse] = await Promise.all([
            fetch(questionsUrl),
            fetch(templatesUrl),
            fetch(shopItemsUrl) // Cargar datos de la tienda
        ]);

        // Verificar respuestas de red
        if (!questionResponse.ok) throw new Error(`HTTP ${questionResponse.status} cargando ${questionsUrl}`);
        if (!templateResponse.ok) throw new Error(`HTTP ${templateResponse.status} cargando ${templatesUrl}`);
        if (!shopResponse.ok) throw new Error(`HTTP ${shopResponse.status} cargando ${shopItemsUrl}`);

        // Parsear JSON
        const questionData = await questionResponse.json();
        const templateData: CatTemplate[] = await templateResponse.json();
        const shopItemJsonData = await shopResponse.json(); // Datos JSON de la tienda

        // Validar formato básico
        if (!Array.isArray(questionData)) throw new Error('Formato inválido de preguntas.');
        if (!Array.isArray(templateData)) throw new Error('Formato inválido de plantillas.');
        if (!Array.isArray(shopItemJsonData)) throw new Error('Formato inválido de ítems de tienda.');

        // Cargar datos en los sistemas correspondientes
        const questionsLoaded = await this.quizSystem.loadQuestionsData(questionData);
        if (!questionsLoaded) throw new Error("Fallo al procesar preguntas en QuizSystem.");
        this.catManager.loadTemplates(templateData);
        // Inicializar ShopManager con los datos JSON cargados
        this.shopManager.init(shopItemJsonData);

        console.log('GameManager: Preload completado exitosamente.');
    } catch (error: any) {
        console.error('GameManager: Error durante preload:', error);
        this.containerElement.innerHTML = `Error al cargar assets: ${error.message}. Revisa la consola.`;
        throw error; // Detener si falla la carga
    }
  }

  /**
   * Prepara el juego para una nueva partida.
   */
  public create(): void {
    console.log('GameManager: create');
    this.quizSystem.resetAvailableQuestions();
    this.catManager.removeAllCats();
    this.stateMachine.changeState('MainMenu'); // Empezar en el menú
  }

  /**
   * El bucle principal del juego.
   * @param timestamp - Tiempo actual.
   */
  private gameLoop(timestamp: number): void {
    if (!this.isRunning) return;
    const deltaTime = (timestamp - this.lastTimestamp) / 1000.0;
    this.lastTimestamp = timestamp;
    const clampedDeltaTime = Math.min(deltaTime, 0.1); // Limitar delta time
    this.update(clampedDeltaTime);
    this.gameLoopRequestId = requestAnimationFrame(this.gameLoop.bind(this));
  }

  /**
   * Actualiza los sistemas del juego en cada frame.
   * @param deltaTime - Tiempo desde el último frame en segundos.
   */
  public update(deltaTime: number): void {
    this.stateMachine.update(deltaTime);
    this.catManager.updateCats(deltaTime); // Sincronizar visuales de gatos
  }

  /** Inicia el bucle de juego y la física. */
  public start(): void {
    if (this.isRunning) return;
    console.log('GameManager: Iniciando bucle de juego...');
    this.isRunning = true;
    this.lastTimestamp = performance.now();
    this.physicsManager.start(); // Iniciar runner de física
    this.gameLoopRequestId = requestAnimationFrame(this.gameLoop.bind(this));
  }

  /** Detiene el bucle de juego y la física. */
  public stop(): void {
    if (!this.isRunning) return;
    console.log('GameManager: Deteniendo bucle de juego...');
    this.isRunning = false;
    if (this.gameLoopRequestId) cancelAnimationFrame(this.gameLoopRequestId);
    this.gameLoopRequestId = undefined;
    this.physicsManager.stop(); // Detener runner de física
  }

  /** Limpia recursos al cerrar el juego. */
  public shutdown(): void {
    console.log('GameManager: shutdown');
    this.stop();
    this.physicsManager.shutdown();
    // Intentar salir del estado actual de forma segura
    if (this.stateMachine.getCurrentStateName() && this.stateMachine.getCurrentStateName() !== '__shutdown__') {
        try { this.stateMachine.changeState('__shutdown__'); }
        catch (e) { console.warn("Error en exit() del estado durante shutdown:", e) }
    }
    this.catManager.removeAllCats(); // Eliminar gatos
    this.containerElement.innerHTML = ''; // Limpiar UI
    this.setBodyStateClass(null); // Limpiar clase CSS del body
    this.shopManager.destroy(); // Limpiar listeners de la tienda
  }

  /** Devuelve el elemento contenedor para la física/mouse. */
  private getWorldContainer(): HTMLElement {
      return document.body; // O un contenedor específico si se prefiere
  }

  /** Configura e instancia los estados del juego. */
  private setupStates(): void {
    this.stateMachine.addState('Loading', new LoadingState(this));
    this.stateMachine.addState('MainMenu', new MainMenuState(this));
    this.stateMachine.addState('QuizGameplay', new QuizGameplayState(this));
    this.stateMachine.addState('Results', new ResultsState(this));
    this.stateMachine.addState('GameOver', new GameOverState(this));
    this.stateMachine.addState('__shutdown__', { enter: () => {}, exit: () => {}, update: () => {} }); // Estado dummy
  }

  /**
   * Actualiza la clase CSS en el elemento <body> para reflejar el estado actual.
   * @param stateName - Nombre descriptivo del estado actual (ej: 'mainmenu', 'gameplay').
   */
  public setBodyStateClass(stateName: string | null): void {
    const body = document.body;
    if (this.previousBodyStateClass) {
        body.classList.remove(`state-${this.previousBodyStateClass}`);
    }
    if (stateName) {
        const newStateClass = `state-${stateName}`;
        body.classList.add(newStateClass);
        this.previousBodyStateClass = stateName;
    } else {
        this.previousBodyStateClass = null;
    }
  }


  // --- Métodos para Vidas ---
  public getLives(): number { return this.playerData.lives; }
  public decrementLives(): void {
      if (this.playerData.lives > 0) {
          this.playerData.lives--;
          this.updateExternalLivesUI();
      }
  }
  public incrementLives(): void {
       this.playerData.lives++;
       this.updateExternalLivesUI();
  }
  // --------------------------

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
      // Aquí se inicializaría el InkManager si existiera
  }

  // --- Método para actualizar UI de tinta (placeholder) ---
  public updateInkUI(): void {
      // TODO: Implementar lógica para actualizar barra de tinta
      console.warn("GameManager.updateInkUI() - Implementación pendiente.");
  }
  // -----------------------------------------------------

  // --- MÉTODOS DE ACTUALIZACIÓN DE UI EXTERNA ---
  public updateExternalLivesUI(): void {
    const currentState = this.getCurrentState();
    if (typeof (currentState as any)?.updateLivesUI === 'function') {
        (currentState as any).updateLivesUI();
    }
  }
  public updateExternalShieldUI(isActive: boolean): void {
    const currentState = this.getCurrentState();
    if (typeof (currentState as any)?.updateShieldIcon === 'function') {
        (currentState as any).updateShieldIcon(isActive);
    } else {
         console.warn("updateExternalShieldUI: El estado actual no tiene updateShieldIcon().");
    }
  }
  public updateExternalHintUI(charges: number): void {
     const currentState = this.getCurrentState();
     if (typeof (currentState as any)?.updateHintIcon === 'function') {
        (currentState as any).updateHintIcon(charges);
     } else {
        console.warn("updateExternalHintUI: El estado actual no tiene updateHintIcon().");
     }
  }
  // ---------------------------------------------

  // --- Getters ---
  public getQuizSystem(): QuizSystem { return this.quizSystem; }
  public getPhysicsManager(): PhysicsManager { return this.physicsManager; }
  public getStateMachine(): StateMachine { return this.stateMachine; }
  public getAudioManager(): AudioManager { return this.audioManager; }
  public getCatManager(): CatManager { return this.catManager; }
  public getShopManager(): ShopManager { return this.shopManager; }
  public getPlayerData(): PlayerData { return this.playerData; }
  public getContainerElement(): HTMLElement { return this.containerElement; }
  public getCurrentState(): IState | null { return this.stateMachine.getCurrentState(); }
  // ---------------------------------------------

} // Fin clase GameManager