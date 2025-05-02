// src/game/states/QuizGameplayState.ts

import { IState } from '../StateMachine';
import { GameManager } from '../GameManager';
import { UIManager } from '../../systems/UIManager';

interface QuestionOption { key: string; text: string; }
interface Question { id: number | string; text: string; options: QuestionOption[]; correctAnswerKey: string; difficulty: string; }

export class QuizGameplayState implements IState {
  private gameManager: GameManager;
  private uiManager: UIManager;
  public currentQuestion: Question | null = null; // Hacer público para UIManager.rebuild
  private nextQuestionTimeoutId: number | null = null;
  public consecutiveCorrectAnswers: number = 0; // Hacer público para UIManager.rebuild
  private hintAppliedToQuestionId: number | string | null = null;

  private readonly BASE_POINTS_PER_CORRECT = 10;
  private readonly DIFFICULTY_BONUS: { [key: string]: number } = { "easy": 10, "medium": 30, "hard": 50 };
  private readonly DIFFICULTY_TEXT: { [key: string]: string } = { "easy": "Fácil", "medium": "Medio", "hard": "Difícil" };

  constructor(gameManager: GameManager) {
    this.gameManager = gameManager;
    try {
        this.uiManager = gameManager.getUIManager();
    } catch (error) {
        console.error("QuizGameplayState: Error crítico obteniendo UIManager.", error);
        throw error;
    }
  }

  // selectRandomCatTemplateId (SIN CAMBIOS)
  private selectRandomCatTemplateId(): string { /* ... */
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
    this.hintAppliedToQuestionId = null;
    this.displayNextQuestion(); // Llama a build con combo 0
  }

  exit(): void {
    console.log('QuizGameplayState: exit');
    this.uiManager.clearQuizInterface(this.gameManager.getContainerElement());
    if (this.nextQuestionTimeoutId) {
        clearTimeout(this.nextQuestionTimeoutId);
        this.nextQuestionTimeoutId = null;
    }
    // Resetear visuales de combo al salir
    this.uiManager.updateComboVisuals(0);
    // Resetear fondo del body al salir
    document.body.style.backgroundColor = '#111827';
    // Resetear variables CSS globales al salir
    const root = document.documentElement;
    root.style.setProperty('--element-glow-intensity', '0');
    root.style.setProperty('--flare-intensity', '0');
    root.style.setProperty('--difficulty-glow-color', 'transparent');
    root.style.setProperty('--difficulty-glow-blur', '0px');
  }

  update(deltaTime: number): void { /* No action needed per frame */ }

  // calculateScore (SIN CAMBIOS)
  private calculateScore(difficulty: string, streakBefore: number): { totalPoints: number, basePoints: number, difficultyBonus: number, comboBonus: number } { /* ... */
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
    this.gameManager.getInkManager().gainInkOnCorrectAnswer();

    this.uiManager.updateScoreDisplay(this.gameManager.getPlayerData().score);
    this.uiManager.updateComboVisuals(this.consecutiveCorrectAnswers); // Actualizar visuales

    let feedbackMessage = `¡Correcto! +${scoreBreakdown.totalPoints} Pts`;
    let details = `(Base: ${scoreBreakdown.basePoints}, Dif: +${scoreBreakdown.difficultyBonus}`;
    const actualComboMultiplier = this.gameManager.getPlayerData().getCurrentComboMultiplier();
    if (scoreBreakdown.comboBonus > 0) { details += `, Combo x${actualComboMultiplier.toFixed(1)}: +${scoreBreakdown.comboBonus}`; }
    details += ')';
    feedbackMessage += ` ${details}`;
    this.uiManager.updateFeedback(feedbackMessage, 'correct');

    try { this.gameManager.getAudioManager().playSound('correct'); }
    catch(e) { console.error("Error sonido 'correct':", e); }

    const selectedTemplateId = this.selectRandomCatTemplateId();
    if (selectedTemplateId) {
        try {
            this.gameManager.getCatManager().addCat(selectedTemplateId);
        } catch (error) { console.error(`Error al llamar a catManager.addCat:`, error); }
    }
    this.scheduleNextQuestion(1500);
  }

  private handleIncorrectAnswer(): void {
    const playerData = this.gameManager.getPlayerData();
    let gameOver = false;
    let hintConsumedThisTurn = playerData.hintCharges > 0 && this.hintAppliedToQuestionId === this.currentQuestion?.id;

    if (playerData.hasShield) {
        playerData.hasShield = false;
        this.uiManager.updateFeedback('¡Escudo Roto!', 'shield');
        this.uiManager.updateShieldIcon(false);
        this.gameManager.getAudioManager().playSound('shield_break');
        this.gameManager.decrementLives();
         if (this.gameManager.getLives() <= 0) {
            gameOver = true;
        }
        // No se resetea el combo ni sus visuales
    } else {
        this.consecutiveCorrectAnswers = 0; // Resetear racha
        this.gameManager.decrementLives();
        this.uiManager.updateComboVisuals(this.consecutiveCorrectAnswers); // Resetear visuales
        this.uiManager.updateFeedback('Incorrecto.', 'incorrect');
        this.gameManager.getAudioManager().playSound('incorrect');
        if (this.gameManager.getLives() <= 0) {
            gameOver = true;
        }
    }

     if (hintConsumedThisTurn && !playerData.hasShield) {
        console.log("Incorrect answer ended hint effect early.");
        playerData.hintCharges = 0;
        this.uiManager.updateHintIcon(0);
     }

    if (gameOver) {
        this.uiManager.updateFeedback('¡Has perdido!', 'incorrect');
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

  // scheduleNextQuestion (SIN CAMBIOS)
  private scheduleNextQuestion(delay: number): void { /* ... */
    if (this.nextQuestionTimeoutId) clearTimeout(this.nextQuestionTimeoutId);
    if (this.gameManager.getStateMachine().getCurrentStateName() === 'QuizGameplay') {
        this.nextQuestionTimeoutId = window.setTimeout(() => {
            this.nextQuestionTimeoutId = null;
            if (this.gameManager.getStateMachine().getCurrentStateName() === 'QuizGameplay') {
                requestAnimationFrame(() => this.displayNextQuestion());
            }
        }, delay);
    }
  }

  /**
   * Obtiene la siguiente pregunta y usa UIManager para construir la interfaz.
   */
  private displayNextQuestion(): void {
    const quizSystem = this.gameManager.getQuizSystem();
    try {
        this.currentQuestion = quizSystem.selectNextQuestion();
    } catch (error) {
        console.error("Error al seleccionar pregunta:", error);
        this.gameManager.getStateMachine().changeState('Results', { finalScore: this.gameManager.getPlayerData().score });
        return;
    }

    if (!this.currentQuestion) {
      console.log("No hay más preguntas, yendo a resultados.");
      this.gameManager.getStateMachine().changeState('Results', { finalScore: this.gameManager.getPlayerData().score });
      return;
    }

    this.hintAppliedToQuestionId = null;
    const appContainer = this.gameManager.getContainerElement();
    if (!appContainer) {
        console.error("¡Error crítico! #app no encontrado.");
        return;
    }

    try {
        // *** PASAR EL COMBO ACTUAL A buildQuizInterface ***
        this.uiManager.buildQuizInterface(
            this.currentQuestion,
            appContainer,
            this.handleOptionClick.bind(this),
            this.consecutiveCorrectAnswers // Pasar combo actual
        );
        // *************************************************

        // Aplicar pista si corresponde
        if (this.gameManager.getPlayerData().hintCharges > 0 && this.currentQuestion) {
             this.uiManager.applyHintVisuals(this.currentQuestion.correctAnswerKey);
             this.hintAppliedToQuestionId = this.currentQuestion.id;
             this.gameManager.getAudioManager().playSound('hint_used');
        }

    } catch (error) {
        console.error("Error llamando a uiManager.buildQuizInterface:", error);
        appContainer.innerHTML = `<p class="text-red-500">Error fatal al construir la interfaz.</p>`;
    }
  }

  // handleOptionClick (SIN CAMBIOS)
  public handleOptionClick(selectedKey: string): void { /* ... */
    if (!this.currentQuestion || this.nextQuestionTimeoutId !== null) return;

    this.uiManager.disableOptions();

    const quizSystem = this.gameManager.getQuizSystem();
    const isCorrect = quizSystem.validateAnswer(this.currentQuestion.id, selectedKey);

    if (this.hintAppliedToQuestionId === this.currentQuestion.id) {
        const playerData = this.gameManager.getPlayerData();
        if(playerData.hintCharges > 0){
             playerData.hintCharges--;
             console.log(`Hint charge consumed by answering. Remaining: ${playerData.hintCharges}`);
             this.uiManager.updateHintIcon(playerData.hintCharges);
             if (playerData.hintCharges <= 0) {
                 console.log("Hint effect ended.");
             }
        }
    }

    if (isCorrect === true) {
        this.handleCorrectAnswer(this.currentQuestion.difficulty);
    } else if (isCorrect === false) {
        this.handleIncorrectAnswer();
    } else {
        this.uiManager.updateFeedback("Error al validar.", 'info');
        this.scheduleNextQuestion(2000);
    }
  }

  /**
   * Método público para que UIManager pueda solicitar la reconstrucción de la UI.
   */
  public rebuildInterface(): void {
      console.log("QuizGameplayState: Rebuilding interface requested by UIManager.");
      const appContainer = this.gameManager.getContainerElement();
      if (this.currentQuestion && appContainer) {
          // Reconstruir con la pregunta y combo actuales
          this.uiManager.buildQuizInterface(
              this.currentQuestion,
              appContainer,
              this.handleOptionClick.bind(this),
              this.consecutiveCorrectAnswers
          );
          // Reaplicar pista si era necesaria para esta pregunta
          if (this.hintAppliedToQuestionId === this.currentQuestion.id) {
               this.uiManager.applyHintVisuals(this.currentQuestion.correctAnswerKey);
          }
      } else {
           console.warn("QuizGameplayState: Cannot rebuild interface - missing question or container.");
      }
  }

} // Fin clase QuizGameplayState
