// src/game/states/GameOverState.ts

import { IState } from '../StateMachine';
import { GameManager } from '../GameManager'; // Asegúrate que la ruta sea correcta

/**
 * Estado que se muestra cuando el jugador pierde todas sus vidas.
 * Muestra el puntaje final y ofrece reiniciar.
 */
export class GameOverState implements IState {
  private gameManager: GameManager;
  private gameOverContainer: HTMLDivElement | null = null;
  private restartListener: (() => void) | null = null;
  private keydownListener: ((event: KeyboardEvent) => void) | null = null;

  constructor(gameManager: GameManager) {
    this.gameManager = gameManager;
  }

  /**
   * Se ejecuta al entrar en el estado GameOver.
   * Limpia gatos, muestra mensaje, puntaje final y botón/prompt de reinicio.
   * @param params - Parámetros opcionales, se espera { finalScore: number }.
   */
  enter(params?: any): void {
    console.log('GameOverState: enter', params);
    this.gameManager.setBodyStateClass('gameover'); // <-- AÑADIR ESTA LÍNEA
    const finalScore = params?.finalScore ?? 0; // Capturar score

    // *** CORRECCIÓN: Limpiar gatos al entrar a Game Over ***
    try {
        console.log("GameOverState: Limpiando gatos de la partida anterior...");
        this.gameManager.getCatManager().removeAllCats();
    } catch (error) {
        console.error("GameOverState: Error al limpiar gatos:", error);
    }
    // ******************************************************

    const appContainer = this.gameManager.getContainerElement();
    appContainer.innerHTML = ''; // Limpiar cualquier UI anterior (del quiz)

    // Crear contenedor para la UI de Game Over
    this.gameOverContainer = document.createElement('div');
    this.gameOverContainer.className = 'game-over-container flex flex-col items-center justify-center h-full text-center p-4 bg-gray-900 bg-opacity-90 text-white rounded-lg';
    this.gameOverContainer.tabIndex = -1; // Para eventos de teclado

    // Texto "A ESTUDIAR!!"
    const gameOverText = document.createElement('p');
    gameOverText.textContent = 'A ESTUDIAR!!';
    gameOverText.className = 'game-over-text text-5xl md:text-6xl font-black text-red-500 mb-4 animate-pulse';

    // Puntaje Final
    const finalScoreText = document.createElement('p');
    finalScoreText.textContent = `Puntaje Final: ${finalScore}`;
    finalScoreText.className = 'final-score text-2xl text-yellow-400 mb-8';

    // Prompt para Reiniciar
    const restartText = document.createElement('p');
    restartText.textContent = 'CLICK O TECLA PARA REINICIAR';
    restartText.className = 'restart-prompt text-lg text-gray-300';

    // Añadir elementos al contenedor
    this.gameOverContainer.appendChild(gameOverText);
    this.gameOverContainer.appendChild(finalScoreText);
    this.gameOverContainer.appendChild(restartText);

    // Añadir contenedor al DOM
    appContainer.appendChild(this.gameOverContainer);

    // Enfocar para teclado
    this.gameOverContainer.focus();

    // Reproducir sonido de Game Over
    this.gameManager.getAudioManager().playSound('game_over');

    // Listeners para reiniciar
    this.restartListener = () => this.triggerRestart();
    this.keydownListener = (event: KeyboardEvent) => {
        // Reiniciar con cualquier tecla (o filtrar por Enter/Space si prefieres)
        this.triggerRestart();
    };

    // Añadir listeners al contenedor
    this.gameOverContainer.addEventListener('click', this.restartListener);
    this.gameOverContainer.addEventListener('keydown', this.keydownListener);
  }

  /**
   * Lógica centralizada para iniciar el proceso de reinicio.
   */
  private triggerRestart(): void {
      console.log('Restarting game from GameOver...');
      // No es necesario remover listeners aquí, se hace en exit()
      this.gameManager.getStateMachine().changeState('MainMenu'); // Volver al menú
  }

  /**
   * Se ejecuta al salir del estado GameOver.
   * Limpia la UI y remueve los listeners.
   */
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
        // Remover el contenedor del DOM de forma segura
        if (this.gameOverContainer.parentNode) {
            this.gameOverContainer.parentNode.removeChild(this.gameOverContainer);
        }
        this.gameOverContainer = null; // Limpiar referencia
    }
     // Limpiar contenedor principal por si acaso (no debería ser necesario si exit se llama correctamente)
     // this.gameManager.getContainerElement().innerHTML = '';
  }

  /**
   * Se ejecuta en cada frame (sin uso aquí).
   * @param deltaTime - Tiempo desde el último frame.
   */
  update(deltaTime: number): void {
    // No se necesita update para este estado simple
  }
} // Fin clase GameOverState