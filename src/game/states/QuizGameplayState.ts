// src/game/states/QuizGameplayState.ts

import { IState } from '../StateMachine';
import { GameManager } from '../GameManager';

// Tipos
interface QuestionOption { key: string; text: string; }
interface Question { id: number | string; text: string; options: QuestionOption[]; correctAnswerKey: string; difficulty: string; }

export class QuizGameplayState implements IState {
  private gameManager: GameManager;
  private currentQuestion: Question | null = null;
  private optionListeners: Map<HTMLButtonElement, () => void> = new Map();
  private quizContainer: HTMLDivElement | null = null; // Referencia al contenedor actual
  private nextQuestionTimeoutId: number | null = null;
  private score: number = 0;
  private consecutiveCorrectAnswers: number = 0;
  private currentComboMultiplier: number = 1.0;

  // Constantes de Puntuación
  private readonly BASE_POINTS_PER_CORRECT = 10;
  private readonly DIFFICULTY_BONUS: { [key: string]: number } = { "easy": 10, "medium": 30, "hard": 50 };

  // Plantillas de Spawn
  private spawnableCatTemplates = [ { id: 'common_gray', weight: 75 }, { id: 'rare_blue', weight: 25 } ];
  private totalSpawnWeight: number = 0;

  constructor(gameManager: GameManager) {
    this.gameManager = gameManager;
    this.calculateTotalSpawnWeight();
  }

  private calculateTotalSpawnWeight(): void { this.totalSpawnWeight = this.spawnableCatTemplates.reduce((sum, t) => sum + t.weight, 0); }
  private selectRandomCatTemplateId(): string { if(this.totalSpawnWeight<=0||this.spawnableCatTemplates.length===0)return'common_gray';const r=Math.random()*this.totalSpawnWeight;let c=0;for(const t of this.spawnableCatTemplates){c+=t.weight;if(r<c)return t.id;}return this.spawnableCatTemplates[this.spawnableCatTemplates.length-1]?.id??'common_gray'; }

  enter(params?: any): void {
    console.log('QuizGameplayState: enter', params);
    this.score = 0;
    this.consecutiveCorrectAnswers = 0;
    this.currentComboMultiplier = this.gameManager.getPlayerData().getCurrentComboMultiplier();
    this.calculateTotalSpawnWeight();
    this.clearUI(); // Limpiar primero
    // Llamar directamente, sin requestAnimationFrame por ahora
    this.displayNextQuestion();
  }

  exit(): void {
    console.log('QuizGameplayState: exit');
    this.clearUI();
  }

  update(deltaTime: number): void { /* Sin cambios */ }
  private calculateScore(difficulty: string, streakBefore: number): { /*...*/ } { const currentStreak=streakBefore+1;const basePoints=this.BASE_POINTS_PER_CORRECT*currentStreak;const difficultyBonus=this.DIFFICULTY_BONUS[difficulty]??this.DIFFICULTY_BONUS["easy"];const actualComboMultiplier=this.gameManager.getPlayerData().getCurrentComboMultiplier();const comboBonus=Math.max(0,(basePoints+difficultyBonus)*(actualComboMultiplier-1));const totalPoints=Math.round(basePoints+difficultyBonus+comboBonus);return{totalPoints,basePoints,difficultyBonus,comboBonus:Math.round(comboBonus)}; }
  private handleCorrectAnswer(difficulty: string): void { const scoreBreakdown=this.calculateScore(difficulty,this.consecutiveCorrectAnswers);this.consecutiveCorrectAnswers++;this.gameManager.getPlayerData().score+=scoreBreakdown.totalPoints;this.score=this.gameManager.getPlayerData().score;this.updateScoreUI();this.updateComboUI();this.updateLivesUI();let feedbackMessage=`¡Correcto! +${scoreBreakdown.totalPoints} Pts`;let details=`(Base: ${scoreBreakdown.basePoints}, Dif: +${scoreBreakdown.difficultyBonus}`;const actualComboMultiplier=this.gameManager.getPlayerData().getCurrentComboMultiplier();if(scoreBreakdown.comboBonus>0){details+=`, Combo x${actualComboMultiplier.toFixed(1)}: +${scoreBreakdown.comboBonus}`;}details+=')';feedbackMessage+=` ${details}`;this.updateFeedbackUI(feedbackMessage,true);try{this.gameManager.getAudioManager().playSound('correct');}catch(e){console.error("Error sonido 'correct':",e);}/*console.log("-> Iniciando lógica de spawn de gato...");*/const selectedTemplateId=this.selectRandomCatTemplateId();/*console.log(` -> Template ID seleccionado: ${selectedTemplateId}`);*/if(selectedTemplateId){try{/*console.log(` -> Intentando llamar a catManager.addCat con ID: ${selectedTemplateId}...`);*/const catManager=this.gameManager.getCatManager();if(!catManager){console.error("   --> ¡Error Fatal! CatManager no disponible.");}else{const newCat=catManager.addCat(selectedTemplateId);/*if(!newCat)console.error(`   --> ¡Fallo! catManager.addCat devolvió null para template ${selectedTemplateId}.`);else console.log(`   --> ¡Éxito! Gato ${newCat.id} spawneado.`);*/}}catch(error){console.error(` -> ¡Error atrapado! al llamar a catManager.addCat:`,error);}}/*else{console.log(" -> No se pudo seleccionar template.");}console.log("-> Fin lógica de spawn de gato.");*/this.scheduleNextQuestion(1500); }
  private handleIncorrectAnswer(): void { const playerData=this.gameManager.getPlayerData();if(playerData.hasShield){console.log("Escudo absorbe el golpe.");playerData.hasShield=false;this.updateFeedbackUI('¡Escudo Roto!',false,true);this.gameManager.getAudioManager().playSound('shield_break');}else{this.consecutiveCorrectAnswers=0;this.gameManager.decrementLives();this.updateLivesUI();this.updateComboUI();this.updateFeedbackUI('Incorrecto.',false);this.gameManager.getAudioManager().playSound('incorrect');}if(this.gameManager.getLives()<=0){console.log("Game Over condition met!");this.updateFeedbackUI('¡Has perdido!',false);if(this.nextQuestionTimeoutId){clearTimeout(this.nextQuestionTimeoutId);this.nextQuestionTimeoutId=null;}setTimeout(()=>{if(this.gameManager.getStateMachine().getCurrentStateName()==='QuizGameplay'){this.gameManager.getStateMachine().changeState('GameOver',{finalScore:playerData.score});}},1500);}else{this.scheduleNextQuestion(1500);}}
  private scheduleNextQuestion(delay: number): void { if(this.nextQuestionTimeoutId)clearTimeout(this.nextQuestionTimeoutId);if(this.gameManager.getStateMachine().getCurrentStateName()==='QuizGameplay'){this.nextQuestionTimeoutId=window.setTimeout(()=>{this.nextQuestionTimeoutId=null;if(this.gameManager.getStateMachine().getCurrentStateName()==='QuizGameplay'){/* Llamar a clearUI ANTES de mostrar la siguiente */ this.clearUI(); requestAnimationFrame(() => this.displayNextQuestion());}},delay);} } // Modificado para limpiar antes y usar RAF

  // --- displayNextQuestion Modificado para guardar referencia ---
  private displayNextQuestion(): void {
    console.log("[UI DEBUG] --- displayNextQuestion START ---");

    const quizSystem = this.gameManager.getQuizSystem();
    try {
        this.currentQuestion = quizSystem.selectNextQuestion();
        console.log("[UI DEBUG] Pregunta seleccionada:", this.currentQuestion ? this.currentQuestion.id : 'Ninguna');
    } catch (error) { console.error("Error al seleccionar pregunta:", error); return; }

    if (!this.currentQuestion) {
      console.log('[UI DEBUG] Fin del Quiz o error. Transicionando...');
      this.gameManager.getStateMachine().changeState('Results', { finalScore: this.gameManager.getPlayerData().score });
      return;
    }

    const appContainer = this.gameManager.getContainerElement();
    if (!appContainer) { console.error("[UI DEBUG] ¡Error crítico! #app no encontrado."); return; }
    else { console.log("[UI DEBUG] Contenedor #app encontrado."); }

    console.log("[UI DEBUG] Creando contenedor de UI del Quiz...");
    // Crear como variable local primero
    const newQuizContainer = document.createElement('div');
    newQuizContainer.className = 'quiz-ui-container p-4 flex flex-col items-center w-full max-w-md mx-auto text-gray-100 bg-gray-800 bg-opacity-80 rounded-lg shadow-lg z-20 relative';
    // No necesitamos ID para buscarlo ahora
    newQuizContainer.style.minHeight = '300px';

    // --- Creación de Elementos Internos ---
    try {
        // Top UI
        const topUIContainer = document.createElement('div'); topUIContainer.className = 'top-ui-container flex justify-between items-center w-full mb-4 p-2 bg-gray-700 rounded';
        const livesDisplayContainer = document.createElement('div'); livesDisplayContainer.id = 'quiz-lives-container'; livesDisplayContainer.className = 'quiz-lives flex items-center gap-1 text-lg text-red-400';
        const heartIcon = document.createElement('span'); heartIcon.textContent = '❤️';
        const livesCountSpan = document.createElement('span'); livesCountSpan.id = 'quiz-lives-count'; livesCountSpan.className = 'font-bold';
        livesDisplayContainer.appendChild(heartIcon); livesDisplayContainer.appendChild(livesCountSpan);
        topUIContainer.appendChild(livesDisplayContainer);
        const scoreDisplay = document.createElement('p'); scoreDisplay.id = 'quiz-score'; scoreDisplay.className = 'quiz-score text-3xl font-bold text-yellow-300';
        topUIContainer.appendChild(scoreDisplay);
        const comboDisplay = document.createElement('p'); comboDisplay.id = 'quiz-combo'; comboDisplay.className = 'quiz-combo text-xl font-semibold text-orange-400'; comboDisplay.style.display = 'none';
        topUIContainer.appendChild(comboDisplay);
        newQuizContainer.appendChild(topUIContainer); // Añadir a newQuizContainer

        // Question Text
        const questionTextElement = document.createElement('p');
        questionTextElement.textContent = this.currentQuestion.text;
        questionTextElement.className = 'question-text text-xl font-semibold mb-6 text-center p-2 bg-gray-700 rounded';
        newQuizContainer.appendChild(questionTextElement); // Añadir a newQuizContainer

        // Options
        const optionsContainer = document.createElement('div');
        optionsContainer.id = 'quiz-options'; optionsContainer.className = 'options-container flex flex-col gap-3 w-full';
        if (!this.currentQuestion.options?.length) throw new Error("No hay opciones");
        this.currentQuestion.options.forEach((option) => {
            if (!option?.key || typeof option.text === 'undefined') { console.warn(`Opción inválida`, option); return; }
            const button = document.createElement('button'); button.textContent = option.text; button.dataset.key = option.key; button.className = 'option-button bg-blue-600 hover:bg-blue-500 text-white font-semibold py-3 px-4 rounded-lg transition duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-opacity-75 disabled:opacity-50 disabled:cursor-not-allowed';
            const listener = () => this.handleOptionClick(option.key);
            this.optionListeners.set(button, listener);
            button.addEventListener('click', listener);
            optionsContainer.appendChild(button);
        });
        newQuizContainer.appendChild(optionsContainer); // Añadir a newQuizContainer

        // Feedback Area
        const feedbackElement = document.createElement('div');
        feedbackElement.id = 'quiz-feedback'; feedbackElement.className = 'feedback-area mt-4 text-lg h-8 text-center font-bold';
        newQuizContainer.appendChild(feedbackElement); // Añadir a newQuizContainer

        console.log("[UI DEBUG] Elementos internos de la UI creados.");

    } catch (error) { console.error("[UI DEBUG] Error creando elementos internos:", error); /* ... */ }

    // --- Appending to DOM ---
    try {
        console.log("[UI DEBUG] Intentando añadir newQuizContainer al appContainer...");
        appContainer.appendChild(newQuizContainer);
        this.quizContainer = newQuizContainer; // *** GUARDAR REFERENCIA DESPUÉS DE AÑADIR ***
        console.log("[UI DEBUG] Contenedor de UI AÑADIDO al DOM y referencia guardada.");
    } catch (error) { console.error("[UI DEBUG] ¡Error al añadir UI al DOM!", error); }

    // Update initial UI values
    this.updateScoreUI();
    this.updateLivesUI();
    this.updateComboUI();
    console.log("[UI DEBUG] --- displayNextQuestion END ---");
  }
  // ---------------------------------------------------------

  private handleOptionClick(selectedKey: string): void { if(!this.currentQuestion||this.nextQuestionTimeoutId!==null)return;const q=this.gameManager.getQuizSystem();if(!this.currentQuestion)return;const ok=q.validateAnswer(this.currentQuestion.id,selectedKey);this.disableOptions();if(ok===true)this.handleCorrectAnswer(this.currentQuestion.difficulty);else if(ok===false)this.handleIncorrectAnswer();else{console.error(`Error validación`);this.updateFeedbackUI("Error.",false);this.scheduleNextQuestion(2000);}}
  private updateScoreUI(): void { const e=document.getElementById('quiz-score'); if(e)e.textContent=`Score: ${this.gameManager.getPlayerData().score}`; }
  private updateComboUI(): void { const e=document.getElementById('quiz-combo'); if(e){if(this.consecutiveCorrectAnswers>1){e.textContent=`Combo x${this.consecutiveCorrectAnswers}`;e.style.display='block';}else{e.style.display='none';}} }
  private updateLivesUI(): void { const e=document.getElementById('quiz-lives-count'); if(e)e.textContent=this.gameManager.getLives().toString(); }
  private updateFeedbackUI(msg: string, ok: boolean, shield?: boolean): void { const e=document.getElementById('quiz-feedback'); if(e){e.textContent=msg;e.className='feedback-area mt-4 text-lg h-8 text-center font-bold';if(shield)e.classList.add('text-blue-400');else if(ok)e.classList.add('text-green-400');else e.classList.add('text-red-400');} }
  private disableOptions(): void { const o=document.getElementById('quiz-options');if(o){const b=o.getElementsByTagName('button');for(let btn of b)btn.disabled=true;} }

  // --- clearUI Modificado para usar la referencia guardada ---
  private clearUI(): void {
    console.log("[UI DEBUG] clearUI llamada");
    if (this.nextQuestionTimeoutId) { clearTimeout(this.nextQuestionTimeoutId); this.nextQuestionTimeoutId = null; }

    // Limpiar listeners
    this.optionListeners.forEach((listener, button) => button.removeEventListener('click', listener));
    this.optionListeners.clear();

    // Eliminar el contenedor anterior usando la referencia guardada
    if (this.quizContainer && this.quizContainer.parentNode) {
      console.log("[UI DEBUG] Eliminando contenedor anterior referenciado...");
      this.quizContainer.parentNode.removeChild(this.quizContainer);
    } else {
        // console.log("[UI DEBUG] clearUI: No hay contenedor anterior referenciado.");
    }
    // Limpiar la referencia
    this.quizContainer = null;
  }
  // ----------------------------------------------------------

} // Fin clase
