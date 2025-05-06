// src/game/components/ui/results-screen.ts
import { LitElement, html, css, CSSResultGroup } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { format } from 'path';

@customElement('results-screen')
export class ResultsScreen extends LitElement {

  // --- Propiedades (Inputs) ---
  @property({ type: Number }) finalScore = 0;
  @property({ type: Number }) correctAnswers = 0;
  @property({ type: Number }) totalQuestions = 0;
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
      background-color: rgba(31, 41, 55, 0.95); /* Fondo azul oscuro */
      color: #e5e7eb;
      font-family: 'Poppins', sans-serif;
      gap: 1.5rem; /* Espacio entre elementos */
      -webkit-tap-highlight-color: transparent;
    }

    /* Título "Resultados" */
    .results-title {
      font-family: 'Pacifico', cursive;
      font-size: clamp(2.8rem, 14vmin, 5.5rem);
      color: #6ee7b7; /* Verde menta */
      text-shadow: 1px 1px 4px rgba(0,0,0,0.4);
      margin-bottom: 0.5rem;
      line-height: 1.1;
    }

    /* Contenedor de estadísticas */
    .stats-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 1rem;
      background-color: rgba(17, 24, 39, 0.6);
      padding: 1.5rem 2rem;
      border-radius: 0.75rem;
      border: 1px solid #4b5563;
    }

    /* Estilo para cada estadística */
    .stat-item {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.2rem;
    }

    .stat-label {
      font-size: 1rem;
      font-weight: 600;
      color: #9ca3af; /* Gris claro */
    }

    .stat-value {
      font-size: clamp(1.8rem, 7vmin, 2.8rem);
      font-weight: 700;
      line-height: 1;
    }

    .stat-value.score { color: #facc15; /* Amarillo */ }
    .stat-value.accuracy { color: #6ee7b7; /* Verde menta */ }

    /* Indicador de Nuevo Récord (Opcional) */
    .new-highscore-indicator {
      font-size: 1rem; font-weight: 700; color: #4ade80;
      background-color: rgba(16, 185, 129, 0.2);
      padding: 0.3rem 0.8rem; border-radius: 0.5rem;
      border: 1px solid #34d399; margin-top: 1rem;
      animation: pulseGreen 1.8s infinite ease-in-out;
    }

    @keyframes pulseGreen {
      0%, 100% { transform: scale(1); box-shadow: 0 0 5px rgba(74, 222, 128, 0.5); }
      50% { transform: scale(1.05); box-shadow: 0 0 10px rgba(74, 222, 128, 0.8); }
    }

    /* Botón de Continuar */
    .continue-button {
      font-family: 'Poppins', sans-serif; font-size: 1.1rem; font-weight: 600;
      padding: 0.9rem 2rem; border-radius: 0.5rem; border: none;
      cursor: pointer; transition: background-color 0.2s ease, transform 0.1s ease, box-shadow 0.2s ease;
      box-shadow: 0 3px 6px rgba(0,0,0,0.2);
      background-color: #60a5fa; /* Azul */
      color: #1e3a8a; /* Azul oscuro */
      margin-top: 1rem;
      -webkit-tap-highlight-color: transparent;
    }
    .continue-button:hover {
       transform: translateY(-2px);
       box-shadow: 0 5px 10px rgba(0,0,0,0.3);
       background-color: #93c5fd;
    }
     .continue-button:active {
       transform: translateY(0px) scale(0.98);
       box-shadow: 0 2px 4px rgba(0,0,0,0.2);
    }

     /* Media Queries */
     @media (max-width: 480px) {
        :host { gap: 1rem; padding: 1.5rem 1rem; }
        .results-title { font-size: clamp(2.2rem, 12vmin, 4.5rem); }
        .stats-container { padding: 1rem 1.5rem; gap: 0.8rem; }
        .stat-label { font-size: 0.9rem; }
        .stat-value { font-size: clamp(1.5rem, 6vmin, 2.2rem); }
        .new-highscore-indicator { font-size: 0.9rem; margin-top: 0.8rem; }
        .continue-button { width: 80%; font-size: 1rem; padding: 0.8rem 1.5rem; }
     }
  `;

  // --- Manejador de Eventos ---
  private _handleContinueClick() {
    this.dispatchEvent(new CustomEvent('continue-requested', { bubbles: true, composed: true }));
  }

  // --- Template HTML ---
  render() {
    const accuracy = this.totalQuestions > 0
      ? ((this.correctAnswers / this.totalQuestions) * 100).toFixed(0)
      : 0;

    return html`
      <h1 class="results-title">Resultados</h1>

      <div class="stats-container">
        <div class="stat-item">
          <span class="stat-label">Puntaje Final</span>
          <span class="stat-value score">${this.finalScore}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">Precisión</span>
          <span class="stat-value accuracy">${accuracy}%</span>
          <span class="stat-label" style="font-size: 0.8rem; color: #6b7280;">(${this.correctAnswers} / ${this.totalQuestions})</span>
        </div>
      </div>

      ${this.isNewHighScore ? html`
        <span class="new-highscore-indicator">¡Nuevo Récord! 🏆</span>
      ` : ''}

      <button class="action-button continue-button" @click=${this._handleContinueClick}>
        Continuar
      </button>
    `;
  }
}

// Declaración global
declare global {
  interface HTMLElementTagNameMap {
    'results-screen': ResultsScreen;
  }
}