// src/game/components/ui/shop-tooltip.ts
import { LitElement, html, css, CSSResultGroup, PropertyValueMap, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import type { ShopItemJsonData } from '../../../types/ShopItemData'; // Ajusta la ruta si es necesario
import type { PlayerData } from '../../../game/PlayerData'; // Ajusta la ruta si es necesario

@customElement('shop-tooltip')
export class ShopTooltip extends LitElement {

  // --- Propiedades (Inputs) ---
  // Recibe el objeto completo del item o null si no hay selección
  @property({ type: Object }) itemData: ShopItemJsonData | null = null;
  // Recibe el estado actual del jugador para cálculos internos
  @property({ type: Object }) playerDataSnapshot: PlayerData | null = null;
  // Controla la visibilidad del tooltip desde fuera
  @property({ type: Boolean }) isVisible = false;

  // --- Estado Interno (Calculado a partir de props) ---
  @state() private _itemName = '...';
  @state() private _itemLevelText = '';
  @state() private _itemEffectText = 'Selecciona un ítem para ver detalles.';
  @state() private _itemCostText = '';
  @state() private _itemStatusText = '';
  @state() private _isBuyButtonDisabled = true;
  @state() private _buyButtonIcon = '💰'; // Icono por defecto

  // --- Estilos Encapsulados ---
  static styles: CSSResultGroup = css`
    :host {
      display: block; /* Ocupa espacio */
      position: relative; /* Para el botón absoluto */
      width: 100%;
      background-color: rgba(31, 41, 55, 0.98);
      border: 1px solid #6b7280;
      border-radius: 0.85rem; /* --shop-tooltip-border-radius */
      color: #d1d5db;
      font-size: 0.75rem; /* --shop-tooltip-font-size */
      text-align: left;
      box-shadow: 0 -0.3125rem 0.625rem rgba(0,0,0,0.2); /* --shop-tooltip-box-shadow */
      box-sizing: border-box;
      padding: 0.6rem 0.8rem; /* --shop-tooltip-padding-y/x */
      padding-right: calc(5.5rem + 1rem); /* Espacio para el botón (min-width + padding-x) */
      min-height: 4rem; /* Altura mínima para evitar colapso */
      opacity: 0;
      visibility: hidden;
      transition: opacity 0.2s ease, visibility 0s linear 0.2s;
      pointer-events: none; /* No interactuable por defecto */
    }

    :host([visible]) {
      opacity: 1;
      visibility: visible;
      pointer-events: auto; /* Interactuable cuando es visible */
      transition: opacity 0.2s ease, visibility 0s linear 0s;
    }

    /* Estilos para los textos internos */
    .tooltip-item-name {
      font-size: 0.9rem; /* --shop-tooltip-name-font-size */
      font-weight: 600; /* --shop-tooltip-name-font-weight */
      color: #f9fafb;
      margin-bottom: 0.15rem;
      display: block; /* Asegura que ocupe su línea */
    }
    .tooltip-item-level {
      font-size: 0.7rem; /* --shop-tooltip-level-font-size */
      font-weight: 700; /* --shop-tooltip-level-font-weight */
      color: #6ee7b7; /* Verde claro */
      margin-bottom: 0.15rem;
      display: block;
    }
    .tooltip-item-level[hidden] { display: none; }

    .tooltip-item-effect {
      font-size: 0.7rem; /* --shop-tooltip-effect-font-size */
      margin-bottom: 0.3rem;
      display: block;
      line-height: 1.3; /* Mejorar legibilidad */
    }
    .tooltip-item-cost {
      font-size: 0.8rem; /* --shop-tooltip-cost-font-size */
      font-weight: 600; /* --shop-tooltip-cost-font-weight */
      color: #facc15; /* Amarillo */
      display: block;
    }
    .tooltip-item-status {
      font-size: 0.75rem; /* --shop-tooltip-status-font-size */
      font-style: italic;
      color: #fca5a5; /* Rojo claro */
      margin-top: 0.3rem;
      display: block;
    }
     .tooltip-item-status[hidden] { display: none; }

    /* Botón de Compra Interno */
    .tooltip-buy-btn {
      position: absolute;
      top: 0; right: 0; bottom: 0;
      min-width: 5.5rem; /* --shop-buy-button-min-width */
      width: auto;
      height: 100%;
      padding: 0 1rem; /* --shop-buy-button-padding-x */
      margin: 0;
      transform: none;
      display: flex;
      justify-content: center;
      align-items: center;
      background-color: #4b5563; /* Gris */
      color: #facc15; /* Amarillo */
      border: none;
      border-left: 1px solid rgba(107, 114, 128, 0.7);
      border-radius: 0 var(--shop-tooltip-border-radius, 0.85rem) var(--shop-tooltip-border-radius, 0.85rem) 0;
      box-shadow: inset 1px 0 2px rgba(0,0,0,0.2); /* --shop-buy-button-box-shadow */
      cursor: pointer;
      transition: background-color 0.2s ease, color 0.2s ease, opacity 0.2s ease, box-shadow 0.2s ease;
      font-size: 3.4rem; /* --shop-buy-button-icon-size */
      font-weight: bold;
      line-height: 1;
      -webkit-tap-highlight-color: transparent;
      z-index: 1; /* Encima del contenido del tooltip */
      opacity: 1;
      appearance: none;
      -webkit-appearance: none;
    }

    .tooltip-buy-btn[disabled] {
      background-color: rgba(55, 65, 81, 0.6);
      color: #6b7280; /* Gris apagado */
      cursor: not-allowed;
      box-shadow: none;
      border-left-color: rgba(75, 85, 99, 0.5);
    }

    .tooltip-buy-btn:not([disabled]):hover {
      background-color: #5a6677;
      color: #fff; /* Blanco en hover */
      box-shadow: inset 1px 0 3px rgba(0,0,0,0.3); /* --shop-buy-button-hover-box-shadow */
    }
    .tooltip-buy-btn:not([disabled]):active {
      background-color: #6b778a;
      box-shadow: inset 1px 0 2px rgba(0,0,0,0.3);
    }
  `;

  // --- Ciclo de Vida: Actualizar estado cuando las propiedades cambian ---
  protected updated(changedProperties: PropertyValueMap<any> | Map<PropertyKey, unknown>): void {
    super.updated(changedProperties);
    // Actualizar estado interno si itemData o playerDataSnapshot cambian
    if (changedProperties.has('itemData') || changedProperties.has('playerDataSnapshot')) {
      this._updateInternalState();
    }
    // Controlar visibilidad basada en la propiedad isVisible
    if (changedProperties.has('isVisible')) {
        this.toggleAttribute('visible', this.isVisible);
    }
  }

  // --- Lógica Interna ---
  private _updateInternalState() {
    if (!this.itemData || !this.playerDataSnapshot) {
      // Estado por defecto si no hay item o datos del jugador
      this._itemName = '...';
      this._itemLevelText = '';
      this._itemEffectText = 'Selecciona un ítem para ver detalles.';
      this._itemCostText = '';
      this._itemStatusText = '';
      this._isBuyButtonDisabled = true;
      this._buyButtonIcon = '💰';
      return;
    }

    // Cálculos basados en las propiedades (reutilizando lógica de ShopManager)
    const cost = this._calculateItemCost(this.itemData, this.playerDataSnapshot);
    const isAffordable = this.playerDataSnapshot.score >= cost;
    const isPurchased = this._checkItemIsPurchased(this.itemData, this.playerDataSnapshot);
    const canPurchaseCheck = this._checkItemCanPurchase(this.itemData, this.playerDataSnapshot);
    const level = this._getItemLevel(this.itemData, this.playerDataSnapshot);
    const isMaxLevel = this.itemData.isLeveled && typeof this.itemData.maxLevel === 'number' && level >= this.itemData.maxLevel;
    const isCurrentlyPurchasable = !isMaxLevel && !(isPurchased && !this.itemData.isLeveled) && canPurchaseCheck && isAffordable;

    // Actualizar textos
    this._itemName = this.itemData.name;
    this._itemEffectText = this._formatEffectText(this.itemData, this.playerDataSnapshot);
    this._itemLevelText = (this.itemData.isLeveled && level >= 0) ? `Nivel: ${level}` : '';
    this._itemCostText = isMaxLevel ? "Nivel Máximo" : `Costo: ${cost}`;

    // Actualizar texto de estado
    let statusText = '';
    if (isMaxLevel) { statusText = "Nivel Máximo Alcanzado"; }
    else if (isPurchased && !this.itemData.isLeveled) { statusText = "Ya comprado / Activo"; }
    else if (!canPurchaseCheck && !isMaxLevel) { statusText = "No disponible"; }
    else if (!isAffordable) { statusText = "Puntos insuficientes"; }
    this._itemStatusText = statusText;

    // Actualizar estado del botón de compra
    this._isBuyButtonDisabled = !isCurrentlyPurchasable;
    this._buyButtonIcon = isMaxLevel || (isPurchased && !this.itemData.isLeveled) ? '✔️' : '💰'; // Icono de check si ya no se puede comprar
  }

  // --- Métodos Helper (copiados y adaptados de ShopManager) ---
  private _calculateItemCost(itemData: ShopItemJsonData, playerData: PlayerData): number {
    const costParams = itemData.cost; let cost = costParams.base;
    if (itemData.isLeveled) { const levelRef = itemData.levelRef; const currentLevel = levelRef ? (playerData as any)[levelRef] ?? 0 : 0; if (costParams.type === 'exponential' && typeof costParams.multiplier === 'number') { cost = costParams.base * Math.pow(costParams.multiplier, currentLevel); } else { cost = costParams.base + (costParams.perLevel ?? 0) * currentLevel; } } else if (costParams.levelRef && typeof costParams.perLevel === 'number') { const linkedLevel = (playerData as any)[costParams.levelRef] ?? 0; cost = costParams.base + costParams.perLevel * linkedLevel; } return Math.round(cost);
  }
  private _formatEffectText(itemData: ShopItemJsonData, playerData: PlayerData): string {
    let text = itemData.effectTemplate; text = text.replace('{lives}', playerData.lives.toString());
    if (text.includes('{isActive}')) { const valueRef = itemData.isPurchasedCheck?.valueRef; const isActive = valueRef ? !!(playerData as any)[valueRef] : false; text = text.replace('{isActive}', isActive ? '(Activo)' : ''); }
    if (text.includes('{isUnlocked}')) { const valueRef = itemData.isPurchasedCheck?.valueRef; const isUnlocked = valueRef ? !!(playerData as any)[valueRef] : false; text = text.replace('{isUnlocked}', isUnlocked ? '(Desbloqueado)' : ''); }
    if (text.includes('{charges}')) { const valueRef = itemData.isPurchasedCheck?.valueRef; const charges = valueRef ? (playerData as any)[valueRef] ?? 0 : 0; text = text.replace('{charges}', charges > 0 ? `(Cargas: ${charges})` : ''); }
    if (text.includes('{currentValue}')) { let currentValue: string | number = '?'; if (itemData.id === 'comboMultiplier') { currentValue = playerData.getCurrentComboMultiplier().toFixed(1); } else if (itemData.id === 'inkCostReduction') { currentValue = playerData.getCurrentInkCostPerPixel().toFixed(2); } else if (itemData.id === 'extraCat') { currentValue = playerData.getCatsPerCorrectAnswer(); } else if (itemData.id === 'maxCats') { currentValue = playerData.getMaxCatsAllowed(); } else if (itemData.id === 'maxCatSize') { currentValue = playerData.getCurrentMaxSizeLimit(); } else if (itemData.id === 'refillCatFood') { currentValue = playerData.currentCatFood; } text = text.replace('{currentValue}', currentValue.toString()); } return text;
  }
  private _checkItemIsPurchased(itemData: ShopItemJsonData, playerData: PlayerData): boolean {
    if (!itemData.isPurchasedCheck) return false; const check = itemData.isPurchasedCheck; const valueRef = check.valueRef; const currentValue = (playerData as any)[valueRef]; if (typeof currentValue === 'undefined') return false; switch (check.condition) { case 'isTrue': return currentValue === true; case 'isFalse': return currentValue === false; case 'greaterThan': return typeof currentValue === 'number' && typeof check.limit === 'number' && currentValue > check.limit; default: return false; }
  }
  private _checkItemCanPurchase(itemData: ShopItemJsonData, playerData: PlayerData): boolean {
    if (!itemData.purchaseCheck) return true; const check = itemData.purchaseCheck; const valueRef = check.valueRef; const currentValue = (playerData as any)[valueRef]; if (typeof currentValue === 'undefined') { return false; } switch (check.condition) { case 'lessThan': return typeof currentValue === 'number' && typeof check.limit === 'number' && currentValue < check.limit; case 'lessThanOrEqual': return typeof currentValue === 'number' && typeof check.limit === 'number' && currentValue <= check.limit; case 'isFalse': return currentValue === false; case 'isTrue': return currentValue === true; case 'greaterThan': return typeof currentValue === 'number' && typeof check.limit === 'number' && currentValue > check.limit; case 'greaterThanOrEqual': return typeof currentValue === 'number' && typeof check.limit === 'number' && currentValue >= check.limit; default: return false; }
  }
  private _getItemLevel(itemData: ShopItemJsonData, playerData: PlayerData): number {
    if (!itemData.isLeveled || !itemData.levelRef) return -1; return (playerData as any)[itemData.levelRef] ?? 0;
  }

  // --- Manejador de Eventos para el Botón de Compra ---
  private _handleBuyClick(event: MouseEvent | TouchEvent) {
    // Prevenir comportamiento default y propagación
    event.stopPropagation();
    if (event.type === 'touchstart') {
        event.preventDefault();
    }

    // No hacer nada si el botón está deshabilitado o no hay itemData
    if (this._isBuyButtonDisabled || !this.itemData) {
      return;
    }

    // Emitir el evento con el ID del ítem
    this.dispatchEvent(new CustomEvent('buy-item-requested', {
      detail: { itemId: this.itemData.id },
      bubbles: true,
      composed: true
    }));
  }

  // --- Template HTML ---
  render() {
    // Usar 'nothing' de Lit para no renderizar partes si no hay datos
    const levelTemplate = this._itemLevelText ? html`<span class="tooltip-item-level" part="level">${this._itemLevelText}</span>` : nothing;
    const statusTemplate = this._itemStatusText ? html`<span class="tooltip-item-status" part="status">${this._itemStatusText}</span>` : nothing;

    return html`
      <div part="content-area">
        <span class="tooltip-item-name" part="name">${this._itemName}</span>
        ${levelTemplate}
        <span class="tooltip-item-effect" part="effect">${this._itemEffectText}</span>
        <span class="tooltip-item-cost" part="cost">${this._itemCostText}</span>
        ${statusTemplate}
      </div>
      <button
        class="tooltip-buy-btn"
        part="buy-button"
        ?disabled=${this._isBuyButtonDisabled}
        @click=${this._handleBuyClick}
        @touchstart=${this._handleBuyClick}
      >
        ${this._buyButtonIcon}
      </button>
    `;
  }
}

// Declaración global
declare global {
  interface HTMLElementTagNameMap {
    'shop-tooltip': ShopTooltip;
  }
}