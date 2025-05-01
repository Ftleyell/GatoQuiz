// src/game/states/QuizGameplayState.ts

import { IState } from '../StateMachine';
import { GameManager } from '../GameManager';

// Tipos (asegúrate que coincidan con tu JSON)
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

export class QuizGameplayState implements IState {
  private gameManager: GameManager;
  private currentQuestion: Question | null = null;
  private optionListeners: Map<HTMLButtonElement, () => void> = new Map();
  private quizContainer: HTMLDivElement | null = null;
  private nextQuestionTimeoutId: number | null = null;
  private score: number = 0;
  private consecutiveCorrectAnswers: number = 0;
  private currentComboMultiplier: number = 1.0; // Asegúrate que esto se actualice desde la tienda si aplica

  private readonly BASE_POINTS_PER_CORRECT = 10;
  private readonly DIFFICULTY_BONUS: { [key: string]: number } = {
      "easy": 0, // Ajusta estos valores según GDD/balance
      "medium": 5,
      "hard": 10,
      // Añadir más dificultades si existen
  };

  // Definición de plantillas y pesos para spawn
  private spawnableCatTemplates = [
    { id: 'common_gray', weight: 75 },
    { id: 'rare_blue', weight: 25 },
    // { id: 'uncommon_green', weight: 40 }, // Descomenta si existen
  ];
  private totalSpawnWeight: number = 0;

  constructor(gameManager: GameManager) {
    this.gameManager = gameManager;
    this.calculateTotalSpawnWeight();
  }

  private calculateTotalSpawnWeight(): void {
      this.totalSpawnWeight = this.spawnableCatTemplates.reduce((sum, template) => sum + template.weight, 0);
      // console.log("QuizGameplayState: Peso total de spawn calculado:", this.totalSpawnWeight); // Log menos verboso
  }

  private selectRandomCatTemplateId(): string {
      if (this.totalSpawnWeight <= 0 || this.spawnableCatTemplates.length === 0) {
          console.warn("No hay plantillas/pesos válidos para spawnear, usando 'common_gray' por defecto.");
          return 'common_gray';
      }
      const randomWeight = Math.random() * this.totalSpawnWeight;
      let currentWeight = 0;
      for (const template of this.spawnableCatTemplates) {
          currentWeight += template.weight;
          if (randomWeight < currentWeight) {
              return template.id;
          }
      }
      console.warn("Error en la selección ponderada, usando fallback 'common_gray'.");
      return this.spawnableCatTemplates[this.spawnableCatTemplates.length - 1]?.id ?? 'common_gray';
  }

  enter(params?: any): void {
    console.log('QuizGameplayState: enter', params);
    this.score = 0;
    this.consecutiveCorrectAnswers = 0;
    // TODO: Cargar/aplicar multiplicador de combo si viene de la tienda/estado guardado
    this.currentComboMultiplier = 1.0;
    this.calculateTotalSpawnWeight();
    // Asegurar que la UI anterior se limpie antes de mostrar la nueva
    this.clearUI();
    this.displayNextQuestion();
  }

  exit(): void {
    console.log('QuizGameplayState: exit');
    this.clearUI(); // Importante limpiar al salir del estado
  }

  update(deltaTime: number): void {
      // Lógica de actualización si es necesaria (ej: timers visuales)
  }

  private calculateScore(difficulty: string): { pointsEarned: number; basePoints: number; difficultyBonus: number; comboMultiplierBonus: number } {
    const difficultyBonus = this.DIFFICULTY_BONUS[difficulty] ?? 0;
    const basePoints = this.BASE_POINTS_PER_CORRECT * this.consecutiveCorrectAnswers;
    // Asegúrate que currentComboMultiplier se actualiza si hay mejoras en la tienda
    const comboMultiplierBonus = Math.max(0, (basePoints + difficultyBonus) * (this.currentComboMultiplier - 1));
    const pointsEarned = Math.round(basePoints + difficultyBonus + comboMultiplierBonus);
    return { pointsEarned, basePoints, difficultyBonus, comboMultiplierBonus };
  }

  private handleCorrectAnswer(difficulty: string): void {
    console.log("Respuesta Correcta.");
    this.consecutiveCorrectAnswers++;
    const scoreCalculation = this.calculateScore(difficulty);
    this.score += scoreCalculation.pointsEarned;

    this.updateScoreUI();
    this.updateComboUI();
    this.updateLivesUI();

    let feedbackText = `¡Correcto! +${scoreCalculation.pointsEarned} puntos`;
    // TODO: Añadir detalles del bonus si es necesario
    this.updateFeedbackUI(feedbackText, true);
    this.gameManager.getAudioManager().playSound('correct');

    const selectedTemplateId = this.selectRandomCatTemplateId();
    // console.log(`Spawneando gato tipo: ${selectedTemplateId}`); // Log menos verboso
    this.gameManager.getCatManager().addCat(selectedTemplateId);

    this.scheduleNextQuestion(1500); // Reducir delay ligeramente?
  }

  private handleIncorrectAnswer(): void {
    console.log("Respuesta Incorrecta.");

    const hasShield = false; // TODO: Implementar lógica de escudo (desde GameManager o estado persistente)

    if (hasShield) {
        console.log("Escudo absorbe el golpe (lógica pendiente).");
        this.updateFeedbackUI('¡Escudo Roto!', false, true); // Usar tercer parámetro para estilo escudo
        this.gameManager.getAudioManager().playSound('shield_break');
        // NO decrementar vidas, NO resetear combo
        // TODO: Desactivar escudo
    } else {
        this.consecutiveCorrectAnswers = 0; // Resetear combo
        this.gameManager.decrementLives();
        this.updateLivesUI(); // Actualizar UI de vidas
        this.updateComboUI(); // Ocultar UI de combo
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
      // Añadir un pequeño delay antes de transicionar para que se vea el mensaje
      setTimeout(() => {
          if (this.gameManager.getStateMachine().getCurrentStateName() === 'QuizGameplay') {
             this.gameManager.getStateMachine().changeState('GameOver', { finalScore: this.score });
          }
      }, 1500);
    } else {
      // Si no es Game Over, programar la siguiente pregunta
      this.scheduleNextQuestion(1500);
    }
  }

  private scheduleNextQuestion(delay: number): void {
    if (this.nextQuestionTimeoutId) {
      clearTimeout(this.nextQuestionTimeoutId);
    }
    // Solo programar si todavía estamos en este estado
    if (this.gameManager.getStateMachine().getCurrentStateName() === 'QuizGameplay') {
        this.nextQuestionTimeoutId = window.setTimeout(() => {
            this.nextQuestionTimeoutId = null;
            // Doble check por si el estado cambió justo antes del timeout
            if (this.gameManager.getStateMachine().getCurrentStateName() === 'QuizGameplay') {
                this.displayNextQuestion();
            }
        }, delay);
    } else {
        // console.log("ScheduleNextQuestion: State changed before timeout could be set. Aborting.");
    }
  }

  private displayNextQuestion(): void {
    console.log("--- displayNextQuestion START ---"); // <-- Log de inicio
    this.clearUI(); // Limpia la UI anterior

    const quizSystem = this.gameManager.getQuizSystem();
    try {
        this.currentQuestion = quizSystem.selectNextQuestion();
        console.log("Pregunta seleccionada:", this.currentQuestion ? this.currentQuestion.id : 'Ninguna');
    } catch (error) {
        console.error("Error al seleccionar la siguiente pregunta:", error);
        // Manejar el error, quizás mostrar mensaje y volver al menú
        this.updateFeedbackUI("Error al cargar pregunta.", false);
        setTimeout(() => this.gameManager.getStateMachine().changeState('MainMenu'), 2000);
        return;
    }


    if (!this.currentQuestion) {
      console.log('Fin del Quiz o error. Transicionando...');
      // TODO: Transicionar a ResultsState en lugar de GameOver si se completó bien
      this.gameManager.getStateMachine().changeState('Results', { finalScore: this.score }); // O GameOver si es por error
      return;
    }

    // --- Creación de UI ---
    const appContainer = this.gameManager.getContainerElement();
    if (!appContainer) {
        console.error("¡Error crítico! No se encontró el contenedor #app.");
        return; // Salir si no hay dónde poner la UI
    }

    console.log("Creando contenedor de UI del Quiz...");
    this.quizContainer = document.createElement('div');
    // Clases básicas + Tailwind (asegúrate que Tailwind funcione)
    this.quizContainer.className = 'quiz-ui-container p-4 flex flex-col items-center w-full max-w-md mx-auto text-gray-100 bg-gray-800 bg-opacity-80 rounded-lg shadow-lg z-20 relative border-2 border-blue-500'; // Añadido borde para depuración
    this.quizContainer.id = 'quiz-ui-active';
    this.quizContainer.style.minHeight = '300px'; // Altura mínima para asegurar visibilidad

    // --- Top UI ---
    const topUIContainer = document.createElement('div');
    topUIContainer.className = 'top-ui-container flex justify-between items-center w-full mb-4 p-2 bg-gray-700 rounded'; // Fondo para ver el contenedor
    // Lives
    const livesDisplayContainer = document.createElement('div');
    livesDisplayContainer.id = 'quiz-lives-container';
    livesDisplayContainer.className = 'quiz-lives flex items-center gap-1 text-lg text-red-400';
    const heartIcon = document.createElement('span'); heartIcon.textContent = '❤️';
    const livesCountSpan = document.createElement('span'); livesCountSpan.id = 'quiz-lives-count'; livesCountSpan.className = 'font-bold';
    livesDisplayContainer.appendChild(heartIcon); livesDisplayContainer.appendChild(livesCountSpan);
    topUIContainer.appendChild(livesDisplayContainer);
    // Score
    const scoreDisplay = document.createElement('p');
    scoreDisplay.id = 'quiz-score';
    scoreDisplay.className = 'quiz-score text-3xl font-bold text-yellow-300';
    topUIContainer.appendChild(scoreDisplay);
    // Combo
    const comboDisplay = document.createElement('p');
    comboDisplay.id = 'quiz-combo';
    comboDisplay.className = 'quiz-combo text-xl font-semibold text-orange-400';
    comboDisplay.style.display = 'none';
    topUIContainer.appendChild(comboDisplay);
    this.quizContainer.appendChild(topUIContainer);
    console.log("Top UI creada.");

    // --- Question Text ---
    const questionTextElement = document.createElement('p');
    try {
        questionTextElement.textContent = this.currentQuestion.text; // Acceso seguro
    } catch(e) { console.error("Error al acceder a question text:", e); questionTextElement.textContent = "Error al mostrar pregunta"; }
    questionTextElement.className = 'question-text text-xl font-semibold mb-6 text-center p-2 bg-gray-700 rounded'; // Fondo para ver el contenedor
    this.quizContainer.appendChild(questionTextElement);
    console.log("Texto de pregunta creado.");

    // --- Options ---
    const optionsContainer = document.createElement('div');
    optionsContainer.id = 'quiz-options';
    optionsContainer.className = 'options-container flex flex-col gap-3 w-full';
    try {
        if (!this.currentQuestion.options || !Array.isArray(this.currentQuestion.options)) {
            throw new Error("Formato de opciones inválido");
        }
        this.currentQuestion.options.forEach((option, index) => {
            if (!option || typeof option.key === 'undefined' || typeof option.text === 'undefined') {
                console.warn(`Opción inválida en índice ${index}`, option);
                return; // Saltar opción inválida
            }
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
        console.log("Botones de opciones creados.");
    } catch(e) {
        console.error("Error al crear botones de opciones:", e);
        optionsContainer.innerHTML = '<p class="text-red-500">Error al mostrar opciones.</p>';
        this.quizContainer.appendChild(optionsContainer); // Añadir mensaje de error
    }


    // --- Feedback Area ---
    const feedbackElement = document.createElement('div');
    feedbackElement.id = 'quiz-feedback';
    feedbackElement.className = 'feedback-area mt-4 text-lg h-8 text-center font-bold';
    this.quizContainer.appendChild(feedbackElement);
    console.log("Área de feedback creada.");

    // --- Appending to DOM ---
    try {
        appContainer.appendChild(this.quizContainer);
        console.log("Contenedor de UI del Quiz AÑADIDO al DOM (#app)."); // <-- Log clave
    } catch (error) {
        console.error("¡Error al añadir quizContainer al appContainer!", error);
    }

    // Update initial UI values
    this.updateScoreUI();
    this.updateLivesUI();
    this.updateComboUI();
    console.log("--- displayNextQuestion END ---"); // <-- Log de fin
  }

  private handleOptionClick(selectedKey: string): void {
    if (!this.currentQuestion || this.nextQuestionTimeoutId !== null) {
      // console.log("Click ignorado (pregunta no lista o respuesta ya procesándose)");
      return;
    }

    // console.log(`Opción seleccionada: ${selectedKey}`);
    const quizSystem = this.gameManager.getQuizSystem();
    if (!this.currentQuestion) return; // Seguridad extra

    const isCorrect = quizSystem.validateAnswer(this.currentQuestion.id, selectedKey);
    this.disableOptions(); // Deshabilitar botones inmediatamente

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
  private updateScoreUI(): void {
    const scoreElement = document.getElementById('quiz-score');
    if (scoreElement) {
        scoreElement.textContent = `Score: ${this.score.toString()}`; // Añadir etiqueta
    } else { console.warn("Elemento #quiz-score no encontrado para actualizar."); }
  }
  private updateComboUI(): void {
    const comboElement = document.getElementById('quiz-combo');
    if (comboElement) {
      if (this.consecutiveCorrectAnswers > 1) {
        comboElement.textContent = `Combo x${this.consecutiveCorrectAnswers}`;
        comboElement.style.display = 'block';
      } else {
        comboElement.style.display = 'none';
      }
    } else { /* console.warn("Elemento #quiz-combo no encontrado"); */ }
  }
  private updateLivesUI(): void {
    const livesElement = document.getElementById('quiz-lives-count');
    if (livesElement) {
      livesElement.textContent = this.gameManager.getLives().toString();
    } else { console.warn("Elemento #quiz-lives-count no encontrado para actualizar."); }
  }
  // Modificado para aceptar tercer parámetro opcional para estilo escudo
   private updateFeedbackUI(message: string, isCorrect: boolean, isShieldBreak: boolean = false): void {
       const feedbackElement = document.getElementById('quiz-feedback');
       if (feedbackElement) {
           feedbackElement.textContent = message;
           feedbackElement.className = 'feedback-area mt-4 text-lg h-8 text-center font-bold'; // Reset classes
           if (isShieldBreak) {
               feedbackElement.classList.add('text-blue-400'); // Estilo para escudo roto
           } else if (isCorrect) {
               feedbackElement.classList.add('text-green-400');
           } else {
               feedbackElement.classList.add('text-red-400');
           }
       } else { console.warn("Elemento #quiz-feedback no encontrado"); }
   }

  private disableOptions(): void {
    const optionsContainer = document.getElementById('quiz-options');
    if (optionsContainer) {
        const buttons = optionsContainer.getElementsByTagName('button');
        for (let button of buttons) {
            button.disabled = true;
        }
    }
  }

  private clearUI(): void {
    console.log("clearUI llamada"); // <-- Log
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
      console.log("Eliminando contenedor de UI anterior..."); // <-- Log
      specificQuizContainer.parentNode.removeChild(specificQuizContainer);
    } else {
        // console.log("clearUI: No active quiz container found to remove."); // Normal en la primera entrada
    }
    this.quizContainer = null;
    // No reseteamos currentQuestion aquí, se hace en displayNextQuestion
  }
}