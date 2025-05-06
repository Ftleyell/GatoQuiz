// src/game/components/ui/combo-counter.ts
import { LitElement, html, css, CSSResultGroup, PropertyValueMap } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';

// Constantes para cálculo de efectos (iguales que en UIManager)
const COMBO_BASE_FONT_SIZE_REM = 3.0;
const COMBO_FONT_INCREMENT_REM = 0.5;
const COMBO_MAX_SIZE_STREAK = 10; // Combo máximo para escalar tamaño
const COMBO_HUE_INCREMENT = 35; // Grados de hue por cada punto de combo

@customElement('combo-counter')
export class ComboCounter extends LitElement {

  // --- Propiedades (Inputs) ---
  @property({ type: Number }) combo = 0;

  // --- Estado Interno (Calculado) ---
  @state() private _isVisible = false;
  @state() private _fontSizeRem = COMBO_BASE_FONT_SIZE_REM;
  @state() private _textColor = 'transparent'; // Empezar transparente

  // --- Estilos Encapsulados ---
  static styles: CSSResultGroup = css`
    :host {
      /* Posicionamiento fijo como en el original */
      position: fixed;
      bottom: 0.5rem; /* Ajustado para móvil primero */
      left: 0.5rem;  /* Ajustado para móvil primero */
      z-index: 2; /* Encima de otros elementos de UI base */
      pointer-events: none; /* No interactuable */
      /* Transiciones suaves */
      transition: font-size 0.4s cubic-bezier(0.22, 1, 0.36, 1),
                  color 0.4s ease-out,
                  opacity 0.3s ease-out,
                  transform 0.3s ease-out; /* Añadir transform */
      /* Estilos de texto base */
      font-family: 'Poppins', sans-serif; /* O la fuente que prefieras */
      font-weight: 900; /* Muy grueso */
      text-shadow: 1px 1px 5px rgba(0,0,0,0.5);
      white-space: nowrap;
      /* Estado inicial oculto */
      opacity: 0;
      transform: scale(0.8) translateY(10px); /* Efecto de aparición */
      will-change: transform, opacity, font-size, color; /* Optimización */
    }

    /* Estado visible */
    :host([visible]) {
      opacity: 1;
      transform: scale(1) translateY(0);
    }

    /* Media Queries */
    @media (min-width: 768px) {
       :host {
         bottom: 1rem;
         left: 1rem;
       }
    }
  `;

  // --- Ciclo de Vida: Actualizar estado cuando las propiedades cambian ---
  protected updated(changedProperties: PropertyValueMap<any> | Map<PropertyKey, unknown>): void {
    super.updated(changedProperties);
    if (changedProperties.has('combo')) {
      this._updateVisuals();
    }
  }

  // --- Lógica Interna ---
  private _updateVisuals() {
    this._isVisible = this.combo > 0;
    this.toggleAttribute('visible', this._isVisible); // Controlar visibilidad con atributo

    if (this._isVisible) {
      // Calcular tamaño de fuente
      const sizeIncrease = Math.min(Math.max(0, this.combo - 1), COMBO_MAX_SIZE_STREAK);
      this._fontSizeRem = COMBO_BASE_FONT_SIZE_REM + sizeIncrease * COMBO_FONT_INCREMENT_REM;

      // Calcular color HSL
      const comboHue = (this.combo * COMBO_HUE_INCREMENT) % 360;
      this._textColor = `hsl(${comboHue}, 100%, 65%)`;
    } else {
      // Resetear a valores base si no es visible (aunque estará oculto)
      this._fontSizeRem = COMBO_BASE_FONT_SIZE_REM;
      this._textColor = 'transparent';
    }

    // Aplicar estilos dinámicos
    this.style.fontSize = `${this._fontSizeRem}rem`;
    this.style.color = this._textColor;
  }

  // --- Template HTML ---
  render() {
    // Solo renderizar el texto si es visible para evitar mostrar "x0" brevemente
    return html`${this._isVisible ? `x${this.combo}` : ''}`;
  }
}

// Declaración global
declare global {
  interface HTMLElementTagNameMap {
    'combo-counter': ComboCounter;
  }
}