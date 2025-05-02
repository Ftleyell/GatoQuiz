// src/systems/UIManager.ts

import { GameManager } from '../game/GameManager';
// import { Theme, ThemeElementDefinition } from '../types/Theme'; // Descomentar si usas ThemeManager
import { QuizGameplayState } from '../game/states/QuizGameplayState';

// Tipos locales
interface QuestionOption { key: string; text: string; }
interface Question { id: number | string; text: string; options: QuestionOption[]; correctAnswerKey: string; difficulty: string | number; explanation?: string; } // Difficulty puede ser string o number

// --- CONSTANTES PARA EFECTOS VISUALES (Ajustadas según GDD ALPHA DEV) ---
const FLARE_START_STREAK = 1;
const FLARE_MAX_STREAK = 10;
const ELEMENT_GLOW_START_STREAK = 2;
const ELEMENT_GLOW_MAX_STREAK = 10;
const BG_COLOR_START_STREAK = 1;
const BG_COLOR_MAX_STREAK = 20;
const COMBO_BASE_FONT_SIZE_REM = 3.0;
const COMBO_FONT_INCREMENT_REM = 0.5;
const COMBO_HUE_INCREMENT = 35;
// --- FIN CONSTANTES ---

// Mapeo de dificultad (Ajustado según GDD ALPHA DEV)
const DIFFICULTY_LEVELS_CONFIG: { [key: number | string]: { name: string; class: string; glowColor?: string; glowBlur?: string; pulse?: boolean } } = {
    1: { name: "COMÚN", class: "difficulty-1" },
    2: { name: "POCO COMÚN", class: "difficulty-2" },
    3: { name: "RARA", class: "difficulty-3" },
    4: { name: "ÉPICA", class: "difficulty-4", glowColor: "rgba(167, 139, 250, 0.7)", glowBlur: "8px" },
    5: { name: "LEGENDARIA", class: "difficulty-5", glowColor: "rgba(245, 158, 11, 0.7)", glowBlur: "10px", pulse: true },
    "easy":   { name: "FÁCIL", class: "difficulty-2", glowColor: "rgba(52, 211, 153, 0.6)", glowBlur: "6px" },
    "medium": { name: "MEDIO", class: "difficulty-3", glowColor: "rgba(96, 165, 250, 0.7)", glowBlur: "8px" },
    "hard":   { name: "DIFÍCIL", class: "difficulty-4", glowColor: "rgba(248, 113, 113, 0.7)", glowBlur: "10px", pulse: true },
};


// Mapa de elementos UI (Tipado interno)
type UIElementsMap = {
    [key: string]: HTMLElement | null | HTMLButtonElement[];
    quizWrapper: HTMLElement | null;
    quizContentContainer: HTMLElement | null;
    topUIContainer: HTMLElement | null; // #score-area
    statusRow: HTMLElement | null;      // #status-wrapper
    livesDisplay: HTMLElement | null;   // #lives-container
    livesDisplayCount: HTMLElement | null; // #lives-count
    shieldIcon: HTMLElement | null;
    hintIcon: HTMLElement | null;
    scoreDisplay: HTMLElement | null;   // #score-display-wrapper
    scoreDisplayText: HTMLElement | null; // #score
    scorePulse: HTMLElement | null;
    inkArea: HTMLElement | null;
    inkLabel: HTMLElement | null;
    inkBarContainer: HTMLElement | null;
    inkBarFill: HTMLElement | null;
    comboDisplay: HTMLElement | null;
    questionBox: HTMLElement | null;
    questionBoxContent: HTMLElement | null;
    questionBoxBackdrop: HTMLElement | null;
    difficultyLabel: HTMLElement | null;
    questionText: HTMLElement | null;
    optionsContainer: HTMLElement | null;
    optionButtons: HTMLButtonElement[];
    feedbackArea: HTMLElement | null;
    explanationOverlay: HTMLElement | null;
    explanationText: HTMLElement | null;
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
    private optionListeners: Map<HTMLButtonElement, () => void> = new Map();
    private explanationConfirmListener: ((event: MouseEvent | KeyboardEvent) => void) | null = null;

    constructor(gameManager: GameManager) {
        this.gameManager = gameManager;
        console.log("UIManager Creado.");
    }

    /**
     * Construye la interfaz principal del quiz (estilo GDD Alpha).
     */
    public buildQuizInterface(question: Question, containerElement: HTMLElement, onOptionClick: (key: string) => void, currentCombo: number): void {
         if (!question) {
             console.error("UIManager: No se proporcionó pregunta para construir la interfaz.");
             containerElement.innerHTML = `<p class="text-red-500">Error: No hay pregunta para mostrar.</p>`;
             return;
         }
        console.log(`UIManager: Construyendo interfaz para pregunta ID ${question.id} (estilo GDD Alpha)`);
        this.clearQuizInterface(containerElement);
        this.optionClickCallback = onOptionClick;

        const elementsMap: Partial<UIElementsMap> = { optionButtons: [] };

        try {
            // Contenedor Principal del Juego
            const gameContainer = document.createElement('div');
            gameContainer.className = 'game-container text-center quiz-wrapper'; // Clases base GDD Alpha
            containerElement.appendChild(gameContainer);
            elementsMap.quizWrapper = gameContainer;

            // Contenedor interno
            const contentContainer = document.createElement('div');
            contentContainer.className = 'quiz-content-container';
            gameContainer.appendChild(contentContainer);
            elementsMap.quizContentContainer = contentContainer;

            // --- Área Superior ---
            const scoreArea = document.createElement('div');
            scoreArea.id = 'score-area'; // ID GDD Alpha
            // Clases base GDD Alpha (Tailwind-like)
            scoreArea.className = 'top-ui-container flex flex-col items-center w-full mb-4 gap-1';
            contentContainer.appendChild(scoreArea);
            elementsMap.topUIContainer = scoreArea;

            const statusWrapper = document.createElement('div');
            statusWrapper.id = 'status-wrapper'; // ID GDD Alpha
            // ** AJUSTE CORREGIDO: Clases para centrar como en GDD Alpha **
            statusWrapper.className = 'status-row flex justify-center items-center w-auto gap-6 mb-1'; // justify-center y gap-6 (o similar)
            scoreArea.appendChild(statusWrapper);
            elementsMap.statusRow = statusWrapper;
            
            // Vidas
            const livesContainer = document.createElement('div');
            livesContainer.id = 'lives-container';
            livesContainer.className = 'quiz-lives flex items-center gap-1.5 text-lg'; // Clases base
            const heartIcon = document.createElement('span'); heartIcon.className = 'life-emoji'; heartIcon.textContent = '❤️';
            const livesCountSpan = document.createElement('span'); livesCountSpan.id = 'lives-count'; livesCountSpan.textContent = '0';
            const shieldIcon = document.createElement('span'); shieldIcon.id = 'shield-icon'; shieldIcon.textContent = '🛡️'; shieldIcon.style.display = 'none';
            const hintIcon = document.createElement('span'); hintIcon.id = 'hint-icon'; hintIcon.textContent = '💡'; hintIcon.style.display = 'none';
            livesContainer.append(heartIcon, livesCountSpan, shieldIcon, hintIcon);
            statusWrapper.appendChild(livesContainer);
            elementsMap.livesDisplay = livesContainer;
            elementsMap.livesDisplayCount = livesCountSpan;
            elementsMap.shieldIcon = shieldIcon;
            elementsMap.hintIcon = hintIcon;

            // Score
            const scoreDisplayWrapper = document.createElement('div');
            scoreDisplayWrapper.id = 'score-display-wrapper';
            scoreDisplayWrapper.className = 'quiz-score relative flex items-center'; // Clases base
            const scoreEmoji = document.createElement('span'); scoreEmoji.className = 'score-emoji'; scoreEmoji.textContent = '⭐';
            const scoreSpan = document.createElement('span'); scoreSpan.id = 'score'; scoreSpan.textContent = '0';
            const scorePulse = document.createElement('div'); scorePulse.id = 'score-pulse';
            scoreDisplayWrapper.append(scoreEmoji, scoreSpan, scorePulse);
            statusWrapper.appendChild(scoreDisplayWrapper);
            elementsMap.scoreDisplay = scoreDisplayWrapper;
            elementsMap.scoreDisplayText = scoreSpan;
            elementsMap.scorePulse = scorePulse;

            // --- Área de Tinta ---
            const inkAreaContainer = document.createElement('div');
            inkAreaContainer.id = 'ink-area';
            inkAreaContainer.className = 'ink-area flex flex-col items-center mt-1'; // Clases base
            scoreArea.appendChild(inkAreaContainer);
            elementsMap.inkArea = inkAreaContainer;

            const inkLabel = document.createElement('div'); inkLabel.id = 'ink-label';
            inkLabel.className = 'ink-label-base'; // Clase base CSS
            inkLabel.textContent = "Tinta";
            inkLabel.classList.add('hidden'); // ** Oculto inicialmente **
            inkAreaContainer.appendChild(inkLabel);
            elementsMap.inkLabel = inkLabel;

            const inkBarContainer = document.createElement('div'); inkBarContainer.id = 'ink-bar-container';
            inkBarContainer.className = 'ink-bar-container-base'; // Clase base CSS
            inkBarContainer.classList.add('hidden'); // ** Oculto inicialmente **
            inkAreaContainer.appendChild(inkBarContainer);
            elementsMap.inkBarContainer = inkBarContainer;

            const inkBarFill = document.createElement('div'); inkBarFill.id = 'ink-bar-fill';
            inkBarFill.className = 'ink-bar-fill-base'; // Clase base CSS
            inkBarFill.style.width = '0%';
            inkBarContainer.appendChild(inkBarFill);
            elementsMap.inkBarFill = inkBarFill;

            // --- Contador de Combo ---
            const comboCounter = document.createElement('span');
            comboCounter.id = 'combo-counter';
            comboCounter.className = 'combo-counter-base'; // Clase base CSS
            comboCounter.style.display = 'none';
            document.body.appendChild(comboCounter);
            elementsMap.comboDisplay = comboCounter;

            // --- Caja de Pregunta ---
            const questionBox = document.createElement('div');
            questionBox.id = 'question-box';
            questionBox.className = 'question-box-base card mb-4 w-full'; // Clases base GDD Alpha
            contentContainer.appendChild(questionBox);
            elementsMap.questionBox = questionBox;

            const qBoxContent = document.createElement('div');
            // ** AJUSTE: Asegurar que el contenido interno también use flex para centrar **
            qBoxContent.className = 'card__content flex flex-col items-center gap-2'; // Clases para centrar contenido
            questionBox.appendChild(qBoxContent);
            elementsMap.questionBoxContent = qBoxContent;

            // Etiqueta de Dificultad
            const difficultyLabel = document.createElement('span');
            difficultyLabel.id = 'difficulty-label';
            difficultyLabel.className = 'difficulty-label-base'; // Clase base CSS
            qBoxContent.appendChild(difficultyLabel);
            elementsMap.difficultyLabel = difficultyLabel;

            // Texto de la Pregunta
            const qText = document.createElement('p');
            qText.id = 'question';
            qText.className = 'question-text-base'; // Clase base CSS
            qText.textContent = question.text;
            qBoxContent.appendChild(qText);
            elementsMap.questionText = qText;

            // Backdrop para efecto glow
            const qBoxBackdrop = document.createElement('div');
            qBoxBackdrop.className = 'card__backdrop';
            questionBox.insertBefore(qBoxBackdrop, qBoxContent);
            elementsMap.questionBoxBackdrop = qBoxBackdrop;

            // --- Contenedor de Opciones ---
            const optionsContainer = document.createElement('div');
            optionsContainer.id = 'options';
            optionsContainer.className = 'options-container-base flex flex-col gap-3 mb-3 w-full'; // Clases base GDD Alpha
            contentContainer.appendChild(optionsContainer);
            elementsMap.optionsContainer = optionsContainer;

            // Botones de Opción
            question.options.forEach(option => {
                 if (!option?.key || typeof option.text === 'undefined') {
                     console.warn("Opción inválida encontrada:", option); return;
                 }
                 const button = document.createElement('button');
                 button.className = 'option-button'; // Clase base GDD Alpha
                 button.dataset.key = option.key;
                 button.textContent = option.text;
                 const listener = () => { if (this.optionClickCallback) { this.optionClickCallback(option.key); } };
                 this.optionListeners.set(button, listener);
                 button.addEventListener('click', listener);
                 optionsContainer.appendChild(button);
                 elementsMap.optionButtons?.push(button);
            });

            // --- Área de Feedback ---
            const feedbackArea = document.createElement('div');
            feedbackArea.id = 'feedback';
            feedbackArea.className = 'feedback-area-base mt-4 text-lg h-8'; // Clases base GDD Alpha
            contentContainer.appendChild(feedbackArea);
            elementsMap.feedbackArea = feedbackArea;

            // --- Guardar referencias a Overlays y Comida ---
            elementsMap.explanationOverlay = document.getElementById('explanation-overlay');
            elementsMap.explanationText = document.getElementById('explanation-text-content');
            elementsMap.blurBackdrop = document.getElementById('blur-backdrop');
            elementsMap.catFoodUiContainer = document.getElementById('cat-food-ui-container');
            elementsMap.catFoodButton = document.getElementById('cat-food-button');
            elementsMap.catFoodBarContainer = document.getElementById('cat-food-bar-container');
            elementsMap.catFoodBarFill = document.getElementById('cat-food-bar-fill');

        } catch (error) {
            console.error("UIManager: Error fatal creando elementos de la interfaz:", error);
            this.clearQuizInterface(containerElement);
            containerElement.innerHTML = `<p class="text-red-500">Error al construir la interfaz del quiz. Revisa la consola.</p>`;
            return;
        }

        // --- Actualizaciones Iniciales de Estado ---
        this.currentUIElements = elementsMap as UIElementsMap;
        this.updateScoreDisplay(this.gameManager.getPlayerData().score);
        this.updateLivesDisplay(this.gameManager.getLives());
        this.updateShieldIcon(this.gameManager.getPlayerData().hasShield);
        this.updateHintIcon(this.gameManager.getPlayerData().hintCharges);
        this.updateInkBar(); // Actualiza % de llenado
        // ** LLAMADA CLAVE: Actualiza visibilidad inicial de tinta y tamaño de #score-area **
        this.updateInkVisibility(this.gameManager.getPlayerData().isDrawingUnlocked);
        this.updateDifficultyLabel(question.difficulty);
        this.updateComboVisuals(currentCombo);
        this.updateCatFoodBar(this.gameManager.getPlayerData().currentCatFood, this.gameManager.getPlayerData().getMaxCatFood());
        this.toggleCatFoodUIVisibility(this.gameManager.getPlayerData().isCatFoodUnlocked);
    }

    /**
     * Limpia la interfaz del quiz, removiendo elementos y listeners.
     */
    public clearQuizInterface(containerElement: HTMLElement): void {
        // Remover listeners de los botones de opción
        this.optionListeners.forEach((listener, button) => {
            if (button && button.isConnected) {
                 button.removeEventListener('click', listener);
            }
        });
        this.optionListeners.clear();

        // Remover el contador de combo del body si existe
        const comboCounter = document.getElementById('combo-counter');
        if (comboCounter && comboCounter.parentNode) {
            comboCounter.parentNode.removeChild(comboCounter);
        }

        this.removeExplanationListener();

        // Limpiar referencias internas
        this.currentUIElements = {};
        this.optionClickCallback = null;

        // Limpiar el contenedor principal de la app
        containerElement.innerHTML = '';
    }

    /**
     * Aplica una lista de clases CSS a un elemento.
     */
    private applyClasses(element: HTMLElement | null, classes: string | undefined): void {
        if (!element || !classes) return;
        classes.split(' ').forEach(cls => {
            if (cls) {
                 element.classList.add(cls);
            }
        });
    }

    // --- Métodos para Explicación (sin cambios) ---
    public showExplanation(explanation: string, onConfirm: () => void): void {
        const overlay = this.currentUIElements?.explanationOverlay ?? document.getElementById('explanation-overlay');
        const textElement = this.currentUIElements?.explanationText ?? document.getElementById('explanation-text-content');
        const backdrop = this.currentUIElements?.blurBackdrop ?? document.getElementById('blur-backdrop');

        if (overlay && textElement && backdrop) {
            textElement.textContent = explanation;
            this.removeExplanationListener();
            backdrop.style.display = 'block';
            overlay.style.display = 'flex';
            void overlay.offsetHeight; void backdrop.offsetHeight;
            backdrop.classList.add('visible');
            overlay.classList.add('visible');

            this.explanationConfirmListener = (event: MouseEvent | KeyboardEvent) => {
                if (this.explanationConfirmListener) {
                    this.hideExplanation();
                    onConfirm();
                }
            };

            setTimeout(() => {
                if (this.explanationConfirmListener) {
                    overlay.addEventListener('click', this.explanationConfirmListener, { capture: true, once: true });
                    window.addEventListener('keydown', this.explanationConfirmListener, { capture: true, once: true });
                }
            }, 0);
        } else {
            console.error("UIManager: Elementos del overlay de explicación no encontrados.");
            onConfirm();
        }
    }
    public hideExplanation(): void {
        const overlay = this.currentUIElements?.explanationOverlay ?? document.getElementById('explanation-overlay');
        const backdrop = this.currentUIElements?.blurBackdrop ?? document.getElementById('blur-backdrop');
        this.removeExplanationListener();
        if (overlay && backdrop) {
            overlay.classList.remove('visible');
            const shopPopup = document.getElementById('shop-popup');
            if (!shopPopup || !shopPopup.classList.contains('visible')) {
                 backdrop.classList.remove('visible');
            }
            const transitionDuration = 400;
            const hideElements = (event?: TransitionEvent) => {
                if (event && (event.target !== overlay || event.propertyName !== 'opacity')) return;
                if (overlay) overlay.style.display = 'none';
                 if (!shopPopup || !shopPopup.classList.contains('visible')) { if (backdrop) backdrop.style.display = 'none'; }
                if (overlay) overlay.removeEventListener('transitionend', hideElements);
            };
            overlay.addEventListener('transitionend', hideElements);
            setTimeout(() => { if (overlay.classList.contains('visible')) { hideElements(); } }, transitionDuration + 50);
        }
     }
    private removeExplanationListener(): void {
        const overlay = this.currentUIElements?.explanationOverlay ?? document.getElementById('explanation-overlay');
        if (this.explanationConfirmListener) {
            if (overlay) { overlay.removeEventListener('click', this.explanationConfirmListener, { capture: true }); }
            window.removeEventListener('keydown', this.explanationConfirmListener, { capture: true });
            this.explanationConfirmListener = null;
        }
     }

    // --- Métodos de Actualización de Estado Simple ---
    public updateScoreDisplay(score: number): void {
        const scoreTextElement = this.currentUIElements?.scoreDisplayText;
        if (scoreTextElement) {
             scoreTextElement.textContent = score.toString();
        }
        const pulseElement = this.currentUIElements?.scorePulse;
        if (pulseElement) {
             pulseElement.classList.remove('pulsing');
             void pulseElement.offsetWidth;
             pulseElement.classList.add('pulsing');
        }
    }
    public updateLivesDisplay(lives: number): void {
        const livesCountElement = this.currentUIElements?.livesDisplayCount;
        if (livesCountElement) {
            livesCountElement.textContent = lives.toString();
        }
    }
    public updateShieldIcon(isActive: boolean): void {
        const shieldIconElement = this.currentUIElements?.shieldIcon;
        if (shieldIconElement) {
            shieldIconElement.style.display = isActive ? 'inline' : 'none';
        }
    }
    public updateHintIcon(charges: number): void {
        const hintIconElement = this.currentUIElements?.hintIcon;
        if (hintIconElement) {
            hintIconElement.style.display = charges > 0 ? 'inline' : 'none';
        }
    }
    /** Muestra un mensaje de feedback (correcto, incorrecto, etc.). */
    public updateFeedback(message: string, type: 'correct' | 'incorrect' | 'shield' | 'info'): void {
        const feedbackAreaElement = this.currentUIElements?.feedbackArea;
        if (feedbackAreaElement) {
            feedbackAreaElement.textContent = message;
            // Aplicar clases base y de color (Alineado con GDD Alpha)
            feedbackAreaElement.className = 'feedback-area-base mt-4 h-8 text-center font-bold'; // Clases base
            const colorClass = type === 'correct' ? 'text-green-400' : // GDD Alpha usa verde
                               type === 'incorrect' ? 'text-red-400' :   // GDD Alpha usa rojo
                               type === 'shield' ? 'text-blue-400' :    // GDD Alpha usa azul
                               'text-gray-400'; // 'info' o default
             feedbackAreaElement.classList.add(...colorClass.split(' '));
        }
    }

    /** Actualiza el porcentaje de llenado de la barra de tinta. */
    public updateInkBar(): void {
        const fillElement = this.currentUIElements?.inkBarFill as HTMLElement | null;
        if (fillElement) {
            const playerData = this.gameManager.getPlayerData();
            const maxInk = playerData.getMaxInk();
            const currentInk = playerData.currentInk;
            const percentage = maxInk > 0 ? Math.max(0, Math.min(100, (currentInk / maxInk) * 100)) : 0;
            fillElement.style.width = `${percentage}%`;
        }
        // ** AJUSTE: No llamar a updateInkVisibility aquí para evitar bucles **
        // La visibilidad se actualiza en buildQuizInterface y cuando se llama explícitamente
    }

    /** ** NUEVO: Controla la visibilidad de la UI de tinta y ajusta el contenedor padre ** */
    public updateInkVisibility(isUnlocked: boolean): void {
        const scoreArea = this.currentUIElements?.topUIContainer;
        const inkLabel = this.currentUIElements?.inkLabel;
        const inkBarContainer = this.currentUIElements?.inkBarContainer;

        // Actualizar visibilidad de la etiqueta y la barra
        if (inkLabel) {
            inkLabel.classList.toggle('hidden', !isUnlocked);
        }
        if (inkBarContainer) {
            inkBarContainer.classList.toggle('hidden', !isUnlocked);
        }

        // Actualizar clase en el contenedor padre para el ajuste de tamaño CSS
        if (scoreArea) {
            scoreArea.classList.toggle('ink-visible', isUnlocked);
            console.log(`UIManager: Clase 'ink-visible' en #score-area: ${isUnlocked}`); // Log para verificar
        }
    }


    /** Actualiza la etiqueta de dificultad (texto, clase, efectos visuales). */
    public updateDifficultyLabel(difficultyValue: string | number): void {
        const labelElement = this.currentUIElements?.difficultyLabel;
        if (!labelElement) return;

        let config = DIFFICULTY_LEVELS_CONFIG[Number(difficultyValue)]
                  || DIFFICULTY_LEVELS_CONFIG[difficultyValue]
                  || DIFFICULTY_LEVELS_CONFIG[1];

        labelElement.textContent = `Pregunta: ${config.name}`; // Texto GDD Alpha
        Object.values(DIFFICULTY_LEVELS_CONFIG).forEach(c => {
            if (c.class) labelElement.classList.remove(c.class);
        });
        if (config.class) labelElement.classList.add(config.class);

        const root = document.documentElement;
        root.style.setProperty('--difficulty-glow-color', config.glowColor || 'transparent');
        root.style.setProperty('--difficulty-glow-blur', config.glowBlur || '0px');

        labelElement.classList.toggle('difficulty-pulse', !!config.pulse);
    }


    /** Actualiza los efectos visuales basados en la racha actual (Replicando GDD ALPHA DEV). */
    public updateComboVisuals(combo: number): void {
        const root = document.documentElement;
        const comboDisplay = this.currentUIElements?.comboDisplay as HTMLElement | null;
        const scoreText = this.currentUIElements?.scoreDisplayText;

        if (!root) { console.error("[updateComboVisuals] Error: document.documentElement no encontrado."); return; }

        // Intensidad del Flare del Score
        const flareIntensity = combo < FLARE_START_STREAK ? 0 : Math.min((combo - FLARE_START_STREAK + 1) / (FLARE_MAX_STREAK - FLARE_START_STREAK + 1), 1);
        root.style.setProperty('--flare-intensity', flareIntensity.toFixed(3));

        // Intensidad del Glow de Elementos
        const glowIntensity = combo < ELEMENT_GLOW_START_STREAK ? 0 : Math.min((combo - ELEMENT_GLOW_START_STREAK + 1) / (ELEMENT_GLOW_MAX_STREAK - ELEMENT_GLOW_START_STREAK + 1), 1);
        root.style.setProperty('--element-glow-intensity', glowIntensity.toFixed(3));

        // Contador de Combo
        if (comboDisplay) {
            if (combo > 0) {
                const sizeIncrease = Math.min(Math.max(0, combo - 1), 10);
                const newFontSizeRem = COMBO_BASE_FONT_SIZE_REM + sizeIncrease * COMBO_FONT_INCREMENT_REM;
                root.style.setProperty('--combo-font-size', `${newFontSizeRem.toFixed(2)}rem`);
                comboDisplay.textContent = `x${combo}`;
                comboDisplay.style.display = 'block';
                const comboHue = (combo * COMBO_HUE_INCREMENT) % 360;
                comboDisplay.style.color = `hsl(${comboHue}, 100%, 65%)`;
                comboDisplay.style.backgroundImage = 'none';
                comboDisplay.style.backgroundClip = 'unset';
                comboDisplay.style.webkitBackgroundClip = 'unset';
            } else {
                comboDisplay.textContent = '';
                comboDisplay.style.display = 'none';
                root.style.setProperty('--combo-font-size', `${COMBO_BASE_FONT_SIZE_REM}rem`);
                comboDisplay.style.color = 'inherit';
                comboDisplay.style.backgroundImage = 'none';
                comboDisplay.style.backgroundClip = 'unset';
                comboDisplay.style.webkitBackgroundClip = 'unset';
            }
        }

        // Cambio de Color de Fondo del Body
        const bgStreakRatio = Math.min(Math.max(0, combo - BG_COLOR_START_STREAK) / (BG_COLOR_MAX_STREAK - BG_COLOR_START_STREAK), 1);
        const bgIntensity = bgStreakRatio * bgStreakRatio;
        const baseHue = 220;
        const targetHue = (baseHue + (combo * 10)) % 360;
        const saturation = 30 + bgIntensity * 50;
        const lightness = 10 + bgIntensity * 15;
        document.body.style.backgroundColor = `hsl(${targetHue.toFixed(0)}, ${saturation.toFixed(0)}%, ${lightness.toFixed(0)}%)`;

        // Clase Pulsante y Estilo del Score
        if (scoreText) {
            const shouldPulse = flareIntensity > 0.3;
            scoreText.classList.toggle('score-pulsing', shouldPulse);
            if (!shouldPulse) { scoreText.style.textShadow = `var(--flare-shadow)`; }
            const scoreIntensity = Math.min(combo / 10, 1);
            const scoreLightness = 90 + scoreIntensity * 10;
            const scoreWeight = 700 + Math.floor(scoreIntensity * 2) * 100;
            const scoreHue = (targetHue + 180) % 360;
            const scoreColor = (combo < 2) ? `#f3f4f6` : `hsl(${ scoreHue }, 80%, ${scoreLightness}%)`;
            scoreText.style.color = scoreColor;
            scoreText.style.fontWeight = `${scoreWeight}`;
        } else { console.warn("[updateComboVisuals] Elemento scoreDisplayText (#score) no encontrado."); }
    }


    /** Deshabilita todos los botones de opción. */
    public disableOptions(): void {
        this.currentUIElements?.optionButtons?.forEach(btn => {
            if (btn) btn.disabled = true;
        });
    }

    /** Habilita los botones de opción (excepto los marcados como hinted). */
    public enableOptions(): void {
        this.currentUIElements?.optionButtons?.forEach(btn => {
            if (btn && !btn.classList.contains('option-hint-disabled')) {
                 btn.disabled = false;
            }
        });
    }

    /** Marca visualmente las opciones incorrectas cuando se usa una pista. */
    public applyHintVisuals(correctKey: string): void {
        console.log(`UIManager: Aplicando visuales de pista, respuesta correcta es ${correctKey}`);
        let incorrectOptionsDisabled = 0;
        const optionsToDisable = 1; // GDD Alpha indica deshabilitar 1 incorrecta

        const buttons = this.currentUIElements?.optionButtons;
        if (!buttons || buttons.length <= 1) return;

        const shuffledButtons = [...buttons].sort(() => 0.5 - Math.random());

        shuffledButtons.forEach(btn => {
            if (incorrectOptionsDisabled >= optionsToDisable) return;
            if (btn && btn.dataset.key !== correctKey) {
                 btn.classList.add('option-hint-disabled'); // Solo aplica clase visual
                 console.log(` -> Hint visual aplicado a opción incorrecta: ${btn.dataset.key}`);
                 incorrectOptionsDisabled++;
            }
        });
    }


    // --- Métodos para UI de Comida (sin cambios) ---
    private toggleCatFoodUIVisibility(show: boolean): void {
        const container = this.currentUIElements?.catFoodUiContainer ?? document.getElementById('cat-food-ui-container');
        if (container) {
            container.classList.toggle('hidden', !show);
        } else {
            if (show) console.warn("UIManager: Contenedor UI comida (#cat-food-ui-container) no encontrado.");
        }
    }
    public showCatFoodUI(): void {
        this.toggleCatFoodUIVisibility(true);
        if (!this.currentUIElements.catFoodButton) {
            this.currentUIElements.catFoodButton = document.getElementById('cat-food-button');
        }
        if (!this.currentUIElements.catFoodBarFill) {
            this.currentUIElements.catFoodBarFill = document.getElementById('cat-food-bar-fill');
        }
    }
    public updateCatFoodBar(currentAmount: number, maxAmount: number): void {
        const fillElement = this.currentUIElements?.catFoodBarFill as HTMLElement | null
                           ?? document.getElementById('cat-food-bar-fill');
    
        if (fillElement) {
            const percentage = maxAmount > 0 ? Math.max(0, Math.min(100, (currentAmount / maxAmount) * 100)) : 0;
            // *** ¡CAMBIO AQUÍ! ***
            fillElement.style.width = `${percentage}%`; // Actualizamos width, no height
            // *** FIN CAMBIO ***
            if (!this.currentUIElements.catFoodBarFill) {
                this.currentUIElements.catFoodBarFill = fillElement;
            }
        }
    }

    // --- Reconstrucción de Interfaz (sin cambios) ---
     public rebuildInterface(): void {
        console.log("UIManager: Reconstruyendo interfaz...");
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

                const hintApplied = (currentState as any).hintAppliedToQuestionId === currentState.currentQuestion.id;
                if (hintApplied && this.gameManager.getPlayerData().hintCharges > 0) {
                     console.log(" -> Reaplicando visuales de pista después de reconstruir.");
                     this.applyHintVisuals(currentState.currentQuestion.correctAnswerKey);
                }
            } else {
                 console.error("UIManager: Contenedor #app no encontrado al intentar reconstruir.");
            }
        } else {
            console.warn("UIManager: No se puede reconstruir la interfaz (estado incorrecto o sin pregunta actual).");
        }
    }

} // Fin clase UIManager