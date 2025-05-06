// src/components/ui/quiz-option-button.ts
import { LitElement, html, css, CSSResultGroup } from 'lit';
import { customElement, property } from 'lit/decorators.js';

@customElement('quiz-option-button')
export class QuizOptionButton extends LitElement {

  // --- Propiedades (Inputs) ---
  @property({ type: String }) optionKey = '';
  @property({ type: String }) optionText = 'Opción';
  @property({ type: Boolean, reflect: true }) disabled = false; // Reflejar para CSS :disabled
  @property({ type: Boolean, reflect: true }) hinted = false;   // Reflejar para aplicar estilo CSS .hinted
  // Propiedad para recibir el tema actual y aplicar la clase correcta
  @property({ type: String }) theme = 'clean'; // 'clean', 'retro', 'inverted', etc. por defecto 'clean'

  // --- Estilos Encapsulados ---
  static styles: CSSResultGroup = css`
    :host {
      display: block; /* Ocupa el ancho disponible por defecto */
      width: 100%;    /* Asegura que ocupe el ancho */
      outline: none; /* Quitar outline del host al hacer focus */
      -webkit-tap-highlight-color: transparent;
    }

    /* Estilo base del botón interno */
    .option-button-internal {
      /* Layout y Alineación */
      display: flex;
      align-items: center;
      justify-content: center;
      width: 100%;
      min-height: 3rem; /* Altura mínima base (móvil) */
      height: auto; /* Permitir crecer */
      padding: 0.8rem 0.8rem; /* Padding base (móvil) */
      box-sizing: border-box;

      /* Texto */
      text-align: center;
      white-space: normal;
      word-wrap: break-word;
      word-break: break-word;
      line-height: 1.3;
      font-family: 'Poppins', sans-serif; /* Fuente por defecto */
      font-weight: 600;
      font-size: 0.95rem; /* Tamaño base (móvil) */

      /* Apariencia Base */
      border: none;
      border-radius: 0.6rem; /* Redondeo base (móvil) */
      cursor: pointer;

      /* Transiciones */
      transition: background-image 0.3s ease, background-color 0.3s ease,
                  transform 0.15s ease, box-shadow 0.3s ease,
                  opacity 0.2s ease;

      /* Sombra base */
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
      opacity: 1;
    }

    /* --- ESTILOS POR TEMA (Aplicados al botón interno) --- */

    /* Tema Limpio (Clean) */
    .option-button-internal.theme-clean {
      color: white;
      font-family: 'Poppins', sans-serif;
      background-image: linear-gradient(to right, #3b82f6, #2563eb);
      border-radius: 0.75rem; /* Redondeo Desktop */
      box-shadow: 0 4px 10px rgba(0, 0, 0, 0.2), inset 0 1px 1px rgba(255, 255, 255, 0.1);
    }
    .option-button-internal.theme-clean:hover:not([disabled]):not(.hinted) {
      background-image: linear-gradient(to right, #60a5fa, #3b82f6);
      transform: translateY(-2px);
      box-shadow: 0 6px 15px rgba(0, 0, 0, 0.25), inset 0 1px 1px rgba(255, 255, 255, 0.1);
    }
    .option-button-internal.theme-clean:active:not([disabled]):not(.hinted) {
      transform: translateY(0px) scale(0.98);
      box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2), inset 0 1px 1px rgba(0, 0, 0, 0.1);
    }

    /* Tema Retro */
    .option-button-internal.theme-retro {
      color: white;
      /* Asegúrate que 'Press Start 2P' esté importada globalmente o vía @import */
      font-family: 'Press Start 2P', cursive;
      font-size: 0.7rem;
      background-color: #3b82f6;
      border: 2px solid #1e293b;
      box-shadow: 3px 3px 0px #1e293b;
      border-radius: 0;
      padding: 0.8rem 1rem;
      min-height: 3.5rem;
      line-height: 1.2;
    }
    /* Nota: El hover de tema retro se ajustará en media query */
    .option-button-internal.theme-retro:active:not([disabled]):not(.hinted) {
      transform: translate(2px, 2px); /* Efecto active móvil */
      box-shadow: none;
      background-color: #1d4ed8;
    }

    /* Tema Invertido (Añadir estilos si se usan) */
    .option-button-internal.theme-inverted {
      /* Copiar estilos de themes.css aquí si es necesario */
      color: #1f2937;
      background-color: #e5e7eb;
      border: 1px solid #d1d5db;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
     .option-button-internal.theme-inverted:hover:not([disabled]):not(.hinted) {
        background-color: #f3f4f6; border-color: #9ca3af;
     }
      .option-button-internal.theme-inverted:active:not([disabled]):not(.hinted) {
         transform: scale(0.98);
      }

    /* --- ESTADOS GLOBALES (Aplican a cualquier tema) --- */

    /* Estado Deshabilitado (cuando la propiedad disabled es true) */
    .option-button-internal[disabled] {
      cursor: not-allowed;
      opacity: 0.6 !important;
      transform: none !important;
    }
    /* Sobrescribir estilos base de disabled por tema */
    .option-button-internal.theme-clean[disabled] {
      background-image: linear-gradient(to right, #9ca3af, #6b7280);
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    }
    .option-button-internal.theme-retro[disabled] {
      background-color: #6b7280;
      border-color: #374151;
      box-shadow: 2px 2px 0px #374151;
    }
     .option-button-internal.theme-inverted[disabled] {
       background-color: #d1d5db; color: #6b7280;
     }

    /* Estado Hinted (cuando la propiedad hinted es true) */
    .option-button-internal.hinted {
      opacity: 0.45 !important;
      cursor: not-allowed; /* Un botón hinted tampoco debe ser clickeable */
      transform: none !important;
    }
     /* Estilos específicos de hinted por tema */
     .option-button-internal.theme-clean.hinted {
        background-image: linear-gradient(to right, #6b7280, #4b5563);
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
     }
      .option-button-internal.theme-retro.hinted {
        background-color: #4b5563;
        border-color: #1f2937;
        box-shadow: 2px 2px 0px #1f2937;
      }
       .option-button-internal.theme-inverted.hinted {
         background-color: #9ca3af; color: #4b5563;
       }


    /* --- Media Queries para ajustar tamaño/padding en Desktop --- */
    @media (min-width: 768px) {
      .option-button-internal {
        padding: 0.9rem 1rem;
        min-height: 3.5rem;
        font-size: 1rem;
        border-radius: 0.75rem; /* Ajustar redondeo desktop */
      }
      /* Ajustes desktop para tema retro */
      .option-button-internal.theme-retro {
        padding: 1rem 1.2rem;
        min-height: 4rem;
        font-size: 0.8rem;
        border-width: 3px;
        box-shadow: 4px 4px 0px #1e293b;
      }
      .option-button-internal.theme-retro:hover:not([disabled]):not(.hinted) {
        transform: translate(2px, 2px);
        box-shadow: 2px 2px 0px #1e293b;
        background-color: #2563eb;
      }
      .option-button-internal.theme-retro:active:not([disabled]):not(.hinted) {
        transform: translate(4px, 4px); /* Efecto desktop */
        box-shadow: none;
      }
      .option-button-internal.theme-retro[disabled] {
         box-shadow: 2px 2px 0px #374151; /* Sombra disabled desktop */
      }
       .option-button-internal.theme-retro.hinted {
         box-shadow: 2px 2px 0px #1f2937; /* Sombra hinted desktop */
       }
    }
  `;

  // --- Template HTML ---
  render() {
    // Determina la clase del tema a aplicar al botón interno
    const themeClass = `theme-${this.theme}`;

    return html`
      <button
        class="option-button-internal ${themeClass} ${this.hinted ? 'hinted' : ''}"
        ?disabled=${this.disabled || this.hinted}
        @click=${this._handleClick}
        @touchstart=${this._handleClick}
        part="button"
      >
        ${this.optionText}
      </button>
    `;
  }

  // --- Manejador de Eventos ---
  private _handleClick(event: MouseEvent | TouchEvent) {
    // Prevenir comportamiento default solo en touch para evitar doble evento y scroll/zoom
    if (event.type === 'touchstart') {
        event.preventDefault();
    }

    // No emitir evento si está realmente deshabilitado O si es hinted
    if (this.disabled || this.hinted) {
      // console.log("Button disabled or hinted, ignoring click."); // Log opcional
      return;
    }

    // console.log(`QuizOptionButton: Clicked! Emitting option-selected with key: ${this.optionKey}`); // Log opcional
    this.dispatchEvent(new CustomEvent('option-selected', {
      detail: { key: this.optionKey },
      bubbles: true, // Permite que el evento suba por el DOM
      composed: true // Permite que el evento cruce límites del Shadow DOM
    }));
  }
}

// Declaración global
declare global {
  interface HTMLElementTagNameMap {
    'quiz-option-button': QuizOptionButton;
  }
}