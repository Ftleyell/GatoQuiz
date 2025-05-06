// src/game/components/ui/game-over-screen.ts
import { LitElement, html, css, CSSResultGroup } from 'lit';
import { customElement, property } from 'lit/decorators.js';

@customElement('game-over-screen')
export class GameOverScreen extends LitElement {

  // --- Propiedades (Inputs) ---
  @property({ type: Number }) finalScore = 0;
  @property({ type: Boolean }) isNewHighScore = false;

  // --- Estilos Encapsulados ---
  static styles: CSSResultGroup = css`
    :host {
      display: flex; /* Usa flex para centrar contenido */
      flex-direction: column;
      justify-content: center;
      align-items: center;
      width: 100%;
      height: 100%;
      position: relative;
      padding: 2rem;
      box-sizing: border-box;
      text-align: center;
      background-color: rgba(17, 24, 39, 0.9); /* Fondo oscuro */
      color: #e5e7eb;
      font-family: 'Poppins', sans-serif;
      gap: 1.5rem; /* Espacio entre elementos */
      -webkit-tap-highlight-color: transparent;
    }

    /* Título "Game Over" */
    .game-over-title {
      font-family: 'Pacifico', cursive; /* Fuente distintiva */
      font-size: clamp(3rem, 15vmin, 6rem);
      color: #f87171; /* Rojo */
      text-shadow: 2px 2px 5px rgba(0,0,0,0.5);
      margin-bottom: 0.5rem;
      line-height: 1.1;
    }

    /* Contenedor del puntaje */
    .score-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.5rem;
    }

    /* Texto "Puntaje Final" */
    .final-score-label {
      font-size: 1.2rem;
      font-weight: 600;
      color: #9ca3af; /* Gris claro */
    }

    /* El número del puntaje */
    .final-score-value {
      font-size: clamp(2.5rem, 10vmin, 4rem);
      font-weight: 700;
      color: #facc15; /* Amarillo */
      line-height: 1;
    }

    /* Indicador de Nuevo Récord (Opcional) */
    .new-highscore-indicator {
      font-size: 1rem;
      font-weight: 700;
      color: #4ade80; /* Verde */
      background-color: rgba(16, 185, 129, 0.2);
      padding: 0.3rem 0.8rem;
      border-radius: 0.5rem;
      border: 1px solid #34d399;
      margin-top: 0.5rem;
      animation: pulseGreen 1.8s infinite ease-in-out;
    }

    @keyframes pulseGreen {
      0%, 100% { transform: scale(1); box-shadow: 0 0 5px rgba(74, 222, 128, 0.5); }
      50% { transform: scale(1.05); box-shadow: 0 0 10px rgba(74, 222, 128, 0.8); }
    }

    /* Contenedor de botones */
    .button-container {
      display: flex;
      gap: 1rem; /* Espacio entre botones */
      margin-top: 1rem;
    }

    /* Estilo base de los botones */
    .action-button {
      font-family: 'Poppins', sans-serif;
      font-size: 1rem;
      font-weight: 600;
      padding: 0.8rem 1.5rem;
      border-radius: 0.5rem;
      border: none;
      cursor: pointer;
      transition: background-color 0.2s ease, transform 0.1s ease, box-shadow 0.2s ease;
      box-shadow: 0 3px 6px rgba(0,0,0,0.2);
      -webkit-tap-highlight-color: transparent;
    }
    .action-button:hover {
       transform: translateY(-2px);
       box-shadow: 0 5px 10px rgba(0,0,0,0.3);
    }
     .action-button:active {
       transform: translateY(0px) scale(0.98);
       box-shadow: 0 2px 4px rgba(0,0,0,0.2);
    }

    /* Botón Reiniciar */
    .restart-button {
      background-color: #34d399; /* Verde */
      color: #064e3b; /* Verde oscuro */
    }
    .restart-button:hover { background-color: #6ee7b7; }

    /* Botón Menú Principal */
    .menu-button {
      background-color: #60a5fa; /* Azul */
      color: #1e3a8a; /* Azul oscuro */
    }
     .menu-button:hover { background-color: #93c5fd; }

     /* Media Queries */
     @media (max-width: 480px) {
        :host { gap: 1rem; padding: 1rem; }
        .game-over-title { font-size: clamp(2.5rem, 13vmin, 5rem); }
        .final-score-label { font-size: 1rem; }
        .final-score-value { font-size: clamp(2rem, 9vmin, 3.5rem); }
        .new-highscore-indicator { font-size: 0.9rem; }
        .button-container { flex-direction: column; width: 80%; }
        .action-button { width: 100%; font-size: 0.9rem; padding: 0.7rem 1rem; }
     }
  `;

  // --- Manejadores de Eventos ---
  private _handleRestartClick() {
    this.dispatchEvent(new CustomEvent('restart-game-requested', { bubbles: true, composed: true }));
  }

  private _handleMenuClick() {
    this.dispatchEvent(new CustomEvent('main-menu-requested', { bubbles: true, composed: true }));
  }

  // --- Template HTML ---
  render() {
    return html`
      <h1 class="game-over-title">¡Fin del Juego!</h1>

      <div class="score-container">
        <span class="final-score-label">Puntaje Final</span>
        <span class="final-score-value">${this.finalScore}</span>
        ${this.isNewHighScore ? html`
          <span class="new-highscore-indicator">¡Nuevo Récord! 🏆</span>
        ` : ''}
      </div>

      <div class="button-container">
        <button class="action-button restart-button" @click=${this._handleRestartClick}>
          Reiniciar Partida
        </button>
        <button class="action-button menu-button" @click=${this._handleMenuClick}>
          Menú Principal
        </button>
      </div>
    `;
  }
}

// Declaración global
declare global {
  interface HTMLElementTagNameMap {
    'game-over-screen': GameOverScreen;
  }
}