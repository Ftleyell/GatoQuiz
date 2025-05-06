// src/components/ui/main-menu-screen.ts
import { LitElement, html, css, CSSResultGroup } from 'lit';
import { customElement, state } from 'lit/decorators.js';

@customElement('main-menu-screen')
export class MainMenuScreen extends LitElement {

  // --- Estado Interno ---
  @state() private _isLoading = false;

  // --- Estilos ---
  static styles: CSSResultGroup = css`
    /* --- ESTILOS MOVIDOS/ADAPTADOS + AJUSTE :host --- */
    :host {
      /* --- INICIO AJUSTES CLAVE --- */
      display: flex;         /* Usa Flexbox para centrar contenido interno */
      justify-content: center; /* Centra contenido horizontalmente */
      align-items: center;    /* Centra contenido verticalmente */
      width: 100%;          /* Ocupa todo el ancho disponible del padre (#app) */
      height: 100%;         /* Ocupa toda la altura disponible del padre (#app) */
      position: relative;     /* Establece contexto para posicionamiento absoluto interno */
      /* --- FIN AJUSTES CLAVE --- */
      overflow: hidden;       /* Mantiene el overflow hidden */
      cursor: pointer;        /* Mantiene el cursor */
      font-family: "Geist", sans-serif; /* Asegurar fuente base */
      -webkit-tap-highlight-color: rgba(0, 0, 0, 0); /* Mantiene tap highlight */
    }

    /* Keyframes (se mantienen igual) */
    @keyframes rainbowRotate {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
    @keyframes pawWiggleAbsolute {
      0%, 100% { transform: translate(-50%, -50%) rotate(-5deg) scale(1); }
      50% { transform: translate(-50%, -50%) rotate(5deg) scale(1.05); }
    }
    @keyframes fadeInOut {
      0%, 100% { opacity: 0.4; }
      50% { opacity: 1; }
    }
     @keyframes spin-yarn {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }

    /* Wrapper principal interno */
    .paw-wrapper {
      position: relative; /* Contexto para contenido interno si fuera necesario */
      width: 100%;
      max-width: 45rem; /* Límite para que no se extienda demasiado en pantallas anchas */
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 1rem;
      z-index: 1; /* Encima del círculo y las patas */
      box-sizing: border-box; /* Incluir padding en el tamaño */
    }

    /* Círculo Arcoíris (Posicionado absoluto relativo al :host) */
    .rainbow-circle {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 80vmin;
      height: 80vmin;
      max-width: 95vw;
      max-height: 95vh;
      z-index: -1; /* Detrás de paw-wrapper */
      border-radius: 50%;
      padding: 6px;
      overflow: hidden;
    }
    .rainbow-circle::before {
      content: '';
      display: block;
      position: absolute;
      width: 200%;
      height: 200%;
      top: -50%;
      left: -50%;
      background-image: conic-gradient(from 0deg at 50% 50%, transparent 50%, #fff845, #1cc98c, #24cbde, #57a9f7, #bd52f9, #ebb347);
      animation: rainbowRotate 4s linear infinite;
      z-index: -1;
    }
    .circle-content {
      width: 100%;
      height: 100%;
      background: #fffefa;
      border-radius: 50%;
      position: relative;
      z-index: 1;
      box-shadow: inset 0 0 15px rgba(0, 0, 0, 0.1);
    }

    /* Contenedor del Título, Texto y Loading (dentro de paw-wrapper) */
    .content-container {
      background: transparent;
      position: relative; /* Relativo a paw-wrapper */
      z-index: 1;
      width: 100%;
      padding: 1rem;
      text-align: center;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      min-height: auto;
      box-sizing: border-box;
    }

    /* Título */
    .title-container {
      position: relative;
      display: block;
      width: 100%;
      z-index: 1;
      margin-bottom: 0;
      text-align: center;
      line-height: 0.9;
    }
    .title-shadow {
      font-family: 'Pacifico', cursive;
      text-shadow: 2px 2px 0px rgba(255, 255, 255, 0.8), 4px 4px 6px rgba(0, 0, 0, 0.1);
      font-size: clamp(3rem, 16vmin, 11rem);
      position: relative;
      z-index: 1;
      margin: 0;
      color: #ea580c;
      display: block;
      word-break: break-word; /* Importante para textos largos */
      overflow-wrap: break-word; /* Alternativa */
      hyphens: auto; /* Permitir división silábica */
    }

    /* Ampersand '&' (Posicionado absoluto relativo al :host) */
    .title-ampersand {
      font-family: 'Pacifico', cursive;
      font-size: clamp(1.8rem, 11vmin, 5.4rem);
      color: #000000;
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      /* animation: pawWiggleAbsolute 1.5s ease-in-out infinite; */
      z-index: 2; /* Encima de los títulos, debajo del loading */
      pointer-events: none;
    }

    /* Patas Gigantes de Fondo (Posicionadas absoluto relativo al :host) */
    .animate-paw-wiggle {
      position: absolute;
      top: 50%;
      left: 50%;
      font-size: clamp(15rem, 60vmin, 30rem);
      line-height: 1;
      pointer-events: none;
      animation: pawWiggleAbsolute 1.5s ease-in-out infinite;
      transform-origin: center center;
      z-index: 0; /* Detrás del paw-wrapper */
    }
    .animate-paw-wiggle.paw-1 {
      color: #ffffff;
      text-shadow: 0 0 15px #fb7185, 0 0 25px #fb7185, 0 0 40px #f472b6;
      transform: translate(-50%, -50%) rotate(-10deg) scale(1);
    }
    .animate-paw-wiggle.paw-2 {
      color: #fb7185;
      opacity: 0.5;
      text-shadow: none;
      transform: translate(-50%, -50%) rotate(15deg) scale(0.95);
      animation-delay: 0.3s;
    }

    /* Texto "Haz Click" (dentro de content-container) */
    .fading-click-text {
      font-family: 'Poppins', sans-serif;
      font-size: clamp(1rem, 4vmin, 1.8rem);
      font-weight: 700;
      color: #000000;
      text-transform: uppercase;
      margin-top: 1.5rem;
      animation: fadeInOut 2.5s infinite ease-in-out;
      position: relative;
      z-index: 1;
    }

    /* Mensaje de Carga (Posicionado absoluto relativo al :host) */
    .loading-message {
      margin-top: 0; /* No necesita margen si está centrado absoluto */
      display: flex;
      flex-direction: column;
      align-items: center;
      position: absolute; /* Centrado absoluto en el :host */
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      z-index: 5; /* Encima de todo */
    }
    .yarn-spinner {
      width: clamp(25px, 8vmin, 40px);
      height: clamp(25px, 8vmin, 40px);
      border: clamp(3px, 1.5vmin, 6px) dotted #f97316;
      border-radius: 50%;
      display: inline-block;
      animation: spin-yarn 1.3s linear infinite;
      margin-bottom: 0.5rem;
    }
    .loading-message span {
       font-family: "Geist", sans-serif;
       font-size: clamp(1rem, 4vmin, 1.5rem);
       font-weight: 600;
       color: #c2410c;
    }

    /* Control de Visibilidad durante Carga */
    .content-container.is-loading .title-container,
    .content-container.is-loading .fading-click-text,
    :host(.is-loading-host) .animate-paw-wiggle, /* Aplicar a :host si isLoading */
    :host(.is-loading-host) .title-ampersand,
    :host(.is-loading-host) .paw-wrapper:not(.loading-message) /* Ocultar paw-wrapper excepto el loading */
     {
        /* Ocultar elementos principales cuando carga */
       visibility: hidden;
       opacity: 0;
       transition: visibility 0s 0.1s, opacity 0.1s linear;
    }

    .loading-message {
       display: none; /* Oculto por defecto */
       opacity: 0;
       transition: opacity 0.2s ease-in;
    }
    /* Mostrar loading cuando el contenedor tiene la clase */
    .content-container.is-loading .loading-message {
        display: flex;
        opacity: 1;
    }

    /* Media Queries (Simplificadas) */
    @media (max-width: 480px) {
      .animate-paw-wiggle.paw-2 {
        display: none; /* Ocultar pata trasera en muy pequeño */
      }
    }
  `;

  // --- Template HTML ---
  render() {
    // Aplicar clase al host directamente para controlar visibilidad de patas/ampersand
    if (this.classList.contains('is-loading-host') !== this._isLoading) {
       this.classList.toggle('is-loading-host', this._isLoading);
    }

    return html`
      <div class="paw-wrapper" @click=${this._handleScreenClick} @touchstart=${this._handleScreenClick}>
        <div class="rainbow-circle">
          <div class="circle-content"></div>
        </div>

        <div class="content-container ${this._isLoading ? 'is-loading' : ''}">
          <div class="title-container">
            <h1 class="font-pacifico title-shadow">Whiskers</h1>
            <h1 class="font-pacifico title-shadow">Wisdom</h1>
          </div>
          <div class="fading-click-text font-poppins">
            &lt;HAZ CLICK O TOCA&gt;
          </div>
        </div>

        <div class="loading-message">
             <div class="yarn-spinner"></div>
             <span class="font-geist">Desenredando la diversión...</span>
        </div>

      </div>

      <span class="animate-paw-wiggle paw-1">🐾</span>
      <span class="animate-paw-wiggle paw-2">🐾</span>
      <span class="title-ampersand font-pacifico">&</span>
    `;
  }

  // --- Manejador de Eventos ---
  private _handleScreenClick(event: MouseEvent | TouchEvent) {
    if (this._isLoading) return; // Evitar múltiples clics

    if (event.type === 'touchstart') {
        event.preventDefault(); // Prevenir comportamiento táctil por defecto
    }

    console.log("MainMenuScreen: Click/Tap detectado!");
    this._isLoading = true; // Activa el estado de carga (y la clase CSS)

    // Esperar un breve instante para que se vea el spinner antes de emitir
    setTimeout(() => {
        // Dispara el evento para que MainMenuState lo capture
        this.dispatchEvent(new CustomEvent('start-game-requested', { bubbles: true, composed: true }));
    }, 100); // Aumentado ligeramente el delay para asegurar renderizado del spinner
  }
}

// Declaración global (sin cambios)
declare global {
  interface HTMLElementTagNameMap {
    'main-menu-screen': MainMenuScreen;
  }
}