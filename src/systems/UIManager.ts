// src/systems/UIManager.ts
// REVERTIDO + LAYOUT AJUSTADO: Aplica clases de tema directamente a elementos. QBox invisible, Status/Difficulty centrados.

import { GameManager } from '../game/GameManager';
import { Theme, ThemeElementDefinition } from '../types/Theme'; // Importar tipos

// Tipos locales (sin cambios)
interface QuestionOption { key: string; text: string; }
interface Question { id: number | string; text: string; options: QuestionOption[]; correctAnswerKey: string; difficulty: string; explanation?: string; }

// Mapeo de dificultad (sin cambios)
const DIFFICULTY_LEVELS_CONFIG: { [key: number]: { name: string; class: string; glowColor?: string; glowBlur?: string; pulse?: boolean } } = {
    1: { name: "COMÚN", class: "difficulty-1" },
    2: { name: "POCO COMÚN", class: "difficulty-2" },
    3: { name: "RARA", class: "difficulty-3" },
    4: { name: "ÉPICA", class: "difficulty-4", glowColor: "rgba(167, 139, 250, 0.7)", glowBlur: "8px" },
    5: { name: "LEGENDARIA", class: "difficulty-5", glowColor: "rgba(245, 158, 11, 0.7)", glowBlur: "10px", pulse: true }
};

// Constantes para efectos de combo (sin cambios)
const COMBO_BASE_FONT_SIZE_REM = 3.0;
const COMBO_FONT_INCREMENT_REM = 0.5;
const COMBO_HUE_INCREMENT = 35;
const ELEMENT_GLOW_START_STREAK = 2;
const ELEMENT_GLOW_MAX_STREAK = 10;
const FLARE_START_STREAK = 1;
const FLARE_MAX_STREAK = 10;
const BG_COLOR_START_STREAK = 1;
const BG_COLOR_MAX_STREAK = 20;

// Mapa de elementos (ajustado para reflejar cambios)
type UIElementsMap = {
    [key: string]: HTMLElement | null | HTMLButtonElement[];
    quizWrapper: HTMLElement | null;
    topUIContainer: HTMLElement | null;
    statusRow: HTMLElement | null;
    livesDisplay: HTMLElement | null;
    scoreDisplay: HTMLElement | null; // Referencia al wrapper del score
    comboDisplay: HTMLElement | null;
    inkArea: HTMLElement | null;
    inkLabel: HTMLElement | null;
    inkBarContainer: HTMLElement | null;
    inkBarFill: HTMLElement | null;
    // questionBoxWrapper: HTMLElement | null; // Ya no se necesita referencia directa si es invisible
    questionBoxContent: HTMLElement | null; // Contenido interno de la pregunta
    difficultyLabel: HTMLElement | null;
    questionText: HTMLElement | null;
    optionsContainer: HTMLElement | null;
    optionButtons: HTMLButtonElement[];
    feedbackArea: HTMLElement | null;
    // Elementos que sí necesitan referencia para actualizar contenido
    scoreDisplayText: HTMLElement | null;
    scorePulse: HTMLElement | null;
    livesDisplayCount: HTMLElement | null;
    shieldIcon: HTMLElement | null;
    hintIcon: HTMLElement | null;
    // Overlays
    explanationOverlay: HTMLElement | null;
    explanationText: HTMLElement | null;
    blurBackdrop: HTMLElement | null;
}

export class UIManager {
    private gameManager: GameManager;
    private currentUIElements: Partial<UIElementsMap> = {};
    private optionClickCallback: ((key: string) => void) | null = null;
    private optionListeners: Map<HTMLButtonElement, () => void> = new Map();
    private explanationConfirmListener: (() => void) | null = null;

    constructor(gameManager: GameManager) {
        this.gameManager = gameManager;
        console.log("UIManager Creado (Layout Ajustado).");
    }

    /**
     * Construye la interfaz completa del quiz aplicando clases directamente desde el tema activo.
     * @param question - La pregunta actual.
     * @param containerElement - El elemento HTML donde se construirá la interfaz.
     * @param onOptionClick - Callback para cuando se selecciona una opción.
     * @param currentCombo - El contador de combo actual.
     */
     // REEMPLAZA/ACTUALIZA este método completo:
     public buildQuizInterface(question: Question, containerElement: HTMLElement, onOptionClick: (key: string) => void, currentCombo: number): void {
        if (!question) { console.error("UIManager: No se proporcionó pregunta."); return; }

        const activeTheme = this.gameManager.getThemeManager().getActiveTheme();
        // Usaremos principalmente IDs/clases directas del GDD Alpha,
        // pero las clases base definidas en CSS son útiles.

        console.log(`UIManager: Construyendo interfaz para pregunta ID ${question.id} con layout GDD Alpha`);

        this.clearQuizInterface(containerElement); // Limpiar interfaz anterior
        this.optionClickCallback = onOptionClick;

        const elementsMap: Partial<UIElementsMap> = { optionButtons: [] };

        try {
            // --- Contenedor Principal del Juego (dentro de #app) ---
            const gameContainer = document.createElement('div');
            gameContainer.className = 'game-container text-center'; // Clase estructural GDD Alpha
            containerElement.appendChild(gameContainer);
            elementsMap.quizWrapper = gameContainer; // Usamos gameContainer como referencia principal

            // --- Crear Combo Counter (directo en body o #app) ---
            const comboCounter = document.createElement('span');
            comboCounter.id = 'combo-counter';
            comboCounter.className = 'combo-counter-base'; // Clase de quiz-elements.css
            comboCounter.style.display = 'none';
            document.body.appendChild(comboCounter);
            elementsMap.comboDisplay = comboCounter;

            // --- Área Superior (Score, Vidas, Tinta) DENTRO de gameContainer ---
            const scoreArea = document.createElement('div');
            scoreArea.id = 'score-area';
            scoreArea.classList.add('mb-4'); // Margen inferior como en Alpha
            gameContainer.appendChild(scoreArea);

            // --- Wrapper para Vidas y Score (Flex) ---
            const statusWrapper = document.createElement('div');
            statusWrapper.id = 'status-wrapper'; // ID del Alpha GDD
            // Clases Flexbox para alinear en línea y centrar
            statusWrapper.className = 'flex justify-center items-center gap-6 mb-1'; // Ajusta gap si es necesario
            scoreArea.appendChild(statusWrapper);
            elementsMap.statusRow = statusWrapper;

            //      --- Contenedor de Vidas ---
            const livesContainer = document.createElement('div');
            livesContainer.id = 'lives-container'; // ID del Alpha GDD
            livesContainer.className = 'flex items-center gap-1'; // Clases Alpha GDD
            const heartIcon = document.createElement('span'); heartIcon.className = 'life-emoji'; heartIcon.textContent = '❤️';
            const livesCountSpan = document.createElement('span'); livesCountSpan.id = 'lives-count'; livesCountSpan.textContent = '0'; // Default
            const shieldIcon = document.createElement('span'); shieldIcon.id = 'shield-icon'; shieldIcon.textContent = '🛡️'; shieldIcon.style.display = 'none';
            const hintIcon = document.createElement('span'); hintIcon.id = 'hint-icon'; hintIcon.textContent = '💡'; hintIcon.style.display = 'none';
            livesContainer.append(heartIcon, livesCountSpan, shieldIcon, hintIcon);
            statusWrapper.appendChild(livesContainer);
            elementsMap.livesDisplay = livesContainer;
            elementsMap.livesDisplayCount = livesCountSpan;
            elementsMap.shieldIcon = shieldIcon;
            elementsMap.hintIcon = hintIcon;

            //      --- Contenedor de Score ---
            const scoreDisplayWrapper = document.createElement('div');
            scoreDisplayWrapper.id = 'score-display-wrapper'; // ID del Alpha GDD
            scoreDisplayWrapper.className = 'flex justify-center items-center relative'; // Clases Alpha GDD
            const scoreEmoji = document.createElement('span'); scoreEmoji.className = 'score-emoji'; scoreEmoji.textContent = '⭐';
            const scoreSpan = document.createElement('span'); scoreSpan.id = 'score'; scoreSpan.textContent = '0'; // Default
            const scorePulse = document.createElement('div'); scorePulse.id = 'score-pulse';
            scoreDisplayWrapper.append(scoreEmoji, scoreSpan, scorePulse);
            statusWrapper.appendChild(scoreDisplayWrapper);
            elementsMap.scoreDisplay = scoreDisplayWrapper;
            elementsMap.scoreDisplayText = scoreSpan;
            elementsMap.scorePulse = scorePulse;

            // --- Área de Tinta (debajo de Vidas/Score) ---
            const inkAreaContainer = document.createElement('div');
            inkAreaContainer.className = 'flex flex-col items-center mt-1';
            scoreArea.appendChild(inkAreaContainer);

            const inkLabel = document.createElement('div'); inkLabel.id = 'ink-label';
            inkLabel.className = 'ink-label-base';
            inkLabel.textContent = "Tinta";
            inkLabel.classList.toggle('hidden', !this.gameManager.getPlayerData().isDrawingUnlocked);
            inkAreaContainer.appendChild(inkLabel);
            elementsMap.inkLabel = inkLabel;

            const inkBarContainer = document.createElement('div'); inkBarContainer.id = 'ink-bar-container';
            inkBarContainer.className = 'ink-bar-container-base';
            inkBarContainer.classList.toggle('hidden', !this.gameManager.getPlayerData().isDrawingUnlocked);
            inkAreaContainer.appendChild(inkBarContainer);
            elementsMap.inkBarContainer = inkBarContainer;

            const inkBarFill = document.createElement('div'); inkBarFill.id = 'ink-bar-fill';
            inkBarFill.className = 'ink-bar-fill-base';
            inkBarFill.style.width = '0%';
            inkBarContainer.appendChild(inkBarFill);
            elementsMap.inkBarFill = inkBarFill;


            // --- Caja de Pregunta (Estilos directos del CSS vía ID) ---
            const questionBox = document.createElement('div');
            questionBox.id = 'question-box'; // ID Clave del Alpha GDD
            // Aplicar solo clases estructurales o la clase base si es necesaria
            questionBox.className = 'question-box-base'; // Clase de quiz-elements.css
            gameContainer.appendChild(questionBox);
            // Guardamos referencia al contenido si es necesario, no a un wrapper invisible
            elementsMap.questionBoxContent = questionBox;

            //      --- Elementos Dentro de la Caja de Pregunta ---
            const difficultyLabel = document.createElement('span');
            difficultyLabel.id = 'difficulty-label';
            difficultyLabel.className = 'difficulty-label-base'; // Clase base
            questionBox.appendChild(difficultyLabel);
            elementsMap.difficultyLabel = difficultyLabel;

            const qText = document.createElement('p');
            qText.id = 'question';
            qText.className = 'question-text-base'; // Clase base
            qText.textContent = question.text;
            questionBox.appendChild(qText);
            elementsMap.questionText = qText;

            // --- Contenedor de Opciones ---
            const optionsContainer = document.createElement('div');
            optionsContainer.id = 'options';
            // Clases base + flex + gap
            optionsContainer.className = 'options-container-base flex flex-col gap-3 mb-4'; // mb-4 como en GDD Alpha
            gameContainer.appendChild(optionsContainer);
            elementsMap.optionsContainer = optionsContainer;

            // --- Botones de Opción ---
            question.options.forEach(option => {
                 if (!option?.key || typeof option.text === 'undefined') return;
                 const button = document.createElement('button');
                 button.className = 'option-button'; // Clase genérica estilizada en CSS
                 button.dataset.key = option.key; button.textContent = option.text;
                 const listener = () => { if (this.optionClickCallback) this.optionClickCallback(option.key); };
                 this.optionListeners.set(button, listener); button.addEventListener('click', listener);
                 optionsContainer.appendChild(button);
                 elementsMap.optionButtons?.push(button);
            });

            // --- Área de Feedback ---
            const feedbackArea = document.createElement('div');
            feedbackArea.id = 'feedback';
            feedbackArea.className = 'feedback-area-base mt-4 h-8'; // Clase base, margen y altura fija GDD Alpha
            gameContainer.appendChild(feedbackArea);
            elementsMap.feedbackArea = feedbackArea;

            // --- Referencias a Overlays (sin cambios) ---
            elementsMap.explanationOverlay = document.getElementById('explanation-overlay');
            elementsMap.explanationText = document.getElementById('explanation-text-content');
            elementsMap.blurBackdrop = document.getElementById('blur-backdrop');

        } catch (error) {
            console.error("UIManager: Error creando elementos (Layout GDD Alpha):", error);
            this.clearQuizInterface(containerElement);
            containerElement.innerHTML = `<p class="text-red-500">Error al construir interfaz. Revisa la consola.</p>`;
            return;
        }

        this.currentUIElements = elementsMap as UIElementsMap;

        // Actualizar estado inicial
        this.updateScoreDisplay(this.gameManager.getPlayerData().score);
        this.updateLivesDisplay(this.gameManager.getLives());
        this.updateShieldIcon(this.gameManager.getPlayerData().hasShield);
        this.updateHintIcon(this.gameManager.getPlayerData().hintCharges);
        this.updateInkBar();
        this.updateDifficultyLabel(question.difficulty);
        this.updateComboVisuals(currentCombo); // Asegura aplicar efectos iniciales
    }


    // ASEGÚRATE que este método también esté actualizado:
    public updateComboVisuals(combo: number): void {
        const comboElement = this.currentUIElements?.comboDisplay;
        const root = document.documentElement;
        const body = document.body;
        const scoreElement = this.currentUIElements?.scoreDisplayText;

        // --- Combo Counter ---
        if (comboElement) {
            if (combo > 0) {
                comboElement.textContent = `x${combo}`;
                const baseSize = 1.5; // Base GDD Alpha
                const increment = 0.5; // Incremento GDD Alpha
                const newFontSize = baseSize + Math.max(0, combo - 1) * increment;
                const comboHue = (combo * COMBO_HUE_INCREMENT) % 360;
                const comboColor = `hsl(${comboHue}, 100%, 65%)`;

                comboElement.style.fontSize = `${newFontSize}rem`;
                comboElement.style.color = comboColor;
                root.style.setProperty('--combo-font-size', `${newFontSize}rem`); // Actualizar variable CSS
                comboElement.style.display = 'block';
            } else {
                comboElement.style.display = 'none';
                root.style.setProperty('--combo-font-size', '1.5rem'); // Reset a base GDD Alpha
            }
        }

        // --- Element Glow (Question Box, Options) ---
        const GLOW_START = 2; const GLOW_MAX = 10;
        const elementGlowIntensity = combo < GLOW_START ? 0 : Math.min((combo - GLOW_START + 1) / (GLOW_MAX - GLOW_START + 1), 1);
        root.style.setProperty('--element-glow-intensity', elementGlowIntensity.toString());

        // --- Score Flare ---
        const FLARE_START = 1; const FLARE_MAX = 10;
        const flareIntensity = combo < FLARE_START ? 0 : Math.min((combo - FLARE_START + 1) / (FLARE_MAX - FLARE_START + 1), 1);
        root.style.setProperty('--flare-intensity', flareIntensity.toString());

        if (scoreElement) {
             const flareColor1 = `hsla(0, 0%, 100%, ${flareIntensity * 0.5})`;
             const flareColor2 = `hsla(55, 100%, 70%, ${flareIntensity * 0.8})`;
             const flareColor3 = `hsla(40, 100%, 60%, ${flareIntensity * 0.6})`;
             const flareColor4 = `hsla(10, 100%, 55%, ${flareIntensity * 0.4})`;
             const blur1 = `${5 + flareIntensity * 5}px`;
             const blur2 = `${10 + flareIntensity * 10}px`;
             const blur3 = `${15 + flareIntensity * 15}px`;
             const blur4 = `${20 + flareIntensity * 20}px`;
             const normalShadow = `0 0 ${blur1} ${flareColor1}, 0 0 ${blur2} ${flareColor2}, 0 0 ${blur3} ${flareColor3}, 0 0 ${blur4} ${flareColor4}`;
             scoreElement.style.textShadow = normalShadow;
             scoreElement.classList.toggle('score-pulsing', flareIntensity > 0.3);

             const scoreIntensity = Math.min(combo / 10, 1);
             const scoreLightness = 90 + scoreIntensity * 10;
             const scoreWeight = 800;
             const scoreHue = (combo * 10) % 360;
             let scoreColor = (combo < 2) ? `#f3f4f6` : `hsl(${ (scoreHue + 40) % 360 }, 90%, ${scoreLightness}%)`;
             scoreElement.style.color = scoreColor;
             scoreElement.style.fontWeight = scoreWeight.toString();
        }

        // --- Background Color ---
        const BG_START = 1; const BG_MAX = 20;
        const bgStreakRatio = combo < BG_START ? 0 : Math.min((combo - BG_START + 1) / (BG_MAX - BG_START + 1), 1);
        const bgIntensity = bgStreakRatio * bgStreakRatio;
        const bgHue = (combo * 10) % 360;
        const bgSaturation = bgIntensity * 80;
        const bgLightness = 10 + bgIntensity * 25;
        const targetBgColor = combo === 0 ? '#111827' : `hsl(${bgHue}, ${bgSaturation}%, ${bgLightness}%)`;
        body.style.backgroundColor = targetBgColor;
     }

    /**
     * Limpia la interfaz del quiz y los listeners asociados.
     */
    public clearQuizInterface(containerElement: HTMLElement): void {
        // console.log("UIManager: Limpiando interfaz del quiz..."); // Log opcional
        this.optionListeners.forEach((listener, button) => {
            if (button?.parentNode) button.removeEventListener('click', listener);
        });
        this.optionListeners.clear();

        const comboCounter = document.getElementById('combo-counter');
        if (comboCounter?.parentNode) {
            comboCounter.parentNode.removeChild(comboCounter);
        }

        this.removeExplanationListener();
        this.currentUIElements = {};
        this.optionClickCallback = null;
        containerElement.innerHTML = '';
    }

    /**
     * Aplica clases CSS a un elemento HTML de forma segura.
     * @param element - El elemento HTML.
     * @param classes - Clases a añadir (string con clases separadas por espacio, o undefined).
     */
    private applyClasses(element: HTMLElement | null, classes: string | undefined): void {
        if (!element || !classes) return;
        // Limpiar clases anteriores si es necesario (puede ser complejo determinar cuáles son de tema)
        // element.className = ''; // Descomentar con precaución
        classes.split(' ').forEach(cls => {
            if (cls) element.classList.add(cls);
        });
    }

    // --- Métodos para Explicación (SIN CAMBIOS) ---
    public showExplanation(explanation: string, onConfirm: () => void): void {
        const overlay = this.currentUIElements?.explanationOverlay;
        const textElement = this.currentUIElements?.explanationText;
        const backdrop = this.currentUIElements?.blurBackdrop;
        if (overlay && textElement && backdrop) {
            console.log("UIManager: Mostrando explicación.");
            textElement.textContent = explanation;
            backdrop.style.display = 'block';
            overlay.style.display = 'flex';
            void overlay.offsetHeight; void backdrop.offsetHeight;
            backdrop.classList.add('visible');
            overlay.classList.add('visible');
            this.removeExplanationListener();
            this.explanationConfirmListener = () => {
                console.log("UIManager: Confirmación de explicación recibida.");
                this.hideExplanation();
                onConfirm();
            };
            setTimeout(() => {
                document.addEventListener('click', this.explanationConfirmListener!, { capture: true, once: true });
                document.addEventListener('keydown', this.explanationConfirmListener!, { capture: true, once: true });
            }, 0);
        } else {
            console.error("UIManager: Elementos del overlay de explicación no encontrados.");
            onConfirm();
        }
    }
    public hideExplanation(): void {
        const overlay = this.currentUIElements?.explanationOverlay;
        const backdrop = this.currentUIElements?.blurBackdrop;
        if (overlay && backdrop) {
            overlay.classList.remove('visible');
            const shopPopup = document.getElementById('shop-popup');
            if (!shopPopup || !shopPopup.classList.contains('visible')) {
                 backdrop.classList.remove('visible');
            }
            this.removeExplanationListener();
            const onTransitionEnd = (event: TransitionEvent) => {
                if (event.propertyName === 'opacity' && overlay === event.target) {
                     overlay.style.display = 'none';
                     if (!shopPopup || !shopPopup.classList.contains('visible')) {
                          if (backdrop) backdrop.style.display = 'none';
                     }
                     overlay.removeEventListener('transitionend', onTransitionEnd);
                }
            };
            overlay.addEventListener('transitionend', onTransitionEnd);
            setTimeout(() => {
                if (overlay.style.opacity === '0') {
                    overlay.style.display = 'none';
                    if (!shopPopup || !shopPopup.classList.contains('visible')) {
                         if (backdrop) backdrop.style.display = 'none';
                    }
                    overlay.removeEventListener('transitionend', onTransitionEnd);
                }
            }, 400);
        }
     }
    private removeExplanationListener(): void {
        if (this.explanationConfirmListener) {
            document.removeEventListener('click', this.explanationConfirmListener, { capture: true });
            document.removeEventListener('keydown', this.explanationConfirmListener, { capture: true });
            this.explanationConfirmListener = null;
        }
     }
    // --- Fin Métodos de Explicación ---

    // --- Métodos de Actualización (SIN CAMBIOS EN LÓGICA INTERNA) ---
    public updateScoreDisplay(score: number): void {
        const element = this.currentUIElements?.scoreDisplayText;
        if (element) { element.textContent = score.toString(); }
        const pulseElement = this.currentUIElements?.scorePulse;
        if (pulseElement) { pulseElement.classList.remove('pulsing'); void pulseElement.offsetWidth; pulseElement.classList.add('pulsing'); }
    }
    public updateLivesDisplay(lives: number): void { const element = this.currentUIElements?.livesDisplayCount; if (element) { element.textContent = lives.toString(); } }
    public updateShieldIcon(isActive: boolean): void { const element = this.currentUIElements?.shieldIcon; if (element) { element.style.display = isActive ? 'inline' : 'none'; } }
    public updateHintIcon(charges: number): void { const element = this.currentUIElements?.hintIcon; if (element) { element.style.display = charges > 0 ? 'inline' : 'none'; } }
    public updateFeedback(message: string, type: 'correct' | 'incorrect' | 'shield' | 'info'): void {
        const element = this.currentUIElements?.feedbackArea;
        const activeTheme = this.gameManager.getThemeManager().getActiveTheme();
        if (element && activeTheme?.elements?.feedbackArea) {
            element.textContent = message;
            const themeDef = activeTheme.elements.feedbackArea;
            const classCorrect = themeDef.correctClass ?? 'feedback-correct';
            const classIncorrect = themeDef.incorrectClass ?? 'feedback-incorrect';
            const classShield = themeDef.shieldClass ?? 'feedback-shield';
            element.classList.remove(classCorrect, classIncorrect, classShield);

            switch (type) {
                case 'correct': this.applyClasses(element, classCorrect); break;
                case 'incorrect': this.applyClasses(element, classIncorrect); break;
                case 'shield': this.applyClasses(element, classShield); break;
                case 'info': break;
            }
        }
    }
    public updateInkBar(): void {
        const inkLabel = this.currentUIElements?.inkLabel;
        const inkBarContainer = this.currentUIElements?.inkBarContainer;
        const inkBarFill = this.currentUIElements?.inkBarFill;
        const isUnlocked = this.gameManager.getPlayerData().isDrawingUnlocked;
        const maxInk = this.gameManager.getPlayerData().getMaxInk();
        const currentInk = this.gameManager.getPlayerData().currentInk;
        const scoreArea = document.getElementById('score-area');

        if (scoreArea) { scoreArea.classList.toggle('ink-visible', isUnlocked); }
        if (inkLabel) inkLabel.classList.toggle('hidden', !isUnlocked);
        if (inkBarContainer) inkBarContainer.classList.toggle('hidden', !isUnlocked);

        if (inkBarFill) {
            const percentage = maxInk > 0 ? Math.max(0, Math.min(100, (currentInk / maxInk) * 100)) : 0;
            (inkBarFill as HTMLElement).style.width = `${percentage}%`;
        }
    }
    public updateComboVisuals(combo: number): void {
        const comboElement = this.currentUIElements?.comboDisplay;
        const root = document.documentElement;
        const body = document.body;
        if (comboElement) {
            if (combo > 0) {
                comboElement.textContent = `x${combo}`;
                const fontSizeIncrement = Math.min(combo - 1, 15) * COMBO_FONT_INCREMENT_REM;
                const newFontSize = COMBO_BASE_FONT_SIZE_REM + fontSizeIncrement;
                const comboHue = (combo * COMBO_HUE_INCREMENT) % 360;
                const comboColor = `hsl(${comboHue}, 100%, 65%)`;
                comboElement.style.fontSize = `${newFontSize}rem`;
                comboElement.style.color = comboColor;
                comboElement.style.display = 'block';
                root.style.setProperty('--combo-font-size', `${newFontSize}rem`);
            } else {
                comboElement.style.display = 'none';
                root.style.setProperty('--combo-font-size', `${COMBO_BASE_FONT_SIZE_REM}rem`);
            }
        }
        const elementGlowIntensity = combo < ELEMENT_GLOW_START_STREAK ? 0 : Math.min((combo - ELEMENT_GLOW_START_STREAK + 1) / (ELEMENT_GLOW_MAX_STREAK - ELEMENT_GLOW_START_STREAK + 1), 1);
        root.style.setProperty('--element-glow-intensity', elementGlowIntensity.toString());
        const flareIntensity = combo < FLARE_START_STREAK ? 0 : Math.min((combo - FLARE_START_STREAK + 1) / (FLARE_MAX_STREAK - FLARE_START_STREAK + 1), 1);
        root.style.setProperty('--flare-intensity', flareIntensity.toString());
        const scoreElement = this.currentUIElements?.scoreDisplayText;
        if (scoreElement) {
             const normalShadow = root.style.getPropertyValue('--flare-shadow');
             scoreElement.classList.toggle('score-pulsing', flareIntensity > 0.3);
             if (flareIntensity <= 0.3) { scoreElement.style.textShadow = normalShadow; }
        }
        const bgStreakRatio = combo < BG_COLOR_START_STREAK ? 0 : Math.min((combo - BG_COLOR_START_STREAK + 1) / (BG_COLOR_MAX_STREAK - BG_COLOR_START_STREAK + 1), 1);
        const bgIntensity = bgStreakRatio * bgStreakRatio;
        const bgHue = (combo * 10) % 360;
        const bgSaturation = bgIntensity * 60;
        const bgLightness = 10 + bgIntensity * 15;
        const targetBgColor = combo === 0 ? '' : `hsl(${bgHue}, ${bgSaturation}%, ${bgLightness}%)`;
        body.style.backgroundColor = targetBgColor;
     }
    public updateDifficultyLabel(difficultyValue: string | number): void {
        const element = this.currentUIElements?.difficultyLabel;
        if (element) {
            const level = parseInt(difficultyValue.toString(), 10) || 1;
            const config = DIFFICULTY_LEVELS_CONFIG[level] || DIFFICULTY_LEVELS_CONFIG[1];
            element.textContent = `Pregunta: ${config.name}`;
            Object.values(DIFFICULTY_LEVELS_CONFIG).forEach(lvl => element.classList.remove(lvl.class));
            element.classList.add(config.class);
            const root = document.documentElement;
            root.style.setProperty('--difficulty-glow-color', config.glowColor || 'transparent');
            root.style.setProperty('--difficulty-glow-blur', config.glowBlur || '0px');
            element.classList.toggle('difficulty-pulse', !!config.pulse);
        }
     }
    public disableOptions(): void { this.currentUIElements?.optionButtons?.forEach(btn => btn.disabled = true); }
    public enableOptions(): void { this.currentUIElements?.optionButtons?.forEach(btn => btn.disabled = false); }
    public applyHintVisuals(correctKey: string): void {
        const buttons = this.currentUIElements?.optionButtons;
        if (!buttons) return;
        const incorrectButtons = buttons.filter(btn => btn.dataset.key !== correctKey);
        if (incorrectButtons.length > 0) {
            const randomIndex = Math.floor(Math.random() * incorrectButtons.length);
            const buttonToHint = incorrectButtons[randomIndex];
            buttonToHint.classList.add('option-hint-disabled');
            console.log(`Hint visual aplicado a opción: ${buttonToHint.dataset.key}`);
        }
    }

    /**
     * Reconstruye la interfaz del quiz, útil después de un cambio de tema.
     */
     public rebuildInterface(): void {
        console.log("UIManager: Reconstruyendo interfaz (Aplicación Directa)...");
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
            } else {
                 console.error("UIManager: No se encontró #app para reconstruir interfaz.");
            }
        } else {
             console.warn("UIManager: No se puede reconstruir interfaz - estado o pregunta no válidos.");
        }
    }

} // Fin clase UIManager