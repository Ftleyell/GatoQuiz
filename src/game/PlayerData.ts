// src/game/PlayerData.ts

/**
 * Encapsula los datos del jugador que son relevantes para la progresión,
 * la tienda y las mejoras persistentes (si se implementa guardado).
 */
export class PlayerData {
    // --- Moneda ---
    /** Puntuación actual del jugador, usada como moneda en la tienda. */
    public score: number = 0;
  
    // --- Estado Base (Podrían manejarse también en GameManager) ---
    /** Vidas actuales. La tienda podría vender vidas extra. */
    // Considerar si las vidas deben estar aquí o solo en GameManager.
    // Si la tienda las modifica, tenerlas aquí facilita el acceso.
    public lives: number = 3; // Valor inicial por defecto
  
    // --- Desbloqueables ---
    /** Indica si la mecánica de dibujo con tinta está desbloqueada. */
    public isDrawingUnlocked: boolean = false;
  
    // --- Consumibles / Estado Temporal ---
    /** Indica si el jugador tiene un escudo activo. */
    public hasShield: boolean = false;
    /** Cargas restantes del consumible de pista. */
    public hintCharges: number = 0;
  
    // --- Mejoras por Nivel ---
    /** Nivel actual de la mejora del multiplicador de combo. */
    public comboMultiplierLevel: number = 0;
    /** Nivel actual de la mejora de reducción de costo de tinta. */
    public inkCostReductionLevel: number = 0;
    /** Nivel actual de la mejora de gatos extra por acierto. */
    public extraCatSpawnLevel: number = 0;
    /** Nivel actual de la mejora del límite máximo de gatos. */
    public maxCatsLevel: number = 0;
  
    // --- Valores Calculados (Basados en Niveles) ---
    // Estos podrían ser getters o actualizarse cuando cambian los niveles
  
    /** Obtiene el multiplicador de combo actual basado en el nivel. */
    public getCurrentComboMultiplier(): number {
        // Ejemplo: 1.0 (base) + 0.1 por nivel
        const BASE_MULTIPLIER = 1.0;
        const INCREMENT = 0.1; // Ajustar según GDD
        return BASE_MULTIPLIER + (this.comboMultiplierLevel * INCREMENT);
    }
  
    /** Obtiene el costo de tinta por píxel actual basado en el nivel. */
    public getCurrentInkCostPerPixel(): number {
        // Ejemplo: 0.5 (base) * (0.9)^nivel
        const BASE_COST = 0.5; // Ajustar según GDD
        const REDUCTION_FACTOR = 0.9; // Ajustar según GDD
        return BASE_COST * Math.pow(REDUCTION_FACTOR, this.inkCostReductionLevel);
    }
  
    /** Obtiene cuántos gatos spawnear por acierto basado en el nivel. */
    public getCatsPerCorrectAnswer(): number {
        // Ejemplo: 1 (base) + 1 por nivel
        const BASE_CATS = 1;
        const INCREMENT = 1; // Ajustar según GDD
        return BASE_CATS + (this.extraCatSpawnLevel * INCREMENT);
    }
  
    /** Obtiene el límite máximo de gatos permitido basado en el nivel. */
    public getMaxCatsAllowed(): number {
        // Ejemplo: 50 (base) + 25 por nivel
        const BASE_LIMIT = 50; // Ajustar según GDD
        const INCREMENT = 25; // Ajustar según GDD
        return BASE_LIMIT + (this.maxCatsLevel * INCREMENT);
    }
  
  
    // --- Métodos para Cargar/Guardar (Placeholder) ---
    // public load(): void { /* Lógica para cargar desde localStorage */ }
    // public save(): void { /* Lógica para guardar en localStorage */ }
  
    // --- Método para Resetear (útil al iniciar nuevo juego) ---
    public reset(): void {
        console.log("PlayerData: Reseteando datos...");
        this.score = 0;
        this.lives = 3; // O obtener de constante en GameManager
        this.isDrawingUnlocked = false;
        this.hasShield = false;
        this.hintCharges = 0;
        this.comboMultiplierLevel = 0;
        this.inkCostReductionLevel = 0;
        this.extraCatSpawnLevel = 0;
        this.maxCatsLevel = 0;
        // Resetear otras propiedades si se añaden
    }
  
    constructor() {
        // Podría llamar a this.load() aquí si se implementa persistencia
        console.log("PlayerData Instanciado.");
    }
  }
  