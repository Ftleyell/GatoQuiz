// src/game/states/QuizGameplayState.ts

import { IState } from '../StateMachine';
import { GameManager } from '../GameManager';

// Definiciones locales temporales (Idealmente mover a un archivo types/quiz.d.ts)
interface QuestionOption {
  key: string;
  text: string;
}
interface Question {
  id: number | string;
  text: string;
  options: QuestionOption[];
  correctAnswerKey: string;
  difficulty: string;
}
// --- Fin Definiciones locales ---


export class QuizGameplayState implements IState {
  private gameManager: GameManager;
  private currentQuestion: Question | null = null;
  private optionListeners: Map<HTMLButtonElement, () => void> = new Map();
  private quizContainer: HTMLDivElement | null = null;
  private nextQuestionTimeoutId: number | null = null;

  private score: number = 0;
  private consecutiveCorrectAnswers: number = 0;
  private currentComboMultiplier: number = 1.0;

  private readonly BASE_POINTS_PER_CORRECT = 10;
  private readonly DIFFICULTY_BONUS: { [key: string]: number } = {
      "easy": 0,
      "medium": 5, // Ajustar según GDD!
      "hard": 10, // Ajustar según GDD!
      // Añadir otras dificultades si existen
  };

  constructor(gameManager: GameManager) {
    this.gameManager = gameManager;
  }

  enter(params?: any): void {
    console.log('QuizGameplayState: enter', params);
    this.score = 0;
    this.consecutiveCorrectAnswers = 0;
    this.currentComboMultiplier = 1.0;
    this.displayNextQuestion();
  }

  exit(): void {
    console.log('QuizGameplayState: exit');
    this.clearUI();
  }

  update(deltaTime: number): void {
      // Lógica de actualización del estado si es necesaria
  }

  private calculateScore(difficulty: string): { pointsEarned: number; basePoints: number; difficultyBonus: number; comboMultiplierBonus: number } {
    const difficultyBonus = this.DIFFICULTY_BONUS[difficulty] ?? 0;
    const basePoints = this.BASE_POINTS_PER_CORRECT * this.consecutiveCorrectAnswers;
    const comboMultiplierBonus = Math.max(0, (basePoints + difficultyBonus) * (this.currentComboMultiplier - 1));
    const pointsEarned = Math.round(basePoints + difficultyBonus + comboMultiplierBonus);
    return { pointsEarned, basePoints, difficultyBonus, comboMultiplierBonus };
  }

  // Maneja la lógica de respuesta correcta
  private handleCorrectAnswer(difficulty: string): void {
    console.log("Respuesta Correcta.");
    this.consecutiveCorrectAnswers++;
    const scoreCalculation = this.calculateScore(difficulty);
    this.score += scoreCalculation.pointsEarned;

    this.updateScoreUI();
    this.updateComboUI();
    this.updateLivesUI();

    let feedbackText = `¡Correcto! +${scoreCalculation.pointsEarned} puntos`;
    // ... (código de feedback detallado) ...
    this.updateFeedbackUI(feedbackText, true);

    this.gameManager.getAudioManager().playSound('correct');

    // *** Integración Gatos CORREGIDA ***
    // Añadir un gato usando el ID de una plantilla válida
    console.log("Añadiendo gato 'common_gray' como recompensa..."); // Asumiendo que tienes esta plantilla
    this.gameManager.getCatManager().addCat('common_gray'); // <-- CORRECCIÓN: Pasar el ID como string
    // **********************************

    this.scheduleNextQuestion(2000);
  }

  // Maneja la lógica de respuesta incorrecta
  private handleIncorrectAnswer(): void {
    console.log("Respuesta Incorrecta.");

    const hasShield = false; // Placeholder

    if (hasShield) {
        // ... (lógica escudo) ...
        this.gameManager.getAudioManager().playSound('shield_break');
    } else {
        this.consecutiveCorrectAnswers = 0;
        this.gameManager.decrementLives();
        this.updateLivesUI();
        this.updateComboUI();
        this.updateFeedbackUI('Incorrecto.', false);
        this.gameManager.getAudioManager().playSound('incorrect');
    }

    if (this.gameManager.getLives() <= 0) {
      console.log("Game Over condition met!");
      this.updateFeedbackUI('¡Has perdido!', false);
      if (this.nextQuestionTimeoutId) {
        clearTimeout(this.nextQuestionTimeoutId);
        this.nextQuestionTimeoutId = null;
      }
      setTimeout(() => {
        this.gameManager.getStateMachine().changeState('GameOver', { finalScore: this.score });
      }, 1500);
    } else {
      this.scheduleNextQuestion(2000);
    }
  }

  // Programa la carga de la siguiente pregunta después de un delay
  private scheduleNextQuestion(delay: number): void {
    if (this.nextQuestionTimeoutId) {
      clearTimeout(this.nextQuestionTimeoutId);
    }
    if (this.gameManager.getStateMachine().getCurrentStateName() === 'QuizGameplay') {
        this.nextQuestionTimeoutId = window.setTimeout(() => {
            this.nextQuestionTimeoutId = null;
            if (this.gameManager.getStateMachine().getCurrentStateName() === 'QuizGameplay') {
                this.displayNextQuestion();
            }
        }, delay);
    } else {
        console.log("ScheduleNextQuestion: State changed before timeout could be set. Aborting.");
    }
  }


  // Muestra la siguiente pregunta en la UI
  private displayNextQuestion(): void {
    this.clearUI();

    const quizSystem = this.gameManager.getQuizSystem();
    this.currentQuestion = quizSystem.selectNextQuestion();

    if (!this.currentQuestion) {
      console.log('Fin del Quiz (No hay más preguntas). Transicionando a Resultados...');
      this.gameManager.getStateMachine().changeState('Results', { finalScore: this.score });
      return;
    }

    // --- Creación de UI (sin cambios) ---
    const appContainer = this.gameManager.getContainerElement();

    this.quizContainer = document.createElement('div');
    this.quizContainer.className = 'quiz-ui-container p-4 flex flex-col items-center w-full max-w-md mx-auto text-gray-100 bg-gray-800 bg-opacity-80 rounded-lg shadow-lg z-20 relative';
    this.quizContainer.id = 'quiz-ui-active';

    const topUIContainer = document.createElement('div');
    topUIContainer.className = 'top-ui-container flex justify-between items-center w-full mb-4';

    const livesDisplayContainer = document.createElement('div');
    livesDisplayContainer.id = 'quiz-lives-container';
    livesDisplayContainer.className = 'quiz-lives flex items-center gap-1 text-lg text-red-400';
    const heartIcon = document.createElement('span'); heartIcon.textContent = '❤️';
    const livesCountSpan = document.createElement('span'); livesCountSpan.id = 'quiz-lives-count'; livesCountSpan.className = 'font-bold';
    livesDisplayContainer.appendChild(heartIcon); livesDisplayContainer.appendChild(livesCountSpan);
    topUIContainer.appendChild(livesDisplayContainer);

    const scoreDisplay = document.createElement('p');
    scoreDisplay.id = 'quiz-score';
    scoreDisplay.className = 'quiz-score text-3xl font-bold text-yellow-300';
    topUIContainer.appendChild(scoreDisplay);

    const comboDisplay = document.createElement('p');
    comboDisplay.id = 'quiz-combo';
    comboDisplay.className = 'quiz-combo text-xl font-semibold text-orange-400';
    comboDisplay.style.display = 'none';
    topUIContainer.appendChild(comboDisplay);

    this.quizContainer.appendChild(topUIContainer);

    const questionTextElement = document.createElement('p');
    questionTextElement.textContent = this.currentQuestion.text;
    questionTextElement.className = 'question-text text-xl font-semibold mb-6 text-center';
    this.quizContainer.appendChild(questionTextElement);

    const optionsContainer = document.createElement('div');
    optionsContainer.id = 'quiz-options';
    optionsContainer.className = 'options-container flex flex-col gap-3 w-full';
    this.currentQuestion.options.forEach(option => {
      const button = document.createElement('button');
      button.textContent = option.text;
      button.dataset.key = option.key;
      button.className = 'option-button bg-blue-600 hover:bg-blue-500 text-white font-semibold py-3 px-4 rounded-lg transition duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-opacity-75 disabled:opacity-50 disabled:cursor-not-allowed';
      const listener = () => this.handleOptionClick(option.key);
      this.optionListeners.set(button, listener);
      button.addEventListener('click', listener);
      optionsContainer.appendChild(button);
    });
    this.quizContainer.appendChild(optionsContainer);

    const feedbackElement = document.createElement('div');
    feedbackElement.id = 'quiz-feedback';
    feedbackElement.className = 'feedback-area mt-4 text-lg h-8 text-center font-bold';
    this.quizContainer.appendChild(feedbackElement);

    const mainAppContainer = document.getElementById('app');
    if (mainAppContainer) {
        mainAppContainer.appendChild(this.quizContainer);
    } else {
        console.error("#app container not found during UI display!");
    }

    this.updateScoreUI();
    this.updateLivesUI();
    this.updateComboUI();
  }

  // Maneja el clic en una opción
  private handleOptionClick(selectedKey: string): void {
    if (!this.currentQuestion || this.nextQuestionTimeoutId !== null) {
      console.log("Click ignorado (pregunta no lista o respuesta ya procesándose)");
      return;
    }

    console.log(`Opción seleccionada: ${selectedKey}`);
    const quizSystem = this.gameManager.getQuizSystem();
    if (!this.currentQuestion) return;

    const isCorrect = quizSystem.validateAnswer(this.currentQuestion.id, selectedKey);

    this.disableOptions();

    if (isCorrect === true) {
      this.handleCorrectAnswer(this.currentQuestion.difficulty);
    } else if (isCorrect === false) {
      this.handleIncorrectAnswer();
    } else {
        console.error(`Error al validar respuesta para pregunta ID ${this.currentQuestion.id}`);
        this.updateFeedbackUI("Error al procesar respuesta.", false);
        this.scheduleNextQuestion(2000);
    }
  }

  // --- Métodos de Actualización de UI ---
  // (Sin cambios en updateScoreUI, updateComboUI, updateLivesUI, updateFeedbackUI)
  private updateScoreUI(): void {
    const scoreElement = document.getElementById('quiz-score');
    if (scoreElement) scoreElement.textContent = this.score.toString();
  }
  private updateComboUI(): void {
    const comboElement = document.getElementById('quiz-combo');
    if (comboElement) {
      if (this.consecutiveCorrectAnswers > 1) {
        comboElement.textContent = `x${this.consecutiveCorrectAnswers}`;
        comboElement.style.display = 'block';
      } else {
        comboElement.style.display = 'none';
      }
    }
  }
  private updateLivesUI(): void {
    const livesElement = document.getElementById('quiz-lives-count');
    if (livesElement) {
      livesElement.textContent = this.gameManager.getLives().toString();
    }
  }
   private updateFeedbackUI(message: string, isCorrect: boolean): void {
       const feedbackElement = document.getElementById('quiz-feedback');
       if (feedbackElement) {
           feedbackElement.textContent = message;
           feedbackElement.classList.remove('text-green-400', 'text-red-400', 'text-blue-400');
           if (message.includes("Escudo")) {
               feedbackElement.classList.add('text-blue-400');
           } else if (isCorrect) {
               feedbackElement.classList.add('text-green-400');
           } else {
               feedbackElement.classList.add('text-red-400');
           }
       }
   }

  // Deshabilita los botones de opción
  private disableOptions(): void {
    const optionsContainer = document.getElementById('quiz-options');
    if (optionsContainer) {
        const buttons = optionsContainer.getElementsByTagName('button');
        for (let button of buttons) {
            button.disabled = true;
        }
    }
  }

  // Limpia la UI del quiz y los listeners asociados
  private clearUI(): void {
    if (this.nextQuestionTimeoutId) {
      clearTimeout(this.nextQuestionTimeoutId);
      this.nextQuestionTimeoutId = null;
    }

    this.optionListeners.forEach((listener, button) => {
      button.removeEventListener('click', listener);
    });
    this.optionListeners.clear();

    const specificQuizContainer = document.getElementById('quiz-ui-active');
    if (specificQuizContainer && specificQuizContainer.parentNode) {
      specificQuizContainer.parentNode.removeChild(specificQuizContainer);
    }

    this.quizContainer = null;
    this.currentQuestion = null;
  }
} // Fin de la clase QuizGameplayState