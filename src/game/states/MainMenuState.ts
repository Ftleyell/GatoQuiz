// src/game/states/MainMenuState.ts

import { IState } from '../StateMachine';
import { GameManager } from '../GameManager';

export class MainMenuState implements IState {
  private gameManager: GameManager;
  private containerClickListener: (() => void) | null = null;
  private containerElement: HTMLElement | null = null;
  private sparkleIntervalId: number | null = null; // Para limpiar el intervalo de chispas

  constructor(gameManager: GameManager) {
    this.gameManager = gameManager;
  }

  enter(params?: any): void {
    console.log('MainMenuState: enter (Whiskers & Wisdom Style)', params);
    this.gameManager.setBodyStateClass('mainmenu-whiskers'); // Clase específica para el body si es necesario
    this.containerElement = this.gameManager.getContainerElement();

    if (!this.containerElement) {
        console.error("MainMenuState: Contenedor principal #app no encontrado.");
        return;
    }

    this.containerElement.innerHTML = ''; // Limpiar contenedor

    // --- Crear Estructura HTML ---
    const pawWrapper = document.createElement('div');
    pawWrapper.className = 'paw-wrapper'; // Necesita CSS definido globalmente

    const rainbowCircle = document.createElement('div');
    rainbowCircle.className = 'rainbow-circle'; // Necesita CSS definido globalmente
    const circleContent = document.createElement('div');
    circleContent.className = 'circle-content'; // Necesita CSS definido globalmente
    rainbowCircle.appendChild(circleContent);

    // Ampersand animado (se posicionará fijo en el centro vía CSS)
    const ampersand = document.createElement('span');
    ampersand.className = 'title-ampersand font-pacifico'; // Necesita CSS definido globalmente
    ampersand.textContent = '&';

    const containerInvisible = document.createElement('div');
    containerInvisible.className = 'container-invisible'; // Necesita CSS definido globalmente

    const titleContainer = document.createElement('div');
    titleContainer.className = 'title-container'; // Necesita CSS definido globalmente

    const title1 = document.createElement('h1');
    title1.className = 'font-pacifico title-shadow'; // Necesita CSS definido globalmente
    title1.textContent = 'Whiskers';

    const title2 = document.createElement('h1');
    title2.className = 'font-pacifico title-shadow'; // Necesita CSS definido globalmente
    title2.textContent = 'Wisdom';

    // Paws animadas de fondo
    const bgPaw1 = document.createElement('span');
    bgPaw1.className = 'animate-paw-wiggle paw-1'; // Necesita CSS definido globalmente
    bgPaw1.textContent = '🐾';
    const bgPaw2 = document.createElement('span');
    bgPaw2.className = 'animate-paw-wiggle paw-2'; // Necesita CSS definido globalmente
    bgPaw2.textContent = '🐾';

    titleContainer.append(title1, title2, bgPaw1, bgPaw2);

    // Texto "HAZ CLICK"
    const clickText = document.createElement('div');
    clickText.id = 'click-text';
    clickText.className = 'fading-click-text font-poppins'; // Aplicar fuente Poppins
    clickText.textContent = '<HAZ CLICK>';

    // Mensaje de carga (inicialmente oculto)
    const loadingMessage = document.createElement('div');
    loadingMessage.id = 'loading-message';
    loadingMessage.className = 'mt-10 flex flex-col items-center'; // Clases Tailwind o equivalentes
    loadingMessage.style.display = 'none'; // Oculto por defecto
    const yarnSpinner = document.createElement('div');
    yarnSpinner.className = 'yarn-spinner mb-4'; // Necesita CSS definido globalmente
    const loadingText = document.createElement('span');
    loadingText.className = 'font-semibold font-geist'; // Aplicar fuente Geist
    loadingText.textContent = 'Desenredando la diversión...';
    loadingMessage.append(yarnSpinner, loadingText);

    containerInvisible.append(titleContainer, clickText, loadingMessage);
    pawWrapper.append(rainbowCircle, containerInvisible);

    // Contenedor para chispas
    const sparkleContainer = document.createElement('div');
    sparkleContainer.id = 'sparkle-container';
    sparkleContainer.style.position = 'absolute';
    sparkleContainer.style.top = '0';
    sparkleContainer.style.left = '0';
    sparkleContainer.style.width = '100%';
    sparkleContainer.style.height = '100%';
    sparkleContainer.style.pointerEvents = 'none';
    sparkleContainer.style.zIndex = '2';

    // Añadir todo al contenedor principal
    this.containerElement.append(pawWrapper, ampersand, sparkleContainer);
    // Añadir plantilla SVG de chispas (oculta)
    this.containerElement.insertAdjacentHTML('beforeend', `
        <svg id="sparkle-svg-template" style="display: none;" width="50px" height="50px" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <defs><style>.cls-sparkle{fill:none;stroke-miterlimit:10; stroke: #fff845; stroke-width: 2px;}</style></defs>
          <line class="cls-sparkle" x1="12" y1="0.5" x2="12" y2="5.29"/>
          <line class="cls-sparkle" x1="12" y1="18.71" x2="12" y2="23.5"/>
          <line class="cls-sparkle" x1="23.5" y1="12" x2="18.71" y2="12"/>
          <line class="cls-sparkle" x1="5.29" y1="12" x2="0.5" y2="12"/>
          <line class="cls-sparkle" x1="20.13" y1="3.87" x2="16.74" y2="7.26"/>
          <line class="cls-sparkle" x1="7.26" y1="16.74" x2="3.87" y2="20.13"/>
          <line class="cls-sparkle" x1="20.13" y1="20.13" x2="16.74" y2="16.74"/>
          <line class="cls-sparkle" x1="7.26" y1="7.26" x2="3.87" y2="3.87"/>
        </svg>
    `);


    // --- Lógica de Inicio y Chispas ---
    const startGameLogic = () => {
        console.log("Starting Whiskers & Wisdom - Meow!");

        // *** INICIO MODIFICACIÓN: Reproducir sonido ***
        this.gameManager.getAudioManager().playSound('ui_confirm');
        // *** FIN MODIFICACIÓN ***

        // Ocultar elementos del menú
        if (titleContainer) titleContainer.style.display = 'none';
        if (rainbowCircle) rainbowCircle.style.display = 'none';
        if (clickText) clickText.style.display = 'none';
        if (ampersand) ampersand.style.display = 'none';
        if (bgPaw1) bgPaw1.style.display = 'none'; // Ocultar patas de fondo también
        if (bgPaw2) bgPaw2.style.display = 'none';
        // Mostrar mensaje de carga
        if (loadingMessage) loadingMessage.style.display = 'flex';

        // Detener chispas
        if (this.sparkleIntervalId) {
            clearTimeout(this.sparkleIntervalId); // Usar clearTimeout ya que usamos setTimeout abajo
            this.sparkleIntervalId = null;
        }

        // Asegurar inicialización de audio (ya se hace al reproducir sonido)
        // if (!this.gameManager.getAudioManager().isReady()) {
        //     this.gameManager.getAudioManager().init();
        // }

        // Cambiar al estado del juego (después de una pequeña pausa opcional para ver el loading)
        // setTimeout(() => {
             this.gameManager.getStateMachine().changeState('QuizGameplay');
        // }, 500); // Pausa opcional
    };

    // Listener de clic en todo el contenedor
    this.containerClickListener = startGameLogic;
    this.containerElement.style.cursor = 'pointer';
    this.containerElement.addEventListener('click', this.containerClickListener, { once: true });

    // Iniciar efecto de chispas
    this.startSparkleEffect();

    // Asegurar que las fuentes estén cargadas
    this.ensureFontsLoaded();

  }

  exit(): void {
    console.log('MainMenuState: exit (Whiskers & Wisdom Style)');
    // Detener chispas
    if (this.sparkleIntervalId) {
        clearTimeout(this.sparkleIntervalId); // Usar clearTimeout
        this.sparkleIntervalId = null;
    }
    // Limpiar listener (aunque once: true debería bastar)
    if (this.containerElement && this.containerClickListener) {
      this.containerElement.removeEventListener('click', this.containerClickListener);
    }
    this.containerClickListener = null;
    // Limpiar HTML y estilos
    if (this.containerElement) {
        this.containerElement.innerHTML = '';
        this.containerElement.style.cursor = '';
        // Resetear otros estilos si es necesario
    }
     this.containerElement = null;
  }

  update(deltaTime: number): void {
    // No se necesita update aquí
  }

  // --- Funciones Helper ---

  private startSparkleEffect(): void {
      const showSparkle = () => {
          const sparkleTemplate = document.getElementById('sparkle-svg-template') as unknown as SVGElement | null; // Type assertion
          const sparkleContainer = document.getElementById('sparkle-container');
          if (!sparkleTemplate || !sparkleContainer) return;

          const sparkleClone = sparkleTemplate.cloneNode(true) as SVGElement; // Type assertion
          sparkleClone.removeAttribute('id');
          sparkleClone.style.display = 'block';
          sparkleClone.classList.add('sparkle-instance'); // Necesita CSS definido globalmente

          const vw = Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0);
          const vh = Math.max(document.documentElement.clientHeight || 0, window.innerHeight || 0);
          const sparkleWidth = 50;
          const sparkleHeight = 50;
          const randomTop = Math.random() * (vh - sparkleHeight);
          const randomLeft = Math.random() * (vw - sparkleWidth);

          sparkleClone.style.position = 'absolute'; // Asegurar posicionamiento
          sparkleClone.style.top = `${randomTop}px`;
          sparkleClone.style.left = `${randomLeft}px`;

          sparkleContainer.appendChild(sparkleClone);

          setTimeout(() => {
              // Verificar si el nodo todavía existe antes de intentar removerlo
              if (sparkleClone.parentNode === sparkleContainer) {
                   sparkleContainer.removeChild(sparkleClone);
              }
          }, 500); // Duración de la animación de la chispa
      };

      const randomSparkleInterval = () => {
          showSparkle();
          const randomDelay = Math.random() * 150 + 50;
          // Guardar ID para poder limpiarlo en exit()
          // Usar setTimeout en lugar de setInterval para que el delay sea variable
          this.sparkleIntervalId = window.setTimeout(randomSparkleInterval, randomDelay);
      };

      // Limpiar intervalo anterior si existe
      if (this.sparkleIntervalId) {
          clearTimeout(this.sparkleIntervalId); // Usar clearTimeout
      }
      randomSparkleInterval(); // Iniciar el ciclo
  }

  // Función para asegurar carga de fuentes (opcional, mejora percepción)
  private ensureFontsLoaded() {
      // Si las fuentes ya están precargadas en index.html o CSS global, esto es menos crítico.
      // Si se cargan dinámicamente, aquí podrías usar document.fonts.load()
      // o una librería como FontFaceObserver antes de mostrar el contenido principal.
      // Ejemplo simple:
      if (document.fonts) {
          Promise.all([
              document.fonts.load('1em Pacifico'),
              document.fonts.load('1em Geist'),
              document.fonts.load('1em Poppins')
          ]).then(() => {
              // console.log('Fuentes principales cargadas/listas.'); // Log opcional
              // Podrías añadir una clase al body aquí para indicar que las fuentes están listas
              // document.body.classList.add('fonts-loaded');
          }).catch(err => {
              console.warn('Error esperando fuentes:', err);
          });
      }
  }

}
