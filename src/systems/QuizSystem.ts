// src/systems/QuizSystem.ts

// Definición de las interfaces (pueden ir en un archivo separado de tipos, ej: types/quiz.ts)
interface QuestionOption {
    key: string;
    text: string;
  }
  
  interface Question {
    id: number | string;
    text: string;
    options: QuestionOption[];
    correctAnswerKey: string;
    difficulty: string;
  }
  
  /**
   * QuizSystem: Gestiona la carga, selección y validación de preguntas del quiz.
   * Implementa la lógica descrita en la sección 2.5 del GDD Técnico v2.
   */
  export class QuizSystem {
    private allQuestions: Question[] = [];
    private availableQuestions: Question[] = []; // Preguntas aún no seleccionadas en la ronda actual
    private currentQuestion: Question | null = null;
    private isLoading: boolean = false;
    private lastError: string | null = null;
  
    constructor() {
      console.log('QuizSystem Creado.');
    }
  
    /**
     * Carga las preguntas desde un archivo JSON en la URL especificada.
     * Es una operación asíncrona.
     * @param url - La ruta al archivo JSON de preguntas (ej: '/assets/data/questions.json').
     * @returns Promise<boolean> - true si la carga fue exitosa, false en caso contrario.
     */
    public async loadQuestions(url: string): Promise<boolean> {
      if (this.isLoading) {
        console.warn('QuizSystem: Ya hay una carga de preguntas en progreso.');
        return false;
      }
      console.log(`QuizSystem: Cargando preguntas desde ${url}...`);
      this.isLoading = true;
      this.lastError = null;
      this.allQuestions = []; // Limpiar preguntas anteriores
  
      try {
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`Error HTTP ${response.status}: ${response.statusText}`);
        }
        const data: Question[] = await response.json();
  
        // Validación básica de datos (podría ser más exhaustiva)
        if (!Array.isArray(data) || data.length === 0) {
          throw new Error('El archivo JSON no contiene un array válido de preguntas.');
        }
        // Aquí se podrían añadir más validaciones por cada pregunta si es necesario
  
        this.allQuestions = data;
        this.resetAvailableQuestions(); // Inicializar lista de disponibles
        console.log(`QuizSystem: ${this.allQuestions.length} preguntas cargadas exitosamente.`);
        this.isLoading = false;
        return true;
  
      } catch (error) {
        console.error('QuizSystem: Error al cargar o procesar el archivo de preguntas:', error);
        this.lastError = error instanceof Error ? error.message : String(error);
        this.isLoading = false;
        this.allQuestions = [];
        this.availableQuestions = [];
        return false;
      }
    }
  
    /**
     * Selecciona la siguiente pregunta disponible, opcionalmente filtrando por dificultad.
     * Evita repetir preguntas hasta que todas las disponibles se hayan usado.
     * @param difficulty - (Opcional) La dificultad deseada (ej: "easy", "medium"). Si no se especifica, se elige entre todas las disponibles.
     * @returns La pregunta seleccionada (Question) o null si no hay preguntas disponibles que cumplan el criterio.
     */
    public selectNextQuestion(difficulty?: string): Question | null {
      if (this.allQuestions.length === 0 && !this.isLoading) {
        console.error('QuizSystem: No hay preguntas cargadas. Llama a loadQuestions() primero.');
        return null;
      }
      if (this.isLoading) {
        console.warn('QuizSystem: Las preguntas aún se están cargando.');
        return null;
      }
  
      let potentialQuestions = this.availableQuestions;
  
      // Filtrar por dificultad si se especifica
      if (difficulty) {
        potentialQuestions = potentialQuestions.filter(q => q.difficulty === difficulty);
      }
  
      if (potentialQuestions.length === 0) {
        console.warn(`QuizSystem: No quedan preguntas disponibles` + (difficulty ? ` con dificultad '${difficulty}'.` : '.'));
        // Opcional: ¿Reiniciar availableQuestions si se acaban? Depende de la lógica del juego.
        // this.resetAvailableQuestions();
        // potentialQuestions = this.availableQuestions.filter(q => !difficulty || q.difficulty === difficulty);
        // if (potentialQuestions.length === 0) return null; // Aún no hay si se reinició y filtró
         return null; // Por ahora, simplemente devolvemos null si no hay más.
      }
  
      // Seleccionar una pregunta al azar de las disponibles y filtradas
      const randomIndex = Math.floor(Math.random() * potentialQuestions.length);
      this.currentQuestion = potentialQuestions[randomIndex];
  
      // Remover la pregunta seleccionada de la lista de disponibles para evitar repetición inmediata
      this.availableQuestions = this.availableQuestions.filter(q => q.id !== this.currentQuestion?.id);
  
      console.log(`QuizSystem: Pregunta seleccionada (ID: ${this.currentQuestion?.id}, Dificultad: ${this.currentQuestion?.difficulty}). Quedan ${this.availableQuestions.length} disponibles.`);
      return this.currentQuestion;
    }
  
    /**
     * Valida si la clave de respuesta seleccionada por el usuario es correcta para una pregunta específica.
     * @param questionId - El ID de la pregunta que se está validando.
     * @param selectedKey - La clave ('key') de la opción que el usuario seleccionó.
     * @returns boolean - true si la respuesta es correcta, false en caso contrario. Null si la pregunta no se encuentra.
     */
    public validateAnswer(questionId: number | string, selectedKey: string | null): boolean | null {
       // Primero busca en la pregunta actual por eficiencia
       if (this.currentQuestion && this.currentQuestion.id === questionId) {
         if (selectedKey === null) return false; // Considerar respuesta nula como incorrecta
         return this.currentQuestion.correctAnswerKey === selectedKey;
       }
  
      // Si no es la actual, busca en todas las preguntas cargadas (menos eficiente)
      const questionToValidate = this.allQuestions.find(q => q.id === questionId);
  
      if (!questionToValidate) {
        console.error(`QuizSystem: No se encontró la pregunta con ID '${questionId}' para validar.`);
        return null; // O lanzar un error, según prefieras manejarlo
      }
  
      if (selectedKey === null) {
          console.log(`QuizSystem: Respuesta nula recibida para pregunta ID '${questionId}'. Considerada incorrecta.`);
          return false;
      }
  
      const isCorrect = questionToValidate.correctAnswerKey === selectedKey;
      console.log(`QuizSystem: Validando respuesta para ID ${questionId}. Seleccionado: '${selectedKey}', Correcto: '${questionToValidate.correctAnswerKey}'. Resultado: ${isCorrect}`);
      return isCorrect;
    }
  
    /**
     * Obtiene la pregunta actualmente seleccionada.
     * @returns La pregunta actual o null si no hay ninguna seleccionada.
     */
    public getCurrentQuestion(): Question | null {
      return this.currentQuestion;
    }
  
    /**
     * Resetea la lista de preguntas disponibles para que todas las cargadas puedan ser seleccionadas de nuevo.
     * Útil al iniciar una nueva ronda de preguntas.
     */
    public resetAvailableQuestions(): void {
      this.availableQuestions = [...this.allQuestions];
      this.currentQuestion = null;
      console.log(`QuizSystem: Lista de preguntas disponibles reseteada (${this.availableQuestions.length} preguntas).`);
    }
  
    /**
     * Obtiene el último error ocurrido durante la carga.
     * @returns El mensaje de error o null si no hubo errores recientes.
     */
    public getLastError(): string | null {
        return this.lastError;
    }
  
    /**
     * Verifica si el sistema está actualmente cargando preguntas.
     * @returns true si está cargando, false en caso contrario.
     */
    public isLoadingQuestions(): boolean {
        return this.isLoading;
    }
  }