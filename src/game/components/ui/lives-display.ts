// src/game/components/ui/lives-display.ts
import { LitElement, html, css, CSSResultGroup } from 'lit';
import { customElement, property } from 'lit/decorators.js';

@customElement('lives-display')
export class LivesDisplay extends LitElement {

  // --- Propiedades (Inputs) ---
  @property({ type: Number }) lives = 3;
  @property({ type: Boolean }) hasShield = false;
  @property({ type: Number }) hintCharges = 0;

  // --- Estilos Encapsulados ---
  static styles: CSSResultGroup = css`
    :host {
      display: inline-flex; /* Ajustar al contenido */
      align-items: center;
      gap: 0.3rem; /* Espacio entre elementos (corazón, número, iconos) */
      font-family: 'Poppins', sans-serif; /* Fuente base */
      color: #f3f4f6; /* Color de texto base (para el número) */
      user-select: none;
    }

    /* Estilos y animación para el corazón */
    .life-emoji {
      font-size: 1.3rem;
      line-height: 1;
      color: #f43f5e; /* Rojo */
      animation: pulseHeart 1.5s infinite ease-in-out;
      user-select: none;
    }

    @keyframes pulseHeart {
      0%, 100% { transform: scale(1); }
      50% { transform: scale(1.15); }
    }

    /* Estilo para el contador de vidas */
    #lives-count-internal {
      font-size: 1.3rem;
      font-weight: 700;
      min-width: 1ch; /* Evita saltos con números de un dígito */
      text-align: left;
    }

    /* Estilos base y animación para iconos de escudo y pista */
    .status-icon {
      font-size: 1.3rem;
      line-height: 1;
      margin-left: 0.3rem; /* Pequeño espacio si ambos están visibles */
      display: inline-block; /* Para que hidden funcione */
      user-select: none;
    }

    .shield-icon {
      filter: drop-shadow(0 0 3px rgba(59, 130, 246, 0.7));
      animation: shieldPulse 2s infinite ease-in-out;
    }

    .hint-icon {
      filter: drop-shadow(0 0 3px rgba(250, 204, 21, 0.7));
      animation: hintPulse 1.8s infinite ease-in-out;
    }

    /* Animaciones de pulso para iconos */
    @keyframes shieldPulse {
      0%, 100% { transform: scale(1); opacity: 0.9; }
      50% { transform: scale(1.1); opacity: 1; }
    }

    @keyframes hintPulse {
      0%, 100% { transform: scale(1) rotate(0deg); opacity: 0.85; }
      50% { transform: scale(1.08) rotate(5deg); opacity: 1; }
    }

    /* Ocultar elementos con el atributo hidden */
    [hidden] {
      display: none !important;
    }

    /* Media Queries (Ajustes responsivos si son necesarios) */
    @media (max-width: 768px) {
      .life-emoji,
      #lives-count-internal,
      .status-icon {
        font-size: 1.1rem; /* Ligeramente más pequeño en tablet */
      }
      :host {
         gap: 0.2rem;
      }
       .status-icon {
         margin-left: 0.2rem;
      }
    }
     @media (max-width: 480px) {
      .life-emoji,
      #lives-count-internal,
      .status-icon {
        font-size: 1rem; /* Aún más pequeño en móvil */
      }
    }
  `;

  // --- Template HTML ---
  render() {
    const showHintIcon = this.hintCharges > 0;

    return html`
      <span class="life-emoji" part="heart-icon">❤️</span>
      <span id="lives-count-internal" part="count">${this.lives}</span>
      <span
        class="status-icon shield-icon"
        part="shield-icon"
        ?hidden=${!this.hasShield}
        title="Escudo Activo"
      >🛡️</span>
      <span
        class="status-icon hint-icon"
        part="hint-icon"
        ?hidden=${!showHintIcon}
        title="Pista Disponible"
      >💡</span>
    `;
  }
}

// Declaración global
declare global {
  interface HTMLElementTagNameMap {
    'lives-display': LivesDisplay;
  }
}
// Fin del archivo