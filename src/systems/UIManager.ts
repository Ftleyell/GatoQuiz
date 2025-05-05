// src/systems/UIManager.ts

import { GameManager } from '../game/GameManager';
import { Theme } from '../types/Theme';
import { QuizGameplayState } from '../game/states/QuizGameplayState';

// Tipos locales
interface QuestionOption { key: string; text: string; }
interface Question { id: number | string; text: string; options: QuestionOption[]; correctAnswerKey: string; difficulty: string | number; explanation?: string; }

// --- CONSTANTES --- (Sin cambios)
const FLARE_START_STREAK = 1; const FLARE_MAX_STREAK = 10; const ELEMENT_GLOW_START_STREAK = 2; const ELEMENT_GLOW_MAX_STREAK = 10; const BG_COLOR_START_STREAK = 1; const BG_COLOR_MAX_STREAK = 20; const COMBO_BASE_FONT_SIZE_REM = 3.0; const COMBO_FONT_INCREMENT_REM = 0.5; const COMBO_HUE_INCREMENT = 35; const RAINBOW_INK_COLORS = ['#a78bfa', '#7c3aed', '#2563eb', '#34d399', '#facc15', '#f97316', '#ef4444']; const DEFAULT_INK_BAR_BG_COLOR = '#374151';
const DIFFICULTY_LEVELS_CONFIG: { [key: number | string]: { name: string; class: string; glowColor?: string; glowBlur?: string; pulse?: boolean } } = { 1: { name: "COMÚN", class: "difficulty-1" }, 2: { name: "POCO COMÚN", class: "difficulty-2" }, 3: { name: "RARA", class: "difficulty-3" }, 4: { name: "ÉPICA", class: "difficulty-4", glowColor: "rgba(167, 139, 250, 0.7)", glowBlur: "8px" }, 5: { name: "LEGENDARIA", class: "difficulty-5", glowColor: "rgba(245, 158, 11, 0.7)", glowBlur: "10px", pulse: true }, "easy": { name: "FÁCIL", class: "difficulty-2", glowColor: "rgba(52, 211, 153, 0.6)", glowBlur: "6px" }, "medium": { name: "MEDIO", class: "difficulty-3", glowColor: "rgba(96, 165, 250, 0.7)", glowBlur: "8px" }, "hard": { name: "DIFÍCIL", class: "difficulty-4", glowColor: "rgba(248, 113, 113, 0.7)", glowBlur: "10px", pulse: true }, };

// Mapa de elementos UI (Eliminamos comboDisplay de aquí)
type UIElementsMap = {
    [key: string]: HTMLElement | null | HTMLButtonElement[];
    quizWrapper: HTMLElement | null; quizScrollableContent: HTMLElement | null;
    topUIContainer: HTMLElement | null; statusRow: HTMLElement | null;
    livesDisplay: HTMLElement | null; livesDisplayCount: HTMLElement | null;
    shieldIcon: HTMLElement | null; hintIcon: HTMLElement | null;
    scoreDisplay: HTMLElement | null; scoreDisplayText: HTMLElement | null; scorePulse: HTMLElement | null;
    inkArea: HTMLElement | null; inkLabel: HTMLElement | null; inkBarContainer: HTMLElement | null;
    // comboDisplay: HTMLElement | null; // <-- ELIMINADO DE AQUÍ
    questionBox: HTMLElement | null; questionBoxContent: HTMLElement | null; questionBoxBackdrop: HTMLElement | null;
    difficultyLabel: HTMLElement | null; questionText: HTMLElement | null;
    optionsContainer: HTMLElement | null; optionButtons: HTMLButtonElement[];
    feedbackArea: HTMLElement | null;
    explanationOverlay: HTMLElement | null; explanationText: HTMLElement | null; explanationStatusText: HTMLElement | null;
    blurBackdrop: HTMLElement | null;
    catFoodUiContainer: HTMLElement | null; catFoodButton: HTMLElement | null;
    catFoodBarContainer: HTMLElement | null; catFoodBarFill: HTMLElement | null;
}

type ButtonListenerInfo = { click: (event: MouseEvent | TouchEvent) => void; touchstart?: (event: TouchEvent) => void; };

export class UIManager {
    private gameManager: GameManager;
    private currentUIElements: Partial<UIElementsMap> = {}; // Ya no contiene comboDisplay
    private optionClickCallback: ((key: string) => void) | null = null;
    private optionListeners: Map<HTMLButtonElement, ButtonListenerInfo> = new Map();
    private explanationConfirmListener: ((event: MouseEvent | TouchEvent | KeyboardEvent) => void) | null = null;
    private explanationListenerAdded: boolean = false;
    private lastShownResultType: 'correct' | 'incorrect' | 'shield' | null = null;

    constructor(gameManager: GameManager) {
        this.gameManager = gameManager;
        console.log("UIManager Creado.");
    }

    /**
     * Construye la interfaz principal del quiz. Ya no crea el combo counter.
     */
    public buildQuizInterface(question: Question, containerElement: HTMLElement, onOptionClick: (key: string) => void, currentCombo: number): void {
        if (!question) { /* ... */ return; }
        this.clearQuizInterface(containerElement); // Ya no elimina el combo
        this.optionClickCallback = onOptionClick;

        const elementsMap: Partial<UIElementsMap> = { optionButtons: [] };
        const playerData = this.gameManager.getPlayerData();

        try {
            // 1. Contenedor Principal
            const gameContainer = document.createElement('div');
            gameContainer.className = 'game-container text-center quiz-wrapper';
            containerElement.appendChild(gameContainer);
            elementsMap.quizWrapper = gameContainer;

            // 2. Área Superior
            const scoreArea = document.createElement('div');
            scoreArea.id = 'score-area'; scoreArea.className = 'top-ui-container';
            gameContainer.appendChild(scoreArea);
            elementsMap.topUIContainer = scoreArea;
            // ... (Crear contenido interno de scoreArea como antes) ...
            const statusWrapper = document.createElement('div'); statusWrapper.id = 'status-wrapper'; statusWrapper.className = 'status-row'; scoreArea.appendChild(statusWrapper); elementsMap.statusRow = statusWrapper;
            const livesContainer = document.createElement('div'); livesContainer.id = 'lives-container'; livesContainer.className = 'quiz-lives'; statusWrapper.appendChild(livesContainer); elementsMap.livesDisplay = livesContainer;
                const heartIcon = document.createElement('span'); heartIcon.className = 'life-emoji'; heartIcon.textContent = '❤️'; livesContainer.appendChild(heartIcon);
                const livesCountSpan = document.createElement('span'); livesCountSpan.id = 'lives-count'; livesCountSpan.textContent = '0'; livesContainer.appendChild(livesCountSpan); elementsMap.livesDisplayCount = livesCountSpan;
                const shieldIcon = document.createElement('span'); shieldIcon.id = 'shield-icon'; shieldIcon.textContent = '🛡️'; shieldIcon.style.display = 'none'; livesContainer.appendChild(shieldIcon); elementsMap.shieldIcon = shieldIcon;
                const hintIcon = document.createElement('span'); hintIcon.id = 'hint-icon'; hintIcon.textContent = '💡'; hintIcon.style.display = 'none'; livesContainer.appendChild(hintIcon); elementsMap.hintIcon = hintIcon;
            const scoreDisplayWrapper = document.createElement('div'); scoreDisplayWrapper.id = 'score-display-wrapper'; scoreDisplayWrapper.className = 'quiz-score'; statusWrapper.appendChild(scoreDisplayWrapper); elementsMap.scoreDisplay = scoreDisplayWrapper;
                const scoreEmoji = document.createElement('span'); scoreEmoji.className = 'score-emoji'; scoreEmoji.textContent = '⭐'; scoreDisplayWrapper.appendChild(scoreEmoji);
                const scoreSpan = document.createElement('span'); scoreSpan.id = 'score'; scoreSpan.textContent = '0'; scoreDisplayWrapper.appendChild(scoreSpan); elementsMap.scoreDisplayText = scoreSpan;
                const scorePulse = document.createElement('div'); scorePulse.id = 'score-pulse'; scoreDisplayWrapper.appendChild(scorePulse); elementsMap.scorePulse = scorePulse;
            const inkAreaContainer = document.createElement('div'); inkAreaContainer.id = 'ink-area'; inkAreaContainer.className = 'ink-area'; scoreArea.appendChild(inkAreaContainer); elementsMap.inkArea = inkAreaContainer;
                const inkLabel = document.createElement('div'); inkLabel.id = 'ink-label'; inkLabel.className = 'ink-label-base'; inkLabel.textContent = "Tinta"; if (!playerData.isDrawingUnlocked) inkLabel.classList.add('hidden'); inkAreaContainer.appendChild(inkLabel); elementsMap.inkLabel = inkLabel;
                const inkBarContainer = document.createElement('div'); inkBarContainer.id = 'ink-bar-container'; inkBarContainer.className = 'ink-bar-container-base relative'; if (!playerData.isDrawingUnlocked) inkBarContainer.classList.add('hidden'); inkAreaContainer.appendChild(inkBarContainer); elementsMap.inkBarContainer = inkBarContainer;
                const currentInk = playerData.currentInk; const barCapacity = playerData.INK_BAR_CAPACITY; const fullBars = Math.floor(currentInk / barCapacity); let initialBackgroundColor = DEFAULT_INK_BAR_BG_COLOR; if (fullBars > 0) { const previousColorIndex = (fullBars - 1) % RAINBOW_INK_COLORS.length; initialBackgroundColor = RAINBOW_INK_COLORS[previousColorIndex]; } inkBarContainer.style.backgroundColor = initialBackgroundColor;

            // 3. Wrapper Scrolleable
            const quizContentWrapper = document.createElement('div');
            quizContentWrapper.className = 'quiz-content-wrapper';
            gameContainer.appendChild(quizContentWrapper);

            // 4. Contenedor Scrolleable
            const quizScrollableContent = document.createElement('div');
            quizScrollableContent.className = 'quiz-scrollable-content';
            quizContentWrapper.appendChild(quizScrollableContent);
            elementsMap.quizScrollableContent = quizScrollableContent;

            // 5. Contenido DENTRO de quizScrollableContent
            // Caja de Pregunta
            const questionBox = document.createElement('div');
            questionBox.id = 'question-box'; questionBox.className = 'question-box-base card mb-4 w-full';
            quizScrollableContent.appendChild(questionBox);
            elementsMap.questionBox = questionBox;
             const qBoxContent = document.createElement('div'); qBoxContent.className = 'card__content flex flex-col items-center gap-2'; questionBox.appendChild(qBoxContent); elementsMap.questionBoxContent = qBoxContent;
             const difficultyLabel = document.createElement('span'); difficultyLabel.id = 'difficulty-label'; difficultyLabel.className = 'difficulty-label-base'; qBoxContent.appendChild(difficultyLabel); elementsMap.difficultyLabel = difficultyLabel;
             const qText = document.createElement('p'); qText.id = 'question'; qText.className = 'question-text-base'; qText.textContent = question.text; qBoxContent.appendChild(qText); elementsMap.questionText = qText;
             const qBoxBackdrop = document.createElement('div'); qBoxBackdrop.className = 'card__backdrop'; questionBox.insertBefore(qBoxBackdrop, qBoxContent); elementsMap.questionBoxBackdrop = qBoxBackdrop;
            // Opciones
            const optionsContainer = document.createElement('div');
            optionsContainer.id = 'options'; optionsContainer.className = 'options-container-base flex flex-col gap-3 mb-3 w-full';
            quizScrollableContent.appendChild(optionsContainer);
            elementsMap.optionsContainer = optionsContainer;
             question.options.forEach(option => {
                 if (!option?.key || typeof option.text === 'undefined') return;
                 const button = document.createElement('button'); button.className = 'option-button';
                 button.dataset.key = option.key; button.textContent = option.text;
                 const handleInteraction = (event: MouseEvent | TouchEvent) => { if (event.type === 'touchstart') event.preventDefault(); if (this.optionClickCallback) this.optionClickCallback(option.key);};
                 const listeners: ButtonListenerInfo = { click: handleInteraction, touchstart: handleInteraction };
                 this.optionListeners.set(button, listeners); button.addEventListener('click', listeners.click); button.addEventListener('touchstart', listeners.touchstart!, { passive: false });
                 optionsContainer.appendChild(button); elementsMap.optionButtons?.push(button);
             });
            // Feedback
            const feedbackArea = document.createElement('div');
            feedbackArea.id = 'feedback'; feedbackArea.className = 'feedback-area-base mt-4 text-lg h-8';
            quizScrollableContent.appendChild(feedbackArea);
            elementsMap.feedbackArea = feedbackArea;

            // --- ELIMINADO: Creación del Combo Counter ---
            // const comboCounter = document.createElement('span');
            // comboCounter.id = 'combo-counter'; comboCounter.className = 'combo-counter-base'; comboCounter.style.display = 'none';
            // document.body.appendChild(comboCounter);
            // elementsMap.comboDisplay = comboCounter; // Ya no se guarda aquí

            // --- Guardar referencias a Overlays, etc. ---
             elementsMap.explanationOverlay = document.getElementById('explanation-overlay');
             elementsMap.explanationText = document.getElementById('explanation-text-content');
             elementsMap.blurBackdrop = document.getElementById('blur-backdrop');
             elementsMap.catFoodUiContainer = document.getElementById('cat-food-ui-container');
             elementsMap.catFoodButton = document.getElementById('cat-food-button');
             elementsMap.catFoodBarContainer = document.getElementById('cat-food-bar-container');
             elementsMap.catFoodBarFill = document.getElementById('cat-food-bar-fill');

        } catch (error) { /* ... */ return; }

        // --- Actualizaciones Iniciales y Aplicar Tema ---
        this.currentUIElements = elementsMap as UIElementsMap;
        this.updateScoreDisplay(playerData.score);
        this.updateLivesDisplay(this.gameManager.getLives());
        this.updateShieldIcon(playerData.hasShield);
        this.updateHintIcon(playerData.hintCharges);
        this.updateInkBar();
        this.updateInkVisibility(playerData.isDrawingUnlocked);
        this.updateDifficultyLabel(question.difficulty);
        this.updateComboVisuals(currentCombo); // Llamada inicial (ahora buscará por ID)
        this.updateCatFoodBar(playerData.currentCatFood, playerData.getMaxCatFood());
        this.toggleCatFoodUIVisibility(playerData.isCatFoodUnlocked);

        const themeManager = this.gameManager.getThemeManager();
        const activeTheme = themeManager?.getActiveTheme();
        this.applyThemeStyles(activeTheme ? activeTheme.elements : null);
    }

    /**
     * Aplica/remueve clases de tema de forma segura, preservando otras clases.
     */
    private applyThemeStyles(themeElements: Partial<Theme['elements']> | null): void {
        // console.log("UIManager: Aplicando/Reseteando estilos de tema (safe)..."); // Log opcional
        const allKnownThemeClasses = [ /* ... */ 'theme-retro', 'theme-clean', 'theme-inverted', 'theme-retro-card', 'theme-clean-card', 'theme-inverted-card', 'theme-retro-button', 'theme-clean-button', 'theme-inverted-button' ];
        for (const key in this.currentUIElements) {
            const mapKey = key as keyof UIElementsMap;
            // --- IMPORTANTE: Saltar 'comboDisplay' si aparece aquí ---
            if (mapKey === 'comboDisplay') continue;
            // --- FIN IMPORTANTE ---
            const elementOrArray = this.currentUIElements[mapKey];
            const themeDef = themeElements ? themeElements[mapKey] : null;
            const applyToElement = (element: HTMLElement) => {
                if (!(element instanceof HTMLElement)) return;
                element.classList.remove(...allKnownThemeClasses);
                 const defaultBaseClasses: { [k in keyof UIElementsMap]?: string } = { /* ... */ quizWrapper: 'quiz-wrapper game-container text-center', topUIContainer: 'top-ui-container', statusRow: 'status-row', livesDisplay: 'quiz-lives', scoreDisplay: 'quiz-score', /* comboDisplay: 'combo-counter-base', ELIMINADO */ inkArea: 'ink-area', inkLabel: 'ink-label-base', inkBarContainer: 'ink-bar-container-base', questionBox: 'question-box-base card', optionsContainer: 'options-container-base', feedbackArea: 'feedback-area-base', optionButton: 'option-button' };
                let baseClassesToAdd: string[] = [];
                if (themeDef?.baseClass) { baseClassesToAdd = themeDef.baseClass.split(' ').filter(cls => cls); }
                else if (defaultBaseClasses[mapKey]) { baseClassesToAdd = defaultBaseClasses[mapKey]!.split(' ').filter(cls => cls); }
                 baseClassesToAdd.forEach(cls => { if (!(mapKey === 'questionBox' && themeDef?.wrapperClass) && !element.classList.contains(cls)) element.classList.add(cls); });
                let themeClassesToAdd: string[] = [];
                 if (mapKey === 'questionBox' && themeDef?.wrapperClass) { baseClassesToAdd.forEach(cls => element.classList.remove(cls)); themeClassesToAdd = themeDef.wrapperClass.split(' ').filter(cls => cls); }
                 else if (themeDef?.themeClass) { themeClassesToAdd = themeDef.themeClass.split(' ').filter(cls => cls); }
                 themeClassesToAdd.forEach(cls => { if (!element.classList.contains(cls)) element.classList.add(cls); });
                 if (mapKey === 'feedbackArea') { element.classList.remove('text-green-400','text-red-400','text-blue-400','text-gray-400','feedback-correct','feedback-incorrect','feedback-shield','feedback-info'); }
                 if (themeDef?.initialDisplay !== undefined) { element.style.display = themeDef.initialDisplay; }
                 // --- ELIMINADO: Manejo de display para comboDisplay aquí ---
                 // else if (mapKey === 'comboDisplay') { element.style.display = 'none'; }
                 if (themeDef?.text !== undefined && element.textContent !== themeDef.text) { element.textContent = themeDef.text; }
            };
            if (Array.isArray(elementOrArray)) { if (mapKey === 'optionButtons') elementOrArray.forEach(button => applyToElement(button as HTMLElement)); }
            else if (elementOrArray instanceof HTMLElement) { applyToElement(elementOrArray); }
        }
    }

     /**
     * Limpia la interfaz del quiz. Ya no elimina el combo counter.
     */
    public clearQuizInterface(containerElement: HTMLElement): void {
        this.optionListeners.forEach((listeners, button) => {
            if (button && button.isConnected) {
                 button.removeEventListener('click', listeners.click);
                 if (listeners.touchstart) {
                     button.removeEventListener('touchstart', listeners.touchstart);
                 }
            }
        });
        this.optionListeners.clear();
        // --- ELIMINADO: Búsqueda y eliminación del combo counter ---
        // try { const comboCounter = document.getElementById('combo-counter'); if (comboCounter && comboCounter.parentNode === document.body) { document.body.removeChild(comboCounter); } } catch (e) { console.warn("Error removiendo combo counter:", e); }
        this.removeExplanationListener();
        this.clearExplanationStatus();
        this.currentUIElements = {}; // Limpiar referencias cacheadas
        this.optionClickCallback = null;
        containerElement.innerHTML = '';
    }

    /**
     * Actualiza los efectos visuales del combo. Ahora siempre busca por ID.
     */
    public updateComboVisuals(combo: number): void {
        const root = document.documentElement;
        // *** SIEMPRE buscar por ID ***
        const comboDisplay = document.getElementById('combo-counter') as HTMLElement | null;
        const scoreText = this.currentUIElements?.scoreDisplayText; // Mantener caché para score
        if (!root) { console.error("updateComboVisuals: Root element not found"); return; }

        // Log para depuración
        console.log(`[updateComboVisuals] Called with combo = ${combo}. Elemento ${comboDisplay ? 'ENCONTRADO' : 'NO ENCONTRADO'}.`);

        // Calcular intensidades (sin cambios)
        const flareIntensity = combo < FLARE_START_STREAK ? 0 : Math.min((combo - FLARE_START_STREAK + 1) / (FLARE_MAX_STREAK - FLARE_START_STREAK + 1), 1);
        root.style.setProperty('--flare-intensity', flareIntensity.toFixed(3));
        const glowIntensity = combo < ELEMENT_GLOW_START_STREAK ? 0 : Math.min((combo - ELEMENT_GLOW_START_STREAK + 1) / (ELEMENT_GLOW_MAX_STREAK - ELEMENT_GLOW_START_STREAK + 1), 1);
        root.style.setProperty('--element-glow-intensity', glowIntensity.toFixed(3));

        // Actualizar el elemento del contador de combo
        if (comboDisplay) {
            if (combo > 0) {
                // Actualizar tamaño y color (sin cambios)
                const sizeIncrease = Math.min(Math.max(0, combo - 1), 10);
                const newFontSizeRem = COMBO_BASE_FONT_SIZE_REM + sizeIncrease * COMBO_FONT_INCREMENT_REM;
                root.style.setProperty('--combo-font-size', `${newFontSizeRem.toFixed(2)}rem`);
                comboDisplay.textContent = `x${combo}`;
                const comboHue = (combo * COMBO_HUE_INCREMENT) % 360;
                comboDisplay.style.color = `hsl(${comboHue}, 100%, 65%)`;
                // Asegurar visibilidad
                if (comboDisplay.style.display !== 'block') {
                    console.log(`[updateComboVisuals] Estableciendo display: 'block' para combo ${combo}`);
                    comboDisplay.style.display = 'block';
                }
            } else {
                 // Asegurar que se oculte
                 if (comboDisplay.style.display !== 'none') {
                    console.log(`[updateComboVisuals] Estableciendo display: 'none' para combo ${combo}`);
                    comboDisplay.style.display = 'none';
                 }
                comboDisplay.textContent = '';
                root.style.setProperty('--combo-font-size', `${COMBO_BASE_FONT_SIZE_REM}rem`);
            }
        } else {
            console.warn(`[updateComboVisuals] comboDisplay element (#combo-counter) NOT found when trying to update for combo ${combo}!`);
        }

        // Actualizar color de fondo y score (sin cambios)
        const bgStreakRatio = Math.min(Math.max(0, combo - BG_COLOR_START_STREAK) / (BG_COLOR_MAX_STREAK - BG_COLOR_START_STREAK), 1);
        const bgIntensity = bgStreakRatio * bgStreakRatio; const baseHue = 220; const targetHue = (baseHue + (combo * 10)) % 360;
        const saturation = 30 + bgIntensity * 50; const lightness = 10 + bgIntensity * 15; document.body.style.backgroundColor = `hsl(${targetHue.toFixed(0)}, ${saturation.toFixed(0)}%, ${lightness.toFixed(0)}%)`;
        if (scoreText) { /* ... */ const shouldPulse = flareIntensity > 0.3; scoreText.classList.toggle('score-pulsing', shouldPulse); if (!shouldPulse) { scoreText.style.textShadow = `var(--flare-shadow)`; } const scoreIntensity = Math.min(combo / 10, 1); const scoreLightness = 90 + scoreIntensity * 10; const scoreWeight = 700 + Math.floor(scoreIntensity * 2) * 100; const scoreHue = (targetHue + 180) % 360; const scoreColor = (combo < 2) ? `#f3f4f6` : `hsl(${ scoreHue }, 80%, ${scoreLightness}%)`; scoreText.style.color = scoreColor; scoreText.style.fontWeight = `${scoreWeight}`; }
    }

    // --- Resto de métodos sin cambios ---
    public showExplanation( explanation: string, onConfirm: () => void, resultType?: 'correct' | 'incorrect' | 'shield' | null ): void { const overlay = this.currentUIElements?.explanationOverlay ?? document.getElementById('explanation-overlay'); const textElement = this.currentUIElements?.explanationText ?? document.getElementById('explanation-text-content'); const backdrop = this.currentUIElements?.blurBackdrop ?? document.getElementById('blur-backdrop'); const overlayContentWrapper = overlay?.querySelector('.overlay-content-wrapper') as HTMLElement | null; this.clearExplanationStatus(); if (overlay && textElement && backdrop && overlayContentWrapper && !this.explanationListenerAdded) { textElement.textContent = explanation; if (resultType) { const statusElement = document.createElement('p'); statusElement.id = 'explanation-status-text'; let statusText = '', statusClass = '', statusIcon = ''; switch (resultType) { case 'correct': statusText = "¡Respuesta Correcta!"; statusClass = 'explanation-status-correct'; statusIcon = '✅'; break; case 'incorrect': statusText = "Respuesta Incorrecta"; statusClass = 'explanation-status-incorrect'; statusIcon = '❌'; break; case 'shield': statusText = "¡Escudo Activado!"; statusClass = 'explanation-status-shield'; statusIcon = '🛡️'; break; } statusElement.innerHTML = `${statusIcon} ${statusText}`; statusElement.classList.add('explanation-status-base', statusClass); overlayContentWrapper.insertBefore(statusElement, textElement); this.currentUIElements.explanationStatusText = statusElement; this.lastShownResultType = resultType; } this.removeExplanationListener(); backdrop.style.display = 'block'; overlay.style.display = 'flex'; requestAnimationFrame(() => { backdrop.classList.add('visible'); overlay.classList.add('visible'); }); this.explanationConfirmListener = (event: MouseEvent | TouchEvent | KeyboardEvent) => { if (event.type === 'touchstart') event.preventDefault(); if (this.explanationConfirmListener) { this.hideExplanation(); onConfirm(); }}; setTimeout(() => { if (this.explanationConfirmListener) { overlay.addEventListener('click', this.explanationConfirmListener, { capture: true, once: true }); overlay.addEventListener('touchstart', this.explanationConfirmListener, { passive: false, capture: true, once: true }); window.addEventListener('keydown', this.explanationConfirmListener, { capture: true, once: true }); this.explanationListenerAdded = true; }}, 50); } else if (!overlay || !textElement || !backdrop || !overlayContentWrapper) { console.error("UIManager: Elementos del overlay de explicación o wrapper no encontrados."); onConfirm(); } else if (this.explanationListenerAdded) { console.warn("UIManager: Intento de mostrar explicación mientras los listeners ya están activos."); } }
    public hideExplanation(): void { const overlay = this.currentUIElements?.explanationOverlay ?? document.getElementById('explanation-overlay'); const backdrop = this.currentUIElements?.blurBackdrop ?? document.getElementById('blur-backdrop'); this.removeExplanationListener(); this.clearExplanationStatus(); if (overlay && backdrop) { overlay.classList.remove('visible'); const shopPopup = document.getElementById('shop-popup'); if (!shopPopup || !shopPopup.classList.contains('visible')) { backdrop.classList.remove('visible'); } const onTransitionEnd = (event?: TransitionEvent) => { if (event && (event.target !== overlay || event.propertyName !== 'opacity')) return; if (overlay) overlay.style.display = 'none'; if (!shopPopup || !shopPopup.classList.contains('visible')) { if (backdrop) backdrop.style.display = 'none'; } if (overlay) overlay.removeEventListener('transitionend', onTransitionEnd); }; overlay.addEventListener('transitionend', onTransitionEnd); setTimeout(() => { if (overlay?.classList.contains('visible')) onTransitionEnd(); }, 450); } }
    private removeExplanationListener(): void { const overlay = this.currentUIElements?.explanationOverlay ?? document.getElementById('explanation-overlay'); if (this.explanationConfirmListener) { if (overlay) { overlay.removeEventListener('click', this.explanationConfirmListener, { capture: true }); overlay.removeEventListener('touchstart', this.explanationConfirmListener, { capture: true }); } window.removeEventListener('keydown', this.explanationConfirmListener, { capture: true }); this.explanationConfirmListener = null; this.explanationListenerAdded = false; } }
    private clearExplanationStatus(): void { const statusElement = this.currentUIElements?.explanationStatusText; if (statusElement && statusElement.parentNode) { statusElement.parentNode.removeChild(statusElement); } if (this.currentUIElements) { this.currentUIElements.explanationStatusText = null; } this.lastShownResultType = null; }
    public updateScoreDisplay(score: number): void { const scoreTextElement = this.currentUIElements?.scoreDisplayText; if (scoreTextElement) { scoreTextElement.textContent = score.toString(); } const pulseElement = this.currentUIElements?.scorePulse; if (pulseElement) { pulseElement.classList.remove('pulsing'); void pulseElement.offsetWidth; pulseElement.classList.add('pulsing'); }}
    public updateLivesDisplay(lives: number): void { const livesCountElement = this.currentUIElements?.livesDisplayCount; if (livesCountElement) { livesCountElement.textContent = lives.toString(); }}
    public updateShieldIcon(isActive: boolean): void { const shieldIconElement = this.currentUIElements?.shieldIcon; if (shieldIconElement) { shieldIconElement.style.display = isActive ? 'inline' : 'none'; }}
    public updateHintIcon(charges: number): void { const hintIconElement = this.currentUIElements?.hintIcon; if (hintIconElement) { hintIconElement.style.display = charges > 0 ? 'inline' : 'none'; }}
    public updateFeedback(message: string, type: 'correct' | 'incorrect' | 'shield' | 'info'): void { const feedbackAreaElement = this.currentUIElements?.feedbackArea; if (feedbackAreaElement) { feedbackAreaElement.textContent = message; feedbackAreaElement.className = 'feedback-area-base mt-4 h-8 text-center font-bold'; const colorClassMap = { correct: 'text-green-400 feedback-correct', incorrect: 'text-red-400 feedback-incorrect', shield: 'text-blue-400 feedback-shield', info: 'text-gray-400 feedback-info' }; feedbackAreaElement.classList.add(...colorClassMap[type].split(' ')); }}
    public updateInkBar(): void { const inkBarContainer = this.currentUIElements?.inkBarContainer ?? document.getElementById('ink-bar-container'); if (!inkBarContainer) return; const playerData = this.gameManager.getPlayerData(); const currentInk = playerData.currentInk; const barCapacity = playerData.INK_BAR_CAPACITY; inkBarContainer.innerHTML = ''; const fullBars = Math.floor(currentInk / barCapacity); const currentBarInk = currentInk % barCapacity; const currentBarPercentage = (currentInk === 0 && fullBars === 0) ? 0 : (currentBarInk === 0 && fullBars > 0) ? 100 : (currentBarInk / barCapacity) * 100; let backgroundColor = DEFAULT_INK_BAR_BG_COLOR; if (fullBars > 0) { const previousColorIndex = (fullBars - 1) % RAINBOW_INK_COLORS.length; backgroundColor = RAINBOW_INK_COLORS[previousColorIndex]; } inkBarContainer.style.backgroundColor = backgroundColor; const currentColorIndex = fullBars % RAINBOW_INK_COLORS.length; const currentBarColor = RAINBOW_INK_COLORS[currentColorIndex]; if (currentBarPercentage >= 0) { const currentBarSegment = document.createElement('div'); currentBarSegment.className = 'ink-bar-segment'; currentBarSegment.style.backgroundColor = currentBarColor; currentBarSegment.style.width = `${currentBarPercentage}%`; currentBarSegment.style.transition = 'width 0.3s ease-out, background-color 0.3s ease-out'; inkBarContainer.appendChild(currentBarSegment); }}
    public updateInkVisibility(isUnlocked: boolean): void { const scoreArea = this.currentUIElements?.topUIContainer ?? document.getElementById('score-area'); const inkLabel = this.currentUIElements?.inkLabel ?? document.getElementById('ink-label'); const inkBarContainer = this.currentUIElements?.inkBarContainer ?? document.getElementById('ink-bar-container'); if (inkLabel) { inkLabel.classList.toggle('hidden', !isUnlocked); } if (inkBarContainer) { inkBarContainer.classList.toggle('hidden', !isUnlocked); } if (scoreArea) { scoreArea.classList.toggle('ink-visible', isUnlocked); }}
    public updateDifficultyLabel(difficultyValue: string | number): void { const labelElement = this.currentUIElements?.difficultyLabel; if (!labelElement) return; let config = DIFFICULTY_LEVELS_CONFIG[Number(difficultyValue)] || DIFFICULTY_LEVELS_CONFIG[difficultyValue] || DIFFICULTY_LEVELS_CONFIG[1]; labelElement.textContent = `Pregunta: ${config.name}`; Object.values(DIFFICULTY_LEVELS_CONFIG).forEach(c => { if (c.class) labelElement.classList.remove(c.class); }); if (config.class) labelElement.classList.add(config.class); const root = document.documentElement; root.style.setProperty('--difficulty-glow-color', config.glowColor || 'transparent'); root.style.setProperty('--difficulty-glow-blur', config.glowBlur || '0px'); labelElement.classList.toggle('difficulty-pulse', !!config.pulse); }
    public disableOptions(): void { this.currentUIElements?.optionButtons?.forEach(btn => { if (btn) btn.disabled = true; }); }
    public enableOptions(): void { this.currentUIElements?.optionButtons?.forEach(btn => { if (btn && !btn.classList.contains('option-hint-disabled')) { btn.disabled = false; } }); }
    public applyHintVisuals(correctKey: string): void { let incorrectOptionsDisabled = 0; const optionsToDisable = 1; const buttons = this.currentUIElements?.optionButtons; if (!buttons || buttons.length <= 1) return; const shuffledButtons = [...buttons].sort(() => 0.5 - Math.random()); shuffledButtons.forEach(btn => { if (incorrectOptionsDisabled >= optionsToDisable) return; if (btn && btn.dataset.key !== correctKey && !btn.classList.contains('option-hint-disabled')) { btn.classList.add('option-hint-disabled'); incorrectOptionsDisabled++; } }); }
    private toggleCatFoodUIVisibility(show: boolean): void { const container = this.currentUIElements?.catFoodUiContainer ?? document.getElementById('cat-food-ui-container'); if (container) { container.classList.toggle('hidden', !show); } else { if (show) console.warn("UIManager: Contenedor UI comida (#cat-food-ui-container) no encontrado."); } }
    public showCatFoodUI(): void { this.toggleCatFoodUIVisibility(true); if (!this.currentUIElements.catFoodButton) { this.currentUIElements.catFoodButton = document.getElementById('cat-food-button'); } }
    public updateCatFoodBar(currentAmount: number, maxAmount: number): void { const fillElement = document.getElementById('cat-food-bar-fill') as HTMLElement | null; if (fillElement) { const percentage = maxAmount > 0 ? Math.max(0, Math.min(100, (currentAmount / maxAmount) * 100)) : 0; fillElement.style.width = `${percentage}%`; } }
    public rebuildInterface(): void { const currentState = this.gameManager.getCurrentState(); if (currentState instanceof QuizGameplayState && currentState.currentQuestion) { const appContainer = this.gameManager.getContainerElement(); if (appContainer) { this.buildQuizInterface( currentState.currentQuestion, appContainer, currentState.handleOptionClick.bind(currentState), currentState.consecutiveCorrectAnswers ); const hintWasApplied = (currentState as any).hintAppliedToQuestionId === currentState.currentQuestion.id; if (hintWasApplied && this.gameManager.getPlayerData().hintCharges > 0) { this.applyHintVisuals(currentState.currentQuestion.correctAnswerKey); } } else { console.error("UIManager: Contenedor #app no encontrado al intentar reconstruir."); } } }

} // Fin clase UIManager
