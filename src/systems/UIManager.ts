// src/systems/UIManager.ts

import { GameManager } from '../game/GameManager';
import { Theme } from '../types/Theme';
import { QuizGameplayState } from '../game/states/QuizGameplayState';
import { LitElement } from 'lit';

// Importar componentes Lit y tipos
import '../game/components/ui/quiz-option-button.ts';
import type { QuizOptionButton } from '../game/components/ui/quiz-option-button';
import '../game/components/ui/score-display.ts';
import type { ScoreDisplay } from '../game/components/ui/score-display';
import '../game/components/ui/lives-display.ts';
import type { LivesDisplay } from '../game/components/ui/lives-display';

// --- CORRECCIÓN AQUÍ ---
// Importar InkBar como valor para que instanceof funcione
import '../game/components/ui/ink-bar.ts'; 
import { InkBar } from '../game/components/ui/ink-bar'; // Quitar 'type'
// --- FIN CORRECCIÓN ---

import '../game/components/ui/quiz-question-display.ts';
import type { QuizQuestionDisplay } from '../game/components/ui/quiz-question-display';
import type { ComboCounter } from '../game/components/ui/combo-counter';
import '../game/components/ui/feedback-area.ts';
import type { FeedbackArea } from '../game/components/ui/feedback-area';


// Tipos locales
interface QuestionOption { key: string; text: string; }
interface Question { id: number | string; text: string; options: QuestionOption[]; correctAnswerKey: string; difficulty: string | number; explanation?: string; }

// --- CONSTANTES ---
const FLARE_START_STREAK = 1; 
const FLARE_MAX_STREAK = 10; 
const ELEMENT_GLOW_START_STREAK = 2; 
const ELEMENT_GLOW_MAX_STREAK = 10;
const BG_COLOR_START_STREAK = 1; 
const BG_COLOR_MAX_STREAK = 20;


type UIElementsMap = {
    quizWrapper: HTMLElement | null; 
    quizScrollableContent: HTMLElement | null;
    topUIContainer: HTMLElement | null; 
    statusRow: HTMLElement | null;
    livesDisplay: LivesDisplay | null;
    scoreDisplay: ScoreDisplay | null;
    inkArea: HTMLElement | null; 
    inkLabel: HTMLElement | null;
    inkBarContainer: InkBar | null; // El tipo aquí está bien, la importación era el problema
    questionBox: QuizQuestionDisplay | null;
    optionsContainer: HTMLElement | null;
    optionButtons: QuizOptionButton[];
    feedbackArea: FeedbackArea | null;
    explanationOverlay: HTMLElement | null; 
    explanationText: HTMLElement | null; 
    explanationStatusText: HTMLElement | null;
    blurBackdrop: HTMLElement | null;
    catFoodUiContainer: HTMLElement | null; 
    catFoodButton: HTMLElement | null; 
    catFoodBarContainer: HTMLElement | null; 
    catFoodBarFill: HTMLElement | null;
}

export class UIManager {
    private gameManager: GameManager;
    private currentUIElements: Partial<UIElementsMap> = {};
    private optionClickCallback: ((key: string) => void) | null = null;
    private explanationConfirmListener: ((event: MouseEvent | TouchEvent | KeyboardEvent) => void) | null = null;
    private explanationListenerAdded: boolean = false;
    private lastShownResultType: 'correct' | 'incorrect' | 'shield' | 'info' | null = null;

    constructor(gameManager: GameManager) {
        this.gameManager = gameManager;
        console.log("UIManager Creado.");
    }

    public buildQuizInterface(question: Question, containerElement: HTMLElement, onOptionClick: (key: string) => void, currentCombo: number): void {
        if (!question) { console.error("UIManager: Intento de construir UI sin pregunta."); return; }
        this.clearQuizInterface(containerElement);
        this.optionClickCallback = onOptionClick;

        const elementsMap: Partial<UIElementsMap> = { optionButtons: [] };
        const playerData = this.gameManager.getPlayerData();

        try {
            const gameContainer = document.createElement('div'); 
            gameContainer.className = 'game-container text-center quiz-wrapper'; 
            containerElement.appendChild(gameContainer); 
            elementsMap.quizWrapper = gameContainer;

            const scoreArea = document.createElement('div'); 
            scoreArea.id = 'score-area'; 
            scoreArea.className = 'top-ui-container'; 
            gameContainer.appendChild(scoreArea); 
            elementsMap.topUIContainer = scoreArea;
            
            const statusWrapper = document.createElement('div'); 
            statusWrapper.id = 'status-wrapper'; 
            statusWrapper.className = 'status-row'; 
            scoreArea.appendChild(statusWrapper); 
            elementsMap.statusRow = statusWrapper;

            const livesDisplayElement = document.createElement('lives-display') as LivesDisplay; 
            livesDisplayElement.lives = this.gameManager.getLives(); 
            livesDisplayElement.hasShield = playerData.hasShield; 
            livesDisplayElement.hintCharges = playerData.hintCharges; 
            statusWrapper.appendChild(livesDisplayElement); 
            elementsMap.livesDisplay = livesDisplayElement;

            const scoreDisplayElement = document.createElement('score-display') as ScoreDisplay; 
            scoreDisplayElement.score = playerData.score; 
            scoreDisplayElement.combo = currentCombo; 
            statusWrapper.appendChild(scoreDisplayElement); 
            elementsMap.scoreDisplay = scoreDisplayElement;
            
            const inkAreaContainer = document.createElement('div'); 
            inkAreaContainer.id = 'ink-area'; 
            inkAreaContainer.className = 'ink-area'; 
            scoreArea.appendChild(inkAreaContainer); 
            elementsMap.inkArea = inkAreaContainer;
            
            const inkLabel = document.createElement('div'); 
            inkLabel.id = 'ink-label'; 
            inkLabel.className = 'ink-label-base hidden'; 
            inkLabel.textContent = "Tinta"; 
            inkAreaContainer.appendChild(inkLabel); 
            elementsMap.inkLabel = inkLabel;
            
            const inkBarElement = document.createElement('ink-bar') as InkBar; 
            inkBarElement.currentInk = playerData.currentInk; 
            inkBarElement.maxInkPerBar = playerData.INK_BAR_CAPACITY; 
            inkBarElement.classList.add('hidden'); 
            inkAreaContainer.appendChild(inkBarElement); 
            elementsMap.inkBarContainer = inkBarElement;

            const quizContentWrapper = document.createElement('div'); 
            quizContentWrapper.className = 'quiz-content-wrapper'; 
            gameContainer.appendChild(quizContentWrapper);
            
            const quizScrollableContent = document.createElement('div'); 
            quizScrollableContent.className = 'quiz-scrollable-content'; 
            quizContentWrapper.appendChild(quizScrollableContent); 
            elementsMap.quizScrollableContent = quizScrollableContent;

            const questionDisplayElement = document.createElement('quiz-question-display') as QuizQuestionDisplay; 
            questionDisplayElement.difficulty = question.difficulty; 
            questionDisplayElement.questionText = question.text; 
            quizScrollableContent.appendChild(questionDisplayElement); 
            elementsMap.questionBox = questionDisplayElement;

            const optionsContainer = document.createElement('div'); 
            optionsContainer.id = 'options'; 
            optionsContainer.className = 'options-container-base flex flex-col gap-3 mb-3 w-full'; 
            quizScrollableContent.appendChild(optionsContainer); 
            elementsMap.optionsContainer = optionsContainer;

            question.options.forEach(option => { 
                if (!option?.key || typeof option.text === 'undefined') { return; } 
                const button = document.createElement('quiz-option-button') as QuizOptionButton; 
                button.optionKey = option.key; 
                button.optionText = option.text; 
                button.disabled = false; 
                button.hinted = false; 
                button.addEventListener('option-selected', (e) => { 
                    const event = e as CustomEvent; 
                    if (this.optionClickCallback && event.detail?.key) { 
                        this.optionClickCallback(event.detail.key); 
                    } 
                }); 
                optionsContainer.appendChild(button); 
                if (!elementsMap.optionButtons) { elementsMap.optionButtons = []; } 
                elementsMap.optionButtons.push(button); 
            });

            const feedbackAreaElement = document.createElement('feedback-area') as FeedbackArea;
            quizScrollableContent.appendChild(feedbackAreaElement);
            elementsMap.feedbackArea = feedbackAreaElement;

            elementsMap.explanationOverlay = document.getElementById('explanation-overlay');
            elementsMap.explanationText = document.getElementById('explanation-text-content');
            elementsMap.explanationStatusText = document.getElementById('explanation-status-text'); 
            elementsMap.blurBackdrop = document.getElementById('blur-backdrop');
            elementsMap.catFoodUiContainer = document.getElementById('cat-food-ui-container');
            elementsMap.catFoodButton = document.getElementById('cat-food-button'); 
            elementsMap.catFoodBarContainer = document.getElementById('cat-food-bar-container');
            elementsMap.catFoodBarFill = document.getElementById('cat-food-bar-fill');

        } catch (error) {
           console.error("Error crítico construyendo la interfaz del quiz:", error);
           containerElement.innerHTML = `<p style="color: red; text-align: center; padding: 1rem;">Error al construir la interfaz del quiz. Revisa la consola.</p>`;
           return;
        }

        this.currentUIElements = elementsMap as UIElementsMap;
        this.updateScoreDisplay(playerData.score);
        this.updateLivesDisplay(this.gameManager.getLives());
        this.updateShieldIcon(playerData.hasShield);
        this.updateHintIcon(playerData.hintCharges);
        this.updateInkBar();
        this.updateInkVisibility(playerData.isDrawingUnlocked);
        this.updateDifficultyLabel(question.difficulty); 
        this.updateComboVisuals(currentCombo);
        this.updateCatFoodBar(playerData.currentCatFood, playerData.getMaxCatFood());
        this.toggleCatFoodUIVisibility(playerData.isCatFoodUnlocked);
        this.updateFeedback('', null); 

        const activeTheme = this.gameManager.getThemeManager()?.getActiveTheme();
        this.applyThemeStylesToNonLitElements(activeTheme ? activeTheme.elements : null);
    }

    private applyThemeStylesToNonLitElements(themeElements: Partial<Theme['elements']> | null): void {
        console.log("UIManager: Aplicando/Reseteando estilos de tema a elementos no-Lit...");
        
        const oldThemeSpecificClasses = [ 
            'theme-retro', 'theme-clean', 'theme-inverted', 
            'theme-retro-card', 'theme-clean-card', 'theme-inverted-card' 
        ];

        const defaultBaseClasses: { [k in keyof UIElementsMap]?: string } = { 
            quizWrapper: 'quiz-wrapper game-container text-center', 
            topUIContainer: 'top-ui-container', 
            statusRow: 'status-row', 
            inkArea: 'ink-area', 
            inkLabel: 'ink-label-base', 
            optionsContainer: 'options-container-base'
        };

        for (const key in this.currentUIElements) {
            const mapKey = key as keyof UIElementsMap;
            const element = this.currentUIElements[mapKey];

            if (!(element instanceof HTMLElement) || (element instanceof LitElement)) {
                continue; 
            }

            const themeDef = themeElements ? themeElements[mapKey as keyof Theme['elements']] : null;

            element.classList.remove(...oldThemeSpecificClasses);
            
            const baseClassString = defaultBaseClasses[mapKey];
            if (baseClassString) {
                baseClassString.split(' ').filter(cls => cls).forEach(cls => {
                    if (!element.classList.contains(cls)) element.classList.add(cls);
                });
            }

            if (themeDef?.themeClass) {
                themeDef.themeClass.split(' ').filter(cls => cls).forEach(cls => {
                    if (!element.classList.contains(cls)) element.classList.add(cls);
                });
            }
            
            if (themeDef?.initialDisplay !== undefined) { 
                element.style.display = themeDef.initialDisplay; 
            }
            if (themeDef?.text !== undefined && element.textContent !== themeDef.text) { 
                element.textContent = themeDef.text; 
            }
        }
    }

    public clearQuizInterface(containerElement: HTMLElement): void {
        this.removeExplanationListener();
        this.clearExplanationStatus();
        this.currentUIElements = {};
        this.optionClickCallback = null;
        containerElement.innerHTML = '';
    }

    public updateComboVisuals(combo: number): void {
         const root = document.documentElement;
         const comboCounterElement = document.querySelector('combo-counter') as ComboCounter | null;
         const scoreDisplayElement = this.currentUIElements?.scoreDisplay;

         if (!root) { return; }

         const flareIntensity = combo < FLARE_START_STREAK ? 0 : Math.min((combo - FLARE_START_STREAK + 1) / (FLARE_MAX_STREAK - FLARE_START_STREAK + 1), 1);
         root.style.setProperty('--flare-intensity', flareIntensity.toFixed(3));
         
         const glowIntensity = combo < ELEMENT_GLOW_START_STREAK ? 0 : Math.min((combo - ELEMENT_GLOW_START_STREAK + 1) / (ELEMENT_GLOW_MAX_STREAK - ELEMENT_GLOW_START_STREAK + 1), 1);
         root.style.setProperty('--element-glow-intensity', glowIntensity.toFixed(3));

         if (comboCounterElement) { comboCounterElement.combo = combo; }
         if (scoreDisplayElement) { scoreDisplayElement.combo = combo; }
         
         const bgStreakRatio = Math.min(Math.max(0, combo - BG_COLOR_START_STREAK) / (BG_COLOR_MAX_STREAK - BG_COLOR_START_STREAK), 1);
         const bgIntensity = bgStreakRatio * bgStreakRatio; 

         const computedRootStyle = getComputedStyle(root);
         const baseHue = parseFloat(computedRootStyle.getPropertyValue('--gq-body-bg-combo-hue-base').trim() || '220');
         const baseSaturation = parseFloat(computedRootStyle.getPropertyValue('--gq-body-bg-combo-saturation-base').trim() || '30');
         const saturationFactor = parseFloat(computedRootStyle.getPropertyValue('--gq-body-bg-combo-saturation-factor').trim() || '50');
         const baseLightness = parseFloat(computedRootStyle.getPropertyValue('--gq-body-bg-combo-lightness-base').trim() || '10');
         const lightnessFactor = parseFloat(computedRootStyle.getPropertyValue('--gq-body-bg-combo-lightness-factor').trim() || '15');
         const comboHueIncrement = parseFloat(computedRootStyle.getPropertyValue('--gq-combo-color-hue-increment').trim() || '10'); 

         const targetHue = (baseHue + (combo * comboHueIncrement)) % 360;
         const saturation = baseSaturation + bgIntensity * saturationFactor;
         const lightness = baseLightness + bgIntensity * lightnessFactor;
         
         document.body.style.backgroundColor = `hsl(${targetHue.toFixed(0)}, ${saturation.toFixed(0)}%, ${lightness.toFixed(0)}%)`;
    }

    public updateScoreDisplay(score: number): void { const scoreDisplayElement = this.currentUIElements?.scoreDisplay; if (scoreDisplayElement) { scoreDisplayElement.score = score; } }
    public updateLivesDisplay(lives: number): void { const livesDisplayElement = this.currentUIElements?.livesDisplay; if (livesDisplayElement) { livesDisplayElement.lives = lives; } }
    public updateShieldIcon(isActive: boolean): void { const livesDisplayElement = this.currentUIElements?.livesDisplay; if (livesDisplayElement) { livesDisplayElement.hasShield = isActive; } }
    public updateHintIcon(charges: number): void { const livesDisplayElement = this.currentUIElements?.livesDisplay; if (livesDisplayElement) { livesDisplayElement.hintCharges = charges; } }
    
    public updateInkBar(): void { 
        const inkBarElement = this.currentUIElements?.inkBarContainer ?? document.querySelector('ink-bar'); 
        // --- CORRECCIÓN AQUÍ ---
        // Asegurarse que InkBar (la clase) esté disponible para instanceof
        if (inkBarElement && inkBarElement instanceof InkBar) { 
        // --- FIN CORRECCIÓN ---
            (inkBarElement as InkBar).currentInk = this.gameManager.getPlayerData().currentInk; 
        } 
    }
    
    public updateInkVisibility(isUnlocked: boolean): void { 
        const scoreArea = this.currentUIElements?.topUIContainer ?? document.getElementById('score-area'); 
        const inkLabel = this.currentUIElements?.inkLabel ?? document.getElementById('ink-label'); 
        const inkBarElement = this.currentUIElements?.inkBarContainer ?? document.querySelector('ink-bar'); 
        if (inkLabel) { inkLabel.classList.toggle('hidden', !isUnlocked); } 
        if (inkBarElement instanceof LitElement) { inkBarElement.classList.toggle('hidden', !isUnlocked); } 
        if (scoreArea) { scoreArea.classList.toggle('ink-visible', isUnlocked); } 
    }
    
    public updateDifficultyLabel(difficultyValue: string | number): void { 
        const questionDisplayElement = this.currentUIElements?.questionBox; 
        if (questionDisplayElement) { 
            questionDisplayElement.difficulty = difficultyValue; 
        } 
    }

    public updateFeedback(message: string, type: 'correct' | 'incorrect' | 'shield' | 'info' | null): void {
        const feedbackAreaElement = this.currentUIElements?.feedbackArea;
        if (feedbackAreaElement) {
            feedbackAreaElement.message = message;
            feedbackAreaElement.type = type;
        }
    }

    public disableOptions(): void { this.currentUIElements.optionButtons?.forEach(btn => { if (btn) { btn.disabled = true; } }); }
    public enableOptions(): void { this.currentUIElements.optionButtons?.forEach(btn => { if (btn) { if (!btn.hinted) { btn.disabled = false; } else { btn.disabled = true; } } }); }
    public applyHintVisuals(correctKey: string): void { 
        let incorrectOptionsHinted = 0; 
        const optionsToHint = 1; 
        const buttons = this.currentUIElements.optionButtons; 
        if (!buttons || buttons.length <= 1) return; 
        const shuffledButtons = [...buttons].sort(() => 0.5 - Math.random()); 
        shuffledButtons.forEach(btn => { 
            if (incorrectOptionsHinted >= optionsToHint) return; 
            if (btn && btn.optionKey !== correctKey && !btn.hinted) { 
                btn.hinted = true; incorrectOptionsHinted++; 
            } 
        }); 
    }

    public showExplanation( explanation: string, onConfirm: () => void, resultType?: 'correct' | 'incorrect' | 'shield' | null ): void { 
        const overlay = this.currentUIElements?.explanationOverlay ?? document.getElementById('explanation-overlay'); 
        const textElement = this.currentUIElements?.explanationText ?? document.getElementById('explanation-text-content'); 
        const backdrop = this.currentUIElements?.blurBackdrop ?? document.getElementById('blur-backdrop'); 
        const overlayContentWrapper = overlay?.querySelector('.overlay-content-wrapper') as HTMLElement | null; 
        
        this.clearExplanationStatus(); 
        
        if (overlay && textElement && backdrop && overlayContentWrapper && !this.explanationListenerAdded) { 
            textElement.textContent = explanation; 
            if (resultType) { 
                const statusElement = document.createElement('p'); 
                statusElement.id = 'explanation-status-text'; 
                let statusText = '', statusClass = '', statusIcon = ''; 
                switch (resultType) { 
                    case 'correct': statusText = "¡Respuesta Correcta!"; statusClass = 'explanation-status-correct'; statusIcon = '✅'; break; 
                    case 'incorrect': statusText = "Respuesta Incorrecta"; statusClass = 'explanation-status-incorrect'; statusIcon = '❌'; break; 
                    case 'shield': statusText = "¡Escudo Activado!"; statusClass = 'explanation-status-shield'; statusIcon = '🛡️'; break; 
                } 
                statusElement.innerHTML = `${statusIcon} ${statusText}`; 
                statusElement.classList.add('explanation-status-base', statusClass); 
                overlayContentWrapper.insertBefore(statusElement, textElement); 
                this.currentUIElements.explanationStatusText = statusElement; 
                this.lastShownResultType = resultType; 
            } 
            this.removeExplanationListener(); 
            backdrop.style.display = 'block'; 
            overlay.style.display = 'flex'; 
            requestAnimationFrame(() => { 
                backdrop.classList.add('visible'); 
                overlay.classList.add('visible'); 
            }); 
            this.explanationConfirmListener = (event: MouseEvent | TouchEvent | KeyboardEvent) => { 
                if (event.type === 'touchstart') event.preventDefault(); 
                if (this.explanationConfirmListener) { 
                    this.hideExplanation(); 
                    onConfirm(); 
                }
            }; 
            setTimeout(() => { 
                if (this.explanationConfirmListener) { 
                    overlay.addEventListener('click', this.explanationConfirmListener, { capture: true, once: true }); 
                    overlay.addEventListener('touchstart', this.explanationConfirmListener, { passive: false, capture: true, once: true }); 
                    window.addEventListener('keydown', this.explanationConfirmListener, { capture: true, once: true }); 
                    this.explanationListenerAdded = true; 
                }}, 50); 
        } else if (!overlay || !textElement || !backdrop || !overlayContentWrapper) { 
            onConfirm(); 
        } 
    }
    
    public hideExplanation(): void { 
        const overlay = this.currentUIElements?.explanationOverlay ?? document.getElementById('explanation-overlay'); 
        const backdrop = this.currentUIElements?.blurBackdrop ?? document.getElementById('blur-backdrop'); 
        this.removeExplanationListener(); 
        this.clearExplanationStatus(); 
        if (overlay && backdrop) { 
            overlay.classList.remove('visible'); 
            const shopPopup = document.getElementById('shop-popup'); 
            if (!shopPopup || !shopPopup.hasAttribute('visible')) { 
                backdrop.classList.remove('visible'); 
            } 
            const onTransitionEnd = (event?: TransitionEvent) => { 
                if (event && (event.target !== overlay || event.propertyName !== 'opacity')) return; 
                if (overlay) overlay.style.display = 'none'; 
                if (!shopPopup || !shopPopup.hasAttribute('visible')) { 
                    if (backdrop) backdrop.style.display = 'none'; 
                } 
                if (overlay) overlay.removeEventListener('transitionend', onTransitionEnd); 
            }; 
            overlay.addEventListener('transitionend', onTransitionEnd); 
            setTimeout(() => { 
                if (overlay?.classList.contains('visible')) onTransitionEnd(); 
            }, 450); 
        } 
    }
    
    private removeExplanationListener(): void { 
        const overlay = this.currentUIElements?.explanationOverlay ?? document.getElementById('explanation-overlay'); 
        if (this.explanationConfirmListener) { 
            if (overlay) { 
                overlay.removeEventListener('click', this.explanationConfirmListener, { capture: true }); 
                overlay.removeEventListener('touchstart', this.explanationConfirmListener, { capture: true }); 
            } 
            window.removeEventListener('keydown', this.explanationConfirmListener, { capture: true }); 
            this.explanationConfirmListener = null; 
            this.explanationListenerAdded = false; 
        } 
    }
    
    private clearExplanationStatus(): void { 
        const statusElement = this.currentUIElements?.explanationStatusText ?? document.getElementById('explanation-status-text'); 
        if (statusElement && statusElement.parentNode) { 
            statusElement.parentNode.removeChild(statusElement); 
        } 
        if (this.currentUIElements) { 
            this.currentUIElements.explanationStatusText = null; 
        } 
        this.lastShownResultType = null; 
    }

     private toggleCatFoodUIVisibility(show: boolean): void { 
        const container = this.currentUIElements?.catFoodUiContainer ?? document.getElementById('cat-food-ui-container'); 
        if (container) { 
            container.classList.toggle('hidden', !show); 
        } 
    }
    
     public showCatFoodUI(): void { 
        this.toggleCatFoodUIVisibility(true); 
        if (!this.currentUIElements.catFoodButton) { 
            this.currentUIElements.catFoodButton = document.getElementById('cat-food-button'); 
        } 
    }
    
     public updateCatFoodBar(currentAmount: number, maxAmount: number): void { 
        const fillElement = this.currentUIElements?.catFoodBarFill ?? document.getElementById('cat-food-bar-fill') as HTMLElement | null; 
        if (fillElement) { 
            const percentage = maxAmount > 0 ? Math.max(0, Math.min(100, (currentAmount / maxAmount) * 100)) : 0; 
            fillElement.style.width = `${percentage}%`; 
        } 
    }

     public rebuildInterface(): void { 
        const currentState = this.gameManager.getCurrentState(); 
        if (currentState instanceof QuizGameplayState && currentState.currentQuestion) { 
            const appContainer = this.gameManager.getContainerElement(); 
            if (appContainer) { 
                this.buildQuizInterface( 
                    currentState.currentQuestion, 
                    appContainer, 
                    currentState.handleOptionClick.bind(currentState), 
                    currentState.consecutiveCorrectAnswers 
                ); 
                const hintWasApplied = (currentState as any).hintAppliedToQuestionId === currentState.currentQuestion.id; 
                if (hintWasApplied && this.gameManager.getPlayerData().hintCharges > 0) { 
                    this.applyHintVisuals(currentState.currentQuestion.correctAnswerKey); 
                } 
            } 
        } 
    }
}
