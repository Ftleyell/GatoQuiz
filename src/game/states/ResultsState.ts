// src/game/states/ResultsState.ts

import { IState } from '../StateMachine';
import { GameManager } from '../GameManager'; // Ajusta la ruta si es necesario

export class ResultsState implements IState {
  private gameManager: GameManager;

  constructor(gameManager: GameManager) {
    this.gameManager = gameManager;
  }

  enter(params?: any): void {
    console.log('ResultsState: enter', params);
    // Aquí mostrarías la pantalla de resultados:
    // 1. Obtener puntuación final, estadísticas (del GameManager o QuizSystem)
    // 2. Mostrar la información en la UI
    // 3. Añadir botones para "Jugar de Nuevo" (-> MainMenu o QuizGameplay) o "Menú Principal" (-> MainMenu)
  }

  exit(): void {
    console.log('ResultsState: exit');
    // Limpiar UI de resultados, quitar listeners
  }

  update(deltaTime: number): void {
    // console.log('ResultsState: update', deltaTime); // No suele necesitar update
  }
}