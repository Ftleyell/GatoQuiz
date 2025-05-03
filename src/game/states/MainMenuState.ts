// src/game/states/MainMenuState.ts

import { IState } from '../StateMachine';
import { GameManager } from '../GameManager';

export class MainMenuState implements IState {
  private gameManager: GameManager;
  // Ajuste: Cambiar tipo para aceptar ambos listeners
  private startListener: ((event: MouseEvent | TouchEvent) => void) | null = null;
  private containerElement: HTMLElement | null = null;
  private sparkleIntervalId: number | null = null;
  private hasStarted: boolean = false; // Flag para evitar doble ejecución

  constructor(gameManager: GameManager) {
    this.gameManager = gameManager;
  }

  enter(params?: any): void {
    console.log('MainMenuState: enter (Whiskers & Wisdom Style)', params);
    this.gameManager.setBodyStateClass('mainmenu-whiskers');
    this.containerElement = this.gameManager.getContainerElement();
    this.hasStarted = false; // Resetear flag al entrar

    if (!this.containerElement) {
        console.error("MainMenuState: Contenedor principal #app no encontrado.");
        return;
    }

    // --- Crear Estructura HTML (Sin cambios aquí) ---
    this.containerElement.innerHTML = '';
    // ... (resto del código para crear HTML igual que antes) ...
    const pawWrapper = document.createElement('div');
    pawWrapper.className = 'paw-wrapper';
    const rainbowCircle = document.createElement('div');
    rainbowCircle.className = 'rainbow-circle';
    const circleContent = document.createElement('div');
    circleContent.className = 'circle-content';
    rainbowCircle.appendChild(circleContent);
    const ampersand = document.createElement('span');
    ampersand.className = 'title-ampersand font-pacifico';
    ampersand.textContent = '&';
    const containerInvisible = document.createElement('div');
    containerInvisible.className = 'container-invisible';
    const titleContainer = document.createElement('div');
    titleContainer.className = 'title-container';
    const title1 = document.createElement('h1');
    title1.className = 'font-pacifico title-shadow';
    title1.textContent = 'Whiskers';
    const title2 = document.createElement('h1');
    title2.className = 'font-pacifico title-shadow';
    title2.textContent = 'Wisdom';
    const bgPaw1 = document.createElement('span');
    bgPaw1.className = 'animate-paw-wiggle paw-1';
    bgPaw1.textContent = '🐾';
    const bgPaw2 = document.createElement('span');
    bgPaw2.className = 'animate-paw-wiggle paw-2';
    bgPaw2.textContent = '🐾';
    titleContainer.append(title1, title2, bgPaw1, bgPaw2); // Añadir ampersand aquí si quieres que esté DENTRO del contenedor relativo
    const clickText = document.createElement('div');
    clickText.id = 'click-text';
    clickText.className = 'fading-click-text font-poppins';
    clickText.textContent = '<HAZ CLICK O TOCA>'; // Texto actualizado
    const loadingMessage = document.createElement('div');
    loadingMessage.id = 'loading-message';
    loadingMessage.className = 'mt-10 flex flex-col items-center';
    loadingMessage.style.display = 'none';
    const yarnSpinner = document.createElement('div');
    yarnSpinner.className = 'yarn-spinner mb-4';
    const loadingText = document.createElement('span');
    loadingText.className = 'font-semibold font-geist';
    loadingText.textContent = 'Desenredando la diversión...';
    loadingMessage.append(yarnSpinner, loadingText);

    // Ajuste: Añadir ampersand DENTRO de containerInvisible si quieres que sea relativo a los títulos
    // containerInvisible.append(titleContainer, ampersand, clickText, loadingMessage); // Opción 1
    // pawWrapper.append(rainbowCircle, containerInvisible);

    // O mantener ampersand fuera si el posicionamiento absoluto funciona mejor con los ajustes CSS
    containerInvisible.append(titleContainer, clickText, loadingMessage); // Opción 2 (como antes)
    pawWrapper.append(rainbowCircle, containerInvisible);

    const sparkleContainer = document.createElement('div');
    sparkleContainer.id = 'sparkle-container';
    sparkleContainer.style.position = 'absolute';
    sparkleContainer.style.top = '0'; sparkleContainer.style.left = '0';
    sparkleContainer.style.width = '100%'; sparkleContainer.style.height = '100%';
    sparkleContainer.style.pointerEvents = 'none'; sparkleContainer.style.zIndex = '2';

    this.containerElement.append(pawWrapper, ampersand, sparkleContainer); // Añadir ampersand aquí si es opción 2
    this.containerElement.insertAdjacentHTML('beforeend', `
        <svg id="sparkle-svg-template" style="display: none;" width="50px" height="50px" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <defs><style>.cls-sparkle{fill:none;stroke-miterlimit:10; stroke: #fff845; stroke-width: 2px;}</style></defs>
          <line class="cls-sparkle" x1="12" y1="0.5" x2="12" y2="5.29"/><line class="cls-sparkle" x1="12" y1="18.71" x2="12" y2="23.5"/><line class="cls-sparkle" x1="23.5" y1="12" x2="18.71" y2="12"/><line class="cls-sparkle" x1="5.29" y1="12" x2="0.5" y2="12"/><line class="cls-sparkle" x1="20.13" y1="3.87" x2="16.74" y2="7.26"/><line class="cls-sparkle" x1="7.26" y1="16.74" x2="3.87" y2="20.13"/><line class="cls-sparkle" x1="20.13" y1="20.13" x2="16.74" y2="16.74"/><line class="cls-sparkle" x1="7.26" y1="7.26" x2="3.87" y2="3.87"/>
        </svg>
    `);

    // --- Lógica de Inicio y Chispas ---
    // Ajuste: Definir función de inicio separada y usar flag
    const startGameLogic = (event: MouseEvent | TouchEvent) => {
        // Prevenir doble ejecución si ambos eventos (click y touchstart) se disparan rápido
        if (this.hasStarted) return;
        this.hasStarted = true;

        // Detener la propagación puede ser útil para evitar que otros listeners (como el de audio) se activen también
        // event.stopPropagation();
        // event.preventDefault(); // Prevenir acciones por defecto como zoom al doble tap

        console.log("Starting Whiskers & Wisdom - Meow!");
        this.gameManager.getAudioManager().playSound('ui_confirm');

        // Ocultar elementos del menú
        if (titleContainer) titleContainer.style.display = 'none';
        if (rainbowCircle) rainbowCircle.style.display = 'none';
        if (clickText) clickText.style.display = 'none';
        if (ampersand) ampersand.style.display = 'none';
        if (bgPaw1) bgPaw1.style.display = 'none';
        if (bgPaw2) bgPaw2.style.display = 'none';
        if (loadingMessage) loadingMessage.style.display = 'flex';

        // Detener chispas
        if (this.sparkleIntervalId) { clearTimeout(this.sparkleIntervalId); this.sparkleIntervalId = null; }

        // Limpiar listeners inmediatamente después de usarlos (aunque {once: true} ayuda)
        this.removeStartListeners();

        // Cambiar al estado del juego
        this.gameManager.getStateMachine().changeState('QuizGameplay');
    };

    // Listener de clic y touch en todo el contenedor
    this.startListener = startGameLogic; // Guardar referencia a la función
    this.containerElement.style.cursor = 'pointer'; // Mantener cursor

    // Ajuste: Añadir ambos listeners
    this.containerElement.addEventListener('click', this.startListener, { once: true, passive: false });
    this.containerElement.addEventListener('touchstart', this.startListener, { once: true, passive: false }); // Escuchar touchstart también
    console.log("MainMenuState: Listeners 'click' y 'touchstart' añadidos a #app.");

    this.startSparkleEffect();
    this.ensureFontsLoaded();
  }

  // Ajuste: Método para remover ambos listeners
  private removeStartListeners(): void {
    if (this.containerElement && this.startListener) {
        this.containerElement.removeEventListener('click', this.startListener);
        this.containerElement.removeEventListener('touchstart', this.startListener);
        console.log("MainMenuState: Listeners 'click' y 'touchstart' removidos.");
    }
    this.startListener = null; // Limpiar referencia
  }

  exit(): void {
    console.log('MainMenuState: exit (Whiskers & Wisdom Style)');
    // Detener chispas
    if (this.sparkleIntervalId) { clearTimeout(this.sparkleIntervalId); this.sparkleIntervalId = null; }
    // Limpiar listeners si no se dispararon (por si acaso)
    this.removeStartListeners();
    // Limpiar HTML y estilos
    if (this.containerElement) {
        this.containerElement.innerHTML = '';
        this.containerElement.style.cursor = '';
    }
    this.containerElement = null;
  }

  update(_deltaTime: number): void { /* No action needed */ }

  // --- Funciones Helper (startSparkleEffect, ensureFontsLoaded sin cambios) ---
  private startSparkleEffect(): void {
      const showSparkle = () => {
          const sparkleTemplate = document.getElementById('sparkle-svg-template') as unknown as SVGElement | null;
          const sparkleContainer = document.getElementById('sparkle-container');
          if (!sparkleTemplate || !sparkleContainer) return;
          const sparkleClone = sparkleTemplate.cloneNode(true) as SVGElement;
          sparkleClone.removeAttribute('id');
          sparkleClone.style.display = 'block';
          sparkleClone.classList.add('sparkle-instance');
          const vw = Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0);
          const vh = Math.max(document.documentElement.clientHeight || 0, window.innerHeight || 0);
          const sparkleWidth = parseFloat(sparkleClone.style.width || '50'); // Usar tamaño base del CSS
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
          }, 500); // Duración de la animación
      };
      const randomSparkleInterval = () => {
          showSparkle();
          const randomDelay = Math.random() * 150 + 50;
          this.sparkleIntervalId = window.setTimeout(randomSparkleInterval, randomDelay);
      };
      if (this.sparkleIntervalId) { clearTimeout(this.sparkleIntervalId); }
      randomSparkleInterval();
  }
  private ensureFontsLoaded() {
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

} // Fin MainMenuState