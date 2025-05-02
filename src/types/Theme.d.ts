// src/types/Theme.d.ts

/**
 * Define la estructura de un elemento específico de la UI dentro de un tema.
 */
export interface ThemeElementDefinition {
    /** Clases CSS base, estructurales o comunes a todos los temas. */
    baseClass?: string;
    /** Clase CSS específica para este tema (ej: 'theme-retro-button'). */
    themeClass?: string;
    /** Clase CSS específica para el contenedor/wrapper del elemento (si aplica, ej: questionBox). */
    wrapperClass?: string;
    /** Clase CSS específica para el contenido interno (si aplica, ej: questionBox). */
    contentClass?: string;
    /** Clase CSS específica para el fondo/backdrop (si aplica, ej: questionBox). */
    backdropClass?: string;
    /** Clase CSS para la etiqueta de dificultad (si aplica). */
    difficultyLabelClass?: string;
     /** Clase CSS para el texto de la pregunta (si aplica). */
    questionTextClass?: string;
    /** Clase CSS para el botón de opción (si aplica). */
    optionButtonClass?: string; // Podríamos usar themeClass, pero esto es más explícito
    /** Clase CSS para el área de feedback (si aplica). */
    feedbackAreaClass?: string; // Podríamos usar themeClass
  
    /** Clase CSS a añadir cuando la respuesta es correcta (para feedbackArea). */
    correctClass?: string;
    /** Clase CSS a añadir cuando la respuesta es incorrecta (para feedbackArea). */
    incorrectClass?: string;
    /** Clase CSS a añadir cuando se rompe el escudo (para feedbackArea). */
    shieldClass?: string;
  
    /** Clase CSS para el patrón de fondo (solo para quizWrapper). */
    backgroundPatternClass?: string;
  
    /** Estado inicial de display CSS ('none', 'block', etc.). */
    initialDisplay?: string;
  
    /** Texto estático para el elemento (ej: 'Tinta'). */
    text?: string;
  
    // Podríamos añadir más propiedades si necesitamos controlar más aspectos
    // como atributos 'id', 'data-*', etc. desde el JSON.
  }
  
  /**
   * Define la estructura completa de un tema.
   */
  export interface Theme {
    /** Identificador único del tema. */
    id: string;
    /** Nombre legible del tema. */
    name: string;
    /** Descripción breve del tema. */
    description: string;
    /** Objeto que mapea nombres lógicos de elementos a sus definiciones de estilo. */
    elements: {
      quizWrapper: ThemeElementDefinition;
      topUIContainer: ThemeElementDefinition;
      statusRow: ThemeElementDefinition;
      livesDisplay: ThemeElementDefinition;
      scoreDisplay: ThemeElementDefinition;
      comboDisplay: ThemeElementDefinition;
      inkArea: ThemeElementDefinition;
      inkLabel: ThemeElementDefinition;
      inkBarContainer: ThemeElementDefinition;
      inkBarFill: ThemeElementDefinition;
      questionBox: ThemeElementDefinition;
      optionsContainer: ThemeElementDefinition;
      optionButton: ThemeElementDefinition; // Definición base para *cada* botón
      feedbackArea: ThemeElementDefinition;
      // Añadir más elementos lógicos si son necesarios
    };
  }
  