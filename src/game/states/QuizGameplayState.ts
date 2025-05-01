// src/game/states/QuizGameplayState.ts

import { IState } from '../StateMachine';
import { GameManager } from '../GameManager'; // Ajusta la ruta si es necesario

export class QuizGameplayState implements IState {
  private gameManager: GameManager;

  constructor(gameManager: GameManager) {
    this.gameManager = gameManager;
  }

  enter(params?: any): void {
    console.log('QuizGameplayState: enter', params);
    // Aquí iniciaría la lógica del gameplay:
    // 1. Obtener la primera pregunta del QuizSystem
    //    const quizSystem = this.gameManager.getQuizSystem();
    //    const question = quizSystem.selectNextQuestion();
    // 2. Mostrar la pregunta y opciones en la UI
    // 3. Añadir listeners a las opciones para detectar la respuesta del usuario
    // 4. Al responder -> validar con QuizSystem -> mostrar feedback -> seleccionar siguiente pregunta o ir a Results
  }

  exit(): void {
    console.log('QuizGameplayState: exit');
    // Limpiar UI del gameplay, quitar listeners
  }

  update(deltaTime: number): void {
    // console.log('QuizGameplayState: update', deltaTime);
    // Actualizar timers, animaciones, etc., relacionados al gameplay
  }
}