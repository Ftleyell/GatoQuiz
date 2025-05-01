// src/game/states/GameOverState.ts

import { IState } from '../StateMachine';
import { GameManager } from '../GameManager';

export class GameOverState implements IState {
  private gameManager: GameManager;
  private gameOverContainer: HTMLDivElement | null = null;
  private restartListener: (() => void) | null = null;
  // Añadir listener para teclado si se desea
  private keydownListener: ((event: KeyboardEvent) => void) | null = null;

  constructor(gameManager: GameManager) {
    this.gameManager = gameManager;
  }

  enter(params?: any): void {
    console.log('GameOverState: enter', params);
    const finalScore = params?.finalScore ?? 0; // Capturar score si se pasa desde QuizGameplay

    const appContainer = this.gameManager.getContainerElement();
    appContainer.innerHTML = ''; // Limpiar pantalla

    this.gameOverContainer = document.createElement('div');
    // Clases Tailwind de ejemplo
    this.gameOverContainer.className = 'game-over-container flex flex-col items-center justify-center h-full text-center p-4 bg-gray-900 bg-opacity-90 text-white rounded-lg';
    this.gameOverContainer.tabIndex = -1; // Hacerlo enfocable para eventos de teclado

    const gameOverText = document.createElement('p');
    gameOverText.textContent = 'A ESTUDIAR!!';
    gameOverText.className = 'game-over-text text-5xl md:text-6xl font-black text-red-500 mb-4 animate-pulse'; // Añadir animación

    // Mostrar score final
    const finalScoreText = document.createElement('p');
    finalScoreText.textContent = `Puntaje Final: ${finalScore}`;
    finalScoreText.className = 'final-score text-2xl text-yellow-400 mb-8';
    this.gameOverContainer.appendChild(finalScoreText);

    const restartText = document.createElement('p');
    restartText.textContent = 'CLICK O TECLA PARA REINICIAR';
    restartText.className = 'restart-prompt text-lg text-gray-300';

    this.gameOverContainer.appendChild(gameOverText);
    this.gameOverContainer.appendChild(finalScoreText); // Añadido score final
    this.gameOverContainer.appendChild(restartText);

    appContainer.appendChild(this.gameOverContainer);

    // Enfocar el contenedor para capturar teclas inmediatamente
    this.gameOverContainer.focus();

    // *** Integración Audio ***
    this.gameManager.getAudioManager().playSound('game_over');
    // **************************

    // Listener para reiniciar (click o tecla)
    this.restartListener = () => this.triggerRestart();
    this.keydownListener = (event: KeyboardEvent) => {
        // Reiniciar con cualquier tecla, o podrías filtrar por Enter/Space
        // if (event.key === 'Enter' || event.key === ' ') {
            this.triggerRestart();
        // }
    };

    // Añadir listeners
    this.gameOverContainer.addEventListener('click', this.restartListener);
    this.gameOverContainer.addEventListener('keydown', this.keydownListener);
  }

  // Método helper para la lógica de reinicio
  private triggerRestart(): void {
      console.log('Restarting game from GameOver...');
      // Ya no necesitamos remover listeners aquí si se hace en exit()
      // Transicionamos de vuelta al menú principal
      this.gameManager.getStateMachine().changeState('MainMenu');
  }

  exit(): void {
    console.log('GameOverState: exit');
    // Limpiar UI y remover listeners
    if (this.gameOverContainer) {
        if (this.restartListener) {
            this.gameOverContainer.removeEventListener('click', this.restartListener);
            this.restartListener = null;
        }
        if (this.keydownListener) {
            this.gameOverContainer.removeEventListener('keydown', this.keydownListener);
            this.keydownListener = null;
        }
        // Remover el contenedor del DOM
        if (this.gameOverContainer.parentNode) {
            this.gameOverContainer.parentNode.removeChild(this.gameOverContainer);
        }
        this.gameOverContainer = null;
    }
     // Limpiar contenedor principal por si acaso queda algo (aunque no debería ser necesario)
     // this.gameManager.getContainerElement().innerHTML = '';
  }

  update(deltaTime: number): void {
    // No se necesita update para este estado simple
  }
}