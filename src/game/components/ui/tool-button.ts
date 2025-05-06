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

  // --- Estilos Encapsulados ---
  static styles: CSSResultGroup = css`
    :host {
      display: block; /* O inline-block si se prefiere */
      width: 3rem;  /* Ancho base (móvil) */
      height: 3rem; /* Alto base (móvil) */
      box-sizing: border-box;
      -webkit-tap-highlight-color: transparent;
    }

    /* Estilo base del botón interno */
    .tool-button-internal {
      width: 100%;
      height: 100%;
      display: flex;
      justify-content: center;
      align-items: center;
      padding: 0.5rem; /* Padding interno */
      box-sizing: border-box;

      background-color: rgba(17, 24, 39, 0.8); /* Fondo oscuro semi-transparente */
      color: #e5e7eb; /* Color icono base */
      border: 2px solid #4b5563; /* Borde gris */
      border-radius: 0.5rem; /* Redondeado */
      cursor: pointer;
      font-size: 1.1rem; /* Tamaño icono base (móvil) */
      line-height: 1;
      transition: background-color 0.2s ease, border-color 0.2s ease,
                  box-shadow 0.2s ease, transform 0.1s ease,
                  opacity 0.2s ease;
      box-shadow: 0 2px 4px rgba(0,0,0,0.3);
      appearance: none; /* Quitar estilos por defecto del navegador */
      -webkit-appearance: none;
      margin: 0; /* Resetear margen */
      outline: none; /* Quitar outline */
    }

    .tool-button-internal:hover:not([disabled]) {
      background-color: rgba(31, 41, 55, 0.9);
      border-color: #6b7280;
      transform: scale(1.05);
    }

    .tool-button-internal:active:not([disabled]) {
      transform: scale(0.95);
      background-color: rgba(55, 65, 81, 0.9);
    }

    /* Estado Deshabilitado */
    .tool-button-internal[disabled] {
      opacity: 0.5;
      cursor: not-allowed;
      transform: none !important;
      background-color: rgba(17, 24, 39, 0.8);
      border-color: #4b5563;
      box-shadow: 0 2px 4px rgba(0,0,0,0.3); /* Mantener sombra base */
    }

    /* Estado Activo */
    :host([active]) .tool-button-internal {
      /* Aplicar estilos específicos cuando el host tiene el atributo 'active' */
      border-color: #a78bfa; /* Ejemplo: Borde violeta */
      box-shadow: 0 0 8px rgba(167, 139, 250, 0.5); /* Ejemplo: Glow violeta */
      background-color: rgba(167, 139, 250, 0.3); /* Fondo violeta claro */
    }
    /* Sobrescribir active:active para que no pierda el estilo activo */
     :host([active]) .tool-button-internal:active:not([disabled]) {
        background-color: rgba(140, 110, 240, 0.5); /* Un poco más oscuro al presionar */
        transform: scale(0.95);
     }

     /* Estilos específicos por toolId si fueran necesarios */
     /* Ejemplo: Hacer el botón de comida naranja cuando está activo */
     :host([toolId="cat-food"][active]) .tool-button-internal {
        border-color: #fb923c;
        box-shadow: 0 0 8px rgba(249, 115, 22, 0.5);
        background-color: rgba(249, 115, 22, 0.3);
     }
      :host([toolId="cat-food"][active]) .tool-button-internal:active:not([disabled]) {
         background-color: rgba(234, 88, 12, 0.5);
      }
      /* Ejemplo: Botón de borrar podría tener otro color activo */
       :host([toolId="clear-ink"][active]) .tool-button-internal {
          /* ... estilos para borrar activo ... */
       }


    /* Media Queries */
    @media (min-width: 768px) {
      :host {
        width: 3.5rem; /* Más grande en desktop */
        height: 3.5rem;
      }
      .tool-button-internal {
        font-size: 1.2rem;
        padding: 0.6rem;
      }
      .tool-button-internal:hover:not([disabled]) {
         transform: scale(1.05); /* Mantener hover en desktop */
      }
       .tool-button-internal:active:not([disabled]) {
         transform: scale(0.95);
      }
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
      >
        ${this.icon /* Podríamos usar html\`<slot></slot>\` si quisiéramos pasar HTML */}
      </button>
    `;
  }

  // --- Manejador de Eventos ---
  constructor() {
    super();
    // No añadimos listeners aquí porque el botón interno ya los tiene
  }

  private _handleClick(event: MouseEvent | TouchEvent) {
    // Prevenir comportamiento default solo en touch
    if (event.type === 'touchstart') {
        event.preventDefault();
    }

    // No emitir si está deshabilitado
    if (this.disabled) {
      return;
    }

    // console.log(`ToolButton: Clicked! Emitting tool-activated with ID: ${this.toolId}`); // Log opcional
    this.dispatchEvent(new CustomEvent('tool-activated', {
      detail: { toolId: this.toolId },
      bubbles: true,
      composed: true
    }));
  }
}

// Declaración global
declare global {
  interface HTMLElementTagNameMap {
    'tool-button': ToolButton;
  }
}