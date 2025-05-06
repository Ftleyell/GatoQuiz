// src/game/components/ui/shop-popup.ts
import { LitElement, html, css, CSSResultGroup, PropertyValueMap, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import type { ShopItemJsonData } from '../../../types/ShopItemData'; // Ajusta ruta
import type { PlayerData } from '../../../game/PlayerData'; // Ajusta ruta
// Importar los componentes que usaremos dentro
import './shop-item-card.ts';
import './shop-tooltip.ts';
// No necesitamos los tipos de los componentes hijos aquí si no accedemos a sus métodos/propiedades directamente
// import type { ShopItemCard } from './shop-item-card';
// import type { ShopTooltip } from './shop-tooltip';

interface ItemsByCategory {
  [key: string]: ShopItemJsonData[];
}

const CATEGORY_ORDER: ReadonlyArray<string> = ['consumable', 'unlockable', 'upgradeable', 'general'];
const CATEGORY_TITLES: Readonly<{ [key: string]: string }> = {
  consumable: 'Consumibles',
  unlockable: 'Desbloqueables',
  upgradeable: 'Mejorables',
  general: 'General'
};

@customElement('shop-popup')
export class ShopPopup extends LitElement {

  @property({ type: Array }) items: ShopItemJsonData[] = [];
  @property({ type: Object }) playerDataSnapshot: PlayerData | null = null;
  @property({ type: Boolean, reflect: true, attribute: 'visible' }) isVisible = false;

  @state() private _selectedItemId: string | null = null;
  @state() private _itemsByCategory: ItemsByCategory = {};
  @state() private _selectedItemData: ShopItemJsonData | null = null;

  static styles: CSSResultGroup = css`
    :host {
      /* Estilos del :host sin cambios respecto a tu versión funcional */
      display: none; 
      opacity: 0;
      visibility: hidden;
      position: fixed;
      top: 0; left: 0; width: 100%; height: 100%;
      justify-content: center;
      align-items: flex-start; 
      text-align: center;
      transition: opacity 0.4s ease-in-out;
      z-index: 101;
      padding: 5vh 1rem;
      box-sizing: border-box;
      pointer-events: none;
      overflow-y: auto;
      font-family: var(--gq-shop-popup-font-family, var(--gq-font-primary, 'Poppins', sans-serif));
    }

    :host([visible]) {
      display: flex; 
      opacity: 1;
      visibility: visible;
      pointer-events: auto;
    }

    .shop-content-box {
      background-color: var(--gq-shop-popup-bg, rgba(17, 24, 39, 0.97));
      border-radius: var(--gq-shop-popup-border-radius, 1rem);
      border: var(--gq-shop-popup-border, 1px solid #4b5563);
      box-shadow: var(--gq-shop-popup-box-shadow, 0 0.625rem 1.875rem rgba(0, 0, 0, 0.6));
      width: 90%;
      max-width: var(--gq-shop-popup-max-width, 30.125rem);
      position: relative;
      color: var(--gq-shop-popup-text-color, #e5e7eb);
      max-height: 85vh;
      display: flex;
      flex-direction: column;
      box-sizing: border-box;
      overflow: hidden;
      pointer-events: auto;
      margin: auto;
    }
    .shop-close-btn {
      position: absolute; 
      top: var(--gq-shop-popup-close-btn-top, 0.25rem); 
      right: var(--gq-shop-popup-close-btn-right, 0.5rem);
      background: none; border: none; 
      color: var(--gq-shop-popup-close-btn-text-color, #9ca3af);
      font-size: var(--gq-shop-popup-close-btn-font-size, 2rem);
      line-height: 1; cursor: pointer;
      transition: color 0.2s ease, transform 0.1s ease;
      padding: 0.25rem; z-index: 10;
      -webkit-tap-highlight-color: transparent;
    }
    .shop-close-btn:hover { 
      color: var(--gq-shop-popup-close-btn-hover-text-color, var(--gq-shop-popup-text-color, #e5e7eb)); 
      transform: scale(1.1); 
    }
    .shop-close-btn:active { transform: scale(0.95); }

    .shop-title-text, .shop-score-text, .shop-section-title {
      text-align: center; flex-shrink: 0;
      padding-left: 1rem; padding-right: 1rem; box-sizing: border-box;
    }
    .shop-title-text {
      font-family: var(--gq-shop-popup-title-font-family, var(--gq-shop-popup-font-family));
      font-size: var(--gq-shop-popup-title-font-size, 1.4rem); 
      font-weight: var(--gq-shop-popup-title-font-weight, 700); 
      margin-top: 0.8rem;
      margin-bottom: 0.4rem; 
      color: var(--gq-shop-popup-title-text-color, var(--gq-shop-popup-text-color, #e5e7eb));
    }
    .shop-score-text {
      font-family: var(--gq-shop-popup-score-font-family, var(--gq-shop-popup-font-family));
      font-size: var(--gq-shop-popup-score-font-size, 0.9rem); 
      font-weight: var(--gq-shop-popup-score-font-weight, 600); 
      margin-bottom: 0.4rem;
      color: var(--gq-shop-popup-score-text-color, #a5b4fc);
    }
    .shop-items-container {
      overflow-y: auto; flex-grow: 1; display: flex; flex-direction: column;
      gap: 0.4rem; padding: 0 0.5rem 0.5rem 0.5rem; box-sizing: border-box;
      margin-bottom: 0; scrollbar-width: none; -ms-overflow-style: none;
    }
    .shop-items-container::-webkit-scrollbar { display: none; }
    .shop-section-title {
      font-family: var(--gq-shop-popup-section-title-font-family, var(--gq-shop-popup-font-family));
      font-size: var(--gq-shop-popup-section-title-font-size, 1rem); 
      font-weight: var(--gq-shop-popup-section-title-font-weight, 600); 
      color: var(--gq-shop-popup-section-title-color, #9ca3af); 
      text-transform: uppercase;
      letter-spacing: 0.05em; margin-top: 0.5rem; margin-bottom: calc(0.4rem * 1.5);
      padding-bottom: 0.25rem; 
      border-bottom: var(--gq-shop-popup-section-title-border-bottom, 1px solid #4b5563);
      padding-left: 0.5rem; padding-right: 0.5rem;
    }
    .shop-section-title:first-of-type { margin-top: 0; }
    .shop-section-items {
      display: grid; grid-template-columns: repeat(auto-fill, minmax(4.5rem, 1fr));
      gap: 0.5rem; align-items: center; justify-items: center; padding: 0 0.3rem;
    }
    shop-tooltip { 
      margin: var(--gq-shop-popup-tooltip-margin, 0.5rem);
      flex-shrink: 0; 
    }
    @media (max-width: 768px) {
       :host { padding: 2vh 0.5rem; }
       .shop-content-box { max-height: 90vh; }
       .shop-section-items { grid-template-columns: repeat(auto-fill, minmax(4rem, 1fr)); gap: 0.4rem; }
       shop-tooltip { margin: var(--gq-shop-popup-tooltip-tablet-margin, var(--gq-shop-popup-tooltip-margin, 0.4rem)); }
    }
  `;

  connectedCallback(): void {
    super.connectedCallback();
    console.log('[shop-popup] connectedCallback');
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    console.log('[shop-popup] disconnectedCallback');
  }

  protected updated(changedProperties: PropertyValueMap<any> | Map<PropertyKey, unknown>): void {
    super.updated(changedProperties);
    if (changedProperties.has('items')) {
      console.log('[shop-popup] items property changed');
      this._groupItemsByCategory();
    }
    if (changedProperties.has('playerDataSnapshot')) {
        console.log('[shop-popup] playerDataSnapshot property changed');
    }
    if (changedProperties.has('_selectedItemId')) {
      console.log('[shop-popup] _selectedItemId state changed to:', this._selectedItemId);
      this._updateTooltipData();
    }
    if (changedProperties.has('isVisible')) {
        console.log('[shop-popup] isVisible property changed to:', this.isVisible);
    }
  }

  private _groupItemsByCategory() {
    const grouped: ItemsByCategory = {};
    this.items.forEach(item => {
      const category = item.category || 'general';
      if (!grouped[category]) grouped[category] = [];
      grouped[category].push(item);
    });
    for (const category in grouped) {
        grouped[category].sort((a, b) => a.name.localeCompare(b.name));
    }
    this._itemsByCategory = grouped;
  }

  private _updateTooltipData() {
    console.log('[shop-popup] _updateTooltipData_ called. _selectedItemId:', this._selectedItemId);
    this._selectedItemData = this._selectedItemId ? this.items.find(item => item.id === this._selectedItemId) ?? null : null;
    console.log('[shop-popup] _selectedItemData is now:', this._selectedItemData);
    
    // La actualización de las props del tooltip se maneja declarativamente en el template.
    // El `?isVisible=${!!this._selectedItemId}` en el template es la forma principal
    // de controlar la visibilidad del tooltip.
  }

  private _handleItemSelection(event: CustomEvent) {
    const itemId = event.detail?.itemId;
    const oldSelectedItemId = this._selectedItemId;
    if (this._selectedItemId === itemId) { 
      this._selectedItemId = null; 
      console.log('[shop-popup] Item deseleccionado:', itemId);
    } else { 
      this._selectedItemId = itemId; 
      console.log('[shop-popup] Item seleccionado:', itemId);
    }
    // El cambio de _selectedItemId (que es @state) debería disparar 'updated' y re-render.
  }

  private _handleBuyRequest(event: CustomEvent) {
    const itemId = event.detail?.itemId;
    if (itemId) {
      console.log('[shop-popup] buy-item-requested evento propagado para:', itemId);
      this.dispatchEvent(new CustomEvent('buy-item-requested', { detail: { itemId: itemId }, bubbles: true, composed: true }));
    }
  }

  private _handleCloseClick() {
    console.log('[shop-popup] close-requested evento emitido');
    this.dispatchEvent(new CustomEvent('close-requested'));
  }

  render() {
    console.log('[shop-popup] render() llamado. _selectedItemId:', this._selectedItemId, 'Tooltip isVisible será:', !!this._selectedItemId);
    return html`
      <div class="shop-content-box" @click=${(e: Event) => e.stopPropagation()}>
        <button class="shop-close-btn" @click=${this._handleCloseClick} title="Cerrar Tienda (Esc)">&times;</button>
        <h2 class="shop-title-text">Tienda de Mejoras</h2>
        <p class="shop-score-text">Puntos: ${this.playerDataSnapshot?.score ?? 0}</p>

        <div class="shop-items-container">
          ${CATEGORY_ORDER.map(category => this._itemsByCategory[category] ? html`
            <h3 class="shop-section-title">${CATEGORY_TITLES[category] || category}</h3>
            <div class="shop-section-items">
              ${this._itemsByCategory[category].map(item => {
                const cost = this._calculateItemCost(item, this.playerDataSnapshot!);
                const isAffordable = this.playerDataSnapshot!.score >= cost;
                const isPurchased = this._checkItemIsPurchased(item, this.playerDataSnapshot!);
                const canPurchaseCheck = this._checkItemCanPurchase(item, this.playerDataSnapshot!);
                const level = this._getItemLevel(item, this.playerDataSnapshot!);
                const isMaxLevel = item.isLeveled && typeof item.maxLevel === 'number' && level >= item.maxLevel;
                const isDisabled = isMaxLevel || (isPurchased && !item.isLeveled) || !canPurchaseCheck || !isAffordable;

                return html`
                  <shop-item-card
                    .itemId=${item.id}
                    .icon=${item.icon || '❓'}
                    ?isDisabled=${isDisabled}
                    ?isPurchased=${isPurchased && !item.isLeveled}
                    ?isMaxLevel=${isMaxLevel}
                    ?isSelected=${this._selectedItemId === item.id}
                    @item-selected=${this._handleItemSelection}
                  ></shop-item-card>
                `;
              })}
            </div>
          ` : nothing)}
        </div>

        <shop-tooltip
          .itemData=${this._selectedItemData}
          .playerDataSnapshot=${this.playerDataSnapshot}
          ?isVisible=${!!this._selectedItemId}
          @buy-item-requested=${this._handleBuyRequest}
        ></shop-tooltip>
      </div>
    `;
  }

   // --- Métodos Helper (sin cambios) ---
   private _calculateItemCost(itemData: ShopItemJsonData, playerData: PlayerData): number { const costParams = itemData.cost; let cost = costParams.base; if (itemData.isLeveled) { const levelRef = itemData.levelRef; const currentLevel = levelRef ? (playerData as any)[levelRef] ?? 0 : 0; if (costParams.type === 'exponential' && typeof costParams.multiplier === 'number') { cost = costParams.base * Math.pow(costParams.multiplier, currentLevel); } else { cost = costParams.base + (costParams.perLevel ?? 0) * currentLevel; } } else if (costParams.levelRef && typeof costParams.perLevel === 'number') { const linkedLevel = (playerData as any)[costParams.levelRef] ?? 0; cost = costParams.base + costParams.perLevel * linkedLevel; } return Math.round(cost); }
   private _checkItemIsPurchased(itemData: ShopItemJsonData, playerData: PlayerData): boolean { if (!itemData.isPurchasedCheck) return false; const check = itemData.isPurchasedCheck; const valueRef = check.valueRef; const currentValue = (playerData as any)[valueRef]; if (typeof currentValue === 'undefined') return false; switch (check.condition) { case 'isTrue': return currentValue === true; case 'isFalse': return currentValue === false; case 'greaterThan': return typeof currentValue === 'number' && typeof check.limit === 'number' && currentValue > check.limit; default: return false; } }
   private _checkItemCanPurchase(itemData: ShopItemJsonData, playerData: PlayerData): boolean { if (!itemData.purchaseCheck) return true; const check = itemData.purchaseCheck; const valueRef = check.valueRef; const currentValue = (playerData as any)[valueRef]; if (typeof currentValue === 'undefined') { return false; } switch (check.condition) { case 'lessThan': return typeof currentValue === 'number' && typeof check.limit === 'number' && currentValue < check.limit; case 'lessThanOrEqual': return typeof currentValue === 'number' && typeof check.limit === 'number' && currentValue <= check.limit; case 'isFalse': return currentValue === false; case 'isTrue': return currentValue === true; case 'greaterThan': return typeof currentValue === 'number' && typeof check.limit === 'number' && currentValue > check.limit; case 'greaterThanOrEqual': return typeof currentValue === 'number' && typeof check.limit === 'number' && currentValue >= check.limit; default: return false; } }
   private _getItemLevel(itemData: ShopItemJsonData, playerData: PlayerData): number { if (!itemData.isLeveled || !itemData.levelRef) return -1; return (playerData as any)[itemData.levelRef] ?? 0; }
}
