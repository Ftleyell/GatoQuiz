// src/game/GameManager.ts

import { PhysicsManager } from '../systems/PhysicsManager';
import { QuizSystem } from '../systems/QuizSystem';
import { StateMachine, IState } from './StateMachine';
import { AudioManager } from '../systems/AudioManager';
import { CatManager } from '../systems/CatManager';
import { ShopManager } from '../systems/ShopManager';
import { PlayerData } from './PlayerData';
import { CatTemplate } from '../types/CatTemplate';
import { ShopItemJsonData } from '../types/ShopItemData';
import { InkManager } from '../systems/InkManager';
import { UIManager } from '../systems/UIManager'; // Importar UIManager simplificado

// Importaciones de Estados
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
  private playerData: PlayerData;
  private shopManager: ShopManager;
  private inkManager: InkManager;
  private uiManager: UIManager;
  private lastTimestamp: number = 0;
  private isRunning: boolean = false;
  private gameLoopRequestId?: number;
  private containerElement: HTMLElement;
  private previousBodyStateClass: string | null = null;

  constructor(container: HTMLElement) {
    this.containerElement = container;
    this.audioManager = new AudioManager();
    this.quizSystem = new QuizSystem();
    this.playerData = new PlayerData();
    this.catManager = new CatManager(this.audioManager);
    this.physicsManager = new PhysicsManager(this.catManager);
    this.uiManager = new UIManager(this); // Instanciar UIManager simplificado
    this.shopManager = new ShopManager(this.playerData, this);
    this.inkManager = new InkManager(this);
    this.stateMachine = new StateMachine();
    this.catManager.setPhysicsManager(this.physicsManager);
    this.setupStates();
  }

  public async init(): Promise<void> {
    console.log('GameManager: init');
    this.playerData.reset();
    this.physicsManager.init(this.getWorldContainer());
    await this.preload(); // Carga datos JSON (sin temas)
    console.log("GameManager init completado.");
  }

  public async preload(): Promise<void> {
    console.log('GameManager: preload - Cargando assets...');
    const questionsUrl = '/data/questions.json';
    const templatesUrl = '/data/cat_templates.json';
    const shopItemsUrl = '/data/shop_items.json';

    try {
      // Cargar archivos en paralelo (sin temas)
      const [questionResponse, templateResponse, shopResponse] = await Promise.all([
        fetch(questionsUrl),
        fetch(templatesUrl),
        fetch(shopItemsUrl)
      ]);

      // Verificar respuestas (sin temas)
      if (!questionResponse.ok) throw new Error(`HTTP ${questionResponse.status} cargando ${questionsUrl}`);
      if (!templateResponse.ok) throw new Error(`HTTP ${templateResponse.status} cargando ${templatesUrl}`);
      if (!shopResponse.ok) throw new Error(`HTTP ${shopResponse.status} cargando ${shopItemsUrl}`);

      // Parsear JSON (sin temas)
      const questionData = await questionResponse.json();
      const templateData: CatTemplate[] = await templateResponse.json();
      const shopItemJsonData = await shopResponse.json();

      // Validar formato (sin temas)
      if (!Array.isArray(questionData)) throw new Error('Formato inválido de preguntas.');
      if (!Array.isArray(templateData)) throw new Error('Formato inválido de plantillas.');
      if (!Array.isArray(shopItemJsonData)) throw new Error('Formato inválido de ítems de tienda.');

      // Cargar datos en sistemas (sin temas)
      const questionsLoaded = await this.quizSystem.loadQuestionsData(questionData);
      if (!questionsLoaded) throw new Error("Fallo al procesar preguntas en QuizSystem.");
      this.catManager.loadTemplates(templateData);
      this.shopManager.init(shopItemJsonData);
      // Ya no se cargan temas aquí

      console.log('GameManager: Preload completado exitosamente.');
    } catch (error: any) {
      console.error('GameManager: Error durante preload:', error);
      this.containerElement.innerHTML = `Error al cargar assets: ${error.message}. Revisa la consola.`;
      throw error;
    }
  }

  public create(): void {
    console.log('GameManager: create');
    this.quizSystem.resetAvailableQuestions();
    this.catManager.removeAllCats();
    // Ya no se establece un tema activo
    this.stateMachine.changeState('MainMenu');
  }

  // --- Métodos gameLoop, update, start, stop, shutdown, getWorldContainer, setupStates, setBodyStateClass, Vidas, Tienda, Dibujo, Actualización UI Externa (SIN CAMBIOS) ---
  private gameLoop(timestamp: number): void { if (!this.isRunning) return; const deltaTime = (timestamp - this.lastTimestamp) / 1000.0; this.lastTimestamp = timestamp; const clampedDeltaTime = Math.min(deltaTime, 0.1); this.update(clampedDeltaTime); this.gameLoopRequestId = requestAnimationFrame(this.gameLoop.bind(this)); }
  public update(deltaTime: number): void { this.stateMachine.update(deltaTime); this.catManager.updateCats(deltaTime); }
  public start(): void { if (this.isRunning) return; console.log('GameManager: Iniciando bucle de juego...'); this.isRunning = true; this.lastTimestamp = performance.now(); this.physicsManager.start(); this.gameLoopRequestId = requestAnimationFrame(this.gameLoop.bind(this)); }
  public stop(): void { if (!this.isRunning) return; console.log('GameManager: Deteniendo bucle de juego...'); this.isRunning = false; if (this.gameLoopRequestId) cancelAnimationFrame(this.gameLoopRequestId); this.gameLoopRequestId = undefined; this.physicsManager.stop(); }
  public shutdown(): void { console.log('GameManager: shutdown'); this.stop(); this.physicsManager.shutdown(); const currentStateName = this.stateMachine.getCurrentStateName(); if (currentStateName && currentStateName !== '__shutdown__') { try { const currentState = this.stateMachine.getCurrentState(); currentState?.exit(); this.stateMachine.changeState('__shutdown__'); } catch (e) { console.warn("Error en exit() del estado durante shutdown:", e) } } this.catManager.removeAllCats(); this.inkManager.destroy(); this.shopManager.destroy(); this.containerElement.innerHTML = ''; this.setBodyStateClass(null); }
  private getWorldContainer(): HTMLElement { return document.body; }
  private setupStates(): void { this.stateMachine.addState('Loading', new LoadingState(this)); this.stateMachine.addState('MainMenu', new MainMenuState(this)); this.stateMachine.addState('QuizGameplay', new QuizGameplayState(this)); this.stateMachine.addState('Results', new ResultsState(this)); this.stateMachine.addState('GameOver', new GameOverState(this)); this.stateMachine.addState('__shutdown__', { enter: () => {}, exit: () => {}, update: () => {} }); }
  public setBodyStateClass(stateName: string | null): void { const body = document.body; if (this.previousBodyStateClass) { body.classList.remove(`state-${this.previousBodyStateClass}`); } if (stateName) { const newStateClass = `state-${stateName}`; body.classList.add(newStateClass); this.previousBodyStateClass = stateName; } else { this.previousBodyStateClass = null; } }
  public getLives(): number { return this.playerData.lives; }
  public decrementLives(): void { if (this.playerData.lives > 0) { this.playerData.lives--; this.updateExternalLivesUI(); } }
  public incrementLives(): void { this.playerData.lives++; this.updateExternalLivesUI(); }
  public openShop(): void { this.shopManager.openShop(); }
  public closeShop(): void { this.shopManager.closeShop(); }
  public enableDrawingFeature(): void { console.log("GameManager: Habilitando función de dibujo..."); const rightControls = document.getElementById('right-controls'); if (rightControls) { rightControls.classList.add('drawing-unlocked'); console.log("GameManager: Clase 'drawing-unlocked' añadida a #right-controls."); } else { console.warn("GameManager: No se encontró #right-controls para añadir clase 'drawing-unlocked'."); } this.inkManager.init(); }
  public updateInkUI(): void { this.inkManager.updateInkUI(); }
  public updateExternalLivesUI(): void { if (this.uiManager) { this.uiManager.updateLivesDisplay(this.playerData.lives); } else { console.warn("updateExternalLivesUI llamado antes de que UIManager esté listo."); } }
  public updateExternalShieldUI(isActive: boolean): void { if (this.uiManager) { this.uiManager.updateShieldIcon(isActive); } else { console.warn("updateExternalShieldUI llamado antes de que UIManager esté listo."); } }
  public updateExternalHintUI(charges: number): void { if (this.uiManager) { this.uiManager.updateHintIcon(charges); } else { console.warn("updateExternalHintUI llamado antes de que UIManager esté listo."); } }
  // --- Fin Métodos sin cambios ---

  // --- Getters (Iguales) ---
  public getQuizSystem(): QuizSystem { return this.quizSystem; }
  public getPhysicsManager(): PhysicsManager { return this.physicsManager; }
  public getStateMachine(): StateMachine { return this.stateMachine; }
  public getAudioManager(): AudioManager { return this.audioManager; }
  public getCatManager(): CatManager { return this.catManager; }
  public getShopManager(): ShopManager { return this.shopManager; }
  public getPlayerData(): PlayerData { return this.playerData; }
  public getInkManager(): InkManager { return this.inkManager; }
  public getUIManager(): UIManager { if (!this.uiManager) { throw new Error("UIManager no ha sido inicializado."); } return this.uiManager; }
  public getContainerElement(): HTMLElement { return this.containerElement; }
  public getCurrentState(): IState | null { return this.stateMachine.getCurrentState(); }
  // -----------------------------------------------------------

} // Fin clase GameManager
