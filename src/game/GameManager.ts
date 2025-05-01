// src/game/GameManager.ts

import { PhysicsManager } from '../systems/PhysicsManager';
import { QuizSystem } from '../systems/QuizSystem';
import { StateMachine, IState } from './StateMachine'; // <-- Modificado: StateMachine e IState importados

// <-- Imports de los nuevos estados añadidos -->
import { LoadingState } from './states/LoadingState';
import { MainMenuState } from './states/MainMenuState';
import { QuizGameplayState } from './states/QuizGameplayState';
import { ResultsState } from './states/ResultsState';


/**
 * GameManager: Clase principal que orquesta el ciclo de vida del juego,
 * los sistemas y el estado general.
 */
export class GameManager {
  private physicsManager: PhysicsManager;
  private quizSystem: QuizSystem;
  private stateMachine: StateMachine; // <-- Descomentado/Añadido
  private lastTimestamp: number = 0;
  private isRunning: boolean = false;
  private gameLoopRequestId?: number;

  private containerElement: HTMLElement;

  constructor(container: HTMLElement) {
    this.containerElement = container;
    console.log('GameManager Creado');

    // Inicializar sistemas centrales
    this.physicsManager = new PhysicsManager();
    this.quizSystem = new QuizSystem();
    this.stateMachine = new StateMachine(); // <-- Descomentado/Añadido
  }

  /**
   * Inicializa los sistemas del juego y prepara los recursos necesarios.
   */
  public async init(): Promise<void> {
    console.log('GameManager: init');
    this.physicsManager.init();

    // Configurar los estados ANTES de cargar assets (si LoadingState los maneja) o DESPUÉS
    this.setupStates(); // <-- Llamada añadida

    await this.preload(); // Cargar assets iniciales
  }

  /**
   * Carga los assets necesarios antes de que el juego comience.
   */
  public async preload(): Promise<void> {
    console.log('GameManager: preload');
    // Cambiar al estado de carga antes de empezar a cargar
    // this.stateMachine.changeState('Loading'); // Opcional: si LoadingState muestra progreso

    try {
      const loaded = await this.quizSystem.loadQuestions('/data/questions.json');
      if (!loaded) {
        console.error(
          'GameManager: Falló la carga de preguntas. Verifica la ruta y el archivo JSON.',
          this.quizSystem.getLastError()
        );
        this.containerElement.innerHTML = `Error al cargar preguntas: ${this.quizSystem.getLastError()}`;
        throw new Error('Failed to load questions.');
      } else {
        console.log('GameManager: Preguntas cargadas.');
      }
      // Cargar otros assets aquí
    } catch (error) {
      console.error('GameManager: Error durante preload:', error);
       if (this.containerElement.innerHTML === '') {
           this.containerElement.innerHTML = `Error durante la carga: ${error instanceof Error ? error.message : String(error)}`;
       }
      throw error; // Detener si la carga falla
    }
  }

  /**
   * Crea las entidades iniciales y establece el estado inicial del juego.
   */
  public create(): void {
    console.log('GameManager: create');
    // Iniciar el primer estado del juego (después de cargar todo)
    this.stateMachine.changeState('MainMenu'); // <-- Cambio de estado inicial añadido
  }

  /**
   * El bucle principal del juego.
   */
  private gameLoop(timestamp: number): void {
    if (!this.isRunning) return;

    const deltaTime = (timestamp - this.lastTimestamp) / 1000.0;
    this.lastTimestamp = timestamp;

    this.update(deltaTime);

    this.gameLoopRequestId = requestAnimationFrame(this.gameLoop.bind(this));
  }


  /**
   * Actualiza la lógica del juego (a través de la StateMachine).
   */
  public update(deltaTime: number): void {
    this.stateMachine.update(deltaTime); // <-- Descomentado/Añadido: Delega el update al estado actual
    this.render(); // Render se llama después de actualizar el estado
  }

  /**
   * Dibuja el estado actual del juego en la pantalla.
   * (Podría delegarse al estado actual también si cada estado renderiza diferente)
   */
  public render(): void {
    // console.log('GameManager: render');
    // Podrías hacer: this.stateMachine.render() si los estados tuvieran un método render
  }

  /**
   * Inicia el bucle principal del juego.
   */
  public start(): void {
     if (this.isRunning) return;
     console.log('GameManager: Iniciando bucle de juego...');
     this.isRunning = true;
     this.lastTimestamp = performance.now();
     this.physicsManager.start();
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
     this.physicsManager.stop();
   }

  /**
   * Libera recursos y limpia antes de cerrar el juego.
   */
  public shutdown(): void {
    console.log('GameManager: shutdown');
    this.stop();
    // Avisar al estado actual para que limpie si es necesario
    if (this.stateMachine.getCurrentStateName()) {
        this.stateMachine.changeState('__shutdown__'); // Un estado dummy para forzar el exit()
    }
    this.containerElement.innerHTML = '';
  }

  /**
   * Configura e instancia los diferentes estados del juego.
   * @private
   */
  private setupStates(): void { // <-- Método añadido
    console.log('GameManager: Configurando estados...');
    this.stateMachine.addState('Loading', new LoadingState(this));
    this.stateMachine.addState('MainMenu', new MainMenuState(this));
    this.stateMachine.addState('QuizGameplay', new QuizGameplayState(this));
    this.stateMachine.addState('Results', new ResultsState(this));
    // Añadir un estado 'dummy' para manejar el shutdown si es necesario
    this.stateMachine.addState('__shutdown__', { enter: ()=>{}, exit: ()=>{}, update: ()=>{} });
  }

  // --- Getters para que los estados accedan a los sistemas ---

  public getQuizSystem(): QuizSystem {
      return this.quizSystem;
  }

  public getPhysicsManager(): PhysicsManager {
       return this.physicsManager;
   }

  public getStateMachine(): StateMachine { // <-- Getter descomentado/añadido
       return this.stateMachine;
   }

   public getContainerElement(): HTMLElement { // <-- Getter útil para los estados que manipulan UI
        return this.containerElement;
    }
}