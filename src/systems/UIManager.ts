// src/systems/UIManager.ts
// SIN TEMAS - Estilo Base GDD Alpha

import { GameManager } from '../game/GameManager';

// Tipos locales
interface QuestionOption { key: string; text: string; }
interface Question { id: number | string; text: string; options: QuestionOption[]; correctAnswerKey: string; difficulty: string; explanation?: string; }

// Mapeo de dificultad
const DIFFICULTY_LEVELS_CONFIG: { [key: number]: { name: string; class: string; glowColor?: string; glowBlur?: string; pulse?: boolean } } = {
    1: { name: "COMÚN", class: "difficulty-1" },
    2: { name: "POCO COMÚN", class: "difficulty-2" },
    3: { name: "RARA", class: "difficulty-3" },
    4: { name: "ÉPICA", class: "difficulty-4", glowColor: "rgba(167, 139, 250, 0.7)", glowBlur: "8px" },
    5: { name: "LEGENDARIA", class: "difficulty-5", glowColor: "rgba(245, 158, 11, 0.7)", glowBlur: "10px", pulse: true }
};

// Constantes para efectos de combo
const COMBO_BASE_FONT_SIZE_REM = 3.0;
const COMBO_FONT_INCREMENT_REM = 0.5;
const COMBO_HUE_INCREMENT = 35;
const ELEMENT_GLOW_START_STREAK = 2;
const ELEMENT_GLOW_MAX_STREAK = 10;
const FLARE_START_STREAK = 1;
const FLARE_MAX_STREAK = 10;
const BG_COLOR_START_STREAK = 1;
const BG_COLOR_MAX_STREAK = 20;

// Mapa de elementos
type UIElementsMap = {
    [key: string]: HTMLElement | null | HTMLButtonElement[];
    quizWrapper: HTMLElement | null;
    feedbackArea: HTMLElement | null;
    scoreDisplay: HTMLElement | null;
    scoreDisplayWrapper: HTMLElement | null;
    scorePulse: HTMLElement | null;
    livesDisplayCount: HTMLElement | null;
    shieldIcon: HTMLElement | null;
    hintIcon: HTMLElement | null;
    comboDisplay: HTMLElement | null;
    optionsContainer: HTMLElement | null;
    difficultyLabel: HTMLElement | null;
    questionBox: HTMLElement | null;
    optionButtons: HTMLButtonElement[];
    inkBarFill: HTMLElement | null;
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
        console.log("UIManager Creado (Modo Simplificado - Estilo GDD Alpha Base).");
    }

    /**
     * Construye la interfaz completa del quiz con el estilo GDD Alpha Base.
     */
    public buildQuizInterface(question: Question, containerElement: HTMLElement, onOptionClick: (key: string) => void, currentCombo: number): void {
        if (!question) { console.error("UIManager: No se proporcionó pregunta."); return; }

        console.log(`UIManager: Construyendo interfaz para pregunta ID ${question.id} (Estilo GDD Alpha Base)`);
        this.clearQuizInterface(containerElement);
        this.optionClickCallback = onOptionClick;

        const elementsMap: Partial<UIElementsMap> = { optionButtons: [] };

        try { // Envolver toda la creación en try/catch
            // --- 1. Crear Contenedor Principal (Wrapper) ---
            const wrapper = document.createElement('div');
            wrapper.id = 'quiz-interface-wrapper';
            wrapper.classList.add('game-container', 'text-center');
            elementsMap.quizWrapper = wrapper;
            containerElement.appendChild(wrapper);

            // --- 2. Crear Combo Counter ---
            const comboCounter = document.createElement('span');
            comboCounter.id = 'combo-counter';
            comboCounter.classList.add('combo-counter-base');
            comboCounter.style.display = 'none';
            document.body.appendChild(comboCounter);
            elementsMap.comboDisplay = comboCounter;

            // --- 3. Construir el resto de la interfaz DENTRO del wrapper ---
            const topUIContainer = document.createElement('div');
            topUIContainer.classList.add('top-ui-container');
            wrapper.appendChild(topUIContainer);

            const scoreArea = document.createElement('div');
            scoreArea.id = 'score-area';
            scoreArea.classList.add('score-area-base');
            if (this.gameManager.getPlayerData().isDrawingUnlocked) {
                 scoreArea.classList.add('ink-visible');
            }
            topUIContainer.appendChild(scoreArea);

            const statusWrapper = document.createElement('div');
            statusWrapper.id = 'status-wrapper';
            statusWrapper.classList.add('status-wrapper-base');
            scoreArea.appendChild(statusWrapper);

            //          --- Lives ---
            const livesContainer = document.createElement('div');
            livesContainer.id = 'lives-container';
            livesContainer.classList.add('lives-container-base');
            const heartIcon = document.createElement('span'); heartIcon.className = 'life-emoji'; heartIcon.textContent = '❤️';
            const livesCountSpan = document.createElement('span'); livesCountSpan.id = 'lives-count';
            // *** DEBUG: Log después de crear livesCountSpan ***
            console.log('[DEBUG] livesCountSpan creado:', livesCountSpan.outerHTML);
            const shieldIcon = document.createElement('span'); shieldIcon.id = 'shield-icon'; shieldIcon.textContent = '🛡️'; shieldIcon.style.display = 'none';
            const hintIcon = document.createElement('span'); hintIcon.id = 'hint-icon'; hintIcon.textContent = '💡'; hintIcon.style.display = 'none';
            livesContainer.append(heartIcon, livesCountSpan, shieldIcon, hintIcon);
            statusWrapper.appendChild(livesContainer);
            elementsMap.livesDisplayCount = livesCountSpan; // Guardar referencia
            elementsMap.shieldIcon = shieldIcon;
            elementsMap.hintIcon = hintIcon;

            //          --- Score ---
            const scoreWrapper = document.createElement('div');
            scoreWrapper.id = 'score-display-wrapper';
            scoreWrapper.classList.add('score-display-wrapper-base');
            const scoreEmoji = document.createElement('span'); scoreEmoji.classList.add('score-emoji'); scoreEmoji.textContent = '⭐';
            const scoreSpan = document.createElement('span'); scoreSpan.id = 'score'; scoreSpan.classList.add('score-text-base');
             // *** DEBUG: Log después de crear scoreSpan ***
            console.log('[DEBUG] scoreSpan creado:', scoreSpan.outerHTML);
            const scorePulse = document.createElement('div'); scorePulse.id = 'score-pulse';
            scoreWrapper.append(scoreEmoji, scoreSpan, scorePulse);
            statusWrapper.appendChild(scoreWrapper);
            elementsMap.scoreDisplayWrapper = scoreWrapper;
            elementsMap.scoreDisplay = scoreSpan; // Guardar referencia
            elementsMap.scorePulse = scorePulse;

            //      --- Ink Elements ---
            const inkLabel = document.createElement('div'); inkLabel.id = 'ink-label'; inkLabel.classList.add('ink-label-base', 'hidden'); inkLabel.textContent = "Tinta";
            const inkBarContainer = document.createElement('div'); inkBarContainer.id = 'ink-bar-container'; inkBarContainer.classList.add('ink-bar-container-base', 'hidden');
            const inkBarFill = document.createElement('div'); inkBarFill.id = 'ink-bar-fill'; inkBarFill.classList.add('ink-bar-fill-base'); inkBarFill.style.width = '0%';
            inkBarContainer.appendChild(inkBarFill);
            scoreArea.append(inkLabel, inkBarContainer);
            elementsMap.inkBarFill = inkBarFill;

            // --- Question Box ---
            const qBox = document.createElement('div'); qBox.id = 'question-box'; qBox.classList.add('question-box-base');
            wrapper.appendChild(qBox);
            elementsMap.questionBox = qBox;

            const difficultyLabel = document.createElement('span'); difficultyLabel.id = 'difficulty-label'; difficultyLabel.classList.add('difficulty-label-base');
            const qText = document.createElement('p'); qText.id = 'question'; qText.classList.add('question-text-base'); qText.textContent = question.text;
            qBox.append(difficultyLabel, qText);
            elementsMap.difficultyLabel = difficultyLabel;

            // --- Options ---
            const optionsContainer = document.createElement('div'); optionsContainer.id = 'options'; optionsContainer.classList.add('options-container-base');
            wrapper.appendChild(optionsContainer);
            elementsMap.optionsContainer = optionsContainer;

            question.options.forEach(option => {
                 if (!option?.key || typeof option.text === 'undefined') return;
                 const button = document.createElement('button');
                 button.classList.add('option-button');
                 button.dataset.key = option.key; button.textContent = option.text;
                 const listener = () => { if (this.optionClickCallback) this.optionClickCallback(option.key); };
                 this.optionListeners.set(button, listener); button.addEventListener('click', listener);
                 optionsContainer.appendChild(button);
                 elementsMap.optionButtons?.push(button);
            });

            // --- Feedback Area ---
            const feedbackArea = document.createElement('div'); feedbackArea.id = 'feedback'; feedbackArea.classList.add('feedback-area-base');
            wrapper.appendChild(feedbackArea);
            elementsMap.feedbackArea = feedbackArea;

            // --- Obtener Overlays ---
            elementsMap.explanationOverlay = document.getElementById('explanation-overlay');
            elementsMap.explanationText = document.getElementById('explanation-text-content');
            elementsMap.blurBackdrop = document.getElementById('blur-backdrop');

        } catch (error) {
             console.error("UIManager: Error creando elementos de la interfaz:", error);
             this.clearQuizInterface(containerElement);
             containerElement.innerHTML = `<p class="text-red-500">Error al construir interfaz. Revisa la consola.</p>`;
             return;
        }

        // --- Finalizar ---
        this.currentUIElements = elementsMap as UIElementsMap; // Guardar referencias finales

        // --- Actualizar Estado Inicial ---
        console.log('[DEBUG] Actualizando UI inicial...'); // *** DEBUG Log ***
        this.updateScoreDisplay(this.gameManager.getPlayerData().score);
        this.updateLivesDisplay(this.gameManager.getLives());
        this.updateShieldIcon(this.gameManager.getPlayerData().hasShield);
        this.updateHintIcon(this.gameManager.getPlayerData().hintCharges);
        this.updateInkBar();
        this.updateDifficultyLabel(question.difficulty);
        this.updateComboVisuals(currentCombo);
        console.log('[DEBUG] UI inicial actualizada.'); // *** DEBUG Log ***
    }

    // clearQuizInterface (SIN CAMBIOS)
     public clearQuizInterface(containerElement: HTMLElement): void { /* ... */
        console.log("UIManager: Limpiando interfaz del quiz...");
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

    // --- Métodos para Explicación (SIN CAMBIOS) ---
    public showExplanation(explanation: string, onConfirm: () => void): void { /* ... */
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
            document.addEventListener('click', this.explanationConfirmListener, { capture: true, once: true });
            document.addEventListener('keydown', this.explanationConfirmListener, { capture: true, once: true });
        } else {
            console.error("UIManager: Elementos del overlay de explicación no encontrados.");
            onConfirm();
        }
    }
    public hideExplanation(): void { /* ... */
        const overlay = this.currentUIElements?.explanationOverlay;
        const backdrop = this.currentUIElements?.blurBackdrop;
        if (overlay && backdrop) {
            overlay.classList.remove('visible');
            const shopPopup = document.getElementById('shop-popup');
            if (!shopPopup || !shopPopup.classList.contains('visible')) {
                 backdrop.classList.remove('visible');
            }
            this.removeExplanationListener();
            setTimeout(() => {
                overlay.style.display = 'none';
                if (!shopPopup || !shopPopup.classList.contains('visible')) {
                     if (backdrop) backdrop.style.display = 'none';
                }
            }, 400);
        }
     }
    private removeExplanationListener(): void { /* ... */
        if (this.explanationConfirmListener) {
            document.removeEventListener('click', this.explanationConfirmListener, { capture: true });
            document.removeEventListener('keydown', this.explanationConfirmListener, { capture: true });
            this.explanationConfirmListener = null;
        }
     }
    // --- Fin Métodos de Explicación ---


    // --- Métodos de Actualización ---

    public updateScoreDisplay(score: number): void {
        const element = this.currentUIElements?.scoreDisplay;
        // *** DEBUG Log ***
        console.log(`[DEBUG] updateScoreDisplay: Elemento encontrado? ${!!element}. Score: ${score}`);
        if (element) {
            element.textContent = score.toString();
        }
        const pulseElement = this.currentUIElements?.scorePulse;
        if (pulseElement) {
            pulseElement.classList.remove('pulsing');
            void pulseElement.offsetWidth;
            pulseElement.classList.add('pulsing');
        }
    }

    public updateLivesDisplay(lives: number): void {
        const element = this.currentUIElements?.livesDisplayCount;
         // *** DEBUG Log ***
        console.log(`[DEBUG] updateLivesDisplay: Elemento encontrado? ${!!element}. Vidas: ${lives}`);
        if (element) {
            element.textContent = lives.toString();
        }
    }

    // updateComboVisuals, updateDifficultyLabel, etc. (SIN CAMBIOS EN LÓGICA INTERNA)
    public updateComboVisuals(combo: number): void { /* ... */
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
        const scoreElement = this.currentUIElements?.scoreDisplay;
        if (scoreElement) {
             const normalShadow = root.style.getPropertyValue('--flare-shadow');
             scoreElement.classList.toggle('score-pulsing', flareIntensity > 0.3);
             if (flareIntensity <= 0.3) { scoreElement.style.textShadow = normalShadow; }
             const scoreIntensity = Math.min(combo / 10, 1);
             const scoreLightness = 90 + scoreIntensity * 10;
             const scoreWeight = 700 + Math.floor(scoreIntensity * 2) * 100;
             const scoreHue = ((combo * COMBO_HUE_INCREMENT) + 180) % 360;
             let scoreColor = (combo < 2) ? `hsl(0, 0%, 95%)` : `hsl(${scoreHue}, 80%, ${scoreLightness}%)`;
             scoreElement.style.color = scoreColor;
             scoreElement.style.fontWeight = scoreWeight.toString();
        }
        const bgStreakRatio = combo < BG_COLOR_START_STREAK ? 0 : Math.min((combo - BG_COLOR_START_STREAK + 1) / (BG_COLOR_MAX_STREAK - BG_COLOR_START_STREAK + 1), 1);
        const bgIntensity = bgStreakRatio * bgStreakRatio;
        const bgHue = (combo * 10) % 360;
        const bgSaturation = bgIntensity * 60;
        const bgLightness = 10 + bgIntensity * 15;
        const targetBgColor = combo === 0 ? '#111827' : `hsl(${bgHue}, ${bgSaturation}%, ${bgLightness}%)`;
        body.style.backgroundColor = targetBgColor;
     }
    public updateDifficultyLabel(difficultyValue: string | number): void { /* ... */
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
    public updateShieldIcon(isActive: boolean): void { /* ... */ const element = this.currentUIElements?.shieldIcon; if (element) { element.style.display = isActive ? 'inline' : 'none'; } }
    public updateHintIcon(charges: number): void { /* ... */ const element = this.currentUIElements?.hintIcon; if (element) { element.style.display = charges > 0 ? 'inline' : 'none'; } }
    public updateFeedback(message: string, type: 'correct' | 'incorrect' | 'shield' | 'info'): void { /* ... */ const element = this.currentUIElements?.feedbackArea; if (element) { element.textContent = message; element.classList.remove('feedback-correct', 'feedback-incorrect', 'feedback-shield'); switch (type) { case 'correct': element.classList.add('feedback-correct'); break; case 'incorrect': element.classList.add('feedback-incorrect'); break; case 'shield': element.classList.add('feedback-shield'); break; case 'info': break; } } }
    public updateInkBar(): void { /* ... */ const inkLabel = document.getElementById('ink-label'); const inkBarContainer = document.getElementById('ink-bar-container'); const inkBarFill = this.currentUIElements?.inkBarFill; const isUnlocked = this.gameManager.getPlayerData().isDrawingUnlocked; const maxInk = this.gameManager.getPlayerData().getMaxInk(); const currentInk = this.gameManager.getPlayerData().currentInk; const scoreArea = document.getElementById('score-area'); const root = document.documentElement; if (scoreArea) { scoreArea.classList.toggle('ink-visible', isUnlocked); } if (inkLabel) inkLabel.classList.toggle('hidden', !isUnlocked); if (inkBarContainer) inkBarContainer.classList.toggle('hidden', !isUnlocked); if (inkBarFill) { const percentage = maxInk > 0 ? Math.max(0, Math.min(100, (currentInk / maxInk) * 100)) : 0; root.style.setProperty('--ink-percentage', `${percentage}%`); inkBarFill.style.width = `${percentage}%`; } }
    public disableOptions(): void { this.currentUIElements?.optionButtons?.forEach(btn => btn.disabled = true); }
    public enableOptions(): void { this.currentUIElements?.optionButtons?.forEach(btn => btn.disabled = false); }
    private applyClasses(element: HTMLElement, ...classes: (string | undefined)[]): void { classes.forEach(cls => { if (cls) { cls.split(' ').forEach(singleClass => { if (singleClass) element.classList.add(singleClass); }); } }); }
    public applyHintVisuals(correctKey: string): void { /* ... */ const buttons = this.currentUIElements?.optionButtons; if (!buttons) return; const incorrectButtons = buttons.filter(btn => btn.dataset.key !== correctKey); if (incorrectButtons.length > 0) { const randomIndex = Math.floor(Math.random() * incorrectButtons.length); const buttonToHint = incorrectButtons[randomIndex]; buttonToHint.classList.add('option-hint-disabled'); console.log(`Hint visual aplicado a opción: ${buttonToHint.dataset.key}`); } }

} // Fin clase UIManager
