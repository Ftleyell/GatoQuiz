// src/game/components/ui/tool-button.ts
import { LitElement, html, css, CSSResultGroup } from 'lit';
import { customElement, property } from 'lit/decorators.js';

@customElement('tool-button')
export class ToolButton extends LitElement {

  // --- Propiedades (Inputs) ---
  @property({ type: String }) toolId = '';
  @property({ type: String }) icon = '❓';
  @property({ type: String }) titleText = '';
  @property({ type: Boolean, reflect: true }) disabled = false;
  @property({ type: Boolean, reflect: true }) active = false;

  // --- Estado Interno para Debounce por Frame ---
  private _isProcessingInteraction = false;

  // --- Estilos Encapsulados ---
  static styles: CSSResultGroup = css`
    /* Estilos base del host */
    :host {
      display: inline-flex; justify-content: center; align-items: center;
      width: 3rem; height: 3rem; box-sizing: border-box;
      -webkit-tap-highlight-color: transparent; cursor: pointer;
      background-color: rgba(17, 24, 39, 0.8); color: #e5e7eb;
      border: 2px solid #4b5563; border-radius: 0.5rem;
      padding: 0.5rem; font-size: 1.1rem; line-height: 1;
      transition: background-color 0.2s ease, border-color 0.2s ease,
                  box-shadow 0.2s ease, transform 0.1s ease,
                  opacity 0.2s ease;
      box-shadow: 0 2px 4px rgba(0,0,0,0.3); position: relative; overflow: hidden;
    }
    /* Botón interno para accesibilidad y reseteo */
    .tool-button-internal {
      appearance: none; -webkit-appearance: none; -moz-appearance: none;
      background: transparent; border: none; padding: 0; margin: 0;
      font: inherit; color: inherit; cursor: inherit; outline: none;
      width: 100%; height: 100%; display: flex;
      justify-content: center; align-items: center;
    }
    /* Hover general */
    :host(:hover) {
      background-color: rgba(31, 41, 55, 0.9);
      border-color: #6b7280;
    }
    /* Active general (presionado) */
    :host(:active) {
      transform: scale(0.95);
      background-color: rgba(55, 65, 81, 0.9);
    }
    /* Estado deshabilitado */
    :host([disabled]) {
      opacity: 0.5; cursor: not-allowed; transform: none !important;
      background-color: rgba(17, 24, 39, 0.8); border-color: #4b5563;
      box-shadow: 0 2px 4px rgba(0,0,0,0.3);
    }
     :host([disabled]:hover) {
       background-color: rgba(17, 24, 39, 0.8); border-color: #4b5563; transform: none;
     }
     :host([disabled]:active) {
       transform: none;
     }

    /* --- ESTILOS DE ESTADO ACTIVO --- */

    /* Estilo activo por defecto (si no hay uno específico por toolId) */
    /* Este se aplicará si no hay uno más específico que coincida */
    :host([active]) {
      border-color: #a78bfa; /* Violeta/Púrpura */
      box-shadow: 0 0 8px rgba(167, 139, 250, 0.5);
      background-color: rgba(167, 139, 250, 0.3);
    }

    /* Estilo específico para PINCEL ACTIVO */
    :host([toolId="brush"][active]) {
        border-color: #a78bfa; /* Violeta/Púrpura */
        box-shadow: 0 0 8px rgba(167, 139, 250, 0.5);
        background-color: rgba(167, 139, 250, 0.3);
    }

     /* --- MEJORA: Estilo específico para COMIDA ACTIVA (igual que pincel) --- */
     :host([toolId="cat-food"][active]) {
             border-color:rgb(245, 99, 31); /* Violeta/Púrpura */
        background-color: rgba(245, 136, 63, 0.8); /* Violeta más oscuro (igual que pincel) */
        box-shadow: 0 0 8px rgba(223, 167, 12, 0.5); /* (igual que pincel) */
     }
     /* --- FIN MEJORA --- */

     /* Estilos para estado presionado MIENTRAS está activo (fallback) */
     :host([active]:active) {
       background-color: rgba(140, 110, 240, 0.5); /* Violeta más oscuro */
       transform: scale(0.95);
     }
      /* --- MEJORA: Estilo presionado para COMIDA ACTIVA (igual que pincel) --- */
      :host([toolId="cat-food"][active]:active) {
        background-color: rgba(245, 136, 63, 0.8); /* Violeta más oscuro (igual que pincel) */
        transform: scale(0.95);
      }
      /* --- FIN MEJORA --- */
      /* Estilo presionado para PINCEL ACTIVO */
      :host([toolId="brush"][active]:active) {
        background-color: rgba(140, 110, 240, 0.5); /* Violeta más oscuro */
        transform: scale(0.95);
      }

    /* --- FIN ESTILOS DE ESTADO ACTIVO --- */

    /* Media Queries para ajustar tamaño en desktop */
    @media (min-width: 768px) {
      :host {
        width: 3.5rem; height: 3.5rem; font-size: 1.2rem; padding: 0.6rem;
      }
       :host(:active) { transform: scale(0.95); }
    }
  `;

  // --- Template HTML ---
  render() {
    return html`
      <button
        class="tool-button-internal"
        title=${this.titleText || this.toolId}
        ?disabled=${this.disabled}
        @click=${this._handleClick}
        @touchstart=${this._handleClick}
        part="button"
        aria-label=${this.titleText || this.toolId}
        tabindex="-1" /* Evita que el botón interno reciba foco directo */
      >
        ${this.icon}
      </button>
    `;
  }

  // --- Manejador de Eventos (con Debounce por Frame) ---
  constructor() {
    super();
  }

  private _handleClick(event: MouseEvent | TouchEvent) {
    if (event.type === 'touchstart') {
      event.preventDefault();
    }
    if (this._isProcessingInteraction || this.disabled) {
      return;
    }
    this._isProcessingInteraction = true;
    this.dispatchEvent(new CustomEvent('tool-activated', {
      detail: { toolId: this.toolId },
      bubbles: true,
      composed: true
    }));
    requestAnimationFrame(() => {
      this._isProcessingInteraction = false;
    });
  }
}

// Declaración global
declare global {
  interface HTMLElementTagNameMap {
    'tool-button': ToolButton;
  }
}