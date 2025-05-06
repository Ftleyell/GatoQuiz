// src/components/ui/score-display.ts
import { LitElement, html, css, CSSResultGroup, PropertyValueMap } from 'lit';
import { customElement, property, state, query } from 'lit/decorators.js';

// Constantes para cálculo de efectos (iguales que en UIManager)
const FLARE_START_STREAK = 1;
const FLARE_MAX_STREAK = 10;

@customElement('score-display')
export class ScoreDisplay extends LitElement {

  // --- Propiedades (Inputs) ---
  @property({ type: Number }) score = 0;
  @property({ type: Number }) combo = 0;

  // --- Estado Interno ---
  @state() private _flareIntensity = 0;
  @state() private _shouldPulse = false;
  @state() private _scoreColor = '#f3f4f6'; // Color inicial
  @state() private _scoreWeight = 800;     // Peso inicial

  // --- Query Selectors Internos ---
  @query('#score-text-internal') private _scoreTextElement!: HTMLElement;
  @query('#score-pulse-internal') private _scorePulseElement!: HTMLElement;

  // --- Estilos Encapsulados ---
  static styles: CSSResultGroup = css`
    :host {
      display: inline-flex; /* Ajusta al contenido */
      align-items: center;
      position: relative; /* Para el elemento de pulso */
      font-family: 'Poppins', sans-serif; /* Fuente base */
    }

    .score-emoji {
      font-size: 1.5rem; /* Ajustar según sea necesario */
      line-height: 1;
      margin-right: 0.3rem; /* Espacio entre emoji y texto */
      user-select: none;
    }

    #score-text-internal {
      /* Transiciones para cambios suaves */
      transition: color 0.5s ease, font-weight 0.5s ease, text-shadow 0.6s ease-out;
      font-size: var(--score-font-size, 2rem); /* Usa variable global o fallback */
      line-height: var(--score-line-height, 1.1);
      /* font-weight se aplica dinámicamente */
      /* color se aplica dinámicamente */
      /* text-shadow se aplica dinámicamente */
      text-align: center;
      min-width: 1ch; /* Evita saltos con números pequeños */
      user-select: none;
    }

    /* Animación de pulso para la sombra */
    @keyframes pulseFlare {
      0%, 100% { text-shadow: var(--flare-shadow); opacity: 1; }
      50% { text-shadow: var(--flare-shadow-pulse); opacity: 0.85; }
    }

    #score-text-internal.score-pulsing {
      animation: pulseFlare 1.5s infinite ease-in-out;
    }

    /* Elemento para la animación de onda expansiva */
    #score-pulse-internal {
      position: absolute;
      left: 50%;
      top: 50%;
      transform: translate(-50%, -50%) scale(0);
      width: 1px;
      height: 1px;
      border-radius: 50%;
      background-color: rgba(255, 255, 255, 0.7);
      opacity: 0;
      z-index: -1;
      pointer-events: none;
    }

    /* Animación de la onda expansiva */
    @keyframes scorePulseAnim {
      0% { transform: translate(-50%, -50%) scale(0); opacity: 0.7; }
      100% { transform: translate(-50%, -50%) scale(200); opacity: 0; }
    }

    #score-pulse-internal.pulsing {
       animation: scorePulseAnim 0.6s ease-out forwards;
    }

    /* Media Queries (si se necesitan ajustes específicos para el score) */
    @media (max-width: 768px) {
      .score-emoji { font-size: 1.3rem; }
      #score-text-internal { font-size: var(--score-font-size, 1.8rem); }
    }
    @media (max-width: 480px) {
      .score-emoji { font-size: 1.2rem; margin-right: 0.2rem;}
      #score-text-internal { font-size: var(--score-font-size, 1.6rem); }
    }
  `;

  // --- Ciclo de Vida: Detectar cambios en 'score' y 'combo' ---
  protected updated(changedProperties: PropertyValueMap<any> | Map<PropertyKey, unknown>): void {
    super.updated(changedProperties);

    // Recalcular efectos si 'combo' cambió
    if (changedProperties.has('combo')) {
      this._calculateEffects();
    }

    // Disparar animación de pulso si 'score' cambió (y no era el primer render)
    if (changedProperties.has('score') && changedProperties.get('score') !== undefined) {
      this._triggerPulseAnimation();
    }
  }

  // --- Lógica Interna ---
  private _calculateEffects() {
    // Calcular intensidad del flare basado en el combo
    this._flareIntensity = this.combo < FLARE_START_STREAK
      ? 0
      : Math.min((this.combo - FLARE_START_STREAK + 1) / (FLARE_MAX_STREAK - FLARE_START_STREAK + 1), 1);

    // Determinar si debe pulsar la sombra
    this._shouldPulse = this._flareIntensity > 0.3;

    // Calcular color y peso del texto basado en combo (similar a UIManager)
    const scoreIntensity = Math.min(this.combo / 10, 1); // Normalizar combo (0 a 1)
    const scoreLightness = 90 + scoreIntensity * 10;
    this._scoreWeight = 700 + Math.floor(scoreIntensity * 2) * 100; // 700, 800, 900

    // Usar HSL para el color, cambiando el hue basado en el combo
    // (Podríamos usar el mismo cálculo de hue que en UIManager si queremos sincronizarlo con el fondo)
    const baseHue = 220; // Azul base del fondo
    const targetHue = (baseHue + (this.combo * 10)) % 360; // Mismo cálculo que UIManager
    const scoreHue = (targetHue + 180) % 360; // Color opuesto para contraste
    this._scoreColor = (this.combo < 2) ? `#f3f4f6` : `hsl(${scoreHue}, 80%, ${scoreLightness}%)`;
  }

  private _triggerPulseAnimation() {
    if (this._scorePulseElement) {
      this._scorePulseElement.classList.remove('pulsing');
      // Forzar reflujo para reiniciar la animación
      void this._scorePulseElement.offsetWidth;
      this._scorePulseElement.classList.add('pulsing');
    }
  }

  // --- Template HTML ---
  render() {
    // Definir las variables CSS para las sombras dinámicas
    const flareShadow = `
      0 0 5px hsla(0, 0%, 100%, ${this._flareIntensity * 0.5}),
      0 0 10px hsla(55, 100%, 70%, ${this._flareIntensity * 0.8}),
      0 0 15px hsla(40, 100%, 60%, ${this._flareIntensity * 0.6}),
      0 0 20px hsla(10, 100%, 55%, ${this._flareIntensity * 0.4})
    `;
    const flareShadowPulse = `
      0 0 5px hsla(0, 0%, 100%, ${this._flareIntensity * 0.5}),
      0 0 12px hsla(50, 100%, 75%, ${this._flareIntensity * 0.7}),
      0 0 18px hsla(35, 100%, 65%, ${this._flareIntensity * 0.5}),
      0 0 24px hsla(5, 100%, 60%, ${this._flareIntensity * 0.3})
    `;

    return html`
      <style>
        /* Inyectar variables CSS dinámicas */
        :host {
          --flare-shadow: ${flareShadow};
          --flare-shadow-pulse: ${flareShadowPulse};
        }
        #score-text-internal {
          font-weight: ${this._scoreWeight};
          color: ${this._scoreColor};
          text-shadow: var(--flare-shadow); /* Aplicar sombra base */
        }
      </style>
      <span class="score-emoji" part="emoji">⭐</span>
      <span
        id="score-text-internal"
        part="text"
        class="${this._shouldPulse ? 'score-pulsing' : ''}"
      >
        ${this.score}
      </span>
      <div id="score-pulse-internal" part="pulse-effect"></div>
    `;
  }
}

// Declaración global
declare global {
  interface HTMLElementTagNameMap {
    'score-display': ScoreDisplay;
  }
}