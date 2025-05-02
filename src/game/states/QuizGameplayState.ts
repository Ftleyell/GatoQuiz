// src/game/states/QuizGameplayState.ts

import { IState } from '../StateMachine';
import { GameManager } from '../GameManager';
import { CatEntity } from '../entities/CatEntity'; // Mantener importación

interface QuestionOption { key: string; text: string; }
interface Question { id: number | string; text: string; options: QuestionOption[]; correctAnswerKey: string; difficulty: string; }

export class QuizGameplayState implements IState {
  private gameManager: GameManager;
  private currentQuestion: Question | null = null;
  private optionListeners: Map<HTMLButtonElement, () => void> = new Map();
  private quizContainer: HTMLDivElement | null = null;
  private nextQuestionTimeoutId: number | null = null;
  private consecutiveCorrectAnswers: number = 0;

  private readonly BASE_POINTS_PER_CORRECT = 10;
  private readonly DIFFICULTY_BONUS: { [key: string]: number } = { "easy": 10, "medium": 30, "hard": 50 };

  constructor(gameManager: GameManager) {
    this.gameManager = gameManager;
  }

  private selectRandomCatTemplateId(): string {
    const catManager = this.gameManager.getCatManager();
    const weightedTemplates = catManager.getSpawnableTemplatesWeighted();
    if (weightedTemplates.length === 0) { return 'common_gray'; }
    const totalWeight = weightedTemplates.reduce((sum, t) => sum + t.weight, 0);
    if (totalWeight <= 0) { return weightedTemplates[0]?.id ?? 'common_gray'; }
    const randomNum = Math.random() * totalWeight;
    let cumulativeWeight = 0;
    for (const template of weightedTemplates) {
        cumulativeWeight += template.weight;
        if (randomNum < cumulativeWeight) { return template.id; }
    }
    return weightedTemplates[weightedTemplates.length - 1]?.id ?? 'common_gray';
  }

  enter(params?: any): void {
    console.log('QuizGameplayState: enter', params);
    this.gameManager.setBodyStateClass('quizgameplay');
    this.gameManager.getPlayerData().reset();
    console.log("PlayerData reseteado para nueva partida.");
    this.consecutiveCorrectAnswers = 0;
    this.clearUI();
    this.displayNextQuestion();
  }

  exit(): void {
    console.log('QuizGameplayState: exit');
    this.clearUI();
  }

  update(deltaTime: number): void { /* No action needed per frame */ }

  private calculateScore(difficulty: string, streakBefore: number): { totalPoints: number, basePoints: number, difficultyBonus: number, comboBonus: number } {
    const currentStreak = streakBefore + 1;
    const basePoints = this.BASE_POINTS_PER_CORRECT * currentStreak;
    const difficultyBonus = this.DIFFICULTY_BONUS[difficulty] ?? this.DIFFICULTY_BONUS["easy"];
    const actualComboMultiplier = this.gameManager.getPlayerData().getCurrentComboMultiplier();
    const comboBonus = Math.max(0, (basePoints + difficultyBonus) * (actualComboMultiplier - 1));
    const totalPoints = Math.round(basePoints + difficultyBonus + comboBonus);
    return { totalPoints, basePoints, difficultyBonus, comboBonus: Math.round(comboBonus) };
  }

  private handleCorrectAnswer(difficulty: string): void {
    const scoreBreakdown = this.calculateScore(difficulty, this.consecutiveCorrectAnswers);
    this.consecutiveCorrectAnswers++;
    this.gameManager.getPlayerData().score += scoreBreakdown.totalPoints;
    this.gameManager.getInkManager().gainInkOnCorrectAnswer(); // Ganar tinta
    this.updateScoreUI();
    this.updateComboUI();

    let feedbackMessage = `¡Correcto! +${scoreBreakdown.totalPoints} Pts`;
    let details = `(Base: ${scoreBreakdown.basePoints}, Dif: +${scoreBreakdown.difficultyBonus}`;
    const actualComboMultiplier = this.gameManager.getPlayerData().getCurrentComboMultiplier();
    if (scoreBreakdown.comboBonus > 0) { details += `, Combo x${actualComboMultiplier.toFixed(1)}: +${scoreBreakdown.comboBonus}`; }
    details += ')';
    feedbackMessage += ` ${details}`;
    this.updateFeedbackUI(feedbackMessage, true);

    try { this.gameManager.getAudioManager().playSound('correct'); }
    catch(e) { console.error("Error sonido 'correct':", e); }

    const selectedTemplateId = this.selectRandomCatTemplateId();
    if (selectedTemplateId) {
        try {
            const catManager = this.gameManager.getCatManager();
            if (catManager) { catManager.addCat(selectedTemplateId); }
            else { console.error("CatManager no disponible al spawnear."); }
        } catch (error) { console.error(`Error al llamar a catManager.addCat:`, error); }
    }
    this.scheduleNextQuestion(1500);
  }

  private handleIncorrectAnswer(): void {
    const playerData = this.gameManager.getPlayerData();
    if (playerData.hasShield) {
        playerData.hasShield = false;
        this.updateFeedbackUI('¡Escudo Roto!', false, true);
        this.gameManager.getAudioManager().playSound('shield_break');
        this.gameManager.updateExternalShieldUI(false);
    } else {
        this.consecutiveCorrectAnswers = 0;
        this.gameManager.decrementLives();
        this.updateComboUI();
        this.updateFeedbackUI('Incorrecto.', false);
        this.gameManager.getAudioManager().playSound('incorrect');
    }

    if (this.gameManager.getLives() <= 0) {
        this.updateFeedbackUI('¡Has perdido!', false);
        if (this.nextQuestionTimeoutId) { clearTimeout(this.nextQuestionTimeoutId); this.nextQuestionTimeoutId = null; }
        setTimeout(() => {
            if (this.gameManager.getStateMachine().getCurrentStateName() === 'QuizGameplay') {
                this.gameManager.getStateMachine().changeState('GameOver', { finalScore: playerData.score });
            }
        }, 1500);
    } else {
        this.scheduleNextQuestion(1500);
    }
  }

  private scheduleNextQuestion(delay: number): void {
    if (this.nextQuestionTimeoutId) clearTimeout(this.nextQuestionTimeoutId);
    if (this.gameManager.getStateMachine().getCurrentStateName() === 'QuizGameplay') {
        this.nextQuestionTimeoutId = window.setTimeout(() => {
            this.nextQuestionTimeoutId = null;
            if (this.gameManager.getStateMachine().getCurrentStateName() === 'QuizGameplay') {
                this.clearUI();
                requestAnimationFrame(() => this.displayNextQuestion());
            }
        }, delay);
    }
  }

  /**
   * Crea y muestra la interfaz gráfica para la pregunta actual,
   * incluyendo los elementos de la barra de tinta.
   */
  private displayNextQuestion(): void {
    const quizSystem = this.gameManager.getQuizSystem();
    try { this.currentQuestion = quizSystem.selectNextQuestion(); }
    catch (error) {
        console.error("Error al seleccionar pregunta:", error);
        this.gameManager.getStateMachine().changeState('Results', { finalScore: this.gameManager.getPlayerData().score });
        return;
    }

    if (!this.currentQuestion) {
      this.gameManager.getStateMachine().changeState('Results', { finalScore: this.gameManager.getPlayerData().score });
      return;
    }

    const appContainer = this.gameManager.getContainerElement();
    if (!appContainer) { console.error("¡Error crítico! #app no encontrado."); return; }

    // Crear contenedor principal para la UI del quiz
    const newQuizContainer = document.createElement('div');
    newQuizContainer.className = 'quiz-ui-container p-4 flex flex-col items-center w-full max-w-md mx-auto text-gray-100 bg-gray-800 bg-opacity-80 rounded-lg shadow-lg z-20 relative';
    newQuizContainer.style.minHeight = '300px';

    try {
        // --- Contenedor Superior (Vidas, Score, Combo, Iconos, TINTA) ---
        const topUIContainer = document.createElement('div');
        // Hacerlo flex-col para apilar score y tinta debajo de vidas/combo
        topUIContainer.className = 'top-ui-container flex flex-col items-center w-full mb-4 p-2 bg-gray-700 rounded gap-2'; // Añadido gap

        // Fila superior (Vidas, Score, Combo)
        const statusRow = document.createElement('div');
        statusRow.className = 'flex justify-between items-center w-full';

        const livesDisplayContainer = document.createElement('div');
        livesDisplayContainer.id = 'quiz-lives-container';
        livesDisplayContainer.className = 'quiz-lives flex items-center gap-2 text-lg text-red-400';
        const heartIcon = document.createElement('span'); heartIcon.textContent = '❤️';
        const livesCountSpan = document.createElement('span'); livesCountSpan.id = 'quiz-lives-count'; livesCountSpan.className = 'font-bold';
        const shieldIcon = document.createElement('span'); shieldIcon.id = 'quiz-shield-icon'; shieldIcon.textContent = '🛡️'; shieldIcon.style.display = 'none';
        const hintIcon = document.createElement('span'); hintIcon.id = 'quiz-hint-icon'; hintIcon.textContent = '💡'; hintIcon.style.display = 'none';
        livesDisplayContainer.appendChild(heartIcon); livesDisplayContainer.appendChild(livesCountSpan); livesDisplayContainer.appendChild(shieldIcon); livesDisplayContainer.appendChild(hintIcon);
        statusRow.appendChild(livesDisplayContainer);

        const scoreDisplay = document.createElement('p');
        scoreDisplay.id = 'quiz-score';
        scoreDisplay.className = 'quiz-score text-3xl font-bold text-yellow-300';
        statusRow.appendChild(scoreDisplay);

        const comboDisplay = document.createElement('p');
        comboDisplay.id = 'quiz-combo';
        comboDisplay.className = 'quiz-combo text-xl font-semibold text-orange-400';
        comboDisplay.style.display = 'none';
        statusRow.appendChild(comboDisplay);

        topUIContainer.appendChild(statusRow); // Añadir fila de estado

        // --- CREACIÓN DE ELEMENTOS DE TINTA ---
        const inkArea = document.createElement('div');
        inkArea.id = 'score-area'; // Reutilizar ID si es conveniente o usar uno nuevo
        inkArea.className = 'flex flex-col items-center mt-2'; // Añadido margen superior

        const inkLabel = document.createElement('div');
        inkLabel.id = 'ink-label'; // ID que busca InkManager
        inkLabel.className = 'hidden text-xs font-semibold uppercase tracking-wider text-pink-400 mb-1'; // Oculto inicialmente
        inkLabel.textContent = 'Tinta';
        inkArea.appendChild(inkLabel);

        const inkBarContainer = document.createElement('div');
        inkBarContainer.id = 'ink-bar-container'; // ID que busca InkManager
        inkBarContainer.className = 'hidden w-36 h-3 bg-gray-700 rounded-full overflow-hidden border border-gray-600'; // Oculto inicialmente
        const inkBarFill = document.createElement('div');
        inkBarFill.id = 'ink-bar-fill'; // ID que busca InkManager
        inkBarFill.className = 'h-full bg-gradient-to-r from-purple-400 to-indigo-600 rounded-full transition-width duration-300 ease-out';
        inkBarFill.style.width = '0%'; // Ancho inicial
        inkBarContainer.appendChild(inkBarFill);
        inkArea.appendChild(inkBarContainer);

        topUIContainer.appendChild(inkArea); // Añadir área de tinta al contenedor superior
        // --- FIN CREACIÓN ELEMENTOS TINTA ---

        newQuizContainer.appendChild(topUIContainer); // Añadir contenedor superior completo

        // Texto de la Pregunta
        const questionTextElement = document.createElement('p');
        questionTextElement.textContent = this.currentQuestion.text;
        questionTextElement.className = 'question-text text-xl font-semibold mb-6 text-center p-2 bg-gray-700 rounded';
        newQuizContainer.appendChild(questionTextElement);

        // Contenedor de Opciones
        const optionsContainer = document.createElement('div');
        optionsContainer.id = 'quiz-options';
        optionsContainer.className = 'options-container flex flex-col gap-3 w-full';
        if (!this.currentQuestion.options?.length) throw new Error("La pregunta seleccionada no tiene opciones.");
        this.currentQuestion.options.forEach((option) => {
            if (!option?.key || typeof option.text === 'undefined') { console.warn(`Opción inválida:`, option); return; }
            const button = document.createElement('button');
            button.textContent = option.text; button.dataset.key = option.key;
            button.className = 'option-button bg-blue-600 hover:bg-blue-500 text-white font-semibold py-3 px-4 rounded-lg transition duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-opacity-75 disabled:opacity-50 disabled:cursor-not-allowed';
            const listener = () => this.handleOptionClick(option.key);
            this.optionListeners.set(button, listener); button.addEventListener('click', listener);
            optionsContainer.appendChild(button);
        });
        newQuizContainer.appendChild(optionsContainer);

        // Área de Feedback
        const feedbackElement = document.createElement('div');
        feedbackElement.id = 'quiz-feedback';
        feedbackElement.className = 'feedback-area mt-4 text-lg h-8 text-center font-bold';
        newQuizContainer.appendChild(feedbackElement);

    } catch (error: any) {
        console.error("[UI DEBUG] Error creando elementos internos de la UI:", error);
        newQuizContainer.innerHTML = `<p class="text-red-500">Error al mostrar la pregunta: ${error.message}</p>`;
    }

    try {
        appContainer.appendChild(newQuizContainer);
        this.quizContainer = newQuizContainer;
    } catch (error) {
        console.error("[UI DEBUG] ¡Error al añadir UI al DOM!", error);
    }

    // Actualizar valores iniciales de la UI (incluyendo tinta)
    this.updateScoreUI();
    this.updateLivesUI();
    this.updateComboUI();
    this.updateShieldIcon(this.gameManager.getPlayerData().hasShield);
    this.updateHintIcon(this.gameManager.getPlayerData().hintCharges);
    // Llamar a updateInkUI explícitamente después de añadir la UI al DOM
    this.gameManager.getInkManager().updateInkUI();
  }

  private handleOptionClick(selectedKey: string): void {
      if (!this.currentQuestion || this.nextQuestionTimeoutId !== null) return;
      const quizSystem = this.gameManager.getQuizSystem();
      const isCorrect = quizSystem.validateAnswer(this.currentQuestion.id, selectedKey);
      this.disableOptions();
      if (isCorrect === true) { this.handleCorrectAnswer(this.currentQuestion.difficulty); }
      else if (isCorrect === false) { this.handleIncorrectAnswer(); }
      else { this.updateFeedbackUI("Error al validar.", false); this.scheduleNextQuestion(2000); }
  }

  private updateScoreUI(): void {
    const scoreElement = document.getElementById('quiz-score');
    if (scoreElement) { scoreElement.textContent = `Score: ${this.gameManager.getPlayerData().score}`; }
  }

  private updateComboUI(): void {
    const comboElement = document.getElementById('quiz-combo');
    if (comboElement) {
        if (this.consecutiveCorrectAnswers > 1) { comboElement.textContent = `Combo x${this.consecutiveCorrectAnswers}`; comboElement.style.display = 'block'; }
        else { comboElement.style.display = 'none'; }
    }
  }

  public updateLivesUI(): void {
    const livesElement = document.getElementById('quiz-lives-count');
    if (livesElement) { livesElement.textContent = this.gameManager.getLives().toString(); }
  }

  private updateFeedbackUI(message: string, isCorrect: boolean, isShield: boolean = false): void {
    const feedbackElement = document.getElementById('quiz-feedback');
    if (feedbackElement) {
        feedbackElement.textContent = message;
        feedbackElement.className = 'feedback-area mt-4 text-lg h-8 text-center font-bold';
        if (isShield) { feedbackElement.classList.add('text-blue-400'); }
        else if (isCorrect) { feedbackElement.classList.add('text-green-400'); }
        else { feedbackElement.classList.add('text-red-400'); }
    }
  }

  private disableOptions(): void {
    const optionsContainer = document.getElementById('quiz-options');
    if (optionsContainer) {
        const buttons = optionsContainer.getElementsByTagName('button');
        for (let button of buttons) { button.disabled = true; }
    }
  }

  private clearUI(): void {
    if (this.nextQuestionTimeoutId) { clearTimeout(this.nextQuestionTimeoutId); this.nextQuestionTimeoutId = null; }
    this.optionListeners.forEach((listener, button) => { button.removeEventListener('click', listener); });
    this.optionListeners.clear();
    // Eliminar el contenedor principal del quiz si existe
    if (this.quizContainer && this.quizContainer.parentNode) {
        this.quizContainer.parentNode.removeChild(this.quizContainer);
    }
    this.quizContainer = null; // Limpiar referencia
  }

   public updateShieldIcon(isActive: boolean): void {
       // Buscar el icono dentro del contenedor actual del quiz
       const shieldIcon = this.quizContainer?.querySelector('#quiz-shield-icon');
       if (shieldIcon) { (shieldIcon as HTMLElement).style.display = isActive ? 'inline' : 'none'; }
   }

   public updateHintIcon(charges: number): void {
       // Buscar el icono dentro del contenedor actual del quiz
       const hintIcon = this.quizContainer?.querySelector('#quiz-hint-icon');
       if (hintIcon) { (hintIcon as HTMLElement).style.display = charges > 0 ? 'inline' : 'none'; }
   }

} // Fin clase QuizGameplayState
