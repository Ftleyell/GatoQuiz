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
  difficulty: string; // Asumiendo que difficulty es string ('easy', 'medium', etc.)
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
  private currentComboMultiplier: number = 1.0; // Empezar con multiplicador base

  // Podrías definir estas constantes aquí o importarlas si las centralizas
  private readonly BASE_POINTS_PER_CORRECT = 10;
  // Deberías definir las bonificaciones por dificultad reales según tu GDD
  private readonly DIFFICULTY_BONUS: { [key: string]: number } = {
      "easy": 0, // Ejemplo
      "medium": 5, // Ejemplo
      "hard": 10, // Ejemplo
      // ...etc.
  };

  constructor(gameManager: GameManager) {
    this.gameManager = gameManager;
  }

  enter(params?: any): void {
    console.log('QuizGameplayState: enter', params);
    this.score = 0;
    this.consecutiveCorrectAnswers = 0;
    this.currentComboMultiplier = 1.0; // Resetear al entrar
    // Las vidas se resetean en GameManager.init()

    // La UI se mostrará cuando se cargue la primera pregunta
    this.displayNextQuestion();
  }

  exit(): void {
    console.log('QuizGameplayState: exit');
    this.clearUI(); // Asegúrate de limpiar timeouts y listeners al salir
  }

  update(deltaTime: number): void {
      // Podría usarse para timers visuales, animaciones, etc.
      // console.log('QuizGameplayState: update', deltaTime);
  }

  // Calcula los puntos ganados (sin modificar estado)
  private calculateScore(difficulty: string): { pointsEarned: number; basePoints: number; difficultyBonus: number; comboMultiplierBonus: number } {
    const basePoints = this.BASE_POINTS_PER_CORRECT * this.consecutiveCorrectAnswers;
    const difficultyBonus = this.DIFFICULTY_BONUS[difficulty] || 0;
    // Aplicar multiplicador de combo (ej: 1.0 base, +0.1 por nivel, etc.)
    // Necesitarías obtener el 'currentComboMultiplier' real de la tienda/estado si es mejorable
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

    // Actualizar UIs
    this.updateScoreUI();
    this.updateComboUI();
    this.updateLivesUI(); // Por consistencia

    // Feedback detallado
    let feedbackText = `¡Correcto! +${scoreCalculation.pointsEarned} puntos`;
    let bonusDetails = [];
    if (scoreCalculation.difficultyBonus > 0) bonusDetails.push(`Dificultad: +${scoreCalculation.difficultyBonus}`);
    if (scoreCalculation.comboMultiplierBonus > 0) bonusDetails.push(`Combo x${this.currentComboMultiplier.toFixed(1)}: +${Math.round(scoreCalculation.comboMultiplierBonus)}`);
    if (bonusDetails.length > 0) feedbackText += ` (${bonusDetails.join(', ')})`;
    this.updateFeedbackUI(feedbackText, true);

    // *** Integración Audio ***
    this.gameManager.getAudioManager().playSound('correct');
    // **************************

    // TODO: Lógica para añadir gatos (Fase 3)
    // TODO: Lógica para añadir tinta (Fase 3)

    // Programar la siguiente pregunta
    this.scheduleNextQuestion(2000); // Delay de 2 segundos
  }

  // Maneja la lógica de respuesta incorrecta
  private handleIncorrectAnswer(): void {
    console.log("Respuesta Incorrecta.");

    // TODO: Implementar lógica de escudo aquí (si existe en GDD/Tienda)
    const hasShield = false; // Placeholder - Obtener del estado del jugador

    if (hasShield) {
        console.log("Escudo absorbió el golpe!");
        // Lógica para romper escudo, mantener racha, perder 1 vida
        // this.gameManager.breakShield(); // Método hipotético
        this.gameManager.decrementLives();
        this.updateLivesUI();
        this.updateFeedbackUI('¡Escudo Roto! Mantienes la racha.', false); // Usar color azul o similar
        // *** Integración Audio ***
        this.gameManager.getAudioManager().playSound('shield_break');
        // **************************
    } else {
        // Sin escudo, perder vida y resetear racha
        this.consecutiveCorrectAnswers = 0;
        this.gameManager.decrementLives();
        this.updateLivesUI();
        this.updateComboUI(); // Ocultar combo
        this.updateFeedbackUI('Incorrecto.', false);
        // *** Integración Audio ***
        this.gameManager.getAudioManager().playSound('incorrect');
        // **************************
    }


    // Comprobar Game Over DESPUÉS de aplicar efectos de escudo/pérdida de vida
    if (this.gameManager.getLives() <= 0) {
      console.log("Game Over condition met!");
      this.updateFeedbackUI('¡Has perdido!', false); // Mensaje final
      if (this.nextQuestionTimeoutId) {
        clearTimeout(this.nextQuestionTimeoutId);
        this.nextQuestionTimeoutId = null;
      }
      // Transicionar a Game Over (el estado GameOver reproducirá su propio sonido)
      setTimeout(() => {
        this.gameManager.getStateMachine().changeState('GameOver');
      }, 1500);
    } else {
      // Todavía hay vidas, programar la siguiente pregunta si no se va a Game Over
      this.scheduleNextQuestion(2000);
    }
  }

  // Programa la carga de la siguiente pregunta después de un delay
  private scheduleNextQuestion(delay: number): void {
    if (this.nextQuestionTimeoutId) {
      clearTimeout(this.nextQuestionTimeoutId);
    }
    // Verificar si el estado actual sigue siendo QuizGameplay antes de setear el timeout
    if (this.gameManager.getStateMachine().getCurrentStateName() === 'QuizGameplay') {
        this.nextQuestionTimeoutId = window.setTimeout(() => {
            this.nextQuestionTimeoutId = null;
            // Doble check por si el estado cambió justo antes de ejecutar el timeout
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
    this.clearUI(); // Limpia UI anterior y listeners

    const quizSystem = this.gameManager.getQuizSystem();
    this.currentQuestion = quizSystem.selectNextQuestion(); // TODO: Podría añadir lógica de dificultad

    if (!this.currentQuestion) {
      console.log('Fin del Quiz (No hay más preguntas). Transicionando a Resultados...');
      // Pasar el score final al estado de Resultados
      this.gameManager.getStateMachine().changeState('Results', { finalScore: this.score });
      return;
    }

    // --- Creación de UI (similar a la versión anterior, con IDs para actualizar) ---
    const appContainer = this.gameManager.getContainerElement();
    // No limpiar innerHTML aquí si quieres que otros elementos (como el canvas de física) persistan
    // appContainer.innerHTML = ''; // <-- COMENTADO O ELIMINADO

    this.quizContainer = document.createElement('div');
    // Clases de ejemplo usando Tailwind (ajustar según tu CSS)
    this.quizContainer.className = 'quiz-ui-container p-4 flex flex-col items-center w-full max-w-md mx-auto text-gray-100 bg-gray-800 bg-opacity-80 rounded-lg shadow-lg z-20 relative'; // Añadir z-index si es necesario
    this.quizContainer.id = 'quiz-ui-active'; // ID para poder quitarlo específicamente en clearUI

    // --- Contenedor Superior (Score, Vidas, Combo) ---
    const topUIContainer = document.createElement('div');
    topUIContainer.className = 'top-ui-container flex justify-between items-center w-full mb-4';

    // Vidas (izquierda)
    const livesDisplayContainer = document.createElement('div');
    livesDisplayContainer.id = 'quiz-lives-container';
    livesDisplayContainer.className = 'quiz-lives flex items-center gap-1 text-lg text-red-400'; // Estilo vidas
    const heartIcon = document.createElement('span');
    heartIcon.textContent = '❤️';
    const livesCountSpan = document.createElement('span');
    livesCountSpan.id = 'quiz-lives-count';
    livesCountSpan.className = 'font-bold';
    livesDisplayContainer.appendChild(heartIcon);
    livesDisplayContainer.appendChild(livesCountSpan);
    topUIContainer.appendChild(livesDisplayContainer);

    // Score (centro)
    const scoreDisplay = document.createElement('p');
    scoreDisplay.id = 'quiz-score';
    scoreDisplay.className = 'quiz-score text-3xl font-bold text-yellow-300'; // Estilo score
    topUIContainer.appendChild(scoreDisplay);

    // Combo (derecha) - inicialmente oculto
    const comboDisplay = document.createElement('p');
    comboDisplay.id = 'quiz-combo';
    comboDisplay.className = 'quiz-combo text-xl font-semibold text-orange-400'; // Estilo combo
    comboDisplay.style.display = 'none'; // Oculto por defecto
    topUIContainer.appendChild(comboDisplay);

    this.quizContainer.appendChild(topUIContainer);
    // -------------------------------------------------

    // Pregunta
    const questionTextElement = document.createElement('p');
    questionTextElement.textContent = this.currentQuestion.text;
    questionTextElement.className = 'question-text text-xl font-semibold mb-6 text-center'; // Más margen inferior
    this.quizContainer.appendChild(questionTextElement);

    // Opciones
    const optionsContainer = document.createElement('div');
    optionsContainer.id = 'quiz-options'; // ID para deshabilitar botones
    optionsContainer.className = 'options-container flex flex-col gap-3 w-full';
    this.currentQuestion.options.forEach(option => {
      const button = document.createElement('button');
      button.textContent = option.text;
      button.dataset.key = option.key;
      // Clases Tailwind de ejemplo para botones
      button.className = 'option-button bg-blue-600 hover:bg-blue-500 text-white font-semibold py-3 px-4 rounded-lg transition duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-opacity-75 disabled:opacity-50 disabled:cursor-not-allowed';
      const listener = () => this.handleOptionClick(option.key);
      this.optionListeners.set(button, listener); // Guardar para remover después
      button.addEventListener('click', listener);
      optionsContainer.appendChild(button);
    });
    this.quizContainer.appendChild(optionsContainer);

    // Área de Feedback
    const feedbackElement = document.createElement('div');
    feedbackElement.id = 'quiz-feedback';
    feedbackElement.className = 'feedback-area mt-4 text-lg h-8 text-center font-bold'; // Altura fija para evitar saltos
    this.quizContainer.appendChild(feedbackElement);

    // Añadir el contenedor del quiz al contenedor principal de la aplicación
    appContainer.appendChild(this.quizContainer);

    // Actualizar UI inicial de score, vidas y combo
    this.updateScoreUI();
    this.updateLivesUI();
    this.updateComboUI();
  }

  // Maneja el clic en una opción
  private handleOptionClick(selectedKey: string): void {
    if (!this.currentQuestion || this.nextQuestionTimeoutId !== null) {
      console.log("Click ignorado (pregunta no lista o respuesta ya procesándose)");
      return; // Evitar doble click o clicks antes de tiempo
    }

    console.log(`Opción seleccionada: ${selectedKey}`);
    const quizSystem = this.gameManager.getQuizSystem();
    // Asegurarse que currentQuestion no sea null antes de acceder a sus propiedades
    if (!this.currentQuestion) return;

    const isCorrect = quizSystem.validateAnswer(this.currentQuestion.id, selectedKey);

    this.disableOptions(); // Deshabilitar botones tras seleccionar

    if (isCorrect === true) { // Comprobar explícitamente true
      this.handleCorrectAnswer(this.currentQuestion.difficulty);
    } else if (isCorrect === false) { // Comprobar explícitamente false
      this.handleIncorrectAnswer();
    } else {
        // isCorrect es null, indica error en validación (ej: pregunta no encontrada)
        console.error(`Error al validar respuesta para pregunta ID ${this.currentQuestion.id}`);
        // Podrías mostrar un mensaje de error genérico y pasar a la siguiente pregunta o manejarlo de otra forma
        this.updateFeedbackUI("Error al procesar respuesta.", false);
        this.scheduleNextQuestion(2000);
    }
  }

  // --- Métodos de Actualización de UI (Refinados) ---
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
          // Aplicar clases condicionales para color (ejemplo Tailwind)
          feedbackElement.classList.remove('text-green-400', 'text-red-400', 'text-blue-400'); // Limpiar clases anteriores
          if (message.includes("Escudo")) {
              feedbackElement.classList.add('text-blue-400'); // Azul para escudo roto
          } else if (isCorrect) {
              feedbackElement.classList.add('text-green-400'); // Verde para correcto
          } else {
              feedbackElement.classList.add('text-red-400'); // Rojo para incorrecto/game over
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
    // Limpiar timeout pendiente
    if (this.nextQuestionTimeoutId) {
      clearTimeout(this.nextQuestionTimeoutId);
      this.nextQuestionTimeoutId = null;
    }

    // Remover listeners de los botones de opción
    this.optionListeners.forEach((listener, button) => {
      button.removeEventListener('click', listener);
    });
    this.optionListeners.clear(); // Limpiar el mapa de listeners

    // Remover el contenedor específico del quiz si existe
    const specificQuizContainer = document.getElementById('quiz-ui-active');
    if (specificQuizContainer && specificQuizContainer.parentNode) {
      specificQuizContainer.parentNode.removeChild(specificQuizContainer);
    }

    // Resetear variables de estado de UI
    this.quizContainer = null;
    this.currentQuestion = null;

    // Limpiar área de feedback por si acaso quedó algo
    const feedbackElement = document.getElementById('quiz-feedback');
    if(feedbackElement) feedbackElement.textContent = '';
  }
}