// src/types/ShopItemData.ts
// NO MÁS IMPORTACIONES DE PlayerData o ShopManager aquí

/**
 * Estructura de los datos brutos de un ítem de tienda, tal como se cargan desde JSON.
 */
export interface ShopItemJsonData {
  id: string;
  name: string;
  icon: string;
  category?: string;
  isLeveled: boolean;
  maxLevel?: number;
  levelRef?: string; // Clave en PlayerData para el nivel (si isLeveled)

  cost: { // Parámetros para calcular el costo
    base: number;
    type?: 'linear' | 'exponential'; // Cómo calcular si es leveled
    perLevel?: number;    // Para linear
    multiplier?: number;  // Para exponential
    levelRef?: string;    // Clave en PlayerData para calcular costo basado en otro nivel (ej: vidas)
  };

  effectTemplate: string; // Plantilla de texto con placeholders

  // Parámetros para verificar si se puede comprar (además del costo)
  purchaseCheck?: {
    condition: 'lessThan' | 'lessThanOrEqual' | 'isFalse' | 'isTrue' | 'greaterThan' | 'greaterThanOrEqual';
    valueRef: string; // Clave en PlayerData a verificar
    limit?: number;   // Límite para condiciones de comparación
  };

   // Parámetros para verificar si ya está "comprado" o activo (para no-levelables)
  isPurchasedCheck?: {
      condition: 'isTrue' | 'isFalse' | 'greaterThan'; // Añadir más si es necesario
      valueRef: string; // Clave en PlayerData a verificar
      limit?: number;   // Límite para greaterThan
  };

  actionId: string; // Identificador de la función a ejecutar en ShopManager
}

// Podríamos mantener una interfaz interna en ShopManager si se procesan estos datos,
// pero por ahora, ShopManager trabajará directamente con ShopItemJsonData.