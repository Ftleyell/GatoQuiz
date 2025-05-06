// src/game/components/ui/shop-item-card.ts
import { LitElement, html, css, CSSResultGroup } from 'lit';
import { customElement, property } from 'lit/decorators.js';

@customElement('shop-item-card')
export class ShopItemCard extends LitElement {

  // --- Propiedades (Inputs) ---
  @property({ type: String }) itemId = '';
  @property({ type: String }) icon = '❓';
  // Reflejar propiedades booleanas como atributos para facilitar el estilado CSS
  @property({ type: Boolean, reflect: true }) isDisabled = false;
  @property({ type: Boolean, reflect: true }) isPurchased = false;
  @property({ type: Boolean, reflect: true }) isMaxLevel = false;
  @property({ type: Boolean, reflect: true }) isSelected = false;

  // --- Estilos Encapsulados ---
  static styles: CSSResultGroup = css`
    :host {
      display: flex; /* Usa flex para centrar el icono interno */
      justify-content: center;
      align-items: center;
      aspect-ratio: 1 / 1; /* Mantener cuadrado */
      width: 100%; /* Ocupar celda del grid */
      max-width: 6rem; /* Límite opcional */
      box-sizing: border-box;
      position: relative;
      cursor: pointer;
      border-radius: 0.75rem; /* Redondeo base */
      background-color: rgba(55, 65, 81, 0.7);
      border: 2px solid #4b5563; /* Borde base */
      box-shadow: 0 0.125rem 0.25rem rgba(0,0,0,0.3); /* Sombra base */
      transition: transform 0.2s ease, background-color 0.2s ease,
                  border-color 0.2s ease, box-shadow 0.2s ease,
                  opacity 0.2s ease;
      -webkit-tap-highlight-color: transparent;
      overflow: hidden; /* Para asegurar que el contenido no se salga */
    }

    /* Estilo del icono */
    .shop-item-icon {
      font-size: clamp(1.2rem, 5vmin, 1.8rem); /* Tamaño fluido */
      line-height: 1;
      user-select: none;
    }

    /* --- Estilos basados en Estados (atributos reflejados) --- */

    :host(:hover) {
      background-color: rgba(75, 85, 99, 0.8);
    }

    :host(:active) {
      transform: scale(0.95);
      background-color: rgba(75, 85, 99, 0.9);
    }

    /* Estado Deshabilitado (isDisabled) */
    :host([isDisabled]) {
      opacity: 0.5;
      cursor: default;
      border-color: #374151;
    }
    :host([isDisabled]:active) {
      transform: none; /* No escalar si está deshabilitado */
    }
    :host([isDisabled]:hover) {
      background-color: rgba(55, 65, 81, 0.7); /* Sin cambio de color en hover */
      border-color: #374151;
      transform: none;
      box-shadow: 0 0.125rem 0.25rem rgba(0,0,0,0.3);
    }

    /* Estado Comprado (isPurchased y no es mejorable - implícito) */
    /* Se aplica el mismo estilo que isDisabled por simplicidad, pero con borde diferente */
    :host([isPurchased]) {
      opacity: 0.7;
      cursor: default;
      border-color: #f59e0b; /* Borde naranja */
    }
     :host([isPurchased]:active) {
       transform: none;
     }
    :host([isPurchased]:hover) {
      background-color: rgba(55, 65, 81, 0.7);
      border-color: #f59e0b;
      transform: none;
      box-shadow: 0 0.125rem 0.25rem rgba(0,0,0,0.3);
    }

    /* Estado Nivel Máximo (isMaxLevel) */
    /* Similar a purchased pero con borde diferente */
    :host([isMaxLevel]) {
      opacity: 0.8;
      cursor: default;
      border-color: #34d399; /* Borde verde */
    }
    :host([isMaxLevel]:active) {
       transform: none;
     }
    :host([isMaxLevel]:hover) {
      background-color: rgba(55, 65, 81, 0.7);
      border-color: #34d399;
      transform: none;
      box-shadow: 0 0.125rem 0.25rem rgba(0,0,0,0.3);
    }

    /* Combinación: Deshabilitado (por costo/check) pero NO comprado/maxLevel */
    :host([isDisabled]:not([isPurchased]):not([isMaxLevel])) {
       border-color: #374151; /* Borde gris oscuro */
       opacity: 0.5;
    }

    /* Estado Seleccionado (isSelected) */
    :host([isSelected]) {
      border-color: #facc15; /* Borde amarillo */
      box-shadow: 0 0 0.5rem rgba(250, 204, 21, 0.6), 0 0.25rem 0.5rem rgba(0,0,0,0.4); /* Sombra + Glow */
      transform: scale(1.05); /* Ligeramente más grande */
    }
     :host([isSelected]:active) {
       transform: scale(1.02); /* Escala ligeramente menos al hacer active */
     }

     /* Media Queries (si se necesitan ajustes específicos) */
     @media (max-width: 480px) {
        :host {
            border-radius: 0.5rem; /* Reducir redondeo en móvil */
        }
        .shop-item-icon {
            font-size: clamp(1rem, 4.5vmin, 1.5rem); /* Icono más pequeño */
        }
     }
  `;

  // --- Template HTML ---
  render() {
    return html`
      <span class="shop-item-icon" part="icon">${this.icon}</span>
    `;
  }

  // --- Manejador de Eventos ---
  constructor() {
    super();
    // Añadir listener directamente en el constructor
    this.addEventListener('click', this._handleClick);
    this.addEventListener('touchstart', this._handleClick, { passive: false }); // Asegurar passive: false
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    // Limpiar listeners al desconectar
    this.removeEventListener('click', this._handleClick);
    this.removeEventListener('touchstart', this._handleClick);
  }

  private _handleClick(event: MouseEvent | TouchEvent) {
    // Prevenir comportamiento default en touch
    if (event.type === 'touchstart') {
        event.preventDefault();
    }

    // Determinar si el ítem está funcionalmente deshabilitado
    const functionallyDisabled = this.isDisabled || this.isPurchased || this.isMaxLevel;

    // Solo emitir evento si NO está funcionalmente deshabilitado
    if (!functionallyDisabled) {
      // console.log(`ShopItemCard: Clicked! Emitting item-selected with ID: ${this.itemId}`); // Log opcional
      this.dispatchEvent(new CustomEvent('item-selected', {
        detail: { itemId: this.itemId },
        bubbles: true,
        composed: true
      }));
    } else {
      // console.log(`ShopItemCard: Clicked but item is disabled/purchased/maxLevel. ID: ${this.itemId}`); // Log opcional
    }
  }
}

// Declaración global
declare global {
  interface HTMLElementTagNameMap {
    'shop-item-card': ShopItemCard;
  }
}