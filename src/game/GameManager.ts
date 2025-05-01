// src/game/GameManager.ts

import { PhysicsManager } from '../systems/PhysicsManager';
import { QuizSystem } from '../systems/QuizSystem';
import { StateMachine } from './StateMachine';
import { AudioManager } from '../systems/AudioManager';
import { CatManager } from '../systems/CatManager';
import { CatTemplate } from '../types/CatTemplate';

import { LoadingState } from './states/LoadingState';
import { MainMenuState } from './states/MainMenuState';
import { QuizGameplayState } from './states/QuizGameplayState';
import { ResultsState } from './states/ResultsState';
import { GameOverState } from './states/GameOverState';

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

    // Crear instancias
    this.audioManager = new AudioManager();
    this.quizSystem = new QuizSystem();
    // Pasar AudioManager a CatManager
    this.catManager = new CatManager(this.audioManager);
    // Pasar CatManager a PhysicsManager
    this.physicsManager = new PhysicsManager(this.catManager);
    this.stateMachine = new StateMachine();

    // Inyectar PhysicsManager en CatManager (si es necesario post-constructor)
    this.catManager.setPhysicsManager(this.physicsManager);
  }

  public async init(): Promise<void> {
    console.log('GameManager: init');
    this.resetLives();
    // Inicializar PhysicsManager (que ahora depende de CatManager)
    this.physicsManager.init(this.getWorldContainer()); // Pasa el contenedor para MouseConstraint
    this.setupStates();
    // Llamar a preload DESPUÉS de que los managers base estén listos
    await this.preload(); // <-- Línea 64 (Ahora debería funcionar)
  }

  // ****** MÉTODO PRELOAD RESTAURADO ******
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
            .then(questionData => { // Guardar los datos para pasarlos después
                 if (!Array.isArray(questionData)) throw new Error('Formato inválido de preguntas.');
                 console.log('GameManager: Datos de preguntas obtenidos.');
                 return questionData; // Devolver los datos
            });

        const loadTemplatesPromise = fetch(templatesUrl)
            .then(response => {
                if (!response.ok) throw new Error(`Error HTTP ${response.status} cargando plantillas de gatos`);
                return response.json();
            })
            .then((templateData: CatTemplate[]) => {
                 if (!Array.isArray(templateData)) throw new Error('Formato inválido de plantillas de gatos.');
                 this.catManager.loadTemplates(templateData);
                 console.log('GameManager: Plantillas de gatos cargadas en CatManager.');
                 return true;
            });

        // Esperar a que ambas promesas se completen
        // Promise.all devolverá un array con los resultados [questionData, true]
        const results = await Promise.all([loadQuestionsPromise, loadTemplatesPromise]);
        const questionData = results[0]; // Obtener los datos de preguntas del resultado

        // Llamar a loadQuestionsData del QuizSystem CON los datos ya cargados
        const questionsLoaded = await this.quizSystem.loadQuestionsData(questionData);
        if (!questionsLoaded) {
             throw new Error("Fallo al procesar datos de preguntas en QuizSystem.");
        }

        console.log('GameManager: Preload completado exitosamente.');

    } catch (error: any) { // Tipar error como any o unknown
        console.error('GameManager: Error durante preload:', error);
        this.containerElement.innerHTML = `Error al cargar assets: ${error.message}. Revisa la consola.`;
        throw error; // Re-lanzar para detener la inicialización
    }
  }
  // ****** FIN MÉTODO PRELOAD RESTAURADO ******


  public create(): void {
    console.log('GameManager: create');
    this.quizSystem.resetAvailableQuestions();
    this.catManager.removeAllCats();
    this.resetLives();
    this.stateMachine.changeState('MainMenu'); // Ir al menú principal después de cargar todo
  }

  private gameLoop(timestamp: number): void {
    if (!this.isRunning) return;
    const deltaTime = (timestamp - this.lastTimestamp) / 1000.0;
    this.lastTimestamp = timestamp;
    const clampedDeltaTime = Math.min(deltaTime, 0.1); // Evitar saltos grandes
    this.update(clampedDeltaTime);
    this.gameLoopRequestId = requestAnimationFrame(this.gameLoop.bind(this));
  }

  public update(deltaTime: number): void {
    // Actualizar la máquina de estados PRIMERO, ya que puede cambiar la lógica activa
    this.stateMachine.update(deltaTime);
    // Actualizar otros sistemas (ej: CatManager para sincronizar visuales)
    this.catManager.updateCats(deltaTime);
    // PhysicsManager (Matter.Runner) se actualiza por sí mismo
  }

  public start(): void {
    if (this.isRunning) return;
    console.log('GameManager: Iniciando bucle de juego...');
    this.isRunning = true;
    this.lastTimestamp = performance.now();
    this.physicsManager.start(); // Inicia el Runner de Matter.js
    this.gameLoopRequestId = requestAnimationFrame(this.gameLoop.bind(this));
  }

  public stop(): void {
    if (!this.isRunning) return;
    console.log('GameManager: Deteniendo bucle de juego...');
    this.isRunning = false;
    if (this.gameLoopRequestId) cancelAnimationFrame(this.gameLoopRequestId);
    this.gameLoopRequestId = undefined;
    this.physicsManager.stop(); // Detiene el Runner de Matter.js
  }

  public shutdown(): void {
    console.log('GameManager: shutdown');
    this.stop();
    // Limpiar recursos y listeners
    this.physicsManager.shutdown(); // Llama a shutdown para quitar listener de resize y colisiones

    // Intentar salir del estado actual de forma segura
    if (this.stateMachine.getCurrentStateName() && this.stateMachine.getCurrentStateName() !== '__shutdown__') {
        try {
            this.stateMachine.changeState('__shutdown__'); // Usar un estado dummy para llamar a exit() del estado actual
        } catch (e) {
            console.warn("Error llamando a exit() del estado actual durante shutdown:", e)
        }
    }
    this.catManager.removeAllCats(); // Eliminar gatos
    this.containerElement.innerHTML = ''; // Limpiar UI
  }

  // Método helper para obtener el contenedor físico (ej: body o un div específico)
  // Necesario para el MouseConstraint en PhysicsManager
  private getWorldContainer(): HTMLElement {
      // Usamos document.body ya que el cat-container es fijo y cubre todo
      return document.body;
  }

  private setupStates(): void {
    console.log('GameManager: Configurando estados...');
    this.stateMachine.addState('Loading', new LoadingState(this));
    this.stateMachine.addState('MainMenu', new MainMenuState(this));
    this.stateMachine.addState('QuizGameplay', new QuizGameplayState(this));
    this.stateMachine.addState('Results', new ResultsState(this));
    this.stateMachine.addState('GameOver', new GameOverState(this));
    // Estado dummy para asegurar que se llame a exit() al hacer shutdown
    this.stateMachine.addState('__shutdown__', { enter: () => {}, exit: () => {}, update: () => {} });
  }

  // --- Métodos para Vidas (sin cambios) ---
  public getLives(): number { return this.lives; }
  public decrementLives(): void { if (this.lives > 0) { this.lives--; console.log(`Vida perdida. Vidas restantes: ${this.lives}`); } }
  public resetLives(): void { this.lives = GameManager.INITIAL_LIVES; console.log(`Vidas reseteadas a: ${this.lives}`); }
  // --------------------------

  // --- Getters para Sistemas (sin cambios) ---
  public getQuizSystem(): QuizSystem { return this.quizSystem; }
  public getPhysicsManager(): PhysicsManager { return this.physicsManager; }
  public getStateMachine(): StateMachine { return this.stateMachine; }
  public getAudioManager(): AudioManager { return this.audioManager; }
  public getCatManager(): CatManager { return this.catManager; }
  public getContainerElement(): HTMLElement { return this.containerElement; }
}