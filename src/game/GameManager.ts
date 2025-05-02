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
import { ShopItemData } from '../types/ShopItemData';

// Importaciones de Estados
import { LoadingState } from './states/LoadingState';
import { MainMenuState } from './states/MainMenuState';
import { QuizGameplayState } from './states/QuizGameplayState'; // Asegurarse que la importación existe
import { ResultsState } from './states/ResultsState';
import { GameOverState } from './states/GameOverState';

// --- Definiciones de Ítems de la Tienda (Ejemplo Hardcodeado - Mover a JSON idealmente) ---
// NOTA: Esta sección debería moverse a un JSON y cargarse en preload según el GDD.
const shopItemDefinitions: ShopItemData[] = [
    { id: 'life', name: "Comprar 1 Vida", icon: '❤️', isLeveled: false, category: 'consumable', getCost: (pd) => 50 + pd.lives * 25, getEffectText: (pd) => `Recupera una vida. Tienes ${pd.lives}.`, canPurchaseCheck: (pd) => pd.lives < 5, purchaseAction: (sm) => sm.purchaseLife() },
    { id: 'shield', name: "Escudo Temporal", icon: '🛡️', isLeveled: false, category: 'consumable', getCost: (pd) => 75, getEffectText: (pd) => `Absorbe el siguiente error ${pd.hasShield ? '(Activo)' : ''}.`, isPurchased: (pd) => pd.hasShield, canPurchaseCheck: (pd) => !pd.hasShield, purchaseAction: (sm) => sm.purchaseShield() },
    { id: 'hint', name: "Pista (3 Usos)", icon: '💡', isLeveled: false, category: 'consumable', getCost: (pd) => 60, getEffectText: (pd) => `Elimina 1 opción incorrecta por 3 preguntas ${pd.hintCharges > 0 ? `(${pd.hintCharges} restantes)` : ''}.`, isPurchased: (pd) => pd.hintCharges > 0, canPurchaseCheck: (pd) => pd.hintCharges <= 0, purchaseAction: (sm) => sm.purchaseHint() },
    { id: 'unlockDrawing', name: "Desbloquear Dibujo", icon: '🖌️', isLeveled: false, category: 'unlockable', getCost: (pd) => 200, getEffectText: (pd) => `Permite usar el pincel ${pd.isDrawingUnlocked ? '(Desbloqueado)' : ''}.`, isPurchased: (pd) => pd.isDrawingUnlocked, canPurchaseCheck: (pd) => !pd.isDrawingUnlocked, purchaseAction: (sm) => sm.purchaseUnlockDrawing() },
    { id: 'comboMultiplier', name: "Multiplicador Combo", icon: '✨', isLeveled: true, maxLevel: 5, category: 'upgradeable', getCost: (pd) => 100 * Math.pow(2, pd.comboMultiplierLevel), getLevel: (pd) => pd.comboMultiplierLevel, getEffectText: (pd) => `Multiplicador actual: x${pd.getCurrentComboMultiplier().toFixed(1)}`, canPurchaseCheck: (pd) => pd.comboMultiplierLevel < 5, purchaseAction: (sm) => sm.purchaseComboMultiplier() },
    { id: 'inkCostReduction', name: "Reducción Costo Tinta", icon: '💧', isLeveled: true, maxLevel: 5, category: 'upgradeable', getCost: (pd) => 80 * Math.pow(1.8, pd.inkCostReductionLevel), getLevel: (pd) => pd.inkCostReductionLevel, getEffectText: (pd) => `Costo de tinta: ${pd.getCurrentInkCostPerPixel().toFixed(2)}/px`, canPurchaseCheck: (pd) => pd.isDrawingUnlocked && pd.inkCostReductionLevel < 5, purchaseAction: (sm) => sm.purchaseInkCostReduction() },
    // Añadir aquí ítems 'extraCat' y 'maxCats' si se definen
];
// -------------------------------------------------------------

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

  /**
   * Constructor de GameManager.
   * @param container - El elemento HTML principal donde se renderizará el juego.
   */
  constructor(container: HTMLElement) {
    this.containerElement = container;
    // console.log('GameManager Creado');
    this.audioManager = new AudioManager();
    this.quizSystem = new QuizSystem();
    this.playerData = new PlayerData();
    this.catManager = new CatManager(this.audioManager); // Pasar AudioManager a CatManager
    this.physicsManager = new PhysicsManager(this.catManager); // Pasar CatManager a PhysicsManager
    this.shopManager = new ShopManager(this.playerData, this); // Pasar PlayerData y GameManager a ShopManager
    this.stateMachine = new StateMachine();
    this.catManager.setPhysicsManager(this.physicsManager); // Inyectar PhysicsManager en CatManager
    this.setupStates(); // Configurar los estados del juego
    // console.log("GameManager Constructor finalizado.");
  }

  /**
   * Inicializa los sistemas principales y carga los assets necesarios.
   */
  public async init(): Promise<void> {
    // console.log('GameManager: init');
    this.playerData.reset(); // Reiniciar datos del jugador
    this.physicsManager.init(this.getWorldContainer()); // Inicializar física
    await this.preload(); // Cargar assets (preguntas, plantillas)
    this.shopManager.init(shopItemDefinitions); // Inicializar tienda con definiciones
    // console.log("GameManager init completado.");
  }

  /**
   * Carga los archivos de datos externos (preguntas, plantillas).
   */
  public async preload(): Promise<void> {
    console.log('GameManager: preload - Cargando assets...');
    const questionsUrl = '/data/questions.json'; // Ruta relativa a la carpeta 'public'
    const templatesUrl = '/data/cat_templates.json'; // Ruta relativa a la carpeta 'public'
    try {
        // Cargar ambos archivos en paralelo
        const [questionResponse, templateResponse] = await Promise.all([
            fetch(questionsUrl),
            fetch(templatesUrl)
        ]);

        // Verificar si las respuestas de red fueron exitosas
        if (!questionResponse.ok) throw new Error(`HTTP ${questionResponse.status} cargando preguntas desde ${questionsUrl}`);
        if (!templateResponse.ok) throw new Error(`HTTP ${templateResponse.status} cargando plantillas desde ${templatesUrl}`);

        // Parsear JSON
        const questionData = await questionResponse.json();
        const templateData: CatTemplate[] = await templateResponse.json();

        // Validar y procesar datos
        if (!Array.isArray(questionData)) throw new Error('Formato inválido de preguntas.');
        if (!Array.isArray(templateData)) throw new Error('Formato inválido de plantillas.');

        // Cargar datos en los sistemas correspondientes
        const questionsLoaded = await this.quizSystem.loadQuestionsData(questionData);
        if (!questionsLoaded) throw new Error("Fallo al procesar preguntas en QuizSystem.");
        this.catManager.loadTemplates(templateData);

        console.log('GameManager: Preload completado exitosamente.');
    } catch (error: any) {
        console.error('GameManager: Error durante preload:', error);
        // Mostrar error en la UI si falla la carga
        this.containerElement.innerHTML = `Error al cargar assets: ${error.message}. Revisa la consola.`;
        throw error; // Relanzar el error para detener la inicialización
    }
  }

  /**
   * Prepara el juego para una nueva partida (llamado después de init/preload).
   */
  public create(): void {
    // console.log('GameManager: create');
    this.quizSystem.resetAvailableQuestions(); // Asegurar que todas las preguntas estén disponibles
    this.catManager.removeAllCats(); // Limpiar gatos de partidas anteriores
    this.stateMachine.changeState('MainMenu'); // Iniciar en el menú principal
  }

  /**
   * El bucle principal del juego, llamado por requestAnimationFrame.
   * @param timestamp - El tiempo actual proporcionado por requestAnimationFrame.
   */
  private gameLoop(timestamp: number): void {
    if (!this.isRunning) return; // Salir si el juego se detuvo

    // Calcular deltaTime (tiempo desde el último frame) en segundos
    const deltaTime = (timestamp - this.lastTimestamp) / 1000.0;
    this.lastTimestamp = timestamp;

    // Limitar deltaTime para evitar saltos grandes si la pestaña estuvo inactiva
    const clampedDeltaTime = Math.min(deltaTime, 0.1); // Máximo 0.1 segundos (10 FPS)

    // Actualizar los sistemas que dependen del tiempo
    this.update(clampedDeltaTime);

    // Solicitar el próximo frame
    this.gameLoopRequestId = requestAnimationFrame(this.gameLoop.bind(this));
  }

  /**
   * Actualiza los sistemas principales del juego en cada frame.
   * @param deltaTime - El tiempo transcurrido desde el último frame, en segundos.
   */
  public update(deltaTime: number): void {
    // Actualizar la máquina de estados (que a su vez llama al update del estado activo)
    this.stateMachine.update(deltaTime);
    // Actualizar la lógica de los gatos (principalmente sincronización visual con física)
    this.catManager.updateCats(deltaTime);
    // NOTA: PhysicsManager se actualiza internamente a través de su Runner.
  }

  /**
   * Inicia el bucle principal del juego y el motor de física.
   */
  public start(): void {
    if (this.isRunning) return; // Evitar iniciar múltiples veces
    // console.log('GameManager: Iniciando bucle de juego...');
    this.isRunning = true;
    this.lastTimestamp = performance.now(); // Registrar tiempo inicial
    this.physicsManager.start(); // Iniciar el runner de Matter.js
    // Iniciar el bucle de requestAnimationFrame
    this.gameLoopRequestId = requestAnimationFrame(this.gameLoop.bind(this));
  }

  /**
   * Detiene el bucle principal del juego y el motor de física.
   */
  public stop(): void {
    if (!this.isRunning) return; // Evitar detener múltiples veces
    // console.log('GameManager: Deteniendo bucle de juego...');
    this.isRunning = false;
    // Cancelar el próximo frame si estaba pendiente
    if (this.gameLoopRequestId) cancelAnimationFrame(this.gameLoopRequestId);
    this.gameLoopRequestId = undefined;
    this.physicsManager.stop(); // Detener el runner de Matter.js
  }

  /**
   * Limpia recursos y detiene sistemas al cerrar el juego.
   */
  public shutdown(): void {
    console.log('GameManager: shutdown');
    this.stop(); // Asegurar que el bucle y la física estén detenidos
    this.physicsManager.shutdown(); // Limpiar listeners de física

    // Intentar llamar a exit() del estado actual para limpieza de UI
    if (this.stateMachine.getCurrentStateName() && this.stateMachine.getCurrentStateName() !== '__shutdown__') {
        try {
            // Usar un estado dummy para forzar la salida del estado actual de forma segura
            this.stateMachine.changeState('__shutdown__');
        } catch (e) {
            console.warn("Error en exit() del estado durante shutdown:", e)
        }
    }

    this.catManager.removeAllCats(); // Eliminar todos los gatos
    this.containerElement.innerHTML = ''; // Limpiar contenedor principal
  }

  /**
   * Devuelve el elemento contenedor donde se renderizan los elementos físicos (gatos).
   * Actualmente devuelve document.body, podría cambiarse si hay un contenedor específico.
   */
  private getWorldContainer(): HTMLElement {
      // Podría ser un div específico si no quieres que el mouse constraint
      // funcione sobre toda la página. Por ahora, body está bien.
      return document.body;
  }

  /**
   * Configura e instancia todos los estados del juego y los añade a la StateMachine.
   */
  private setupStates(): void {
    // console.log('GameManager: Configurando estados...');
    this.stateMachine.addState('Loading', new LoadingState(this));
    this.stateMachine.addState('MainMenu', new MainMenuState(this));
    this.stateMachine.addState('QuizGameplay', new QuizGameplayState(this));
    this.stateMachine.addState('Results', new ResultsState(this)); // Aunque no se use activamente aún
    this.stateMachine.addState('GameOver', new GameOverState(this));
    // Estado dummy para manejar la limpieza durante shutdown
    this.stateMachine.addState('__shutdown__', { enter: () => {}, exit: () => {}, update: () => {} });
    // console.log('GameManager: Estados configurados.');
  }

  // --- Métodos para Vidas (delegan a PlayerData y notifican) ---
  public getLives(): number {
      return this.playerData.lives;
  }

  public decrementLives(): void {
      if (this.playerData.lives > 0) {
          this.playerData.lives--;
          this.updateExternalLivesUI(); // Notificar cambio a la UI externa
      }
  }

  public incrementLives(): void {
       this.playerData.lives++;
       this.updateExternalLivesUI(); // Notificar cambio a la UI externa
  }
  // ------------------------------------------------------

  // --- Métodos para Tienda ---
  /** Abre el popup de la tienda. */
  public openShop(): void {
      this.shopManager.openShop();
      // Podrías pausar el juego aquí si es necesario: this.physicsManager.stop();
  }

  /** Cierra el popup de la tienda. */
  public closeShop(): void {
      this.shopManager.closeShop();
      // Reanudar el juego si se pausó: this.physicsManager.start();
  }
  // --------------------------

  // --- Método para habilitar dibujo ---
  /** Activa la UI relacionada con la función de dibujo (llamado por ShopManager). */
  public enableDrawingFeature(): void {
      console.log("GameManager: Habilitando función de dibujo...");
      // Buscar elementos específicos de la UI de dibujo
      const rightControls = document.getElementById('right-controls'); // Asumiendo ID del contenedor de botones
      const inkLabel = document.getElementById('ink-label'); // Asumiendo ID de la etiqueta de tinta
      const inkBar = document.getElementById('ink-bar-container'); // Asumiendo ID de la barra de tinta
      const scoreArea = document.getElementById('score-area'); // Contenedor que necesita ajustar altura

      // Modificar clases o estilos para mostrar los elementos
      if (rightControls) rightControls.classList.add('drawing-unlocked'); // Clase para mostrar botones de dibujo
      if (inkLabel) inkLabel.classList.remove('hidden'); // Quitar clase 'hidden'
      if (inkBar) inkBar.classList.remove('hidden');
      if (scoreArea) scoreArea.classList.add('ink-visible'); // Clase para ajustar altura

      this.updateInkUI(); // Actualizar estado inicial de la barra
      // Aquí también se inicializaría el InkManager si existiera
  }

  // --- Método para actualizar UI de tinta (ejemplo placeholder) ---
  /** Actualiza la barra de progreso de tinta (implementación pendiente). */
  public updateInkUI(): void {
      // TODO: Implementar lógica para obtener tinta de PlayerData
      // y actualizar el estilo '--ink-percentage' del elemento #ink-bar-fill
      // const inkPercentage = (this.playerData.currentInk / this.playerData.maxInk) * 100;
      // document.documentElement.style.setProperty('--ink-percentage', `${inkPercentage}%`);
      console.warn("GameManager.updateInkUI() - Implementación pendiente.");
  }
  // -------------------------------------------------------------

  // --- MÉTODOS DE ACTUALIZACIÓN DE UI EXTERNA (CORREGIDOS Y MÁS SEGUROS) ---

  /** Notifica al estado actual para actualizar la UI de vidas. */
  public updateExternalLivesUI(): void {
    const currentState = this.getCurrentState();
    // console.log(`[DEBUG] updateExternalLivesUI: currentState es:`, currentState?.constructor?.name);

    // CORRECCIÓN: Llamar a 'updateLivesUI' en lugar de 'updateLivesDisplay'
    // VERIFICACIÓN: Asegurarse que el método exista antes de llamarlo
    if (typeof (currentState as any)?.updateLivesUI === 'function') {
        (currentState as any).updateLivesUI();
    } else {
        // console.log("[DEBUG] updateExternalLivesUI: El estado actual no tiene updateLivesUI().");
    }
  }

  /** Notifica al estado actual para actualizar la visibilidad del icono de escudo. */
  public updateExternalShieldUI(isActive: boolean): void {
    const currentState = this.getCurrentState();
    // console.log(`[DEBUG] updateExternalShieldUI: currentState es:`, currentState?.constructor?.name);

    // VERIFICACIÓN: Asegurarse que el método exista antes de llamarlo
    // Asumiendo que el método se llamará 'updateShieldIcon' en QuizGameplayState
    if (typeof (currentState as any)?.updateShieldIcon === 'function') {
        (currentState as any).updateShieldIcon(isActive);
    } else {
         console.warn("[DEBUG] updateExternalShieldUI: El estado actual no tiene updateShieldIcon().");
    }
  }

  /** Notifica al estado actual para actualizar la visibilidad/contador del icono de pista. */
  public updateExternalHintUI(charges: number): void {
     const currentState = this.getCurrentState();
     // console.log(`[DEBUG] updateExternalHintUI: currentState es:`, currentState?.constructor?.name);

     // VERIFICACIÓN: Asegurarse que el método exista antes de llamarlo
     // Asumiendo que el método se llamará 'updateHintIcon' en QuizGameplayState
     if (typeof (currentState as any)?.updateHintIcon === 'function') {
        (currentState as any).updateHintIcon(charges);
     } else {
        console.warn("[DEBUG] updateExternalHintUI: El estado actual no tiene updateHintIcon().");
     }
  }
  // ---------------------------------------------------

  // --- Getters ---
  public getQuizSystem(): QuizSystem { return this.quizSystem; }
  public getPhysicsManager(): PhysicsManager { return this.physicsManager; }
  public getStateMachine(): StateMachine { return this.stateMachine; }
  public getAudioManager(): AudioManager { return this.audioManager; }
  public getCatManager(): CatManager { return this.catManager; }
  public getShopManager(): ShopManager { return this.shopManager; }
  public getPlayerData(): PlayerData { return this.playerData; }
  public getContainerElement(): HTMLElement { return this.containerElement; }
  /** Obtiene la instancia del estado actualmente activo. */
  public getCurrentState(): IState | null {
      return this.stateMachine.getCurrentState();
  }
  // ---------------------------------------------------
} // Fin clase GameManager