// src/game/states/QuizGameplayState.ts

import { IState } from '../StateMachine';
import { GameManager } from '../GameManager'; // Asegúrate que la ruta sea correcta

// Tipos (mantenidos para claridad, pueden moverse a un archivo types)
interface QuestionOption { key: string; text: string; }
interface Question { id: number | string; text: string; options: QuestionOption[]; correctAnswerKey: string; difficulty: string; }

/**
 * Estado principal del juego donde se muestra el Quiz y la interacción con gatos.
 */
export class QuizGameplayState implements IState {
  private gameManager: GameManager;
  private currentQuestion: Question | null = null;
  private optionListeners: Map<HTMLButtonElement, () => void> = new Map();
  private quizContainer: HTMLDivElement | null = null;
  private nextQuestionTimeoutId: number | null = null;
  // private score: number = 0; // <-- Ya eliminado
  private consecutiveCorrectAnswers: number = 0;

  // Constantes de Puntuación (se mantienen para cálculo)
  private readonly BASE_POINTS_PER_CORRECT = 10;
  private readonly DIFFICULTY_BONUS: { [key: string]: number } = { "easy": 10, "medium": 30, "hard": 50 };

  // Plantillas de Spawn (NOTA: Se refactorizará en el siguiente paso para usar CatManager)
  private spawnableCatTemplates = [ { id: 'common_gray', weight: 75 }, { id: 'rare_blue', weight: 25 } ];
  private totalSpawnWeight: number = 0;

  constructor(gameManager: GameManager) {
    this.gameManager = gameManager;
    this.calculateTotalSpawnWeight(); // Calcular peso inicial
  }

  // Métodos auxiliares para spawn (se refactorizarán)
  private calculateTotalSpawnWeight(): void { this.totalSpawnWeight = this.spawnableCatTemplates.reduce((sum, t) => sum + t.weight, 0); }
  private selectRandomCatTemplateId(): string { if(this.totalSpawnWeight<=0||this.spawnableCatTemplates.length===0)return'common_gray';const r=Math.random()*this.totalSpawnWeight;let c=0;for(const t of this.spawnableCatTemplates){c+=t.weight;if(r<c)return t.id;}return this.spawnableCatTemplates[this.spawnableCatTemplates.length-1]?.id??'common_gray'; }


  /**
   * Se ejecuta al entrar en el estado QuizGameplay.
   * Inicializa el estado de la partida y muestra la primera pregunta.
   * @param params - Parámetros opcionales (no usados aquí).
   */
  enter(params?: any): void {
    console.log('QuizGameplayState: enter', params);
    this.gameManager.setBodyStateClass('quizgameplay'); // <-- AÑADIR ESTA LÍNEA
    
    // *** CORRECCIÓN: Resetear PlayerData al iniciar nueva partida ***
    this.gameManager.getPlayerData().reset();
    console.log("PlayerData reseteado para nueva partida.");
    // *************************************************************

    this.consecutiveCorrectAnswers = 0;
    this.calculateTotalSpawnWeight(); // Recalcular por si cambia en el futuro
    this.clearUI(); // Limpiar UI anterior si existe
    this.displayNextQuestion(); // Mostrar la primera pregunta
  }

  /**
   * Se ejecuta al salir del estado QuizGameplay.
   * Limpia la UI y los listeners.
   */
  exit(): void {
    console.log('QuizGameplayState: exit');
    this.clearUI(); // Limpiar la interfaz del quiz
  }

  /**
   * Se ejecuta en cada frame (actualmente sin uso específico aquí).
   * @param deltaTime - Tiempo desde el último frame.
   */
  update(deltaTime: number): void {
    // Podría usarse para animaciones o lógica dependiente del tiempo dentro del quiz
  }

  /**
   * Calcula los puntos ganados por una respuesta correcta.
   * @param difficulty - La dificultad de la pregunta.
   * @param streakBefore - La racha de aciertos *antes* de esta respuesta.
   * @returns Objeto con el desglose de puntos.
   */
  private calculateScore(difficulty: string, streakBefore: number): { totalPoints: number, basePoints: number, difficultyBonus: number, comboBonus: number } {
    const currentStreak = streakBefore + 1;
    const basePoints = this.BASE_POINTS_PER_CORRECT * currentStreak;
    const difficultyBonus = this.DIFFICULTY_BONUS[difficulty] ?? this.DIFFICULTY_BONUS["easy"];
    // Obtener multiplicador actual directamente de PlayerData
    const actualComboMultiplier = this.gameManager.getPlayerData().getCurrentComboMultiplier();
    const comboBonus = Math.max(0, (basePoints + difficultyBonus) * (actualComboMultiplier - 1));
    const totalPoints = Math.round(basePoints + difficultyBonus + comboBonus);

    return { totalPoints, basePoints, difficultyBonus, comboBonus: Math.round(comboBonus) };
  }

  /**
   * Maneja la lógica cuando el jugador acierta una respuesta.
   * Calcula puntaje, actualiza PlayerData, da feedback, spawnea gato y programa la siguiente pregunta.
   * @param difficulty - La dificultad de la pregunta acertada.
   */
  private handleCorrectAnswer(difficulty: string): void {
    // Calcular desglose de puntos
    const scoreBreakdown = this.calculateScore(difficulty, this.consecutiveCorrectAnswers);
    this.consecutiveCorrectAnswers++; // Incrementar racha

    // Actualizar PlayerData
    this.gameManager.getPlayerData().score += scoreBreakdown.totalPoints;

    // Actualizar UI
    this.updateScoreUI();
    this.updateComboUI();

    // Mostrar Feedback detallado
    let feedbackMessage = `¡Correcto! +${scoreBreakdown.totalPoints} Pts`;
    let details = `(Base: ${scoreBreakdown.basePoints}, Dif: +${scoreBreakdown.difficultyBonus}`;
    const actualComboMultiplier = this.gameManager.getPlayerData().getCurrentComboMultiplier();
    if (scoreBreakdown.comboBonus > 0) {
        details += `, Combo x${actualComboMultiplier.toFixed(1)}: +${scoreBreakdown.comboBonus}`;
    }
    details += ')';
    feedbackMessage += ` ${details}`;
    this.updateFeedbackUI(feedbackMessage, true);

    // Reproducir sonido
    try { this.gameManager.getAudioManager().playSound('correct'); }
    catch(e) { console.error("Error sonido 'correct':", e); }

    // Spawnear Gato (Usando lógica temporal, se refactorizará)
    const selectedTemplateId = this.selectRandomCatTemplateId();
    if (selectedTemplateId) {
        try {
            const catManager = this.gameManager.getCatManager();
            if (catManager) {
                catManager.addCat(selectedTemplateId);
            } else {
                console.error("   --> ¡Error Fatal! CatManager no disponible al spawnear.");
            }
        } catch (error) {
            console.error(` -> ¡Error atrapado! al llamar a catManager.addCat:`, error);
        }
    }

    // Programar siguiente pregunta
    this.scheduleNextQuestion(1500); // Delay de 1.5s
  }

  /**
   * Maneja la lógica cuando el jugador falla una respuesta.
   * Consume escudo si existe, o resta vida. Resetea racha.
   * Verifica si es Game Over. Programa siguiente pregunta o transición a GameOver.
   */
  private handleIncorrectAnswer(): void {
    const playerData = this.gameManager.getPlayerData();

    if (playerData.hasShield) {
        // Usar escudo
        console.log("Escudo absorbe el golpe.");
        playerData.hasShield = false; // Consumir escudo
        this.updateFeedbackUI('¡Escudo Roto!', false, true); // Feedback visual azul
        this.gameManager.getAudioManager().playSound('shield_break');
        this.gameManager.updateExternalShieldUI(false); // Notificar UI

    } else {
        // Sin escudo: perder vida y racha
        this.consecutiveCorrectAnswers = 0; // Resetear racha
        this.gameManager.decrementLives(); // Restar vida (GameManager actualiza PlayerData y llama a updateExternalLivesUI)
        // updateLivesUI() // No es necesario llamar aquí, decrementLives ya lo hace
        this.updateComboUI(); // Ocultar contador de combo
        this.updateFeedbackUI('Incorrecto.', false); // Feedback visual rojo
        this.gameManager.getAudioManager().playSound('incorrect');
    }

    // Verificar Game Over
    if (this.gameManager.getLives() <= 0) {
        console.log("Game Over condition met!");
        this.updateFeedbackUI('¡Has perdido!', false); // Mensaje final
        if (this.nextQuestionTimeoutId) { clearTimeout(this.nextQuestionTimeoutId); this.nextQuestionTimeoutId = null; }
        setTimeout(() => {
            if (this.gameManager.getStateMachine().getCurrentStateName() === 'QuizGameplay') {
                this.gameManager.getStateMachine().changeState('GameOver', { finalScore: playerData.score });
            }
        }, 1500);

    } else {
        // Si no es game over, programar siguiente pregunta
        this.scheduleNextQuestion(1500); // Delay de 1.5s
    }
  }

  /**
   * Programa la carga de la siguiente pregunta después de un delay.
   * Cancela cualquier programación anterior.
   * @param delay - Tiempo en milisegundos antes de cargar la siguiente pregunta.
   */
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
   * Crea y muestra la interfaz gráfica para la pregunta actual.
   * Añade los elementos al DOM y configura los listeners de los botones.
   */
  private displayNextQuestion(): void {
    // console.log("[UI DEBUG] --- displayNextQuestion START ---"); // Log menos verboso
    const quizSystem = this.gameManager.getQuizSystem();
    try {
        this.currentQuestion = quizSystem.selectNextQuestion();
        // console.log("[UI DEBUG] Pregunta seleccionada:", this.currentQuestion ? this.currentQuestion.id : 'Ninguna');
    } catch (error) {
        console.error("Error al seleccionar pregunta:", error);
        this.gameManager.getStateMachine().changeState('Results', { finalScore: this.gameManager.getPlayerData().score });
        return;
    }

    if (!this.currentQuestion) {
      console.log('[UI DEBUG] Fin del Quiz o error. Transicionando a Results...');
      this.gameManager.getStateMachine().changeState('Results', { finalScore: this.gameManager.getPlayerData().score });
      return;
    }

    const appContainer = this.gameManager.getContainerElement();
    if (!appContainer) { console.error("[UI DEBUG] ¡Error crítico! #app no encontrado."); return; }

    const newQuizContainer = document.createElement('div');
    newQuizContainer.className = 'quiz-ui-container p-4 flex flex-col items-center w-full max-w-md mx-auto text-gray-100 bg-gray-800 bg-opacity-80 rounded-lg shadow-lg z-20 relative';
    newQuizContainer.style.minHeight = '300px';

    try {
        // Contenedor Superior (Vidas, Score, Combo)
        const topUIContainer = document.createElement('div');
        topUIContainer.className = 'top-ui-container flex justify-between items-center w-full mb-4 p-2 bg-gray-700 rounded';

        // Vidas + Iconos Estado
        const livesDisplayContainer = document.createElement('div');
        livesDisplayContainer.id = 'quiz-lives-container';
        livesDisplayContainer.className = 'quiz-lives flex items-center gap-2 text-lg text-red-400'; // Aumentado gap
        const heartIcon = document.createElement('span'); heartIcon.textContent = '❤️';
        const livesCountSpan = document.createElement('span'); livesCountSpan.id = 'quiz-lives-count'; livesCountSpan.className = 'font-bold';
        // Icono Escudo (inicialmente oculto)
        const shieldIcon = document.createElement('span'); shieldIcon.id = 'quiz-shield-icon'; shieldIcon.textContent = '🛡️'; shieldIcon.style.display = 'none'; // Oculto por defecto
        // Icono Pista (inicialmente oculto)
        const hintIcon = document.createElement('span'); hintIcon.id = 'quiz-hint-icon'; hintIcon.textContent = '💡'; hintIcon.style.display = 'none'; // Oculto por defecto

        livesDisplayContainer.appendChild(heartIcon);
        livesDisplayContainer.appendChild(livesCountSpan);
        livesDisplayContainer.appendChild(shieldIcon); // Añadir icono escudo
        livesDisplayContainer.appendChild(hintIcon); // Añadir icono pista
        topUIContainer.appendChild(livesDisplayContainer);


        // Score
        const scoreDisplay = document.createElement('p');
        scoreDisplay.id = 'quiz-score'; // ID para actualizar
        scoreDisplay.className = 'quiz-score text-3xl font-bold text-yellow-300';
        topUIContainer.appendChild(scoreDisplay);

        // Combo
        const comboDisplay = document.createElement('p');
        comboDisplay.id = 'quiz-combo'; // ID para actualizar
        comboDisplay.className = 'quiz-combo text-xl font-semibold text-orange-400';
        comboDisplay.style.display = 'none'; // Oculto inicialmente
        topUIContainer.appendChild(comboDisplay);

        newQuizContainer.appendChild(topUIContainer);

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
            if (!option?.key || typeof option.text === 'undefined') {
                console.warn(`Opción inválida encontrada en pregunta ${this.currentQuestion?.id}:`, option);
                return;
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

    // Actualizar valores iniciales de la UI (score, vidas, combo, iconos de estado)
    this.updateScoreUI();
    this.updateLivesUI();
    this.updateComboUI();
    // Actualizar estado inicial de iconos escudo/pista basado en PlayerData
    this.updateShieldIcon(this.gameManager.getPlayerData().hasShield);
    this.updateHintIcon(this.gameManager.getPlayerData().hintCharges);

    // console.log("[UI DEBUG] --- displayNextQuestion END ---"); // Log menos verboso
  }

  /**
   * Manejador de clic para los botones de opción.
   * @param selectedKey - La clave de la opción seleccionada.
   */
  private handleOptionClick(selectedKey: string): void {
      if (!this.currentQuestion || this.nextQuestionTimeoutId !== null) return;

      const quizSystem = this.gameManager.getQuizSystem();
      const isCorrect = quizSystem.validateAnswer(this.currentQuestion.id, selectedKey);

      this.disableOptions();

      if (isCorrect === true) {
          this.handleCorrectAnswer(this.currentQuestion.difficulty);
      } else if (isCorrect === false) {
          this.handleIncorrectAnswer();
      } else {
          console.error(`Error validando respuesta para pregunta ID ${this.currentQuestion.id}`);
          this.updateFeedbackUI("Error al validar.", false);
          this.scheduleNextQuestion(2000);
      }
  }

  /** Actualiza el elemento de la UI que muestra la puntuación. */
  private updateScoreUI(): void {
    const scoreElement = document.getElementById('quiz-score');
    if (scoreElement) {
        scoreElement.textContent = `Score: ${this.gameManager.getPlayerData().score}`;
    }
  }

  /** Actualiza el elemento de la UI que muestra el combo. */
  private updateComboUI(): void {
    const comboElement = document.getElementById('quiz-combo');
    if (comboElement) {
        if (this.consecutiveCorrectAnswers > 1) {
            comboElement.textContent = `Combo x${this.consecutiveCorrectAnswers}`;
            comboElement.style.display = 'block';
        } else {
            comboElement.style.display = 'none';
        }
    }
  }

  /** Actualiza el elemento de la UI que muestra las vidas. */
  private updateLivesUI(): void {
    const livesElement = document.getElementById('quiz-lives-count');
    if (livesElement) {
        livesElement.textContent = this.gameManager.getLives().toString();
    }
  }

  /**
   * Actualiza el área de feedback con un mensaje y estilo visual.
   * @param message - El mensaje a mostrar.
   * @param isCorrect - true para feedback positivo (verde), false para negativo (rojo).
   * @param isShield - (Opcional) true para feedback de escudo roto (azul).
   */
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

  /** Deshabilita todos los botones de opción. */
  private disableOptions(): void {
    const optionsContainer = document.getElementById('quiz-options');
    if (optionsContainer) {
        const buttons = optionsContainer.getElementsByTagName('button');
        for (let button of buttons) { button.disabled = true; }
    }
  }

  /** Limpia la UI del quiz (elimina contenedor) y los listeners de botones. */
  private clearUI(): void {
    if (this.nextQuestionTimeoutId) { clearTimeout(this.nextQuestionTimeoutId); this.nextQuestionTimeoutId = null; }
    this.optionListeners.forEach((listener, button) => { button.removeEventListener('click', listener); });
    this.optionListeners.clear();
    if (this.quizContainer && this.quizContainer.parentNode) { this.quizContainer.parentNode.removeChild(this.quizContainer); }
    this.quizContainer = null;
  }

  // --- Métodos para actualizar iconos de estado (llamados por GameManager) ---
  /** Actualiza la visibilidad del icono de escudo en la UI del quiz. */
   public updateShieldIcon(isActive: boolean): void {
       const shieldIcon = document.querySelector('#quiz-shield-icon'); // Asumiendo ID dentro del contenedor
       if (shieldIcon) {
           (shieldIcon as HTMLElement).style.display = isActive ? 'inline' : 'none';
       } else {
           // console.warn("updateShieldIcon: Elemento #quiz-shield-icon no encontrado.");
       }
   }

   /** Actualiza la visibilidad del icono de pista en la UI del quiz. */
   public updateHintIcon(charges: number): void {
       const hintIcon = document.querySelector('#quiz-hint-icon'); // Asumiendo ID dentro del contenedor
       if (hintIcon) {
           (hintIcon as HTMLElement).style.display = charges > 0 ? 'inline' : 'none';
           // Aquí podrías añadir lógica para mostrar el número de cargas si quisieras
       } else {
            // console.warn("updateHintIcon: Elemento #quiz-hint-icon no encontrado.");
       }
   }
   // ---------------------------------------------------------------------------

} // Fin clase QuizGameplayState