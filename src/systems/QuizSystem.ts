// src/systems/QuizSystem.ts

// Definición de las interfaces (pueden ir en un archivo separado de tipos, ej: types/quiz.d.ts)
interface QuestionOption {
  key: string;
  text: string;
}

interface Question {
  id: number | string;
  text: string;
  options: QuestionOption[];
  correctAnswerKey: string;
  difficulty: string; // Asegúrate que coincida con tu estructura JSON real
}

/**
* QuizSystem: Gestiona la carga, selección y validación de preguntas del quiz.
*/
export class QuizSystem {
  private allQuestions: Question[] = [];
  private availableQuestions: Question[] = [];
  private currentQuestion: Question | null = null;
  private isLoading: boolean = false;
  private lastError: string | null = null;

  constructor() {
      console.log('QuizSystem Creado.');
  }

  // --- Método NUEVO para procesar datos ya cargados ---
  public async loadQuestionsData(data: any[]): Promise<boolean> {
      if (this.isLoading) {
          console.warn('QuizSystem: Ya hay una carga en progreso.');
          return false;
      }
      console.log(`QuizSystem: Procesando datos de preguntas pre-cargados...`);
      this.isLoading = true;
      this.lastError = null;
      this.allQuestions = []; // Limpiar preguntas anteriores

      try {
          // Validación básica
          if (!Array.isArray(data)) {
              throw new Error('Los datos de preguntas proporcionados no son un array válido.');
          }
          // TODO: Validación más profunda de cada objeto de pregunta

          // Asignar los datos cargados
          this.allQuestions = data as Question[]; // Usar type assertion
          this.resetAvailableQuestions(); // Inicializar lista de disponibles

          console.log(`QuizSystem: ${this.allQuestions.length} preguntas procesadas exitosamente desde datos pre-cargados.`);
          this.isLoading = false;
          return true;

      } catch (error) {
          console.error('QuizSystem: Error al procesar los datos de preguntas:', error);
          this.lastError = error instanceof Error ? error.message : String(error);
          this.isLoading = false;
          this.allQuestions = [];
          this.availableQuestions = [];
          return false;
      }
  }
  // --- Fin Método NUEVO ---

  // --- Método Original (Comentado/Eliminado) ---
  /**
   * Carga las preguntas desde un archivo JSON en la URL especificada.
   * @deprecated Usar GameManager.preload para cargar y luego llamar a loadQuestionsData
   */
  /*
  public async loadQuestions(url: string): Promise<boolean> {
      // ... lógica original con fetch ...
  }
  */
  // --- Fin Método Original ---


  /**
   * Selecciona la siguiente pregunta disponible, opcionalmente filtrando por dificultad.
   * @param difficulty - (Opcional) La dificultad deseada.
   * @returns La pregunta seleccionada (Question) o null si no hay preguntas disponibles.
   */
  public selectNextQuestion(difficulty?: string): Question | null {
      if (this.allQuestions.length === 0 && !this.isLoading) {
          console.error('QuizSystem: No hay preguntas cargadas o procesadas. Llama a loadQuestionsData() después de cargar los datos.');
          return null;
      }
      if (this.isLoading) {
          console.warn('QuizSystem: Las preguntas aún se están procesando.');
          return null;
      }

      let potentialQuestions = this.availableQuestions;

      if (difficulty) {
          potentialQuestions = potentialQuestions.filter(q => q.difficulty === difficulty);
      }

      if (potentialQuestions.length === 0) {
          // Si no quedan preguntas de la dificultad pedida O ninguna pregunta en general,
          // podríamos resetear o devolver null. Por ahora devolvemos null.
          console.warn(`QuizSystem: No quedan preguntas disponibles` + (difficulty ? ` con dificultad '${difficulty}'.` : '.'));
          // Opcional: Resetear si se acaban todas?
          // if (this.availableQuestions.length === 0) this.resetAvailableQuestions();
          return null;
      }

      const randomIndex = Math.floor(Math.random() * potentialQuestions.length);
      this.currentQuestion = potentialQuestions[randomIndex];

      // Remover la pregunta seleccionada de la lista de disponibles
      this.availableQuestions = this.availableQuestions.filter(q => q.id !== this.currentQuestion?.id);

      console.log(`QuizSystem: Pregunta seleccionada (ID: ${this.currentQuestion?.id}, Dificultad: ${this.currentQuestion?.difficulty}). Quedan ${this.availableQuestions.length} disponibles.`);
      return this.currentQuestion;
  }

  /**
   * Valida si la clave de respuesta seleccionada es correcta para una pregunta específica.
   * @param questionId - El ID de la pregunta.
   * @param selectedKey - La clave de la opción seleccionada.
   * @returns boolean - true si es correcta, false si es incorrecta. Null si la pregunta no se encuentra.
   */
  public validateAnswer(questionId: number | string, selectedKey: string | null): boolean | null {
      const questionToValidate = this.allQuestions.find(q => q.id === questionId);

      if (!questionToValidate) {
          console.error(`QuizSystem: No se encontró la pregunta con ID '${questionId}' para validar.`);
          return null;
      }

      if (selectedKey === null) {
          console.log(`QuizSystem: Respuesta nula recibida para pregunta ID '${questionId}'. Considerada incorrecta.`);
          return false;
      }

      const isCorrect = questionToValidate.correctAnswerKey === selectedKey;
      // console.log(`QuizSystem: Validando ID ${questionId}. Seleccionado: '${selectedKey}', Correcto: '${questionToValidate.correctAnswerKey}'. Resultado: ${isCorrect}`); // Log menos verboso
      return isCorrect;
  }

  /**
   * Obtiene la pregunta actualmente seleccionada.
   * @returns La pregunta actual o null.
   */
  public getCurrentQuestion(): Question | null {
      return this.currentQuestion;
  }

  /**
   * Resetea la lista de preguntas disponibles.
   */
  public resetAvailableQuestions(): void {
      this.availableQuestions = [...this.allQuestions];
      this.currentQuestion = null; // Asegurarse de limpiar la pregunta actual también
      // console.log(`QuizSystem: Lista de preguntas disponibles reseteada (${this.availableQuestions.length} preguntas).`); // Menos verboso
  }

  /**
   * Obtiene el último error ocurrido durante la carga/procesamiento.
   * @returns El mensaje de error o null.
   */
  public getLastError(): string | null {
      return this.lastError;
  }

  /**
   * Verifica si el sistema está actualmente procesando preguntas.
   * @returns true si está procesando, false en caso contrario.
   */
  public isLoadingQuestions(): boolean {
      return this.isLoading;
  }
}