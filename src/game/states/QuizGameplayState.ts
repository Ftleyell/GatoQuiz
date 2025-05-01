// src/game/states/QuizGameplayState.ts

import { IState } from '../StateMachine';
import { GameManager } from '../GameManager';
// Importar la interfaz Question si la moviste a un archivo de tipos
// import { Question } from '../../types/quiz'; // Ejemplo de ruta

// Re-declarar interfaces aquí si no están en un archivo importado
interface QuestionOption { key: string; text: string; }
interface Question { id: number | string; text: string; options: QuestionOption[]; correctAnswerKey: string; difficulty: string; }


export class QuizGameplayState implements IState {
  private gameManager: GameManager;
  private currentQuestion: Question | null = null;
  // Guardar referencias a los listeners para poder removerlos
  private optionListeners: Map<HTMLButtonElement, () => void> = new Map();
  // Referencia al contenedor de la UI del quiz para limpiarlo fácilmente
  private quizContainer: HTMLDivElement | null = null;


  constructor(gameManager: GameManager) {
    this.gameManager = gameManager;
  }

  enter(params?: any): void {
    console.log('QuizGameplayState: enter', params);
    this.displayNextQuestion();
  }

  exit(): void {
    console.log('QuizGameplayState: exit');
    this.clearUI(); // Limpiar UI y listeners al salir del estado
  }

  update(deltaTime: number): void {
    // console.log('QuizGameplayState: update', deltaTime);
    // Lógica de actualización durante el gameplay (timers, animaciones, etc.)
  }

  private displayNextQuestion(): void {
    this.clearUI(); // Limpiar UI anterior antes de mostrar la nueva pregunta

    const quizSystem = this.gameManager.getQuizSystem();
    this.currentQuestion = quizSystem.selectNextQuestion(); // Usar la variable de instancia

    if (!this.currentQuestion) {
      console.log('No hay más preguntas disponibles o hubo un error.');
      // TODO: Transicionar al estado de Resultados
      // --- Línea Corregida ---
      this.gameManager.getStateMachine().changeState('Results', { score: 0 }); // Usamos un score temporal 0
      // --- Fin Línea Corregida ---
      return;
    }

    const appContainer = this.gameManager.getContainerElement();
    appContainer.innerHTML = ''; // Limpiar contenedor principal

    // Crear contenedor específico para la UI del Quiz
    this.quizContainer = document.createElement('div');
    this.quizContainer.className = 'quiz-ui-container p-4 flex flex-col items-center w-full max-w-md'; // Clases de ejemplo (Tailwind?)

    // Crear y mostrar texto de la pregunta (similar a #question en consola ok.html)
    const questionTextElement = document.createElement('p');
    questionTextElement.textContent = this.currentQuestion.text;
    questionTextElement.className = 'question-text text-xl font-semibold mb-4 text-center text-gray-100'; // Clases de ejemplo
    this.quizContainer.appendChild(questionTextElement);

    // Crear y mostrar opciones (similar a #options en consola ok.html)
    const optionsContainer = document.createElement('div');
    optionsContainer.className = 'options-container flex flex-col gap-3 w-full'; // Clases de ejemplo
    this.currentQuestion.options.forEach(option => {
      const button = document.createElement('button');
      button.textContent = option.text;
      button.dataset.key = option.key; // Guardar la clave de la opción
      // Usar clases similares a .option-button de consola ok.html
      button.className = 'option-button bg-blue-600 hover:bg-blue-500 text-white font-semibold py-3 px-4 rounded-lg transition duration-200 ease-in-out';

      // Crear y guardar listener específico para este botón
      const listener = () => this.handleOptionClick(option.key);
      this.optionListeners.set(button, listener); // Guardar referencia
      button.addEventListener('click', listener);

      optionsContainer.appendChild(button);
    });
    this.quizContainer.appendChild(optionsContainer);

    // Crear espacio para feedback (similar a #feedback)
    const feedbackElement = document.createElement('div');
    feedbackElement.id = 'quiz-feedback'; // Darle un ID
    feedbackElement.className = 'feedback-area mt-4 text-lg h-8 text-center'; // Clases de ejemplo
    this.quizContainer.appendChild(feedbackElement);

    // Añadir toda la UI del quiz al contenedor principal de la app
    appContainer.appendChild(this.quizContainer);
  }

  private handleOptionClick(selectedKey: string): void {
    if (!this.currentQuestion) return;

    console.log(`Opción seleccionada: ${selectedKey}`);
    const quizSystem = this.gameManager.getQuizSystem();
    const isCorrect = quizSystem.validateAnswer(this.currentQuestion.id, selectedKey);

    // Deshabilitar botones después de responder
    this.disableOptions();

    // Mostrar feedback simple
    const feedbackElement = document.getElementById('quiz-feedback');
    if (feedbackElement) {
       feedbackElement.textContent = isCorrect ? '¡Correcto!' : 'Incorrecto.';
       feedbackElement.className = `feedback-area mt-4 text-lg h-8 text-center font-bold ${isCorrect ? 'text-green-400' : 'text-red-400'}`;
    }

    // TODO: Añadir lógica de puntuación, vidas, efectos visuales/sonido
    // TODO: Añadir delay y luego llamar a displayNextQuestion() o cambiar a ResultsState

    // Por ahora, después de un breve delay, cargamos la siguiente pregunta
    setTimeout(() => {
       // Aquí iría la lógica para decidir si seguir o ir a resultados
       // if (quizSystem.hasNextQuestion() && lives > 0) {
           this.displayNextQuestion();
       // } else {
       //    this.gameManager.getStateMachine().changeState('Results', { score: ... });
       // }
    }, 1500); // Esperar 1.5 segundos antes de la siguiente pregunta (temporal)
  }

  private disableOptions(): void {
      this.optionListeners.forEach((listener, button) => {
          button.disabled = true;
          // Podríamos añadir aquí una clase CSS para indicar visualmente que está deshabilitado
          button.classList.add('opacity-50', 'cursor-not-allowed');
      });
  }

  private clearUI(): void {
     // Remover listeners de los botones de opción
     this.optionListeners.forEach((listener, button) => {
       button.removeEventListener('click', listener);
     });
     this.optionListeners.clear(); // Limpiar el mapa de listeners

     // Limpiar el contenedor de la UI del quiz si existe
     if (this.quizContainer && this.quizContainer.parentNode) {
         this.quizContainer.parentNode.removeChild(this.quizContainer);
     }
     this.quizContainer = null;
     this.currentQuestion = null; // Resetear pregunta actual al limpiar

     // Opcional: Limpiar completamente el contenedor de la app
     // this.gameManager.getContainerElement().innerHTML = '';
   }

}