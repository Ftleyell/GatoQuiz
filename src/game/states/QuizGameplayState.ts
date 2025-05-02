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

  private readonly BASE_POINTS_PER_CORRECT = 15; // <-- Valor ajustado
  private readonly DIFFICULTY_BONUS: { [key: string]: number } = {
      "easy": 10,
      "1": 10,
      "2": 20,
      "medium": 30,
      "3": 30,
      "hard": 45,
      "4": 45,
      "5": 65
  }; // <-- Valores ajustados

  private readonly FADE_DURATION = 500;

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

    this.uiManager.updateComboVisuals(0);
    document.body.style.backgroundColor = '#111827';
    const root = document.documentElement;
    root.style.setProperty('--element-glow-intensity', '0');
    root.style.setProperty('--flare-intensity', '0');
    root.style.setProperty('--difficulty-glow-color', 'transparent');
    root.style.setProperty('--difficulty-glow-blur', '0px');

    this.isWaitingForExplanationConfirm = false;
    this.hintAppliedToQuestionId = null;
    this.currentQuestion = null;

  }

  update(deltaTime: number): void { /* No action needed per frame */ }

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
    const scoreBreakdown = this.calculateScore(difficulty, this.consecutiveCorrectAnswers);
    this.consecutiveCorrectAnswers++;
    this.gameManager.getPlayerData().score += scoreBreakdown.totalPoints;
    this.gameManager.getInkManager().gainInkOnCorrectAnswer();

    this.uiManager.updateScoreDisplay(this.gameManager.getPlayerData().score);
    this.uiManager.updateComboVisuals(this.consecutiveCorrectAnswers);
    this.uiManager.updateInkBar();

    let feedbackMessage = `¡Correcto! +${scoreBreakdown.totalPoints} Pts`;
    let details = `(Base: ${scoreBreakdown.basePoints}, Dif: +${scoreBreakdown.difficultyBonus}`;
    const actualComboMultiplier = this.gameManager.getPlayerData().getCurrentComboMultiplier();
    if (scoreBreakdown.comboBonus > 0) { details += `, Combo x${actualComboMultiplier.toFixed(1)}: +${scoreBreakdown.comboBonus}`; }
    details += ')';
    feedbackMessage += ` ${details}`;
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

    this.proceedToNextStep();
  }

  private handleIncorrectAnswer(): void {
    const playerData = this.gameManager.getPlayerData();
    let gameOver = false;
    const hintWasActiveForThisQuestion = this.hintAppliedToQuestionId === this.currentQuestion?.id;
    let shieldSaved = false;

    if (playerData.hasShield) {
        shieldSaved = true;
        playerData.hasShield = false;
        this.uiManager.updateFeedback('¡Escudo Roto!', 'shield');
        this.uiManager.updateShieldIcon(false);
        this.gameManager.getAudioManager().playSound('shield_break');
    } else {
        this.consecutiveCorrectAnswers = 0;
        this.gameManager.decrementLives();
        this.uiManager.updateComboVisuals(this.consecutiveCorrectAnswers);
        this.uiManager.updateFeedback('Incorrecto.', 'incorrect');
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
        this.uiManager.updateFeedback('¡Has perdido!', 'incorrect');
        if (this.nextQuestionTimeoutId) { clearTimeout(this.nextQuestionTimeoutId); this.nextQuestionTimeoutId = null; }
        setTimeout(() => {
            if (this.gameManager.getStateMachine().getCurrentStateName() === 'QuizGameplay') {
                this.gameManager.getStateMachine().changeState('GameOver', { finalScore: playerData.score });
            }
        }, 1500);
    } else {
        this.proceedToNextStep();
    }
  }

  private proceedToNextStep(): void {
      const explanation = this.currentQuestion?.explanation;
      if (explanation && !this.isWaitingForExplanationConfirm) {
          this.isWaitingForExplanationConfirm = true;
          this.uiManager.showExplanation(explanation, () => {
              this.isWaitingForExplanationConfirm = false;
              this.scheduleNextQuestion(500);
          });
      } else if (!this.isWaitingForExplanationConfirm) {
          this.scheduleNextQuestion(1500);
      }
  }

  private scheduleNextQuestion(delay: number): void {
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
        return;
    }

    this.hintAppliedToQuestionId = null;

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

        if (this.gameManager.getPlayerData().hintCharges > 0 && this.currentQuestion) {
             this.uiManager.applyHintVisuals(this.currentQuestion.correctAnswerKey);
             this.hintAppliedToQuestionId = this.currentQuestion.id;
        }

    } catch (error) {
        console.error("Error construyendo la interfaz del quiz:", error);
        this.uiManager.updateFeedback("Error al mostrar la pregunta.", 'info');
    }
  }

  public handleOptionClick(selectedKey: string): void {
    if (this.isWaitingForExplanationConfirm) return;
    if (!this.currentQuestion || this.nextQuestionTimeoutId !== null) return;

    this.uiManager.disableOptions();

    const quizSystem = this.gameManager.getQuizSystem();
    const isCorrect = quizSystem.validateAnswer(this.currentQuestion.id, selectedKey);
    const playerData = this.gameManager.getPlayerData();

    if (this.hintAppliedToQuestionId === this.currentQuestion.id) {
        if (playerData.hintCharges > 0) {
            playerData.hintCharges--;
            this.uiManager.updateHintIcon(playerData.hintCharges);
        }
         this.hintAppliedToQuestionId = null;
    }

    if (isCorrect === true) {
        this.handleCorrectAnswer(this.currentQuestion.difficulty);
    } else if (isCorrect === false) {
        this.handleIncorrectAnswer();
    } else {
        this.uiManager.updateFeedback("Error al validar la respuesta.", 'info');
        this.hintAppliedToQuestionId = null;
        this.proceedToNextStep();
    }
  }

  public rebuildInterface(): void {
      const appContainer = this.gameManager.getContainerElement();
      if (this.currentQuestion && appContainer) {
          this.uiManager.buildQuizInterface(
              this.currentQuestion,
              appContainer,
              this.handleOptionClick.bind(this),
              this.consecutiveCorrectAnswers
          );
          if (this.hintAppliedToQuestionId === this.currentQuestion.id) {
               this.uiManager.applyHintVisuals(this.currentQuestion.correctAnswerKey);
          }
      } else {
          console.warn("QuizGameplayState: No se puede reconstruir, falta pregunta actual o contenedor.");
      }
  }

}