// src/game/components/ui/quiz-question-display.ts
import { LitElement, html, css, CSSResultGroup, PropertyValueMap } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';

// Copiamos la configuración de dificultad aquí para que el componente sea autocontenido
const DIFFICULTY_LEVELS_CONFIG: { [key: number | string]: { name: string; class: string; glowColor?: string; glowBlur?: string; pulse?: boolean } } = {
    1: { name: "COMÚN", class: "difficulty-1" },
    2: { name: "POCO COMÚN", class: "difficulty-2" },
    3: { name: "RARA", class: "difficulty-3" },
    4: { name: "ÉPICA", class: "difficulty-4", glowColor: "rgba(167, 139, 250, 0.7)", glowBlur: "8px" },
    5: { name: "LEGENDARIA", class: "difficulty-5", glowColor: "rgba(245, 158, 11, 0.7)", glowBlur: "10px", pulse: true },
    "easy": { name: "FÁCIL", class: "difficulty-2", glowColor: "rgba(52, 211, 153, 0.6)", glowBlur: "6px" },
    "medium": { name: "MEDIO", class: "difficulty-3", glowColor: "rgba(96, 165, 250, 0.7)", glowBlur: "8px" },
    "hard": { name: "DIFÍCIL", class: "difficulty-4", glowColor: "rgba(248, 113, 113, 0.7)", glowBlur: "10px", pulse: true },
};

// Variable CSS global para el glow de elementos (usada por la sombra del card)
const ELEMENT_GLOW_INTENSITY_VAR = css`var(--element-glow-intensity, 0)`;

@customElement('quiz-question-display')
export class QuizQuestionDisplay extends LitElement {

  // --- Propiedades (Inputs) ---
  @property({ type: String }) difficulty: string | number = '1';
  @property({ type: String }) questionText = 'Cargando pregunta...';
  @property({ type: String }) theme = 'clean'; // 'clean', 'retro', 'inverted'

  // --- Estado Interno (Calculado) ---
  @state() private _difficultyConfig = DIFFICULTY_LEVELS_CONFIG[1];
  @state() private _difficultyGlowColor = 'transparent';
  @state() private _difficultyGlowBlur = '0px';

  // --- Estilos Encapsulados ---
  static styles: CSSResultGroup = css`
    :host {
      display: block; /* Ocupa el ancho disponible */
      width: 100%;
      margin-bottom: 1.5rem; /* Espacio inferior como en el layout original */
      box-sizing: border-box;
    }

    /* Contenedor principal (Card) */
    .question-box-internal {
      width: 100%;
      min-height: 5em; /* Altura mínima base */
      height: auto; /* Permitir crecer */
      display: flex; /* Usar flex para centrar contenido interno */
      flex-direction: column;
      align-items: center;
      justify-content: center; /* Centrar verticalmente si hay espacio extra */
      border-radius: 0.75rem;
      padding: 1rem; /* Padding base */
      gap: 0.4rem;
      box-sizing: border-box;
      position: relative; /* Para el backdrop en tema retro */
      overflow: hidden; /* Para contener backdrop */
      transition: box-shadow 0.5s ease-out; /* Transición para glow */
    }

    /* Contenido interno (para tema retro) */
    .card__content {
      width: 100%;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: inherit; /* Heredar gap del padre */
      position: relative; /* Para estar sobre el backdrop */
      z-index: 10;
    }

    /* --- Estilos de Card por Tema --- */

    /* Tema Limpio (Clean) */
    .question-box-internal.theme-clean {
      background-color: rgba(17, 24, 39, 0.85); /* Fondo oscuro semi-transparente */
      border: 1px solid rgba(75, 85, 99, 0.5); /* Borde sutil */
      box-shadow: inset 0 1px 2px rgba(0,0,0,0.2), /* Sombra interior */
                  0 0 calc(${ELEMENT_GLOW_INTENSITY_VAR} * 18px) calc(${ELEMENT_GLOW_INTENSITY_VAR} * 4px) hsla(50, 100%, 60%, calc(${ELEMENT_GLOW_INTENSITY_VAR} * 0.6)); /* Glow externo */
    }

    /* Tema Retro */
    .question-box-internal.theme-retro {
      --retro-card-bg: #1f2937; /* Color base retro card */
      --retro-card-brad: 0.4rem; /* Radio borde retro */
      border-radius: var(--retro-card-brad);
      background: color-mix(in srgb, var(--retro-card-bg), #fff 5%);
      border: none;
      /* Sombra de glow general (puede ser sobreescrita por glow dificultad) */
       box-shadow: 0 0 calc(${ELEMENT_GLOW_INTENSITY_VAR} * 18px) calc(${ELEMENT_GLOW_INTENSITY_VAR} * 4px) hsla(50, 100%, 60%, calc(${ELEMENT_GLOW_INTENSITY_VAR} * 0.6));
    }
    /* Backdrop para tema retro */
    .card__backdrop {
      --grad: hsl(from var(--retro-card-bg) h s l);
      position: absolute;
      inset: 0;
      background-image: radial-gradient(
          150% var(--gh, 0%) at 25% 100%,
          var(--grad), transparent
        ),
        radial-gradient(
          150% calc(300% - var(--gh, 0%) + 25%) at 75% 100%,
          var(--grad), transparent
        );
      transition: --gh 1s ease;
      z-index: 1;
      animation: wobble 3s infinite alternate;
      border-radius: inherit; /* Heredar redondeo */
    }
    .card__backdrop::before {
      content: ""; position: absolute; inset: 0.1rem;
      background: rgba(0 0 0 / 0.2); border-radius: inherit;
      backdrop-filter: blur(10px) contrast(1.5); z-index: 2;
    }
    .card__backdrop::after {
      --p: 0.12rem; --p2x: calc(var(--p) * 2);
      content: ""; position: absolute; inset: 0.15em;
      background-image: radial-gradient(circle at center, #000 50%, #fff 1px);
      background-size: var(--p2x) var(--p2x); border-radius: inherit;
      mix-blend-mode: color-burn; z-index: 3; opacity: 0.5;
    }
    @keyframes wobble { from { --gh: 25%; } to { --gh: 300%; } }

    /* Tema Invertido (Placeholder) */
    .question-box-internal.theme-inverted {
      background-color: #f3f4f6; /* Fondo claro */
      border: 1px solid #d1d5db;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      color: #1f2937; /* Texto oscuro por defecto */
    }

    /* --- Estilos de Elementos Internos --- */

    /* Etiqueta de Dificultad */
    .difficulty-label {
      text-align: center; display: block; margin-left: auto; margin-right: auto;
      width: fit-content;
      font-size: 0.65rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      padding: 0.1rem 0.4rem;
      border-radius: 0.25rem;
      line-height: 1.2;
      transition: color 0.3s ease, background-color 0.3s ease, text-shadow 0.3s ease;
      /* Sombra de texto para el glow de dificultad */
      text-shadow: 0 0 var(--difficulty-glow-blur, 0px) var(--difficulty-glow-color, transparent),
                   0 0 calc(var(--difficulty-glow-blur, 0px) * 1.5) var(--difficulty-glow-color, transparent);
      flex-shrink: 0;
      margin-bottom: 0.3rem;
    }
    /* Clases de color/fondo por dificultad */
    .difficulty-1 { color: #9ca3af; background-color: rgba(107, 114, 128, 0.2); }
    .difficulty-2 { color: #34d399; background-color: rgba(16, 185, 129, 0.2); }
    .difficulty-3 { color: #60a5fa; background-color: rgba(59, 130, 246, 0.2); }
    .difficulty-4 { color: #c4b5fd; background-color: rgba(167, 139, 250, 0.2); }
    .difficulty-5 { color: #fbbf24; background-color: rgba(245, 158, 11, 0.2); }
    /* Animación de pulso para dificultad */
    @keyframes difficultyPulse {
      0%, 100% { transform: scale(1); opacity: 1; }
      50% { transform: scale(1.05); opacity: 0.9; }
    }
    .difficulty-pulse {
      animation: difficultyPulse 1.2s infinite ease-in-out;
    }

    /* Texto de la Pregunta */
    .question-text {
      font-size: 1.1rem;
      font-weight: 600;
      line-height: 1.5;
      color: inherit; /* Hereda color del contenedor (útil para tema invertido) */
      text-align: center;
      width: 100%;
      word-break: break-word;
      hyphens: auto;
      flex-grow: 1; /* Ocupa espacio vertical disponible */
    }
    /* Color específico para temas oscuros */
    .theme-clean .question-text,
    .theme-retro .question-text {
        color: #e5e7eb;
    }


    /* Media Queries */
    @media (max-width: 768px) {
      .question-box-internal { padding: 0.8rem; min-height: 4.5em; }
      .difficulty-label { font-size: 0.6rem; padding: 0.1rem 0.35rem; }
      .question-text { font-size: 1rem; line-height: 1.4; }
    }
     @media (max-width: 480px) {
      .question-box-internal { padding: 0.6rem; min-height: 4em; }
      .difficulty-label { font-size: 0.55rem; }
      .question-text { font-size: 0.9rem; }
    }
  `;

  // --- Ciclo de Vida: Actualizar estado cuando las propiedades cambian ---
  protected updated(changedProperties: PropertyValueMap<any> | Map<PropertyKey, unknown>): void {
    super.updated(changedProperties);
    if (changedProperties.has('difficulty')) {
      this._updateDifficultyConfig();
    }
  }

  // --- Lógica Interna ---
  private _updateDifficultyConfig() {
    this._difficultyConfig = DIFFICULTY_LEVELS_CONFIG[this.difficulty] || DIFFICULTY_LEVELS_CONFIG[1];
    this._difficultyGlowColor = this._difficultyConfig.glowColor || 'transparent';
    this._difficultyGlowBlur = this._difficultyConfig.glowBlur || '0px';
    // Actualizar variables CSS para el glow
    this.style.setProperty('--difficulty-glow-color', this._difficultyGlowColor);
    this.style.setProperty('--difficulty-glow-blur', this._difficultyGlowBlur);
  }

  // --- Template HTML ---
  render() {
    const themeClass = `theme-${this.theme}`;
    const difficultyClass = this._difficultyConfig.class || 'difficulty-1';
    const shouldPulse = this._difficultyConfig.pulse || false;

    // Renderizar estructura base y contenido interno
    const content = html`
      <span
        class="difficulty-label ${difficultyClass} ${shouldPulse ? 'difficulty-pulse' : ''}"
        part="difficulty"
      >
        Pregunta: ${this._difficultyConfig.name}
      </span>
      <p class="question-text" part="text">
        ${this.questionText}
      </p>
    `;

    // Añadir backdrop solo para tema retro
    const backdrop = this.theme === 'retro' ? html`<div class="card__backdrop"></div>` : '';

    return html`
      <div class="question-box-internal ${themeClass}">
        ${backdrop}
        <div class="card__content">
           ${content}
        </div>
      </div>
    `;
  }
}

// Declaración global
declare global {
  interface HTMLElementTagNameMap {
    'quiz-question-display': QuizQuestionDisplay;
  }
}