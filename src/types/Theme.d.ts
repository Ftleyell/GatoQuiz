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
    id: string;
    name: string;
    description: string;

    /**
     * (Opcional) Clases CSS para aplicar a elementos HTML estándar (no-Lit)
     * o como una clase global al wrapper principal del tema.
     */
    elements?: {
        quizWrapper?: ThemeElementDefinition; // Ejemplo: para una clase global en <body>
        // ... otras definiciones si son necesarias para elementos no Lit ...
    };

    /**
     * (Obligatorio) Definiciones de variables CSS para este tema.
     * Estas variables serán aplicadas globalmente y usadas por los componentes Lit.
     */
    cssVariables: {
        [key: string]: string; // Ejemplo: { "--gq-text-color": "#FFFFFF", "--gq-primary-bg": "blue" }
    };
  }
  