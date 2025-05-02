// src/systems/ThemeManager.ts

import { Theme } from '../types/Theme'; // Asegúrate que la ruta sea correcta

export class ThemeManager {
    private themes: Theme[] = [];
    private activeThemeIndex: number = 0;
    private defaultThemeId: string = 'retro'; // O el ID del tema por defecto que prefieras
    private isLoading: boolean = false;
    private lastError: string | null = null;
    private rootElement: HTMLElement = document.body; // Elemento donde se aplicará la clase de tema

    constructor(rootElementSelector: string = 'body') {
        console.log("ThemeManager Creado.");
        const element = document.querySelector(rootElementSelector);
        if (element instanceof HTMLElement) {
            this.rootElement = element;
        } else {
            console.warn(`ThemeManager: Elemento raíz '${rootElementSelector}' no encontrado, usando document.body.`);
            this.rootElement = document.body;
        }
    }

    /**
     * Procesa los datos de temas ya cargados (ej. desde GameManager.preload).
     * @param data - Array de objetos Theme.
     * @returns true si la carga fue exitosa, false en caso contrario.
     */
    public async loadThemesData(data: any[]): Promise<boolean> {
        if (this.isLoading) {
            console.warn('ThemeManager: Ya hay una carga en progreso.');
            return false;
        }
        console.log(`ThemeManager: Procesando datos de temas pre-cargados...`);
        this.isLoading = true;
        this.lastError = null;
        this.themes = [];

        try {
            if (!Array.isArray(data)) {
                throw new Error('Los datos de temas proporcionados no son un array válido.');
            }
            // TODO: Validación más profunda de cada objeto Theme si es necesario

            this.themes = data as Theme[]; // Usar type assertion
            console.log(`ThemeManager: ${this.themes.length} temas procesados exitosamente.`);

            // Establecer índice inicial basado en el defaultThemeId
            this.activeThemeIndex = Math.max(0, this.themes.findIndex(t => t.id === this.defaultThemeId));

            this.isLoading = false;
            this.applyActiveThemeClass(); // Aplicar clase del tema inicial
            return true;

        } catch (error) {
            console.error('ThemeManager: Error al procesar los datos de temas:', error);
            this.lastError = error instanceof Error ? error.message : String(error);
            this.isLoading = false;
            this.themes = [];
            this.activeThemeIndex = 0;
            return false;
        }
    }

     /**
      * Aplica la clase CSS del tema activo al elemento raíz.
      */
     private applyActiveThemeClass(): void {
        if (!this.rootElement) return;

        // Remover clases de temas anteriores
        this.themes.forEach(theme => {
            if (theme.elements?.quizWrapper?.themeClass) {
                 this.rootElement.classList.remove(theme.elements.quizWrapper.themeClass);
            }
         });

        // Añadir clase del tema activo
        const activeTheme = this.getActiveTheme();
        if (activeTheme?.elements?.quizWrapper?.themeClass) {
            const themeClass = activeTheme.elements.quizWrapper.themeClass;
            this.rootElement.classList.add(themeClass);
            console.log(`ThemeManager: Clase de tema '${themeClass}' aplicada a ${this.rootElement.tagName}.`);
        } else {
            console.warn("ThemeManager: Tema activo o su themeClass no definidos.");
        }
    }

    /**
     * Obtiene el objeto del tema actualmente activo.
     * @returns El objeto Theme activo o null si no hay temas cargados.
     */
    public getActiveTheme(): Theme | null {
        if (this.themes.length === 0) {
            return null;
        }
        return this.themes[this.activeThemeIndex] ?? null;
    }

    /**
     * Obtiene el ID del tema actualmente activo.
     * @returns El ID del tema activo o null.
     */
    public getActiveThemeId(): string | null {
        return this.getActiveTheme()?.id ?? null;
    }

    /**
     * Cambia al siguiente tema disponible en la lista.
     */
    public cycleTheme(): void {
        if (this.themes.length <= 1) return; // No hay a dónde ciclar

        this.activeThemeIndex = (this.activeThemeIndex + 1) % this.themes.length;
        this.applyActiveThemeClass(); // Aplicar la nueva clase de tema
        const newTheme = this.getActiveTheme();
        console.log(`ThemeManager: Tema ciclado a '${newTheme?.name ?? 'N/A'}' (ID: ${newTheme?.id ?? 'N/A'})`);

        // Aquí podrías emitir un evento si otros sistemas necesitan reaccionar
        // al cambio de tema de forma más compleja que solo con CSS.
        // Ejemplo: document.dispatchEvent(new CustomEvent('themeChanged', { detail: newTheme }));
    }

    /**
     * Establece un tema específico como activo por su ID.
     * @param themeId - El ID del tema a activar.
     * @returns true si el tema se encontró y activó, false en caso contrario.
     */
    public setActiveTheme(themeId: string): boolean {
        const index = this.themes.findIndex(t => t.id === themeId);
        if (index !== -1) {
            this.activeThemeIndex = index;
            this.applyActiveThemeClass();
            console.log(`ThemeManager: Tema establecido a '${this.getActiveTheme()?.name}' (ID: ${themeId})`);
            return true;
        } else {
            console.warn(`ThemeManager: No se encontró el tema con ID '${themeId}'.`);
            return false;
        }
    }

    /**
      * Obtiene la lista de todos los temas cargados.
      * @returns Un array de objetos Theme.
      */
    public getThemes(): Theme[] {
        return [...this.themes]; // Devolver una copia
    }

     /**
      * Obtiene el último error ocurrido durante la carga/procesamiento.
      * @returns El mensaje de error o null.
      */
     public getLastError(): string | null {
         return this.lastError;
     }

     /**
      * Verifica si el sistema está actualmente cargando/procesando temas.
      * @returns true si está cargando, false en caso contrario.
      */
     public isLoadingThemes(): boolean {
         return this.isLoading;
     }
}