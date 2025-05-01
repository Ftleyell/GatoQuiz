// src/game/GameManager.ts

import { PhysicsManager } from '../systems/PhysicsManager';
import { QuizSystem } from '../systems/QuizSystem';
import { StateMachine } from './StateMachine';
import { AudioManager } from '../systems/AudioManager';
import { CatManager } from '../systems/CatManager'; // <-- IMPORTAR CatManager

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
  private audioManager: AudioManager;
  private catManager: CatManager; // <-- AÑADIR PROPIEDAD CatManager
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

    // Instanciar Managers principales
    this.physicsManager = new PhysicsManager();
    this.quizSystem = new QuizSystem();
    this.stateMachine = new StateMachine();
    this.audioManager = new AudioManager();
    // Instanciar CatManager y pasar dependencias necesarias
    this.catManager = new CatManager(this.physicsManager); // <-- INSTANCIAR CatManager
  }

  public async init(): Promise<void> {
    console.log('GameManager: init');
    this.resetLives();
    this.physicsManager.init(); // Init de física antes que sistemas dependientes
    this.setupStates();
    // La inicialización del AudioManager se maneja en main.ts
    await this.preload();
  }

  public async preload(): Promise<void> {
    console.log('GameManager: preload');
    try {
      const loaded = await this.quizSystem.loadQuestions('/data/questions.json');
      if (!loaded) {
        console.error('GameManager: Falló la carga inicial de preguntas.');
        throw new Error('Failed to load questions.');
      } else {
        console.log('GameManager: Preguntas cargadas.');
      }
      // Aquí podríamos precargar assets de gatos (imágenes, plantillas JSON) en el futuro
      // await this.catManager.preloadAssets(); // Método hipotético
    } catch (error) {
      console.error('GameManager: Error durante preload:', error);
      throw error;
    }
  }

  public create(): void {
    console.log('GameManager: create');
    this.quizSystem.resetAvailableQuestions();
    this.catManager.removeAllCats(); // Asegurar que no queden gatos de partidas anteriores
    this.resetLives(); // Asegurar que las vidas se resetean al empezar nueva partida
    this.stateMachine.changeState('MainMenu');
  }

  private gameLoop(timestamp: number): void {
    if (!this.isRunning) return;
    const deltaTime = (timestamp - this.lastTimestamp) / 1000.0;
    this.lastTimestamp = timestamp;
    const clampedDeltaTime = Math.min(deltaTime, 0.1);
    this.update(clampedDeltaTime); // Pasar deltaTime a update
    // El renderizado ahora se maneja dentro de update (via catManager.updateCats)
    this.gameLoopRequestId = requestAnimationFrame(this.gameLoop.bind(this));
  }

  public update(deltaTime: number): void {
    // Actualizar la máquina de estados primero
    this.stateMachine.update(deltaTime);

    // Actualizar otros sistemas que necesiten update en cada frame
    // PhysicsManager es actualizado internamente por su Runner
    this.catManager.updateCats(deltaTime); // <-- ACTUALIZAR GATOS (sincroniza física y render básico)

    // No llamar a render() global aquí si el renderizado es manejado por sistemas/estados
  }

  public start(): void {
    if (this.isRunning) return;
    console.log('GameManager: Iniciando bucle de juego...');
    this.isRunning = true;
    this.lastTimestamp = performance.now();
    this.physicsManager.start(); // Iniciar el Runner de física
    this.gameLoopRequestId = requestAnimationFrame(this.gameLoop.bind(this));
  }

  public stop(): void {
    if (!this.isRunning) return;
    console.log('GameManager: Deteniendo bucle de juego...');
    this.isRunning = false;
    if (this.gameLoopRequestId) cancelAnimationFrame(this.gameLoopRequestId);
    this.gameLoopRequestId = undefined;
    this.physicsManager.stop(); // Detener el Runner de física
  }

  public shutdown(): void {
    console.log('GameManager: shutdown');
    this.stop();
    if (this.stateMachine.getCurrentStateName() && this.stateMachine.getCurrentStateName() !== '__shutdown__') {
        this.stateMachine.changeState('__shutdown__'); // Llama a exit() del estado actual
    }
    this.catManager.removeAllCats(); // <-- Limpiar gatos al cerrar
    this.containerElement.innerHTML = ''; // Limpiar contenedor principal
  }

  private setupStates(): void {
    console.log('GameManager: Configurando estados...');
    this.stateMachine.addState('Loading', new LoadingState(this));
    this.stateMachine.addState('MainMenu', new MainMenuState(this));
    this.stateMachine.addState('QuizGameplay', new QuizGameplayState(this));
    this.stateMachine.addState('Results', new ResultsState(this));
    this.stateMachine.addState('GameOver', new GameOverState(this));
    this.stateMachine.addState('__shutdown__', { enter: () => {}, exit: () => {}, update: () => {} });
  }

  // --- Métodos para Vidas ---
  public getLives(): number { return this.lives; }
  public decrementLives(): void { if (this.lives > 0) { this.lives--; console.log(`Vida perdida. Vidas restantes: ${this.lives}`); } }
  public resetLives(): void { this.lives = GameManager.INITIAL_LIVES; console.log(`Vidas reseteadas a: ${this.lives}`); }
  // --------------------------

  // --- Getters para Sistemas ---
  public getQuizSystem(): QuizSystem { return this.quizSystem; }
  public getPhysicsManager(): PhysicsManager { return this.physicsManager; }
  public getStateMachine(): StateMachine { return this.stateMachine; }
  public getAudioManager(): AudioManager { return this.audioManager; }
  public getCatManager(): CatManager { return this.catManager; } // <-- AÑADIR GETTER
  public getContainerElement(): HTMLElement { return this.containerElement; }
}