// src/game/GameManager.ts

import { PhysicsManager } from '../systems/PhysicsManager';
import { QuizSystem } from '../systems/QuizSystem'; // <-- Importación añadida
// Import StateMachine cuando la necesites más adelante
// import { StateMachine } from './StateMachine';

/**
 * GameManager: Clase principal que orquesta el ciclo de vida del juego,
 * los sistemas y el estado general.
 * Basado en la estructura definida en Fase 1, paso 2 del flujo de trabajo.
 */
export class GameManager {
  private physicsManager: PhysicsManager;
  private quizSystem: QuizSystem; // <-- Propiedad añadida
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
    this.quizSystem = new QuizSystem(); // <-- Instanciación añadida
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
    try {
      // Cargar preguntas del quiz
      // Asegúrate que la ruta '/data/questions.json' es correcta respecto a tu carpeta 'public'
      const loaded = await this.quizSystem.loadQuestions('/data/questions.json'); // <-- Llamada añadida
      if (!loaded) {
        console.error(
          'GameManager: Falló la carga de preguntas. Verifica la ruta y el archivo JSON.',
          this.quizSystem.getLastError()
        );
         // Mostrar error al usuario podría ir aquí
         this.containerElement.innerHTML = `Error al cargar preguntas: ${this.quizSystem.getLastError()}`;
         throw new Error("Failed to load questions."); // Detener inicialización si las preguntas son críticas
      } else {
        console.log('GameManager: Preguntas cargadas.');
      }

      // Podrías cargar otros assets aquí también
      // await loadOtherAssets();

      // --- Añade aquí las llamadas de prueba temporales si quieres ---
      //     (Recuerda quitar o comentar esto para la versión final)
      console.log("--- Probando QuizSystem (Temporal) ---");
      const firstQ = this.quizSystem.selectNextQuestion();
      console.log("Primera pregunta seleccionada:", firstQ);
      if (firstQ) {
        console.log("Validando respuesta 'A':", this.quizSystem.validateAnswer(firstQ.id, 'A'));
        console.log("Validando respuesta correcta:", this.quizSystem.validateAnswer(firstQ.id, firstQ.correctAnswerKey));
      } else {
          console.log("No se pudo seleccionar la primera pregunta.");
      }
      const easyQ = this.quizSystem.selectNextQuestion('easy'); // Intenta seleccionar otra (si hay más 'easy')
      console.log("Pregunta fácil seleccionada:", easyQ);
       if (!easyQ && firstQ?.difficulty !== 'easy') {
           console.log("No se pudo seleccionar una pregunta fácil (quizás solo había una y ya se usó, o no hay de esa dificultad).");
       }
       this.quizSystem.resetAvailableQuestions(); // Resetea para futuras pruebas si es necesario
      console.log("--- Fin pruebas QuizSystem ---");
      // --- Fin de las llamadas de prueba ---


    } catch (error) {
      console.error('GameManager: Error durante preload:', error);
      // Asegurarse que el error se muestre si no se hizo antes
      if (this.containerElement.innerHTML === '') { // Evitar sobreescribir mensaje específico de preguntas
          this.containerElement.innerHTML = `Error durante la carga: ${error instanceof Error ? error.message : String(error)}`;
      }
      // Re-lanzar el error para detener la cadena de inicialización si es un fallo crítico
      throw error;
    }
  }

  /**
   * Crea las entidades iniciales del juego, configura la UI y establece el estado inicial.
   * Se llama después de init() y preload() si fueron exitosos.
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

  // --- Método para acceder al QuizSystem si otros módulos lo necesitan ---
  public getQuizSystem(): QuizSystem {
      return this.quizSystem;
  }

  // --- Método para acceder al PhysicsManager si otros módulos lo necesitan ---
   public getPhysicsManager(): PhysicsManager {
       return this.physicsManager;
   }

  // --- Método para acceder al StateMachine si otros módulos lo necesitan ---
  // public getStateMachine(): StateMachine {
  //     if (!this.stateMachine) throw new Error("StateMachine no inicializada.");
  //     return this.stateMachine;
  // }
}