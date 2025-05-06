// src/game/states/MainMenuState.ts

import { IState } from '../StateMachine';
import { GameManager } from '../GameManager';
// Importar el componente Lit para asegurar que se registre antes de usarlo
import '../components/ui/main-menu-screen'

export class MainMenuState implements IState {
  private gameManager: GameManager;
  // El listener ahora es para el evento personalizado del componente Lit
  private startListener: (() => void) | null = null;
  private containerElement: HTMLElement | null = null;
  private sparkleIntervalId: number | null = null;
  private hasStarted: boolean = false; // Para evitar doble transición

  constructor(gameManager: GameManager) {
    this.gameManager = gameManager;
  }

  enter(params?: any): void {
    console.log('MainMenuState: enter (Refactored with Lit)', params);
    this.gameManager.setBodyStateClass('mainmenu-whiskers'); // Establece clase para estilos de fondo/globales
    this.containerElement = this.gameManager.getContainerElement();
    this.hasStarted = false; // Resetear flag al entrar

    if (!this.containerElement) {
      console.error("MainMenuState: Contenedor principal #app no encontrado.");
      return;
    }

    // --- Limpiar contenedor y añadir el componente Lit ---
    // Toda la creación de UI ahora la maneja <main-menu-screen>
    this.containerElement.innerHTML = '<main-menu-screen></main-menu-screen>';
    const mainMenuElement = this.containerElement.querySelector('main-menu-screen');
    // ----------------------------------------------------

    if (mainMenuElement) {
      // --- Listener para el evento personalizado 'start-game-requested' ---
      this.startListener = () => {
        if (this.hasStarted) return; // Prevenir doble ejecución
        this.hasStarted = true;

        console.log("Evento 'start-game-requested' recibido desde <main-menu-screen>");

        // Lógica principal de inicio del juego
        this.gameManager.getAudioManager().playSound('ui_confirm');
        // El spinner de carga ahora se muestra DENTRO del componente <main-menu-screen>

        this.removeStartListeners(); // Limpiar este listener específico
        console.log("MainMenuState: Iniciando transición a QuizGameplay...");
        this.gameManager.getStateMachine().changeState('QuizGameplay');
      };
      // ------------------------------------------------------------------

      // Añadir el listener al componente Lit (una sola vez)
      mainMenuElement.addEventListener('start-game-requested', this.startListener, { once: true });
      console.log("MainMenuState: Listener 'start-game-requested' añadido a <main-menu-screen>.");

    } else {
      console.error("Error al encontrar <main-menu-screen> después de añadirlo al DOM.");
    }

    // Mantenemos la lógica de efectos visuales adicionales aquí (o podríamos moverla al componente)
    this.startSparkleEffect();
    this.ensureFontsLoaded();
  }

  // --- Modificado para limpiar el listener del componente Lit ---
  private removeStartListeners(): void {
    // Buscar el elemento Lit por si acaso (necesario si se llama desde fuera de enter/exit)
    const mainMenuElement = this.containerElement?.querySelector('main-menu-screen');
    if (mainMenuElement && this.startListener) {
      // Remover específicamente el listener de nuestro evento personalizado
      mainMenuElement.removeEventListener('start-game-requested', this.startListener);
      console.log("MainMenuState: Listener 'start-game-requested' removido de <main-menu-screen>.");
    }
    // Limpiar la referencia a la función listener
    this.startListener = null;
  }
  // -----------------------------------------------------------

  exit(): void {
    console.log('MainMenuState: exit (Refactored with Lit)');
    if (this.sparkleIntervalId) { clearTimeout(this.sparkleIntervalId); this.sparkleIntervalId = null; }
    this.removeStartListeners(); // Llama a la versión modificada para limpiar el listener del componente
    if (this.containerElement) {
        this.containerElement.innerHTML = ''; // Limpiar el componente Lit del DOM
        this.containerElement.style.cursor = '';
    }
    this.containerElement = null;
    this.hasStarted = false; // Resetear flag al salir
  }

  update(_deltaTime: number): void {
    // No se necesita acción por frame en este estado
  }

  // --- Métodos auxiliares (sin cambios) ---
  private startSparkleEffect(): void {
      const showSparkle = () => {
          // (Código del efecto sparkle sin cambios...)
           const sparkleTemplate = document.getElementById('sparkle-svg-template') as unknown as SVGElement | null;
           const sparkleContainer = this.containerElement?.querySelector('#sparkle-container') ?? document.getElementById('sparkle-container'); // Buscar dentro o fuera
           if (!sparkleTemplate || !sparkleContainer) return;
           const sparkleClone = sparkleTemplate.cloneNode(true) as SVGElement;
           sparkleClone.removeAttribute('id');
           sparkleClone.style.display = 'block';
           sparkleClone.classList.add('sparkle-instance');
           const vw = Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0);
           const vh = Math.max(document.documentElement.clientHeight || 0, window.innerHeight || 0);
           const sparkleWidth = parseFloat(sparkleClone.style.width || '50');
           const sparkleHeight = parseFloat(sparkleClone.style.height || '50');
           const randomTop = Math.random() * (vh - sparkleHeight);
           const randomLeft = Math.random() * (vw - sparkleWidth);
           sparkleClone.style.position = 'absolute';
           sparkleClone.style.top = `${randomTop}px`;
           sparkleClone.style.left = `${randomLeft}px`;
           sparkleContainer.appendChild(sparkleClone);
           setTimeout(() => {
               if (sparkleClone.parentNode === sparkleContainer) {
                    sparkleContainer.removeChild(sparkleClone);
               }
           }, 500);
      };
      const randomSparkleInterval = () => {
          showSparkle();
          const randomDelay = Math.random() * 150 + 50;
          this.sparkleIntervalId = window.setTimeout(randomSparkleInterval, randomDelay);
      };
      if (this.sparkleIntervalId) { clearTimeout(this.sparkleIntervalId); }
      // Añadir contenedor si no existe (puede ser necesario si el innerHTML lo borró)
      if (this.containerElement && !this.containerElement.querySelector('#sparkle-container')) {
           const sparkleContainer = document.createElement('div');
           sparkleContainer.id = 'sparkle-container';
           sparkleContainer.style.position = 'absolute'; sparkleContainer.style.top = '0'; sparkleContainer.style.left = '0';
           sparkleContainer.style.width = '100%'; sparkleContainer.style.height = '100%';
           sparkleContainer.style.pointerEvents = 'none'; sparkleContainer.style.zIndex = '2';
           // Asegurarse que la plantilla SVG exista (podría estar fuera del #app)
           if (!document.getElementById('sparkle-svg-template') && this.containerElement.parentElement) {
                this.containerElement.parentElement.insertAdjacentHTML('beforeend', `
                   <svg id="sparkle-svg-template" style="display: none;" width="50px" height="50px" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                     <defs><style>.cls-sparkle{fill:none;stroke-miterlimit:10; stroke: #fff845; stroke-width: 2px;}</style></defs>
                     <line class="cls-sparkle" x1="12" y1="0.5" x2="12" y2="5.29"/><line class="cls-sparkle" x1="12" y1="18.71" x2="12" y2="23.5"/><line class="cls-sparkle" x1="23.5" y1="12" x2="18.71" y2="12"/><line class="cls-sparkle" x1="5.29" y1="12" x2="0.5" y2="12"/><line class="cls-sparkle" x1="20.13" y1="3.87" x2="16.74" y2="7.26"/><line class="cls-sparkle" x1="7.26" y1="16.74" x2="3.87" y2="20.13"/><line class="cls-sparkle" x1="20.13" y1="20.13" x2="16.74" y2="16.74"/><line class="cls-sparkle" x1="7.26" y1="7.26" x2="3.87" y2="3.87"/>
                   </svg>
               `);
           }
           this.containerElement.appendChild(sparkleContainer); // Añadir al contenedor del estado
      }
      randomSparkleInterval();
  }

  private ensureFontsLoaded() {
    // (Código para asegurar fuentes sin cambios...)
     if (document.fonts) {
         Promise.all([
             document.fonts.load('1em Pacifico'),
             document.fonts.load('1em Geist'),
             document.fonts.load('1em Poppins')
         ]).then(() => {
             // console.log('Fuentes principales cargadas/listas.');
         }).catch(err => {
             console.warn('Error esperando fuentes:', err);
         });
     }
  }
} // Fin clase MainMenuState