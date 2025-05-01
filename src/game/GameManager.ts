// src/game/GameManager.ts

import { PhysicsManager } from '../systems/PhysicsManager';
import { QuizSystem } from '../systems/QuizSystem';
import { StateMachine } from './StateMachine';
import { AudioManager } from '../systems/AudioManager';
import { CatManager } from '../systems/CatManager';
import { CatTemplate } from '../types/CatTemplate'; // <-- IMPORTAR CatTemplate

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
  private catManager: CatManager;
  private lastTimestamp: number = 0;
  private isRunning: boolean = false;
  private gameLoopRequestId?: number;

  private containerElement: HTMLElement;

  private static readonly INITIAL_LIVES = 3;
  private lives: number = GameManager.INITIAL_LIVES;

  constructor(container: HTMLElement) {
    this.containerElement = container;
    console.log('GameManager Creado');

    this.physicsManager = new PhysicsManager();
    this.quizSystem = new QuizSystem();
    this.stateMachine = new StateMachine();
    this.audioManager = new AudioManager();
    this.catManager = new CatManager(this.physicsManager);
  }

  public async init(): Promise<void> {
    console.log('GameManager: init');
    this.resetLives();
    this.physicsManager.init();
    this.setupStates();
    await this.preload(); // Esperar a que preload termine
  }

  /**
   * Carga todos los assets necesarios antes de iniciar el juego.
   */
  public async preload(): Promise<void> {
    console.log('GameManager: preload - Cargando assets...');

    const questionsUrl = '/data/questions.json';
    const templatesUrl = '/data/cat_templates.json'; // Ruta al nuevo JSON

    try {
        // Crear promesas para ambas cargas
        const loadQuestionsPromise = fetch(questionsUrl)
            .then(response => {
                if (!response.ok) throw new Error(`Error HTTP ${response.status} cargando preguntas`);
                return response.json();
            })
            .then(data => {
                 // Validación básica (QuizSystem hace una validación más profunda si es necesario)
                if (!Array.isArray(data)) throw new Error('Formato inválido de preguntas.');
                // Aquí podríamos llamar a quizSystem.loadQuestions si quisiéramos encapsular más,
                // pero por ahora asignamos directamente si la estructura es simple.
                // O mejor aún, QuizSystem podría tener un método que devuelva los datos cargados
                // await this.quizSystem.loadQuestions(questionsUrl); // Si loadQuestions hiciera el fetch
                console.log('GameManager: Datos de preguntas obtenidos.');
                return data; // Devolver datos para loadTemplates si fuera necesario
            });

        const loadTemplatesPromise = fetch(templatesUrl)
            .then(response => {
                if (!response.ok) throw new Error(`Error HTTP ${response.status} cargando plantillas de gatos`);
                return response.json();
            })
            .then((data: CatTemplate[]) => { // Tipar los datos esperados
                 if (!Array.isArray(data)) throw new Error('Formato inválido de plantillas de gatos.');
                 this.catManager.loadTemplates(data); // Cargar las plantillas en CatManager
                 console.log('GameManager: Plantillas de gatos cargadas en CatManager.');
                 return true; // Indicar éxito
            });

        // Esperar a que ambas promesas se completen
        // Promise.all devolverá un array con los resultados de cada promesa en orden
        await Promise.all([loadQuestionsPromise, loadTemplatesPromise]);

        // Llamar a loadQuestions del QuizSystem después de obtener los datos (si no lo hace internamente)
        // Esto asume que loadQuestionsPromise resolvió con los datos de las preguntas
        const questionData = await loadQuestionsPromise; // Re-obtener los datos (o ajustar la lógica)
        const questionsLoaded = await this.quizSystem.loadQuestionsData(questionData); // Método hipotético en QuizSystem
        if (!questionsLoaded) {
             throw new Error("Fallo al procesar datos de preguntas en QuizSystem.");
        }


        console.log('GameManager: Preload completado exitosamente.');

    } catch (error) {
        console.error('GameManager: Error durante preload:', error);
        // Aquí podrías mostrar un mensaje de error al usuario en la UI
        this.containerElement.innerHTML = `Error al cargar assets: ${error.message}. Revisa la consola.`;
        throw error; // Re-lanzar para detener la inicialización si es crítico
    }
}

  // --- Método Hipotético añadido a QuizSystem ---
  // Necesitarías añadir este método a src/systems/QuizSystem.ts:
  /*
  public async loadQuestionsData(data: any[]): Promise<boolean> {
      if (this.isLoading) {
          console.warn('QuizSystem: Ya hay una carga en progreso.');
          return false;
      }
      console.log(`QuizSystem: Procesando datos de preguntas pre-cargados...`);
      this.isLoading = true;
      this.lastError = null;
      this.allQuestions = [];

      try {
          if (!Array.isArray(data) || data.length === 0) {
              throw new Error('Los datos de preguntas proporcionados no son un array válido.');
          }
          // TODO: Validación más profunda de cada objeto de pregunta si es necesario
          this.allQuestions = data as Question[]; // Asignar los datos (con type assertion)
          this.resetAvailableQuestions();
          console.log(`QuizSystem: ${this.allQuestions.length} preguntas procesadas exitosamente.`);
          this.isLoading = false;
          return true;

      } catch (error) {
          console.error('QuizSystem: Error al procesar los datos de preguntas:', error);
          this.lastError = error instanceof Error ? error.message : String(error);
          this.isLoading = false;
          this.allQuestions = [];
          this.availableQuestions = [];
          return false;
      }
  }
  */
 // --- Fin Método Hipotético ---


  public create(): void {
    console.log('GameManager: create');
    this.quizSystem.resetAvailableQuestions();
    this.catManager.removeAllCats();
    this.resetLives();
    this.stateMachine.changeState('MainMenu');
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
    // Detener otros managers/listeners aquí si es necesario
    this.physicsManager.shutdown(); // Llama a shutdown para quitar listener de resize

    if (this.stateMachine.getCurrentStateName() && this.stateMachine.getCurrentStateName() !== '__shutdown__') {
        this.stateMachine.changeState('__shutdown__');
    }
    this.catManager.removeAllCats();
    this.containerElement.innerHTML = '';
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
  public getCatManager(): CatManager { return this.catManager; }
  public getContainerElement(): HTMLElement { return this.containerElement; }
}