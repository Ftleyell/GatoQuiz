// src/game/components/ui/feedback-area.ts
import { LitElement, html, css, CSSResultGroup, PropertyValueMap } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { classMap } from 'lit/directives/class-map.js';

// Mapeo de tipos a clases CSS (puedes ajustar los nombres de clase si es necesario)
const typeToClassMap = {
  correct: 'text-green-400 feedback-correct',
  incorrect: 'text-red-400 feedback-incorrect',
  shield: 'text-blue-400 feedback-shield',
  info: 'text-gray-400 feedback-info',
};

@customElement('feedback-area')
export class FeedbackArea extends LitElement {

  // --- Propiedades (Inputs) ---
  @property({ type: String }) message = '';
  @property({ type: String }) type: 'correct' | 'incorrect' | 'shield' | 'info' | null = null;

  // --- Estado Interno (Calculado) ---
  // Usaremos classMap directamente en render, no necesitamos estado interno extra

  // --- Estilos Encapsulados ---
  static styles: CSSResultGroup = css`
    :host {
      display: block; /* Ocupa el ancho disponible */
      margin-top: 1rem; /* Margen superior como en el layout original */
      height: 2rem; /* Altura fija como en el layout original (h-8) */
      box-sizing: border-box;
      /* Transición para la aparición/desaparición suave */
      transition: opacity 0.3s ease-out;
      opacity: 1; /* Visible por defecto si tiene contenido */
    }

    /* Ocultar si no hay mensaje */
    :host(:empty) {
        opacity: 0;
        /* Podríamos añadir height: 0; si queremos que colapse */
    }

    /* Contenedor del texto */
    .feedback-text {
      width: 100%;
      height: 100%;
      display: flex;
      justify-content: center;
      align-items: center;
      font-size: 1.125rem; /* text-lg */
      font-weight: 700; /* font-bold */
      text-align: center;
      line-height: 1; /* Ajustar para centrado vertical */
      transition: color 0.3s ease; /* Transición de color */
    }

    /* Clases de color (pueden venir de un CSS global si usas Tailwind,
       o definirlas aquí si prefieres encapsular todo) */
    .text-green-400 { color: #4ade80; /* Tailwind green-400 */ }
    .text-red-400 { color: #f87171; /* Tailwind red-400 */ }
    .text-blue-400 { color: #60a5fa; /* Tailwind blue-400 */ }
    .text-gray-400 { color: #9ca3af; /* Tailwind gray-400 */ }

    /* Clases adicionales si las necesitas (feedback-correct, etc.) */
    /* .feedback-correct { ... } */
    /* .feedback-incorrect { ... } */
    /* .feedback-shield { ... } */
    /* .feedback-info { ... } */

    /* Media Queries (si necesitas ajustar tamaño de fuente) */
    @media (max-width: 768px) {
        .feedback-text {
            font-size: 1rem;
        }
    }
  `;

  // --- Template HTML ---
  render() {
    // Determinar las clases a aplicar
    const classes = {
      'feedback-text': true,
      // Añadir clases de color/tipo basadas en la propiedad 'type'
      ...(this.type && typeToClassMap[this.type]
          ? typeToClassMap[this.type].split(' ').reduce((acc, cls) => ({ ...acc, [cls]: true }), {})
          : {})
    };

    // Mostrar el mensaje solo si existe
    return html`
      <div class=${classMap(classes)} part="text">
        ${this.message || '' /* Renderizar string vacío si no hay mensaje */}
      </div>
    `;
  }
}

// Declaración global
declare global {
  interface HTMLElementTagNameMap {
    'feedback-area': FeedbackArea;
  }
}