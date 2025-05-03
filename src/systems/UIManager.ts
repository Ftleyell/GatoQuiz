// src/systems/UIManager.ts

import { GameManager } from '../game/GameManager';
// import { Theme, ThemeElementDefinition } from '../types/Theme'; // Descomentar si usas ThemeManager
import { QuizGameplayState } from '../game/states/QuizGameplayState';

// Tipos locales
interface QuestionOption { key: string; text: string; }
interface Question { id: number | string; text: string; options: QuestionOption[]; correctAnswerKey: string; difficulty: string | number; explanation?: string; }

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

// --- NUEVO: Constantes para Barra Arcoíris ---
const RAINBOW_INK_COLORS = [
    '#a78bfa', // Violeta (Base)
    '#7c3aed', // Indigo
    '#2563eb', // Azul
    '#34d399', // Verde
    '#facc15', // Amarillo
    '#f97316', // Naranja
    '#ef4444'  // Rojo
];
const DEFAULT_INK_BAR_BG_COLOR = '#374151'; // Color base del contenedor (usado si fullBars = 0)
// ---------------------------------------

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
    // No necesitamos referencia directa al segmento de tinta aquí
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
    catFoodBarFill: HTMLElement | null; // Mantenemos este para comida
}

// Ajuste: Tipo para almacenar listeners
// --- CORRECCIÓN: Cambiar firma de 'click' ---
type ButtonListenerInfo = {
    click: (event: MouseEvent | TouchEvent) => void; // <-- Cambiado aquí
    touchstart?: (event: TouchEvent) => void;
};
// --- FIN CORRECCIÓN ---

export class UIManager {
    private gameManager: GameManager;
    private currentUIElements: Partial<UIElementsMap> = {};
    private optionClickCallback: ((key: string) => void) | null = null;
    // Ajuste: Cambiar tipo de optionListeners
    private optionListeners: Map<HTMLButtonElement, ButtonListenerInfo> = new Map();
    private explanationConfirmListener: ((event: MouseEvent | TouchEvent | KeyboardEvent) => void) | null = null; // Añadir TouchEvent
    private explanationListenerAdded: boolean = false; // Flag para evitar añadir múltiples listeners

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
        this.clearQuizInterface(containerElement); // Limpia listeners antiguos
        this.optionClickCallback = onOptionClick;

        const elementsMap: Partial<UIElementsMap> = { optionButtons: [] };
        const playerData = this.gameManager.getPlayerData();

        try {
            // --- Creación de Elementos DOM (sin cambios funcionales aquí) ---
            // ... (código para crear gameContainer, contentContainer, scoreArea, statusWrapper, livesContainer, scoreDisplayWrapper, inkAreaContainer, comboCounter, questionBox, optionsContainer, feedbackArea) ...
            // Contenedor Principal del Juego
            const gameContainer = document.createElement('div');
            gameContainer.className = 'game-container text-center quiz-wrapper';
            containerElement.appendChild(gameContainer);
            elementsMap.quizWrapper = gameContainer;

            // Contenedor interno
            const contentContainer = document.createElement('div');
            contentContainer.className = 'quiz-content-container';
            gameContainer.appendChild(contentContainer);
            elementsMap.quizContentContainer = contentContainer;

            // --- Área Superior ---
            const scoreArea = document.createElement('div');
            scoreArea.id = 'score-area';
            scoreArea.className = 'top-ui-container flex flex-col items-center w-full mb-4 gap-1';
            contentContainer.appendChild(scoreArea);
            elementsMap.topUIContainer = scoreArea;

            const statusWrapper = document.createElement('div');
            statusWrapper.id = 'status-wrapper';
            statusWrapper.className = 'status-row flex justify-center items-center w-auto gap-6 mb-1';
            scoreArea.appendChild(statusWrapper);
            elementsMap.statusRow = statusWrapper;

            // Vidas
            const livesContainer = document.createElement('div');
            livesContainer.id = 'lives-container';
            livesContainer.className = 'quiz-lives flex items-center gap-1.5 text-lg';
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
            scoreDisplayWrapper.className = 'quiz-score relative flex items-center';
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
            inkAreaContainer.className = 'ink-area flex flex-col items-center mt-1';
            scoreArea.appendChild(inkAreaContainer);
            elementsMap.inkArea = inkAreaContainer;

            const inkLabel = document.createElement('div'); inkLabel.id = 'ink-label';
            inkLabel.className = 'ink-label-base';
            inkLabel.textContent = "Tinta";
            if (!playerData.isDrawingUnlocked) { inkLabel.classList.add('hidden'); }
            inkAreaContainer.appendChild(inkLabel);
            elementsMap.inkLabel = inkLabel;

            const inkBarContainer = document.createElement('div'); inkBarContainer.id = 'ink-bar-container';
            inkBarContainer.className = 'ink-bar-container-base relative';
            if (!playerData.isDrawingUnlocked) { inkBarContainer.classList.add('hidden'); }
            const currentInk = playerData.currentInk;
            const barCapacity = playerData.INK_BAR_CAPACITY;
            const fullBars = Math.floor(currentInk / barCapacity);
            let initialBackgroundColor = DEFAULT_INK_BAR_BG_COLOR;
            if (fullBars > 0) {
                const previousColorIndex = (fullBars - 1) % RAINBOW_INK_COLORS.length;
                initialBackgroundColor = RAINBOW_INK_COLORS[previousColorIndex];
            }
            inkBarContainer.style.backgroundColor = initialBackgroundColor;
            inkAreaContainer.appendChild(inkBarContainer);
            elementsMap.inkBarContainer = inkBarContainer;

            // --- Contador de Combo ---
            const comboCounter = document.createElement('span');
            comboCounter.id = 'combo-counter';
            comboCounter.className = 'combo-counter-base';
            comboCounter.style.display = 'none';
            document.body.appendChild(comboCounter);
            elementsMap.comboDisplay = comboCounter;

            // --- Caja de Pregunta ---
            const questionBox = document.createElement('div');
            questionBox.id = 'question-box';
            questionBox.className = 'question-box-base card mb-4 w-full';
            contentContainer.appendChild(questionBox);
            elementsMap.questionBox = questionBox;

            const qBoxContent = document.createElement('div');
            qBoxContent.className = 'card__content flex flex-col items-center gap-2';
            questionBox.appendChild(qBoxContent);
            elementsMap.questionBoxContent = qBoxContent;

            // Etiqueta de Dificultad
            const difficultyLabel = document.createElement('span');
            difficultyLabel.id = 'difficulty-label';
            difficultyLabel.className = 'difficulty-label-base';
            qBoxContent.appendChild(difficultyLabel);
            elementsMap.difficultyLabel = difficultyLabel;

            // Texto de la Pregunta
            const qText = document.createElement('p');
            qText.id = 'question';
            qText.className = 'question-text-base';
            qText.textContent = question.text;
            qBoxContent.appendChild(qText);
            elementsMap.questionText = qText;

            // Backdrop para efecto glow (si es necesario)
            const qBoxBackdrop = document.createElement('div');
            qBoxBackdrop.className = 'card__backdrop';
            questionBox.insertBefore(qBoxBackdrop, qBoxContent);
            elementsMap.questionBoxBackdrop = qBoxBackdrop;

            // --- Contenedor de Opciones ---
            const optionsContainer = document.createElement('div');
            optionsContainer.id = 'options';
            optionsContainer.className = 'options-container-base flex flex-col gap-3 mb-3 w-full';
            contentContainer.appendChild(optionsContainer);
            elementsMap.optionsContainer = optionsContainer;

            // Botones de Opción
            question.options.forEach(option => {
                 if (!option?.key || typeof option.text === 'undefined') {
                     console.warn("Opción inválida encontrada:", option); return;
                 }
                 const button = document.createElement('button');
                 button.className = 'option-button';
                 button.dataset.key = option.key;
                 button.textContent = option.text;

                 // --- Ajuste para Touch ---
                 // Crear la función de callback una vez
                 const handleInteraction = (event: MouseEvent | TouchEvent) => {
                    // Prevenir comportamiento por defecto solo en touch para evitar zoom/scroll accidental
                    if (event.type === 'touchstart') {
                        event.preventDefault();
                    }
                    // Llamar al callback original si existe
                    if (this.optionClickCallback) {
                        this.optionClickCallback(option.key);
                    }
                 };

                 // Guardar referencias a los listeners para poder removerlos
                 const listeners: ButtonListenerInfo = {
                     click: handleInteraction, // <--- Ahora acepta el evento
                     touchstart: handleInteraction // Llama a la misma función
                 };
                 this.optionListeners.set(button, listeners);

                 // Añadir ambos listeners
                 button.addEventListener('click', listeners.click);
                 // Usar passive: false para poder llamar preventDefault si es necesario
                 button.addEventListener('touchstart', listeners.touchstart!, { passive: false });
                 // --- Fin Ajuste para Touch ---

                 optionsContainer.appendChild(button);
                 elementsMap.optionButtons?.push(button);
            });

            // --- Área de Feedback ---
            const feedbackArea = document.createElement('div');
            feedbackArea.id = 'feedback';
            feedbackArea.className = 'feedback-area-base mt-4 text-lg h-8';
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

        // --- Actualizaciones Iniciales de Estado (sin cambios aquí) ---
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
    }

    /**
     * Limpia la interfaz del quiz, removiendo elementos y listeners.
     */
    public clearQuizInterface(containerElement: HTMLElement): void {
        // Ajuste: Remover ambos listeners
        this.optionListeners.forEach((listeners, button) => {
            if (button && button.isConnected) {
                 button.removeEventListener('click', listeners.click);
                 if (listeners.touchstart) {
                     button.removeEventListener('touchstart', listeners.touchstart);
                 }
            }
        });
        this.optionListeners.clear();

        const comboCounter = document.getElementById('combo-counter');
        if (comboCounter && comboCounter.parentNode) {
            comboCounter.parentNode.removeChild(comboCounter);
        }

        this.removeExplanationListener(); // Asegurarse que este también remueva touchstart si se añade
        this.currentUIElements = {};
        this.optionClickCallback = null;
        containerElement.innerHTML = '';
    }


    // --- Métodos para Explicación ---
    public showExplanation(explanation: string, onConfirm: () => void): void {
        const overlay = this.currentUIElements?.explanationOverlay ?? document.getElementById('explanation-overlay');
        const textElement = this.currentUIElements?.explanationText ?? document.getElementById('explanation-text-content');
        const backdrop = this.currentUIElements?.blurBackdrop ?? document.getElementById('blur-backdrop');

        if (overlay && textElement && backdrop && !this.explanationListenerAdded) { // Evitar añadir listeners múltiples
            textElement.textContent = explanation;
            this.removeExplanationListener(); // Limpiar por si acaso
            backdrop.style.display = 'block';
            overlay.style.display = 'flex';
            void overlay.offsetHeight; void backdrop.offsetHeight;
            backdrop.classList.add('visible');
            overlay.classList.add('visible');

            // Ajuste: Crear un único handler para click, touchstart y keydown
            this.explanationConfirmListener = (event: MouseEvent | TouchEvent | KeyboardEvent) => {
                // Prevenir comportamiento por defecto en touch
                if (event.type === 'touchstart') {
                    event.preventDefault();
                }
                // Solo proceder si el listener todavía está activo (evita doble ejecución)
                if (this.explanationConfirmListener) {
                    this.hideExplanation(); // Llama a removeExplanationListener internamente
                    onConfirm();
                }
            };

            // Añadir listeners con un pequeño retraso para evitar activación accidental
            setTimeout(() => {
                if (this.explanationConfirmListener) {
                    // Añadir listeners al overlay
                    overlay.addEventListener('click', this.explanationConfirmListener, { capture: true, once: true });
                    overlay.addEventListener('touchstart', this.explanationConfirmListener, { passive: false, capture: true, once: true }); // Añadir touchstart
                    // Añadir listener de teclado a window
                    window.addEventListener('keydown', this.explanationConfirmListener, { capture: true, once: true });
                    this.explanationListenerAdded = true; // Marcar que los listeners están activos
                    console.log("UIManager: Listeners para confirmar explicación añadidos (click, touchstart, keydown).");
                }
            }, 50); // 50ms de retraso

        } else if (!overlay || !textElement || !backdrop) {
            console.error("UIManager: Elementos del overlay de explicación no encontrados.");
            onConfirm(); // Ejecutar confirmación si no se puede mostrar overlay
        } else if (this.explanationListenerAdded) {
             console.warn("UIManager: Intento de mostrar explicación mientras los listeners ya están activos.");
        }
    }
    public hideExplanation(): void {
        const overlay = this.currentUIElements?.explanationOverlay ?? document.getElementById('explanation-overlay');
        const backdrop = this.currentUIElements?.blurBackdrop ?? document.getElementById('blur-backdrop');
        this.removeExplanationListener(); // Limpiar listeners primero
        if (overlay && backdrop) {
            overlay.classList.remove('visible');
            const shopPopup = document.getElementById('shop-popup');
            // Solo ocultar backdrop si la tienda tampoco está visible
            if (!shopPopup || !shopPopup.classList.contains('visible')) {
                 backdrop.classList.remove('visible');
            }
            // Usar una función nombrada para el listener de transitionend
            const onTransitionEnd = (event?: TransitionEvent) => {
                // Asegurarse que la transición correcta terminó
                if (event && (event.target !== overlay || event.propertyName !== 'opacity')) return;
                if (overlay) overlay.style.display = 'none';
                // Solo ocultar backdrop si la tienda tampoco está visible
                if (!shopPopup || !shopPopup.classList.contains('visible')) {
                    if (backdrop) backdrop.style.display = 'none';
                }
                if (overlay) overlay.removeEventListener('transitionend', onTransitionEnd);
            };
            // Añadir listener y fallback con setTimeout
            overlay.addEventListener('transitionend', onTransitionEnd);
            setTimeout(() => {
                // Si después de la duración + un margen, sigue visible, forzar ocultación
                if (overlay?.classList.contains('visible')) {
                    console.warn("UIManager: transitionend no se disparó para explicación, forzando ocultación.");
                    onTransitionEnd(); // Llamar manualmente
                }
            }, 450); // Duración de la transición + 50ms margen
        }
     }
    private removeExplanationListener(): void {
        const overlay = this.currentUIElements?.explanationOverlay ?? document.getElementById('explanation-overlay');
        if (this.explanationConfirmListener) {
            if (overlay) {
                overlay.removeEventListener('click', this.explanationConfirmListener, { capture: true });
                overlay.removeEventListener('touchstart', this.explanationConfirmListener, { capture: true }); // Remover touchstart
            }
            window.removeEventListener('keydown', this.explanationConfirmListener, { capture: true });
            this.explanationConfirmListener = null;
            this.explanationListenerAdded = false; // Marcar que los listeners están inactivos
            // console.log("UIManager: Listeners de confirmación de explicación removidos."); // Log opcional
        }
     }

    // --- Métodos de Actualización de Estado Simple (sin cambios) ---
    public updateScoreDisplay(score: number): void {
        const scoreTextElement = this.currentUIElements?.scoreDisplayText;
        if (scoreTextElement) { scoreTextElement.textContent = score.toString(); }
        const pulseElement = this.currentUIElements?.scorePulse;
        if (pulseElement) { pulseElement.classList.remove('pulsing'); void pulseElement.offsetWidth; pulseElement.classList.add('pulsing'); }
    }
    public updateLivesDisplay(lives: number): void {
        const livesCountElement = this.currentUIElements?.livesDisplayCount;
        if (livesCountElement) { livesCountElement.textContent = lives.toString(); }
    }
    public updateShieldIcon(isActive: boolean): void {
        const shieldIconElement = this.currentUIElements?.shieldIcon;
        if (shieldIconElement) { shieldIconElement.style.display = isActive ? 'inline' : 'none'; }
    }
    public updateHintIcon(charges: number): void {
        const hintIconElement = this.currentUIElements?.hintIcon;
        if (hintIconElement) { hintIconElement.style.display = charges > 0 ? 'inline' : 'none'; }
    }
    public updateFeedback(message: string, type: 'correct' | 'incorrect' | 'shield' | 'info'): void {
        const feedbackAreaElement = this.currentUIElements?.feedbackArea;
        if (feedbackAreaElement) {
            feedbackAreaElement.textContent = message;
            feedbackAreaElement.className = 'feedback-area-base mt-4 h-8 text-center font-bold'; // Resetear clases
            const colorClass = type === 'correct' ? 'text-green-400 feedback-correct' :
                               type === 'incorrect' ? 'text-red-400 feedback-incorrect' :
                               type === 'shield' ? 'text-blue-400 feedback-shield' :
                               'text-gray-400 feedback-info';
             feedbackAreaElement.classList.add(...colorClass.split(' '));
        }
    }


    /** Actualiza la visualización de la barra de tinta con fondo del color anterior. */
    public updateInkBar(): void {
        const inkBarContainer = this.currentUIElements?.inkBarContainer ?? document.getElementById('ink-bar-container');
        if (!inkBarContainer) return;

        const playerData = this.gameManager.getPlayerData();
        const currentInk = playerData.currentInk;
        const barCapacity = playerData.INK_BAR_CAPACITY;

        inkBarContainer.innerHTML = ''; // Limpiar barras anteriores

        const fullBars = Math.floor(currentInk / barCapacity);
        const currentBarInk = currentInk % barCapacity;
        const currentBarPercentage = (currentInk === 0 && fullBars === 0) ? 0 :
                                     (currentBarInk === 0 && fullBars > 0) ? 100 :
                                     (currentBarInk / barCapacity) * 100;

        let backgroundColor = DEFAULT_INK_BAR_BG_COLOR;
        if (fullBars > 0) {
            const previousColorIndex = (fullBars - 1) % RAINBOW_INK_COLORS.length;
            backgroundColor = RAINBOW_INK_COLORS[previousColorIndex];
        }
        inkBarContainer.style.backgroundColor = backgroundColor;

        const currentColorIndex = fullBars % RAINBOW_INK_COLORS.length;
        const currentBarColor = RAINBOW_INK_COLORS[currentColorIndex];

        if (currentBarPercentage >= 0) {
            const currentBarSegment = document.createElement('div');
            currentBarSegment.className = 'ink-bar-segment'; // Usa la clase definida en ink.css
            currentBarSegment.style.backgroundColor = currentBarColor;
            currentBarSegment.style.width = `${currentBarPercentage}%`;
            // La transición debería estar definida en la clase CSS .ink-bar-segment
            // currentBarSegment.style.transition = 'width 0.3s ease-out, background-color 0.3s ease-out';
            inkBarContainer.appendChild(currentBarSegment);
        }
    }


    /** Controla la visibilidad de la UI de tinta y ajusta el contenedor padre */
    public updateInkVisibility(isUnlocked: boolean): void {
        const scoreArea = this.currentUIElements?.topUIContainer ?? document.getElementById('score-area');
        const inkLabel = this.currentUIElements?.inkLabel ?? document.getElementById('ink-label');
        const inkBarContainer = this.currentUIElements?.inkBarContainer ?? document.getElementById('ink-bar-container');

        if (inkLabel) { inkLabel.classList.toggle('hidden', !isUnlocked); }
        if (inkBarContainer) { inkBarContainer.classList.toggle('hidden', !isUnlocked); }
        if (scoreArea) { scoreArea.classList.toggle('ink-visible', isUnlocked); }
    }


    /** Actualiza la etiqueta de dificultad (texto, clase, efectos visuales). */
    public updateDifficultyLabel(difficultyValue: string | number): void {
        const labelElement = this.currentUIElements?.difficultyLabel;
        if (!labelElement) return;
        let config = DIFFICULTY_LEVELS_CONFIG[Number(difficultyValue)] || DIFFICULTY_LEVELS_CONFIG[difficultyValue] || DIFFICULTY_LEVELS_CONFIG[1];
        labelElement.textContent = `Pregunta: ${config.name}`;
        Object.values(DIFFICULTY_LEVELS_CONFIG).forEach(c => { if (c.class) labelElement.classList.remove(c.class); });
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

        const flareIntensity = combo < FLARE_START_STREAK ? 0 : Math.min((combo - FLARE_START_STREAK + 1) / (FLARE_MAX_STREAK - FLARE_START_STREAK + 1), 1);
        root.style.setProperty('--flare-intensity', flareIntensity.toFixed(3));
        const glowIntensity = combo < ELEMENT_GLOW_START_STREAK ? 0 : Math.min((combo - ELEMENT_GLOW_START_STREAK + 1) / (ELEMENT_GLOW_MAX_STREAK - ELEMENT_GLOW_START_STREAK + 1), 1);
        root.style.setProperty('--element-glow-intensity', glowIntensity.toFixed(3));

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

        const bgStreakRatio = Math.min(Math.max(0, combo - BG_COLOR_START_STREAK) / (BG_COLOR_MAX_STREAK - BG_COLOR_START_STREAK), 1);
        const bgIntensity = bgStreakRatio * bgStreakRatio;
        const baseHue = 220; const targetHue = (baseHue + (combo * 10)) % 360;
        const saturation = 30 + bgIntensity * 50; const lightness = 10 + bgIntensity * 15;
        document.body.style.backgroundColor = `hsl(${targetHue.toFixed(0)}, ${saturation.toFixed(0)}%, ${lightness.toFixed(0)}%)`;

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
        this.currentUIElements?.optionButtons?.forEach(btn => { if (btn) btn.disabled = true; });
    }

    /** Habilita los botones de opción (excepto los marcados como hinted). */
    public enableOptions(): void {
        this.currentUIElements?.optionButtons?.forEach(btn => { if (btn && !btn.classList.contains('option-hint-disabled')) { btn.disabled = false; } });
    }

    /** Marca visualmente las opciones incorrectas cuando se usa una pista. */
    public applyHintVisuals(correctKey: string): void {
        let incorrectOptionsDisabled = 0; const optionsToDisable = 1;
        const buttons = this.currentUIElements?.optionButtons; if (!buttons || buttons.length <= 1) return;
        const shuffledButtons = [...buttons].sort(() => 0.5 - Math.random());
        shuffledButtons.forEach(btn => {
            if (incorrectOptionsDisabled >= optionsToDisable) return;
            if (btn && btn.dataset.key !== correctKey && !btn.classList.contains('option-hint-disabled')) {
                 btn.classList.add('option-hint-disabled');
                 incorrectOptionsDisabled++;
            }
        });
    }


    // --- Métodos para UI de Comida ---
    private toggleCatFoodUIVisibility(show: boolean): void {
        const container = this.currentUIElements?.catFoodUiContainer ?? document.getElementById('cat-food-ui-container');
        if (container) { container.classList.toggle('hidden', !show); }
        else { if (show) console.warn("UIManager: Contenedor UI comida (#cat-food-ui-container) no encontrado."); }
    }
    public showCatFoodUI(): void {
        this.toggleCatFoodUIVisibility(true);
        if (!this.currentUIElements.catFoodButton) { this.currentUIElements.catFoodButton = document.getElementById('cat-food-button'); }
    }
    public updateCatFoodBar(currentAmount: number, maxAmount: number): void {
        // <<< LOGS AÑADIDOS >>>
        console.log(`[UIManager.updateCatFoodBar] Llamado con: current=${currentAmount}, max=${maxAmount}`);
        const fillElement = document.getElementById('cat-food-bar-fill') as HTMLElement | null;
        if (fillElement) {
            const percentage = maxAmount > 0 ? Math.max(0, Math.min(100, (currentAmount / maxAmount) * 100)) : 0;
            // <<< LOG AÑADIDO >>>
            console.log(` -> Calculando porcentaje: ${percentage.toFixed(1)}%`);
            fillElement.style.width = `${percentage}%`;
        } else {
            // <<< LOG AÑADIDO >>>
            console.warn("[UIManager.updateCatFoodBar] Elemento #cat-food-bar-fill NO encontrado.");
        }
    }
    // --- Reconstrucción de Interfaz ---
     public rebuildInterface(): void {
        const currentState = this.gameManager.getCurrentState();
        if (currentState instanceof QuizGameplayState && currentState.currentQuestion) {
            const appContainer = this.gameManager.getContainerElement();
            if (appContainer) {
                this.buildQuizInterface( currentState.currentQuestion, appContainer, currentState.handleOptionClick.bind(currentState), currentState.consecutiveCorrectAnswers );
                const hintApplied = (currentState as any).hintAppliedToQuestionId === currentState.currentQuestion.id;
                if (hintApplied && this.gameManager.getPlayerData().hintCharges > 0) { this.applyHintVisuals(currentState.currentQuestion.correctAnswerKey); }
            } else { console.error("UIManager: Contenedor #app no encontrado al intentar reconstruir."); }
        }
    }

} // Fin clase UIManager