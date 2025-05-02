// src/game/states/MainMenuState.ts

import { IState } from '../StateMachine';
import { GameManager } from '../GameManager';

export class MainMenuState implements IState {
  private gameManager: GameManager;
  private playButtonListener: (() => void) | null = null;

  constructor(gameManager: GameManager) {
    this.gameManager = gameManager;
  }

  enter(params?: any): void {
    console.log('MainMenuState: enter', params);
    this.gameManager.setBodyStateClass('mainmenu'); // <-- AÑADIR ESTA LÍNEA
    const container = this.gameManager.getContainerElement();
    container.innerHTML = ''; // Limpiar contenedor

    // Crear elementos de UI
    const title = document.createElement('h1');
    title.textContent = 'Quiz Felino Interactivo'; // Título para nuestro nuevo menú
    title.className = 'main-menu-title'; // Clase CSS (añadir estilos en style.css)

    const playButton = document.createElement('button');
    playButton.textContent = 'Jugar';
    playButton.id = 'playButton';
    playButton.className = 'play-button'; // Clase CSS (añadir estilos en style.css)

    // Añadir elementos al contenedor
    container.appendChild(title);
    container.appendChild(playButton);

    // Añadir estilos inline básicos para centrar (o mejor usar CSS)
    container.style.display = 'flex';
    container.style.flexDirection = 'column';
    container.style.justifyContent = 'center';
    container.style.alignItems = 'center';
    container.style.height = '100%'; // Asumiendo que #app tiene dimensiones definidas

    // Guardar la función listener para poder removerla después
    this.playButtonListener = () => {
      console.log('Botón Jugar presionado');
      this.gameManager.getStateMachine().changeState('QuizGameplay');
    };

    // Añadir event listener
    playButton.addEventListener('click', this.playButtonListener);
  }

  exit(): void {
    console.log('MainMenuState: exit');
    const container = this.gameManager.getContainerElement();
    const playButton = container.querySelector('#playButton');
    if (playButton && this.playButtonListener) {
      playButton.removeEventListener('click', this.playButtonListener);
      console.log('Listener del botón Jugar removido.');
      this.playButtonListener = null;
    } else {
      console.warn('No se pudo remover el listener del botón Jugar.');
    }
    container.innerHTML = ''; // Limpiar UI del menú
    container.style.display = ''; // Resetear estilos inline
    container.style.flexDirection = '';
    container.style.justifyContent = '';
    container.style.alignItems = '';
    container.style.height = '';
  }

  update(deltaTime: number): void {
    // No se necesita lógica de actualización en cada frame para este menú simple
  }
}