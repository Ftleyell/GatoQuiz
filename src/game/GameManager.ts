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
    this.playerData.reset(); // Reinicia los datos del jugador
    this.physicsManager.init(this.getWorldContainer()); // Inicializa la física
    await this.preload(); // Carga datos JSON (preguntas, plantillas, tienda)
    // ShopManager se inicializa dentro de preload ahora
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
    this.quizSystem.resetAvailableQuestions(); // Reinicia las preguntas disponibles
    this.catManager.removeAllCats(); // Elimina gatos de partidas anteriores
    this.stateMachine.changeState('MainMenu'); // Empieza en el menú principal
  }

  /**
   * El bucle principal del juego.
   * @param timestamp - Tiempo actual proporcionado por requestAnimationFrame.
   */
  private gameLoop(timestamp: number): void {
    if (!this.isRunning) return; // Si el juego no está corriendo, no hace nada
    const deltaTime = (timestamp - this.lastTimestamp) / 1000.0; // Calcula tiempo transcurrido en segundos
    this.lastTimestamp = timestamp; // Actualiza el último timestamp
    const clampedDeltaTime = Math.min(deltaTime, 0.1); // Limita el deltaTime para evitar saltos grandes
    this.update(clampedDeltaTime); // Llama al método de actualización
    this.gameLoopRequestId = requestAnimationFrame(this.gameLoop.bind(this)); // Solicita el próximo frame
  }

  /**
   * Actualiza los sistemas del juego en cada frame.
   * @param deltaTime - Tiempo desde el último frame en segundos.
   */
  public update(deltaTime: number): void {
    this.stateMachine.update(deltaTime); // Actualiza el estado actual
    this.catManager.updateCats(deltaTime); // Actualiza la posición visual de los gatos
  }

  /** Inicia el bucle de juego y la física. */
  public start(): void {
    if (this.isRunning) return; // Evita iniciar si ya está corriendo
    console.log('GameManager: Iniciando bucle de juego...');
    this.isRunning = true;
    this.lastTimestamp = performance.now(); // Establece el tiempo inicial
    this.physicsManager.start(); // Inicia el runner de física
    this.gameLoopRequestId = requestAnimationFrame(this.gameLoop.bind(this)); // Inicia el bucle
  }

  /** Detiene el bucle de juego y la física. */
  public stop(): void {
    if (!this.isRunning) return; // Evita detener si ya está detenido
    console.log('GameManager: Deteniendo bucle de juego...');
    this.isRunning = false;
    if (this.gameLoopRequestId) cancelAnimationFrame(this.gameLoopRequestId); // Cancela el próximo frame
    this.gameLoopRequestId = undefined;
    this.physicsManager.stop(); // Detiene el runner de física
  }

  /** Limpia recursos y detiene sistemas al cerrar el juego. */
  public shutdown(): void {
    console.log('GameManager: shutdown');
    this.stop(); // Detiene el bucle y la física
    this.physicsManager.shutdown(); // Limpia listeners de física
    // Intenta salir del estado actual de forma segura
    if (this.stateMachine.getCurrentStateName() && this.stateMachine.getCurrentStateName() !== '__shutdown__') {
        try { this.stateMachine.changeState('__shutdown__'); }
        catch (e) { console.warn("Error en exit() del estado durante shutdown:", e) }
    }
    this.catManager.removeAllCats(); // Elimina todos los gatos
    this.containerElement.innerHTML = ''; // Limpia la UI principal
    this.setBodyStateClass(null); // Limpia la clase CSS del body
    this.shopManager.destroy(); // Limpia listeners de la tienda
  }

  /** Devuelve el elemento contenedor para la física/mouse. */
  private getWorldContainer(): HTMLElement {
      // Podría ser un div específico si no quieres que el mouse constraint
      // funcione sobre toda la página. Por ahora, body está bien.
      return document.body;
  }

  /** Configura e instancia los estados del juego. */
  private setupStates(): void {
    this.stateMachine.addState('Loading', new LoadingState(this));
    this.stateMachine.addState('MainMenu', new MainMenuState(this));
    this.stateMachine.addState('QuizGameplay', new QuizGameplayState(this));
    this.stateMachine.addState('Results', new ResultsState(this));
    this.stateMachine.addState('GameOver', new GameOverState(this));
    this.stateMachine.addState('__shutdown__', { enter: () => {}, exit: () => {}, update: () => {} }); // Estado dummy para limpieza
  }

  /**
   * Actualiza la clase CSS en el elemento <body> para reflejar el estado actual.
   * Útil para mostrar/ocultar elementos de UI contextualmente.
   * @param stateName - Nombre descriptivo del estado actual (ej: 'mainmenu', 'gameplay').
   */
  public setBodyStateClass(stateName: string | null): void {
    const body = document.body;
    // Elimina la clase del estado anterior si existe
    if (this.previousBodyStateClass) {
        body.classList.remove(`state-${this.previousBodyStateClass}`);
    }
    // Añade la nueva clase si se proporciona un nombre
    if (stateName) {
        const newStateClass = `state-${stateName}`;
        body.classList.add(newStateClass);
        this.previousBodyStateClass = stateName; // Guarda la clase actual para la próxima vez
    } else {
        this.previousBodyStateClass = null; // Limpia si no hay estado
    }
  }


  // --- Métodos para Vidas (Delegan a PlayerData y notifican UI) ---
  /** Obtiene las vidas actuales del jugador. */
  public getLives(): number { return this.playerData.lives; }
  /** Decrementa una vida y actualiza la UI. */
  public decrementLives(): void {
      if (this.playerData.lives > 0) {
          this.playerData.lives--;
          this.updateExternalLivesUI(); // Notifica al estado actual para actualizar la UI
      }
  }
  /** Incrementa una vida y actualiza la UI. */
  public incrementLives(): void {
       this.playerData.lives++;
       this.updateExternalLivesUI(); // Notifica al estado actual para actualizar la UI
  }
  // --------------------------------------------------------------

  // --- Métodos para Tienda ---
  /** Abre el popup de la tienda. */
  public openShop(): void { this.shopManager.openShop(); }
  /** Cierra el popup de la tienda. */
  public closeShop(): void { this.shopManager.closeShop(); }
  // --------------------------

  // --- Método para habilitar la función de dibujo ---
  /** Activa la UI relacionada con la función de dibujo (llamado por ShopManager). */
  public enableDrawingFeature(): void {
      console.log("GameManager: Habilitando función de dibujo...");
      // Busca los elementos de UI relevantes por ID
      const rightControls = document.getElementById('right-controls');
      const inkLabel = document.getElementById('ink-label');
      const inkBar = document.getElementById('ink-bar-container');
      const scoreArea = document.getElementById('score-area');
      // Modifica clases/estilos para mostrarlos
      if (rightControls) rightControls.classList.add('drawing-unlocked');
      if (inkLabel) inkLabel.classList.remove('hidden');
      if (inkBar) inkBar.classList.remove('hidden');
      if (scoreArea) scoreArea.classList.add('ink-visible');
      this.updateInkUI(); // Actualiza la barra de tinta (implementación pendiente)
      // Aquí se inicializaría el InkManager si existiera
  }

  // --- Método para actualizar UI de tinta (placeholder) ---
  /** Actualiza la barra de progreso de tinta (implementación pendiente). */
  public updateInkUI(): void {
      // TODO: Implementar lógica para obtener tinta de PlayerData
      // y actualizar el estilo '--ink-percentage' del elemento #ink-bar-fill
      console.warn("GameManager.updateInkUI() - Implementación pendiente.");
  }
  // -----------------------------------------------------

  // --- MÉTODOS DE ACTUALIZACIÓN DE UI EXTERNA (Llaman a métodos del estado actual si existen) ---
  /** Notifica al estado actual para actualizar la UI de vidas. */
  public updateExternalLivesUI(): void {
    const currentState = this.getCurrentState();
    // Llama a updateLivesUI() solo si el estado actual tiene ese método
    if (typeof (currentState as any)?.updateLivesUI === 'function') {
        (currentState as any).updateLivesUI();
    }
  }
  /** Notifica al estado actual para actualizar la UI del escudo. */
  public updateExternalShieldUI(isActive: boolean): void {
    const currentState = this.getCurrentState();
    // Llama a updateShieldIcon() solo si el estado actual tiene ese método
    if (typeof (currentState as any)?.updateShieldIcon === 'function') {
        (currentState as any).updateShieldIcon(isActive);
    } else {
         // Podría ser normal si el estado actual no maneja este icono (ej. MainMenu)
         // console.warn("updateExternalShieldUI: El estado actual no tiene updateShieldIcon().");
    }
  }
  /** Notifica al estado actual para actualizar la UI de la pista. */
  public updateExternalHintUI(charges: number): void {
     const currentState = this.getCurrentState();
     // Llama a updateHintIcon() solo si el estado actual tiene ese método
     if (typeof (currentState as any)?.updateHintIcon === 'function') {
        (currentState as any).updateHintIcon(charges);
     } else {
        // Podría ser normal si el estado actual no maneja este icono
        // console.warn("updateExternalHintUI: El estado actual no tiene updateHintIcon().");
     }
  }
  // --------------------------------------------------------------------------------------

  // --- Getters (Proporcionan acceso controlado a los sistemas) ---
  public getQuizSystem(): QuizSystem { return this.quizSystem; }
  public getPhysicsManager(): PhysicsManager { return this.physicsManager; }
  public getStateMachine(): StateMachine { return this.stateMachine; }
  public getAudioManager(): AudioManager { return this.audioManager; }
  public getCatManager(): CatManager { return this.catManager; }
  public getShopManager(): ShopManager { return this.shopManager; }
  public getPlayerData(): PlayerData { return this.playerData; }
  public getContainerElement(): HTMLElement { return this.containerElement; }
  /** Obtiene la instancia del estado actualmente activo. */
  public getCurrentState(): IState | null { return this.stateMachine.getCurrentState(); }
  // -----------------------------------------------------------

} // Fin clase GameManager
