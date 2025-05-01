// src/game/components/ValueComponent.ts

import { IComponent } from './IComponent';

/**
 * Componente que almacena valores asociados a la entidad,
 * como rareza, valor en puntos y tamaño actual.
 */
export class ValueComponent implements IComponent {
  public readonly type = 'ValueComponent';
  public rarity: number = 0;
  public scoreValue: number = 0;
  public currentSize: number = 0; // <-- AÑADIDO: Para rastrear tamaño

  /**
   * Crea una instancia de ValueComponent.
   * @param rarity - Nivel de rareza inicial.
   * @param scoreValue - Valor en puntos inicial.
   * @param initialSize - Tamaño inicial del gato. // <-- AÑADIDO
   */
  constructor(rarity: number = 0, scoreValue: number = 0, initialSize: number = 0) { // <-- AÑADIDO initialSize
    this.rarity = rarity;
    this.scoreValue = scoreValue;
    this.currentSize = initialSize; // <-- AÑADIDO
  }
}