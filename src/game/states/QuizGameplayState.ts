// src/game/states/QuizGameplayState.ts

import { IState } from '../StateMachine';
import { GameManager } from '../GameManager';

// Re-declarar interfaces aquí si no están en un archivo importado
interface QuestionOption { key: string; text: string; }
interface Question { id: number | string; text: string; options: QuestionOption[]; correctAnswerKey: string; difficulty: string; } // Difficulty es string

export class QuizGameplayState implements IState {
  private gameManager: GameManager;
  private currentQuestion: Question | null = null;
  private optionListeners: Map<HTMLButtonElement, () => void> = new Map();
  private quizContainer: HTMLDivElement | null = null;

  // --- Nuevas propiedades para Score y Combo ---
  private score: number = 0;
  private consecutiveCorrectAnswers: number = 0;
  private currentComboMultiplier: number = 1.0; // Multiplicador base (puede venir de GameManager/PlayerData si es mejorable)

  // --- Constantes de Puntuación (basadas en prompt y consola ok.html) ---
  private readonly BASE_POINTS_PER_CORRECT = 10;
  // Mapeo de dificultad (string) a bonus. AJUSTA ESTO según tu GDD/QuizSystem.
  private readonly DIFFICULTY_BONUS: { [key: string]: number } = {
      'easy': 10,
      'medium': 20, // Asumiendo que tendrás 'medium'
      'hard': 30,   // Asumiendo que tendrás 'hard'
      // Añadir más niveles si existen en tus preguntas
      'default': 10 // Bonus por defecto si la dificultad no coincide
  };


  constructor(gameManager: GameManager) {
    this.gameManager = gameManager;
  }

  enter(params?: any): void {
    console.log('QuizGameplayState: enter', params);
    // Resetear estado al entrar
    this.score = 0;
    this.consecutiveCorrectAnswers = 0;
    // Resetear multiplicador si no viene de fuera
    this.currentComboMultiplier = 1.0;

    this.displayNextQuestion(); // Muestra la primera pregunta y configura la UI inicial de score/combo
  }

  exit(): void {
    console.log('QuizGameplayState: exit');
    this.clearUI();
  }

  update(deltaTime: number): void {
    // Lógica de actualización durante el gameplay (timers, animaciones, etc.)
  }

  // --- Método para calcular puntos ---
  private calculateScore(difficulty: string): { pointsEarned: number, basePoints: number, difficultyBonus: number, comboBonus: number } {
      const difficultyBonus = this.DIFFICULTY_BONUS[difficulty] || this.DIFFICULTY_BONUS['default'];
      const basePointsCombo = this.BASE_POINTS_PER_CORRECT * this.consecutiveCorrectAnswers;
      // Nota: La fórmula de consola ok.html aplicaba el multiplicador al total (base+dificultad).
      // Si solo debe aplicar a los puntos base * racha, la fórmula cambia. Usaremos la de consola ok.html.
      const comboMultiplierBonus = Math.max(0, (basePointsCombo + difficultyBonus) * (this.currentComboMultiplier - 1));
      const pointsEarned = Math.round(basePointsCombo + difficultyBonus + comboMultiplierBonus);

      return {
          pointsEarned: pointsEarned,
          basePoints: basePointsCombo,
          difficultyBonus: difficultyBonus,
          comboBonus: comboMultiplierBonus
      };
  }

  // --- Método para manejar respuesta correcta ---
  private handleCorrectAnswer(difficulty: string): void {
      this.consecutiveCorrectAnswers++;
      const scoreCalculation = this.calculateScore(difficulty);
      this.score += scoreCalculation.pointsEarned;

      this.updateScoreUI();
      this.updateComboUI();

      // Generar texto de feedback detallado
      let feedbackText = `¡Correcto! +${scoreCalculation.pointsEarned} puntos`;
      let bonusDetails = [];
      // Incluir desglose solo si hay más que los puntos base iniciales
      if (this.consecutiveCorrectAnswers > 1 || scoreCalculation.difficultyBonus > this.DIFFICULTY_BONUS['default'] || scoreCalculation.comboBonus > 0) {
           bonusDetails.push(`Racha: x${this.consecutiveCorrectAnswers}`);
          if (scoreCalculation.difficultyBonus > 0) bonusDetails.push(`Dificultad: +${scoreCalculation.difficultyBonus}`);
          if (scoreCalculation.comboBonus > 0) bonusDetails.push(`Combo Mult: +${Math.round(scoreCalculation.comboBonus)}`);
          feedbackText += ` (${bonusDetails.join(', ')})`;
      }

      this.updateFeedbackUI(feedbackText, true);

      // TODO: Añadir lógica de vidas, efectos visuales/sonido, gatos, tinta aquí
  }

  // --- Método para manejar respuesta incorrecta ---
  private handleIncorrectAnswer(): void {
      this.consecutiveCorrectAnswers = 0; // Resetear racha

      this.updateComboUI(); // Ocultar contador de combo
      this.updateFeedbackUI('Incorrecto.', false);

      // TODO: Añadir lógica de vidas, efectos visuales/sonido aquí
      // TODO: Si hay vidas, ¿se muestra la explicación o se pasa a la siguiente?
  }


  private displayNextQuestion(): void {
    this.clearUI();

    const quizSystem = this.gameManager.getQuizSystem();
    this.currentQuestion = quizSystem.selectNextQuestion();

    if (!this.currentQuestion) {
      console.log('Fin del Quiz (No hay más preguntas). Transicionando a Resultados...');
      this.gameManager.getStateMachine().changeState('Results', { score: this.score }); // Pasar score final
      return;
    }

    const appContainer = this.gameManager.getContainerElement();
    appContainer.innerHTML = '';

    this.quizContainer = document.createElement('div');
    this.quizContainer.className = 'quiz-ui-container p-4 flex flex-col items-center w-full max-w-md text-gray-100'; // Añadido text-gray-100

    // --- Crear y añadir displays de Score y Combo ---
    const scoreDisplay = document.createElement('p');
    scoreDisplay.id = 'quiz-score'; // ID solicitado
    scoreDisplay.className = 'quiz-score text-3xl font-bold mb-2'; // Clases de ejemplo
    scoreDisplay.textContent = this.score.toString(); // Mostrar score inicial
    this.quizContainer.appendChild(scoreDisplay);

    const comboDisplay = document.createElement('p');
    comboDisplay.id = 'quiz-combo'; // ID solicitado
    comboDisplay.className = 'quiz-combo text-xl font-semibold text-yellow-400 mb-4'; // Clases de ejemplo
    comboDisplay.style.display = 'none'; // Oculto inicialmente
    this.quizContainer.appendChild(comboDisplay);
    // ------------------------------------------------

    // Crear y mostrar texto de la pregunta
    const questionTextElement = document.createElement('p');
    questionTextElement.textContent = this.currentQuestion.text;
    questionTextElement.className = 'question-text text-xl font-semibold mb-4 text-center';
    this.quizContainer.appendChild(questionTextElement);

    // Crear y mostrar opciones
    const optionsContainer = document.createElement('div');
    optionsContainer.className = 'options-container flex flex-col gap-3 w-full';
    this.currentQuestion.options.forEach(option => {
      const button = document.createElement('button');
      button.textContent = option.text;
      button.dataset.key = option.key;
      button.className = 'option-button bg-blue-600 hover:bg-blue-500 text-white font-semibold py-3 px-4 rounded-lg transition duration-200 ease-in-out';

      const listener = () => this.handleOptionClick(option.key);
      this.optionListeners.set(button, listener);
      button.addEventListener('click', listener);

      optionsContainer.appendChild(button);
    });
    this.quizContainer.appendChild(optionsContainer);

    // Crear espacio para feedback
    const feedbackElement = document.createElement('div');
    feedbackElement.id = 'quiz-feedback'; // ID solicitado
    feedbackElement.className = 'feedback-area mt-4 text-lg h-8 text-center font-bold'; // Añadido font-bold
    this.quizContainer.appendChild(feedbackElement);

    appContainer.appendChild(this.quizContainer);

    // Actualizar UI de combo al inicio (estará oculto si racha es 0)
    this.updateComboUI();
  }

  private handleOptionClick(selectedKey: string): void {
    if (!this.currentQuestion) return;

    console.log(`Opción seleccionada: ${selectedKey}`);
    const quizSystem = this.gameManager.getQuizSystem();
    const isCorrect = quizSystem.validateAnswer(this.currentQuestion.id, selectedKey);

    this.disableOptions();

    if (isCorrect) {
        this.handleCorrectAnswer(this.currentQuestion.difficulty);
    } else {
        this.handleIncorrectAnswer();
    }

    // Delay antes de pasar a la siguiente pregunta (o a resultados)
    setTimeout(() => {
       // TODO: Añadir lógica de vidas aquí antes de decidir
       this.displayNextQuestion(); // Llama a displayNextQuestion que maneja fin de preguntas
    }, 2000); // Aumentado delay a 2 segundos para ver feedback
  }

  // --- Métodos de Actualización de UI ---
  private updateScoreUI(): void {
      const scoreElement = document.getElementById('quiz-score');
      if (scoreElement) {
          scoreElement.textContent = this.score.toString();
          // TODO: Añadir efectos visuales de cambio de score si se desea
      } else {
          console.warn("Elemento #quiz-score no encontrado para actualizar UI.");
      }
  }

  private updateComboUI(): void {
      const comboElement = document.getElementById('quiz-combo');
      if (comboElement) {
          if (this.consecutiveCorrectAnswers > 0) {
              comboElement.textContent = `x${this.consecutiveCorrectAnswers}`;
              comboElement.style.display = 'block'; // Mostrar
              // TODO: Añadir animación/efecto de combo si se desea
          } else {
              comboElement.textContent = ''; // Limpiar texto
              comboElement.style.display = 'none'; // Ocultar
          }
      } else {
           console.warn("Elemento #quiz-combo no encontrado para actualizar UI.");
      }
  }

  private updateFeedbackUI(message: string, isCorrect: boolean): void {
       const feedbackElement = document.getElementById('quiz-feedback');
       if (feedbackElement) {
           feedbackElement.textContent = message;
           // Resetear clases de color y aplicar la nueva
           feedbackElement.classList.remove('text-green-400', 'text-red-400');
           feedbackElement.classList.add(isCorrect ? 'text-green-400' : 'text-red-400');
       } else {
            console.warn("Elemento #quiz-feedback no encontrado para actualizar UI.");
       }
  }
  // -------------------------------------

  private disableOptions(): void {
      this.optionListeners.forEach((listener, button) => {
          button.disabled = true;
          button.classList.add('opacity-50', 'cursor-not-allowed');
           // TODO: Añadir clase específica para correcta/incorrecta si se quiere feedback visual en botones
      });
  }

  private clearUI(): void {
     this.optionListeners.forEach((listener, button) => {
       button.removeEventListener('click', listener);
     });
     this.optionListeners.clear();

     if (this.quizContainer && this.quizContainer.parentNode) {
         this.quizContainer.parentNode.removeChild(this.quizContainer);
     }
     this.quizContainer = null;
     this.currentQuestion = null;
   }
}