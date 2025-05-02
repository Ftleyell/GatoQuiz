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

    // --- Consumibles / Estado Temporal ---
    public hasShield: boolean = false;
    public hintCharges: number = 0;

    // --- Recursos ---
    public currentInk: number = 0;
    private readonly MAX_INK: number = 1000;

    // --- Mejoras por Nivel ---
    public comboMultiplierLevel: number = 0;
    public inkCostReductionLevel: number = 0;
    public extraCatSpawnLevel: number = 0;
    public maxCatsLevel: number = 0;
    public maxCatSizeLevel: number = 0; // <-- NUEVO: Nivel para tamaño máximo

    // --- Constantes para Cálculos ---
    private readonly BASE_MAX_CAT_SIZE_LIMIT = 150; // <-- NUEVO: Límite base reducido
    private readonly MAX_CAT_SIZE_INCREMENT_PER_LEVEL = 25; // <-- NUEVO: Cuánto aumenta por nivel

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

    // *** NUEVO MÉTODO: Calcula el límite de tamaño máximo actual ***
    public getCurrentMaxSizeLimit(): number {
        return this.BASE_MAX_CAT_SIZE_LIMIT + (this.maxCatSizeLevel * this.MAX_CAT_SIZE_INCREMENT_PER_LEVEL);
    }
    // ************************************************************

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
        // console.log(`Ink refilled. Current: ${this.currentInk}/${this.getMaxInk()}`); // Log opcional
    }

    // --- Método para Resetear ---
    // MODIFICADO: Incluye el nuevo nivel
    public reset(): void {
        console.log("PlayerData: Reseteando datos...");
        this.score = 0;
        this.lives = 3;
        this.isDrawingUnlocked = false;
        this.hasShield = false;
        this.hintCharges = 0;
        this.currentInk = 0;
        this.comboMultiplierLevel = 0;
        this.inkCostReductionLevel = 0;
        this.extraCatSpawnLevel = 0;
        this.maxCatsLevel = 0;
        this.maxCatSizeLevel = 0; // <-- NUEVO: Resetear nivel de tamaño
    }

    constructor() {
        console.log("PlayerData Instanciado.");
    }
}
