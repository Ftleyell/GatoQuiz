// src/game/PlayerData.ts

/**
 * Encapsula los datos del jugador que son relevantes para la progresión,
 * la tienda y las mejoras.
 */
export class PlayerData {
    // --- Moneda ---
    public score: number = 0;

    // --- Estado Base ---
    public lives: number = 3;

    // --- Desbloqueables ---
    public isDrawingUnlocked: boolean = false;
    public isCatFoodUnlocked: boolean = false; // <-- NUEVO: Estado de desbloqueo

    // --- Consumibles / Estado Temporal ---
    public hasShield: boolean = false;
    public hintCharges: number = 0;

    // --- Recursos ---
    public currentInk: number = 0;
    private readonly MAX_INK: number = 1000;
    public currentCatFood: number = 0; // <-- NUEVO: Cantidad actual de comida
    private readonly MAX_CAT_FOOD: number = 25; // <-- NUEVO: Capacidad máxima

    // --- Mejoras por Nivel ---
    public comboMultiplierLevel: number = 0;
    public inkCostReductionLevel: number = 0;
    public extraCatSpawnLevel: number = 0;
    public maxCatsLevel: number = 0;
    public maxCatSizeLevel: number = 0;

    // --- Constantes para Cálculos ---
    private readonly BASE_MAX_CAT_SIZE_LIMIT = 150;
    private readonly MAX_CAT_SIZE_INCREMENT_PER_LEVEL = 25;

    // --- Valores Calculados (Basados en Niveles) ---

    public getCurrentComboMultiplier(): number {
        const BASE_MULTIPLIER = 1.0;
        const INCREMENT = 0.1;
        return BASE_MULTIPLIER + (this.comboMultiplierLevel * INCREMENT);
    }

    public getCurrentInkCostPerPixel(): number {
        const BASE_COST = 0.5;
        const REDUCTION_FACTOR = 0.9;
        return BASE_COST * Math.pow(REDUCTION_FACTOR, this.inkCostReductionLevel);
    }

    public getCatsPerCorrectAnswer(): number {
        const BASE_CATS = 1;
        const INCREMENT = 1;
        return BASE_CATS + (this.extraCatSpawnLevel * INCREMENT);
    }

    public getMaxCatsAllowed(): number {
        const BASE_LIMIT = 50;
        const INCREMENT = 25;
        return BASE_LIMIT + (this.maxCatsLevel * INCREMENT);
    }

    public getCurrentMaxSizeLimit(): number {
        return this.BASE_MAX_CAT_SIZE_LIMIT + (this.maxCatSizeLevel * this.MAX_CAT_SIZE_INCREMENT_PER_LEVEL);
    }

    public getMaxInk(): number {
        return this.MAX_INK;
    }

    // --- Métodos de Gestión de Tinta ---
    public spendInk(amount: number): boolean {
        if (this.currentInk >= amount) {
            this.currentInk -= amount;
            return true;
        }
        return false;
    }

    public gainInk(amount: number): void {
        this.currentInk = Math.min(this.getMaxInk(), this.currentInk + amount);
    }

    public refillInk(): void {
        this.currentInk = this.getMaxInk();
    }

    // --- Métodos de Gestión de Comida para Gatos ---

    /** Obtiene la capacidad máxima de comida. */
    public getMaxCatFood(): number {
        // Podría ser mejorable en el futuro
        return this.MAX_CAT_FOOD;
    }

    /**
     * Intenta gastar una unidad de comida.
     * @returns true si se pudo gastar, false si no había comida.
     */
    public spendCatFoodUnit(): boolean {
        if (!this.isCatFoodUnlocked) return false; // No se puede gastar si no está desbloqueado
        if (this.currentCatFood > 0) {
            this.currentCatFood--;
            console.log(`Cat food spent. Remaining: ${this.currentCatFood}/${this.getMaxCatFood()}`); // Log
            return true;
        }
        console.log("No cat food left to spend."); // Log
        return false;
    }

    /** Rellena la comida al máximo. */
    public refillCatFood(): void {
        if (!this.isCatFoodUnlocked) return; // No rellenar si no está desbloqueado
        this.currentCatFood = this.getMaxCatFood();
        console.log(`Cat food refilled. Current: ${this.currentCatFood}/${this.getMaxCatFood()}`); // Log
    }

    // --- Método para Resetear ---
    // MODIFICADO: Incluye los nuevos estados de comida
    public reset(): void {
        console.log("PlayerData: Reseteando datos...");
        this.score = 0;
        this.lives = 3;
        this.isDrawingUnlocked = false;
        this.isCatFoodUnlocked = false; // <-- NUEVO: Resetear
        this.hasShield = false;
        this.hintCharges = 0;
        this.currentInk = 0;
        this.currentCatFood = 0; // <-- NUEVO: Resetear
        this.comboMultiplierLevel = 0;
        this.inkCostReductionLevel = 0;
        this.extraCatSpawnLevel = 0;
        this.maxCatsLevel = 0;
        this.maxCatSizeLevel = 0;
    }

    constructor() {
        console.log("PlayerData Instanciado.");
    }
}
