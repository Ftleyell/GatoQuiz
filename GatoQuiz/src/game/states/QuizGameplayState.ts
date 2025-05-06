// src/game/states/QuizGameplayState.ts

import { IState } from '../StateMachine';
import { GameManager } from '../GameManager';
import { UIManager } from '../../systems/UIManager';

interface QuestionOption { key: string; text: string; }
interface Question {
  id: number | string;
  text: string;
  options: QuestionOption[];
  correctAnswerKey: string;
  difficulty: string | number;
  explanation?: string;
}

const SIZE_INCREMENT_PER_CORRECT = 1;
const MAX_CORRECT_ANSWER_GROWTH = 4;

export class QuizGameplayState implements IState {
  private gameManager: GameManager;
  private uiManager: UIManager;
  public currentQuestion: Question | null = null;
  private nextQuestionTimeoutId: number | null = null;
  public consecutiveCorrectAnswers: number = 0;
  private hintAppliedToQuestionId: number | string | null = null;
  private isWaitingForExplanationConfirm: boolean = false;
  private lastAnswerResultType: 'correct' | 'incorrect' | 'shield' | null = null; // <--- AÑADIDO: Almacenar el resultado

  private readonly BASE_POINTS_PER_CORRECT = 15;
  private readonly DIFFICULTY_BONUS: { [key: string]: number } = {
      "easy": 10,
      "1": 10,
      "2": 20,
      "medium": 30,
      "3": 30,
      "hard": 45,
      "4": 45,
      "5": 65
  };

  constructor(gameManager: GameManager) {
    this.gameManager = gameManager;
    try {
        this.uiManager = gameManager.getUIManager();
    } catch (error) {
        console.error("QuizGameplayState: Error crítico obteniendo UIManager.", error);
        throw error;
    }
  }

  private selectRandomCatTemplateId(): string {
    const catManager = this.gameManager.getCatManager();
    const weightedTemplates = catManager.getSpawnableTemplatesWeighted();
    if (weightedTemplates.length === 0) { return 'common_cat'; }
    const totalWeight = weightedTemplates.reduce((sum, t) => sum + t.weight, 0);
    if (totalWeight <= 0) { return weightedTemplates[0]?.id ?? 'common_cat'; }
    const randomNum = Math.random() * totalWeight;
    let cumulativeWeight = 0;
    for (const template of weightedTemplates) {
        cumulativeWeight += template.weight;
        if (randomNum < cumulativeWeight) { return template.id; }
    }
    return weightedTemplates[weightedTemplates.length - 1]?.id ?? 'common_cat';
  }

  enter(params?: any): void {
    console.log('QuizGameplayState: enter', params);
    const containerElement = this.gameManager.getContainerElement();

    containerElement.innerHTML = '';
    containerElement.classList.remove('state-fade-in', 'state-fade-out');
    containerElement.style.opacity = '0';

    this.gameManager.setBodyStateClass('quizgameplay');
    this.gameManager.getPlayerData().reset();
    console.log("PlayerData reseteado para nueva partida.");
    this.consecutiveCorrectAnswers = 0;
    this.hintAppliedToQuestionId = null;
    this.isWaitingForExplanationConfirm = false;
    this.lastAnswerResultType = null; // Resetear al entrar

    this.displayNextQuestion();

    requestAnimationFrame(() => {
        containerElement.classList.add('state-fade-in');
        containerElement.style.opacity = '';
    });
  }

  exit(): void {
    console.log('QuizGameplayState: exit');
    const containerElement = this.gameManager.getContainerElement();

    this.uiManager.clearQuizInterface(containerElement);

    if (this.nextQuestionTimeoutId) {
        clearTimeout(this.nextQuestionTimeoutId);
        this.nextQuestionTimeoutId = null;
    }

    this.uiManager.updateComboVisuals(0); // Resetear efectos visuales de combo
    document.body.style.backgroundColor = '#111827'; // Resetear color de fondo
    const root = document.documentElement;
    root.style.setProperty('--element-glow-intensity', '0');
    root.style.setProperty('--flare-intensity', '0');
    root.style.setProperty('--difficulty-glow-color', 'transparent');
    root.style.setProperty('--difficulty-glow-blur', '0px');

    this.isWaitingForExplanationConfirm = false;
    this.hintAppliedToQuestionId = null;
    this.currentQuestion = null;
    this.lastAnswerResultType = null; // Limpiar al salir

  }

  // Corrección: Añadir guion bajo a 'deltaTime'
  update(_deltaTime: number): void { /* No action needed per frame */ }

  private calculateScore(difficulty: string | number, streakBefore: number): { totalPoints: number, basePoints: number, difficultyBonus: number, comboBonus: number } {
    const currentStreak = streakBefore + 1;
    const basePoints = this.BASE_POINTS_PER_CORRECT * currentStreak;
    const difficultyBonus = this.DIFFICULTY_BONUS[difficulty] ?? this.DIFFICULTY_BONUS[1] ?? 0;
    const actualComboMultiplier = this.gameManager.getPlayerData().getCurrentComboMultiplier();
    const comboBonus = Math.max(0, (basePoints + difficultyBonus) * (actualComboMultiplier - 1));
    const totalPoints = Math.round(basePoints + difficultyBonus + comboBonus);
    return { totalPoints, basePoints, difficultyBonus, comboBonus: Math.round(comboBonus) };
  }

  private handleCorrectAnswer(difficulty: string | number): void {
    this.lastAnswerResultType = 'correct'; // <--- GUARDAR RESULTADO
    const scoreBreakdown = this.calculateScore(difficulty, this.consecutiveCorrectAnswers);
    this.consecutiveCorrectAnswers++;
    this.gameManager.getPlayerData().score += scoreBreakdown.totalPoints;
    this.gameManager.getInkManager().gainInkOnCorrectAnswer();

    this.uiManager.updateScoreDisplay(this.gameManager.getPlayerData().score);
    this.uiManager.updateComboVisuals(this.consecutiveCorrectAnswers);
    this.uiManager.updateInkBar();

    // Mantenemos el feedback detallado aquí por ahora
    let feedbackMessage = `¡+${scoreBreakdown.totalPoints} Pts!`;
    let details = `(Base: ${scoreBreakdown.basePoints}, Dif: +${scoreBreakdown.difficultyBonus}`;
    const actualComboMultiplier = this.gameManager.getPlayerData().getCurrentComboMultiplier();
    if (scoreBreakdown.comboBonus > 0) { details += `, Combo x${actualComboMultiplier.toFixed(1)}: +${scoreBreakdown.comboBonus}`; }
    details += ')';
    feedbackMessage += ` ${details}`;
    // Actualizamos el feedback existente con los detalles del puntaje
    this.uiManager.updateFeedback(feedbackMessage, 'correct');

    try { this.gameManager.getAudioManager().playSound('correct'); }
    catch(e) { console.error("Error sonido 'correct':", e); }

    try {
        this.gameManager.getCatManager().growExistingCats(SIZE_INCREMENT_PER_CORRECT, MAX_CORRECT_ANSWER_GROWTH);
    } catch (error) {
        console.error("Error llamando a catManager.growExistingCats:", error);
    }

    const catsToSpawn = this.gameManager.getPlayerData().getCatsPerCorrectAnswer();
    const selectedTemplateId = this.selectRandomCatTemplateId();

    if (selectedTemplateId) {
        for (let i = 0; i < catsToSpawn; i++) {
             try {
                 this.gameManager.getCatManager().addCat(selectedTemplateId);
             } catch (error) {
                 console.error(`Error al llamar a catManager.addCat (iteración ${i+1}/${catsToSpawn}):`, error);
             }
        }
    }

    this.proceedToNextStep(); // Llama a proceedToNextStep
  }

  private handleIncorrectAnswer(): void {
    this.lastAnswerResultType = 'incorrect'; // <--- GUARDAR RESULTADO
    const playerData = this.gameManager.getPlayerData();
    let gameOver = false;

    if (playerData.hasShield) {
        playerData.hasShield = false;
        this.uiManager.updateFeedback('¡Escudo Roto!', 'shield'); // Usamos feedback para escudo
        this.uiManager.updateShieldIcon(false);
        this.gameManager.getAudioManager().playSound('shield_break');
        this.lastAnswerResultType = 'shield'; // <- Actualizamos si el escudo lo salvó
    } else {
        this.consecutiveCorrectAnswers = 0;
        this.gameManager.decrementLives();
        this.uiManager.updateComboVisuals(this.consecutiveCorrectAnswers);
        // COMENTADO: Ya no mostramos "Incorrecto." aquí
        // this.uiManager.updateFeedback('Incorrecto.', 'incorrect');
        this.gameManager.getAudioManager().playSound('incorrect');

        if (playerData.hintCharges > 0) {
             console.log("Incorrect answer (no shield), resetting hint charges.");
             playerData.hintCharges = 0;
             this.uiManager.updateHintIcon(0);
        }

        if (this.gameManager.getLives() <= 0) {
            gameOver = true;
        }
    }

    this.hintAppliedToQuestionId = null;

    if (gameOver) {
        this.uiManager.updateFeedback('¡Has perdido!', 'incorrect'); // Usamos feedback para Game Over
        if (this.nextQuestionTimeoutId) { clearTimeout(this.nextQuestionTimeoutId); this.nextQuestionTimeoutId = null; }
        setTimeout(() => {
            // Verificar que aún estemos en este estado antes de cambiar
            if (this.gameManager.getStateMachine().getCurrentStateName() === 'QuizGameplay') {
                 this.gameManager.getStateMachine().changeState('GameOver', { finalScore: playerData.score });
            }
        }, 1500);
    } else {
        this.proceedToNextStep(); // Llama a proceedToNextStep
    }
  }

  private proceedToNextStep(): void {
      const explanation = this.currentQuestion?.explanation;
      // Si hay explicación y no estamos esperando ya, mostrarla
      if (explanation && !this.isWaitingForExplanationConfirm) {
          this.isWaitingForExplanationConfirm = true;
          // Pasamos el resultado guardado (correct/incorrect/shield)
          this.uiManager.showExplanation(explanation, () => {
              this.isWaitingForExplanationConfirm = false;
              this.lastAnswerResultType = null; // Limpiar resultado después de confirmar
              this.scheduleNextQuestion(500); // Programar siguiente pregunta
          }, this.lastAnswerResultType); // <--- PASAR EL RESULTADO
      }
      // Si no hay explicación o ya estamos esperando, simplemente programar la siguiente
      else if (!this.isWaitingForExplanationConfirm) {
          this.lastAnswerResultType = null; // Limpiar resultado si no hay explicación
          this.scheduleNextQuestion(1500); // Programar siguiente (mayor delay si no hubo explicación)
      }
  }

  private scheduleNextQuestion(delay: number): void {
    if (this.nextQuestionTimeoutId) clearTimeout(this.nextQuestionTimeoutId);
    // Verificar que aún estemos en este estado antes de programar
    if (this.gameManager.getStateMachine().getCurrentStateName() === 'QuizGameplay') {
        this.nextQuestionTimeoutId = window.setTimeout(() => {
            this.nextQuestionTimeoutId = null;
            // Verificar de nuevo antes de mostrar la siguiente pregunta
            if (this.gameManager.getStateMachine().getCurrentStateName() === 'QuizGameplay') {
                requestAnimationFrame(() => this.displayNextQuestion());
            }
        }, delay);
    }
  }

  private displayNextQuestion(): void {
    const quizSystem = this.gameManager.getQuizSystem();
    try {
        this.currentQuestion = quizSystem.selectNextQuestion();
    } catch (error) {
        console.error("Error seleccionando la siguiente pregunta:", error);
        this.uiManager.updateFeedback("Error al cargar la siguiente pregunta.", 'info');
        return;
    }

    if (!this.currentQuestion) {
        console.log("No quedan más preguntas disponibles.");
        this.uiManager.updateFeedback("¡Has completado todas las preguntas!", 'correct');
         // Podríamos ir a un estado de "Resultados" o "Fin de Ronda" aquí
        setTimeout(() => {
             if (this.gameManager.getStateMachine().getCurrentStateName() === 'QuizGameplay') {
                this.gameManager.getStateMachine().changeState('Results', { finalScore: this.gameManager.getPlayerData().score });
             }
        }, 1500);
        return;
    }

    this.hintAppliedToQuestionId = null; // Resetear pista para la nueva pregunta

    const appContainer = this.gameManager.getContainerElement();
    if (!appContainer) {
        console.error("QuizGameplayState: Contenedor #app no encontrado.");
        return;
    }

    try {
        this.uiManager.buildQuizInterface(
            this.currentQuestion,
            appContainer,
            this.handleOptionClick.bind(this),
            this.consecutiveCorrectAnswers
        );

        // Si hay una pista activa en PlayerData, aplicarla visualmente
        if (this.gameManager.getPlayerData().hintCharges > 0 && this.currentQuestion) {
             this.uiManager.applyHintVisuals(this.currentQuestion.correctAnswerKey);
             this.hintAppliedToQuestionId = this.currentQuestion.id; // Marcar que se aplicó a esta pregunta
        }

    } catch (error) {
        console.error("Error construyendo la interfaz del quiz:", error);
        this.uiManager.updateFeedback("Error al mostrar la pregunta.", 'info');
    }
  }

  public handleOptionClick(selectedKey: string): void {
    // Ignorar clicks si estamos mostrando la explicación o si ya hay un timeout para la siguiente pregunta
    if (this.isWaitingForExplanationConfirm || !this.currentQuestion || this.nextQuestionTimeoutId !== null) {
         console.log(`handleOptionClick ignorado: isWaiting=${this.isWaitingForExplanationConfirm}, no currentQ=${!this.currentQuestion}, nextQTimeout=${this.nextQuestionTimeoutId}`);
         return;
    }


    this.uiManager.disableOptions(); // Deshabilitar botones para evitar doble click

    const quizSystem = this.gameManager.getQuizSystem();
    const isCorrect = quizSystem.validateAnswer(this.currentQuestion.id, selectedKey);
    const playerData = this.gameManager.getPlayerData();

    // Si se usó una pista en esta pregunta, descontar la carga
    if (this.hintAppliedToQuestionId === this.currentQuestion.id) {
        if (playerData.hintCharges > 0) {
            playerData.hintCharges--;
            this.uiManager.updateHintIcon(playerData.hintCharges);
        }
         this.hintAppliedToQuestionId = null; // Resetear la marca de pista usada
    }

    // Procesar resultado
    if (isCorrect === true) {
        this.handleCorrectAnswer(this.currentQuestion.difficulty);
    } else if (isCorrect === false) {
        this.handleIncorrectAnswer();
    } else {
        // Caso de error (pregunta no encontrada, etc.)
        this.uiManager.updateFeedback("Error al validar la respuesta.", 'info');
        this.hintAppliedToQuestionId = null; // Asegurar que se limpie
        this.proceedToNextStep(); // Continuar el flujo aunque haya error
    }
  }

  // Para refrescar la UI si cambia el tema
  public rebuildInterface(): void {
      const appContainer = this.gameManager.getContainerElement();
      if (this.currentQuestion && appContainer) {
          this.uiManager.buildQuizInterface(
              this.currentQuestion,
              appContainer,
              this.handleOptionClick.bind(this),
              this.consecutiveCorrectAnswers
          );
          // Re-aplicar pista visual si corresponde
          if (this.hintAppliedToQuestionId === this.currentQuestion.id) {
               this.uiManager.applyHintVisuals(this.currentQuestion.correctAnswerKey);
          }
      } else {
          console.warn("QuizGameplayState: No se puede reconstruir, falta pregunta actual o contenedor.");
      }
  }

} // Fin clase QuizGameplayState