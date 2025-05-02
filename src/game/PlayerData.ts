// src/game/PlayerData.ts

/**
 * Encapsula los datos del jugador que son relevantes para la progresión,
 * la tienda y las mejoras persistentes (si se implementa guardado).
 */
export class PlayerData {
    // --- Moneda ---
    public score: number = 0;

    // --- Estado Base ---
    public lives: number = 3; // Valor inicial por defecto

    // --- Desbloqueables ---
    public isDrawingUnlocked: boolean = false;

    // --- Consumibles / Estado Temporal ---
    public hasShield: boolean = false;
    public hintCharges: number = 0;

    // --- Recursos ---
    /** Tinta actual disponible para dibujar. */
    public currentInk: number = 0; // Inicialmente 0
    /** Capacidad máxima de tinta (podría ser mejorable en el futuro). */
    private readonly MAX_INK: number = 1000; // Definido como constante interna por ahora

    // --- Mejoras por Nivel ---
    public comboMultiplierLevel: number = 0;
    public inkCostReductionLevel: number = 0;
    public extraCatSpawnLevel: number = 0;
    public maxCatsLevel: number = 0;

    // --- Valores Calculados (Basados en Niveles) ---

    /** Obtiene el multiplicador de combo actual basado en el nivel. */
    public getCurrentComboMultiplier(): number {
        const BASE_MULTIPLIER = 1.0;
        const INCREMENT = 0.1; // Ajustar según GDD
        return BASE_MULTIPLIER + (this.comboMultiplierLevel * INCREMENT);
    }

    /** Obtiene el costo de tinta por píxel actual basado en el nivel. */
    public getCurrentInkCostPerPixel(): number {
        const BASE_COST = 0.5; // Ajustar según GDD
        const REDUCTION_FACTOR = 0.9; // Ajustar según GDD
        return BASE_COST * Math.pow(REDUCTION_FACTOR, this.inkCostReductionLevel);
    }

    /** Obtiene cuántos gatos spawnear por acierto basado en el nivel. */
    public getCatsPerCorrectAnswer(): number {
        const BASE_CATS = 1;
        const INCREMENT = 1; // Ajustar según GDD
        return BASE_CATS + (this.extraCatSpawnLevel * INCREMENT);
    }

    /** Obtiene el límite máximo de gatos permitido basado en el nivel. */
    public getMaxCatsAllowed(): number {
        const BASE_LIMIT = 50; // Ajustar según GDD
        const INCREMENT = 25; // Ajustar según GDD
        return BASE_LIMIT + (this.maxCatsLevel * INCREMENT);
    }

    /** Obtiene la capacidad máxima de tinta. */
    public getMaxInk(): number {
        // Podría modificarse si hay mejoras de capacidad máxima
        return this.MAX_INK;
    }

    // --- Métodos de Gestión de Tinta ---

    /**
     * Intenta gastar una cantidad de tinta.
     * @param amount - La cantidad de tinta a gastar.
     * @returns true si se pudo gastar (había suficiente), false en caso contrario.
     */
    public spendInk(amount: number): boolean {
        if (this.currentInk >= amount) {
            this.currentInk -= amount;
            return true; // Gasto exitoso
        }
        return false; // Tinta insuficiente
    }

    /**
     * Añade tinta al jugador, sin exceder el máximo.
     * @param amount - La cantidad de tinta a ganar.
     */
    public gainInk(amount: number): void {
        this.currentInk = Math.min(this.getMaxInk(), this.currentInk + amount);
        // console.log(`Ink gained: +${amount}. Current: ${this.currentInk}/${this.getMaxInk()}`); // Log opcional
    }

    /**
     * Rellena la tinta del jugador al máximo.
     * Útil al borrar trazos, por ejemplo.
     */
    public refillInk(): void {
        this.currentInk = this.getMaxInk();
        console.log(`Ink refilled. Current: ${this.currentInk}/${this.getMaxInk()}`);
    }

    // --- Métodos para Cargar/Guardar (Placeholder) ---
    // public load(): void { /* ... */ }
    // public save(): void { /* ... */ }

    // --- Método para Resetear ---
    public reset(): void {
        console.log("PlayerData: Reseteando datos...");
        this.score = 0;
        this.lives = 3;
        this.isDrawingUnlocked = false;
        this.hasShield = false;
        this.hintCharges = 0;
        this.currentInk = 0; // <-- Resetear tinta a 0
        // this.maxInk = 1000; // MaxInk se mantiene constante por ahora
        this.comboMultiplierLevel = 0;
        this.inkCostReductionLevel = 0;
        this.extraCatSpawnLevel = 0;
        this.maxCatsLevel = 0;
    }

    constructor() {
        console.log("PlayerData Instanciado.");
    }
}
