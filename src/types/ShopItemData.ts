// src/types/ShopItemData.ts

// Importar dependencias necesarias (si las hubiera en el futuro)
import { PlayerData } from '../game/PlayerData'; // Asumiendo que PlayerData está en game/
import { ShopManager } from '../systems/ShopManager'; // Para la firma de purchaseAction

/**
 * Define la estructura de los datos para cada ítem disponible en la tienda.
 */
export interface ShopItemData {
  /** Identificador único del ítem (ej: 'life', 'unlockDrawing', 'comboMultiplier') */
  id: string;

  /** Nombre del ítem que se mostrará en la UI (tooltip). */
  name: string;

  /** Icono o emoji para representar el ítem en la UI. */
  icon: string; // Añadido para la representación visual

  /** Indica si el ítem se puede comprar múltiples veces para subir de nivel. */
  isLeveled: boolean;

  /** Nivel máximo alcanzable si el ítem es 'isLeveled'. */
  maxLevel?: number;

  /**
   * Calcula y devuelve el costo actual del ítem.
   * Puede depender del nivel actual del jugador o de otros factores.
   * @param playerData - El estado actual de los datos del jugador.
   * @returns El costo numérico del ítem.
   */
  getCost: (playerData: PlayerData) => number;

  /**
   * Genera el texto descriptivo del efecto actual del ítem.
   * Puede incluir el nivel actual si es 'isLeveled'.
   * @param playerData - El estado actual de los datos del jugador.
   * @returns Una cadena de texto describiendo el efecto.
   */
  getEffectText: (playerData: PlayerData) => string;

  /**
   * Obtiene el nivel actual del ítem si es 'isLeveled'.
   * @param playerData - El estado actual de los datos del jugador.
   * @returns El nivel actual (número) o undefined si no es aplicable.
   */
  getLevel?: (playerData: PlayerData) => number;

  /**
   * Verifica si el ítem ya ha sido comprado o está activo (para ítems no mejorables).
   * @param playerData - El estado actual de los datos del jugador.
   * @returns true si está comprado/activo, false en caso contrario.
   */
  isPurchased?: (playerData: PlayerData) => boolean;

  /**
   * Realiza verificaciones adicionales para determinar si el ítem se puede comprar
   * (más allá de tener suficientes puntos). Ej: ¿Ya tiene el máximo de vidas? ¿Ya está desbloqueado?
   * @param playerData - El estado actual de los datos del jugador.
   * @returns true si se puede comprar, false si no.
   */
  canPurchaseCheck?: (playerData: PlayerData) => boolean;

  /**
   * La función que se ejecuta cuando se compra el ítem.
   * Debe manejar la lógica de aplicar el efecto y verificar/restar el costo.
   * @param shopManager - La instancia del ShopManager para acceder a PlayerData y otros sistemas si es necesario.
   * @returns true si la compra fue exitosa (puntos suficientes, condiciones cumplidas), false en caso contrario.
   */
  purchaseAction: (shopManager: ShopManager) => boolean;

  /**
   * (Opcional) Categoría a la que pertenece el ítem (para organizar la tienda).
   * Ej: 'consumable', 'unlockable', 'upgradeable'
   */
  category?: string;
}
