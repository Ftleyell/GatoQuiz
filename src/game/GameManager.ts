// src/game/GameManager.ts

import { PhysicsManager } from '../systems/PhysicsManager';
import { QuizSystem } from '../systems/QuizSystem';
import { StateMachine } from './StateMachine'; // Removido IState ya que no se usa directamente aquí
import { AudioManager } from '../systems/AudioManager'; // <-- IMPORTAR AudioManager

import { LoadingState } from './states/LoadingState';
import { MainMenuState } from './states/MainMenuState';
import { QuizGameplayState } from './states/QuizGameplayState';
import { ResultsState } from './states/ResultsState';
import { GameOverState } from './states/GameOverState';

/**
 * GameManager: Clase principal que orquesta el ciclo de vida del juego,
 * los sistemas y el estado general.
 */
export class GameManager {
  private physicsManager: PhysicsManager;
  private quizSystem: QuizSystem;
  private stateMachine: StateMachine;
  private audioManager: AudioManager; // <-- AÑADIR PROPIEDAD AudioManager
  private lastTimestamp: number = 0;
  private isRunning: boolean = false;
  private gameLoopRequestId?: number;

  private containerElement: HTMLElement;

  // --- Manejo de Vidas (centralizado aquí) ---
  private static readonly INITIAL_LIVES = 3;
  private lives: number = GameManager.INITIAL_LIVES;
  // -------------------------------------------

  constructor(container: HTMLElement) {
    this.containerElement = container;
    console.log('GameManager Creado');

    this.physicsManager = new PhysicsManager();
    this.quizSystem = new QuizSystem();
    this.stateMachine = new StateMachine();
    this.audioManager = new AudioManager(); // <-- INSTANCIAR AudioManager
  }

  public async init(): Promise<void> {
    console.log('GameManager: init');
    this.resetLives();
    this.physicsManager.init();
    this.setupStates();
    // La inicialización del AudioManager (this.audioManager.init()) se hará desde main.ts
    // tras la interacción del usuario.
    await this.preload();
  }

  public async preload(): Promise<void> {
    console.log('GameManager: preload');
    try {
      const loaded = await this.quizSystem.loadQuestions('/data/questions.json');
      if (!loaded) {
        console.error('GameManager: Falló la carga inicial de preguntas.'); // Mensaje de error más específico
        throw new Error('Failed to load questions.');
      } else {
        console.log('GameManager: Preguntas cargadas.');
      }
    } catch (error) {
      console.error('GameManager: Error durante preload:', error); // Log de error más específico
      throw error; // Re-lanzar para que se maneje en main.ts
    }
  }

  public create(): void {
    console.log('GameManager: create');
    this.quizSystem.resetAvailableQuestions();
    this.stateMachine.changeState('MainMenu');
  }

  private gameLoop(timestamp: number): void {
    if (!this.isRunning) return;
    const deltaTime = (timestamp - this.lastTimestamp) / 1000.0;
    this.lastTimestamp = timestamp;
    // Evitar saltos enormes en deltaTime si la pestaña estuvo inactiva
    const clampedDeltaTime = Math.min(deltaTime, 0.1); // Limitar a 100ms (10 FPS min)
    this.update(clampedDeltaTime);
    this.gameLoopRequestId = requestAnimationFrame(this.gameLoop.bind(this));
  }

  public update(deltaTime: number): void {
    this.stateMachine.update(deltaTime);
    // La lógica de renderizado ahora está principalmente dentro de los estados o sistemas específicos
    // this.render(); <-- Render se maneja internamente donde sea necesario
  }

  // Se elimina el método render() vacío si no tiene lógica central aquí

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
    // Cambiar a un estado 'dummy' para asegurar que exit() se llama en el estado actual
    if (this.stateMachine.getCurrentStateName() && this.stateMachine.getCurrentStateName() !== '__shutdown__') {
        this.stateMachine.changeState('__shutdown__');
    }
    // Limpiar contenedor
    this.containerElement.innerHTML = '';
    // Aquí podrías añadir limpieza de otros managers si tuvieran métodos shutdown()
    // this.physicsManager.shutdown();
    // this.audioManager.shutdown(); // (Si tuviera un método shutdown)
  }

  private setupStates(): void {
    console.log('GameManager: Configurando estados...');
    this.stateMachine.addState('Loading', new LoadingState(this));
    this.stateMachine.addState('MainMenu', new MainMenuState(this));
    this.stateMachine.addState('QuizGameplay', new QuizGameplayState(this));
    this.stateMachine.addState('Results', new ResultsState(this));
    this.stateMachine.addState('GameOver', new GameOverState(this));
    // Estado dummy para asegurar limpieza al hacer shutdown
    this.stateMachine.addState('__shutdown__', { enter: () => {}, exit: () => {}, update: () => {} });
  }

  // --- Métodos para Vidas ---
  public getLives(): number {
    return this.lives;
  }

  public decrementLives(): void {
    if (this.lives > 0) {
      this.lives--;
      console.log(`Vida perdida. Vidas restantes: ${this.lives}`);
    }
  }

  public resetLives(): void {
    this.lives = GameManager.INITIAL_LIVES;
    console.log(`Vidas reseteadas a: ${this.lives}`);
  }
  // --------------------------

  // --- Getters para Sistemas ---
  public getQuizSystem(): QuizSystem { return this.quizSystem; }
  public getPhysicsManager(): PhysicsManager { return this.physicsManager; }
  public getStateMachine(): StateMachine { return this.stateMachine; }
  public getAudioManager(): AudioManager { return this.audioManager; } // <-- AÑADIR GETTER
  public getContainerElement(): HTMLElement { return this.containerElement; }
}