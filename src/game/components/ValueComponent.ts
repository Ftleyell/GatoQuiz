// src/game/components/ValueComponent.ts

import { IComponent } from './IComponent';

/**
 * Componente que almacena valores asociados a la entidad,
 * como rareza, valor en puntos, etc., según GDD Sec 2.6.
 */
export class ValueComponent implements IComponent {
  public readonly type = 'ValueComponent';
  public rarity: number = 0; // Podría ser un enum o string también ('common', 'rare', etc.)
  public scoreValue: number = 0; // Valor al ser 'liberado' o interactuado
  // Otras propiedades potenciales: 'growthLevel', 'canMerge', etc.

  /**
   * Crea una instancia de ValueComponent.
   * @param rarity - Nivel de rareza inicial.
   * @param scoreValue - Valor en puntos inicial.
   */
  constructor(rarity: number = 0, scoreValue: number = 0) {
    this.rarity = rarity;
    this.scoreValue = scoreValue;
  }
}