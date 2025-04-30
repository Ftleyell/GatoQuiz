// src/game/GameManager.ts

import { PhysicsManager } from '../systems/physics/PhysicsManager'; // Update the path to the correct location
// Import StateMachine y otros sistemas/managers cuando se necesiten
// import { StateMachine } from './StateMachine';

/**
 * GameManager: Clase principal que orquesta el ciclo de vida del juego,
 * los sistemas y el estado general.
 * Basado en la estructura definida en Fase 1, paso 2 del flujo de trabajo.
 */
export class GameManager {
  private physicsManager: PhysicsManager;
  // private stateMachine: StateMachine;
  private lastTimestamp: number = 0;
  private isRunning: boolean = false;
  private gameLoopRequestId?: number;

  // Referencia al elemento HTML donde se renderiza el juego (si es necesario)
  private containerElement: HTMLElement;

  constructor(container: HTMLElement) {
    this.containerElement = container;
    console.log('GameManager Creado');

    // Inicializar sistemas centrales
    this.physicsManager = new PhysicsManager();
    // this.stateMachine = new StateMachine();
  }

  /**
   * Inicializa los sistemas del juego y prepara los recursos necesarios.
   * Se llama una sola vez al principio.
   */
  public async init(): Promise<void> {
    console.log('GameManager: init');
    this.physicsManager.init();
    // Aquí se podrían inicializar otros sistemas como Audio, UI, etc.
    // this.setupStates(); // Configurar estados de la StateMachine
    await this.preload(); // Cargar assets iniciales
  }

  /**
   * Carga los assets necesarios antes de que el juego comience (imágenes, sonidos, JSON).
   * Puede ser asíncrono.
   */
  public async preload(): Promise<void> {
    console.log('GameManager: preload');
    // Ejemplo: Cargar preguntas del quiz, imágenes de gatos, sonidos...
    // await loadAssets();
  }

  /**
   * Crea las entidades iniciales del juego, configura la UI y establece el estado inicial.
   * Se llama después de init() y preload().
   */
  public create(): void {
    console.log('GameManager: create');
    // Ejemplo: Crear el mundo físico, añadir elementos UI, iniciar el primer estado
    // this.stateMachine.changeState('MainMenu');
    // this.physicsManager.start(); // Iniciar simulación física si aplica aquí
  }

  /**
   * El bucle principal del juego. Se llama en cada frame.
   * @param timestamp - El tiempo actual proporcionado por requestAnimationFrame
   */
  private gameLoop(timestamp: number): void {
    if (!this.isRunning) return;

    // Calcula el tiempo delta (diferencia de tiempo desde el último frame) en segundos
    const deltaTime = (timestamp - this.lastTimestamp) / 1000.0;
    this.lastTimestamp = timestamp;

    // Llama al método update con el deltaTime
    this.update(deltaTime);

    // Solicita el siguiente frame
    this.gameLoopRequestId = requestAnimationFrame(this.gameLoop.bind(this));
  }


  /**
   * Actualiza la lógica del juego (movimiento, IA, física, estado).
   * @param deltaTime - Tiempo transcurrido desde el último frame en segundos.
   */
  public update(deltaTime: number): void {
    // console.log(`GameManager: update (deltaTime: ${deltaTime.toFixed(4)}s)`); // Descomentar para depuración
    // Actualizar la máquina de estados
    // this.stateMachine.update(deltaTime);

    // Nota: Matter.js Runner actualiza el motor físico internamente si está corriendo.
    // No es necesario llamar a Matter.Engine.update() manualmente si se usa Runner.

    // Actualizar otros sistemas si es necesario (ej: IA, Animaciones)

    // Llamar a render al final del update
    this.render();
  }

  /**
   * Dibuja el estado actual del juego en la pantalla.
   */
  public render(): void {
    // console.log('GameManager: render'); // Descomentar para depuración
    // Aquí iría la lógica de renderizado (Canvas, DOM, WebGL)
    // Ejemplo: Limpiar canvas, dibujar entidades, actualizar UI
  }

  /**
   * Inicia el bucle principal del juego.
   */
  public start(): void {
     if (this.isRunning) return;
     console.log('GameManager: Iniciando bucle de juego...');
     this.isRunning = true;
     this.lastTimestamp = performance.now(); // Usar performance.now() para alta precisión
     this.physicsManager.start(); // Asegurarse que la física corre
     this.gameLoopRequestId = requestAnimationFrame(this.gameLoop.bind(this));
   }

  /**
   * Detiene el bucle principal del juego.
   */
   public stop(): void {
     if (!this.isRunning) return;
     console.log('GameManager: Deteniendo bucle de juego...');
     this.isRunning = false;
     if (this.gameLoopRequestId) {
       cancelAnimationFrame(this.gameLoopRequestId);
       this.gameLoopRequestId = undefined;
     }
     this.physicsManager.stop(); // Detener la simulación física
   }

  /**
   * Libera recursos, detiene procesos y limpia antes de cerrar el juego.
   */
  public shutdown(): void {
    console.log('GameManager: shutdown');
    this.stop();
    // Limpiar event listeners, detener sonidos, etc.
    // this.physicsManager.shutdown(); // Si hubiera limpieza necesaria en PhysicsManager
    this.containerElement.innerHTML = ''; // Limpiar el contenedor
  }

  // --- Métodos de ayuda o específicos del juego irían aquí ---

  // private setupStates(): void {
  //   console.log('GameManager: Configurando estados...');
  //   this.stateMachine.addState('Loading', new LoadingState(this));
  //   this.stateMachine.addState('MainMenu', new MainMenuState(this));
  //   this.stateMachine.addState('Gameplay', new GameplayState(this));
  //   // ... otros estados
  // }
}