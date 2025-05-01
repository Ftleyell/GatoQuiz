// src/game/states/MainMenuState.ts

import { IState } from '../StateMachine';
import { GameManager } from '../GameManager'; // Ajusta la ruta si es necesario

export class MainMenuState implements IState {
  private gameManager: GameManager;

  constructor(gameManager: GameManager) {
    this.gameManager = gameManager;
  }

  enter(params?: any): void {
    console.log('MainMenuState: enter', params);
    // Aquí mostrarías el menú principal (Título, botón "Jugar")
    // Ejemplo simple:
    // const container = this.gameManager.getContainerElement();
    // container.innerHTML = `<h1>Quiz Felino</h1><button id="playButton">Jugar</button>`;
    // container.querySelector('#playButton')?.addEventListener('click', () => {
    //   this.gameManager.getStateMachine().changeState('QuizGameplay');
    // });
  }

  exit(): void {
    console.log('MainMenuState: exit');
    // Limpiar UI del menú, quitar listeners
    // const container = this.gameManager.getContainerElement();
    // container.innerHTML = ''; // O quitar listeners específicos
  }

  update(deltaTime: number): void {
    // console.log('MainMenuState: update', deltaTime); // No suele necesitar update
  }
}