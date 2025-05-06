// src/game/components/ui/shop-popup.ts
import { LitElement, html, css, CSSResultGroup, PropertyValueMap, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import type { ShopItemJsonData } from '../../../types/ShopItemData.ts'; // Ajusta ruta
import type { PlayerData } from '../../../game/PlayerData.ts'; // Ajusta ruta
// Importar los componentes que usaremos dentro
import './shop-item-card.ts';
import './shop-tooltip.ts';
import type { ShopItemCard } from './shop-item-card';
import type { ShopTooltip } from './shop-tooltip';

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

  // --- Propiedades (Inputs) ---
  @property({ type: Array }) items: ShopItemJsonData[] = [];
  @property({ type: Object }) playerDataSnapshot: PlayerData | null = null;
  @property({ type: Boolean, reflect: true, attribute: 'visible' }) isVisible = false;

  // --- Estado Interno ---
  @state() private _selectedItemId: string | null = null;
  @state() private _itemsByCategory: ItemsByCategory = {};
  @state() private _selectedItemData: ShopItemJsonData | null = null;

  // --- Estilos Encapsulados ---
  static styles: CSSResultGroup = css`
    :host {
      /* --- REVERTIDO: Volver a display: flex y visibility: hidden --- */
      display: flex; /* Define el layout base */
      opacity: 0;
      visibility: hidden;
      pointer-events: none; /* Asegura que no sea interactuable por defecto */
      /* -------------------------------------------------------------- */
      position: fixed;
      top: 0; left: 0; width: 100%; height: 100%;
      justify-content: center;
      align-items: flex-start; /* Alinear arriba por defecto */
      text-align: center;
      /* Transición solo para opacidad */
      transition: opacity 0.4s ease-in-out;
      z-index: 101;
      padding: 5vh 1rem;
      box-sizing: border-box;
      overflow-y: auto; /* Scroll interno del host */
    }

    :host([visible]) {
      /* --- REVERTIDO: Solo cambiar opacity, visibility, pointer-events --- */
      opacity: 1;
      visibility: visible;
      pointer-events: auto; /* Hacer interactuable cuando es visible */
       /* Ya no necesitamos !important */
      /* -------------------------------------------------------------- */
    }

    /* --- RESTO DE ESTILOS INTERNOS SIN CAMBIOS --- */
    .shop-content-box {
      background-color: rgba(17, 24, 39, 0.97);
      border-radius: 1rem; /* --shop-border-radius */
      border: 1px solid #4b5563;
      box-shadow: 0 0.625rem 1.875rem rgba(0, 0, 0, 0.6); /* --shop-box-shadow */
      width: 90%;
      max-width: 30.125rem; /* --shop-max-width */
      position: relative; /* Para el botón de cierre */
      color: #e5e7eb;
      max-height: 85vh; /* Altura máxima */
      display: flex;
      flex-direction: column;
      box-sizing: border-box;
      overflow: hidden; /* Ocultar overflow interno, el scroll es del host */
      pointer-events: auto; /* El contenido SÍ debe ser interactuable cuando el :host es visible */
      margin: auto; /* Centrar horizontalmente si el host es flex */
    }
    .shop-close-btn {
      position: absolute; top: 0.25rem; right: 0.5rem;
      background: none; border: none; color: #9ca3af;
      font-size: 2rem; line-height: 1; cursor: pointer;
      transition: color 0.2s ease, transform 0.1s ease;
      padding: 0.25rem; z-index: 10;
      -webkit-tap-highlight-color: transparent;
    }
    .shop-close-btn:hover { color: #e5e7eb; transform: scale(1.1); }
    .shop-close-btn:active { transform: scale(0.95); }
    .shop-title-text, .shop-score-text, .shop-section-title {
      text-align: center; flex-shrink: 0;
      padding-left: 1rem; padding-right: 1rem; box-sizing: border-box;
    }
    .shop-title-text {
      font-size: 1.4rem; font-weight: 700; margin-top: 0.8rem;
      margin-bottom: 0.4rem; color: #e5e7eb;
    }
    .shop-score-text {
      font-size: 0.9rem; font-weight: 600; margin-bottom: 0.4rem;
      color: #a5b4fc;
    }
    .shop-items-container {
      overflow-y: auto; flex-grow: 1; display: flex; flex-direction: column;
      gap: 0.4rem; padding: 0 0.5rem 0.5rem 0.5rem; box-sizing: border-box;
      margin-bottom: 0; scrollbar-width: none; -ms-overflow-style: none;
    }
    .shop-items-container::-webkit-scrollbar { display: none; }
    .shop-section-title {
      font-size: 1rem; font-weight: 600; color: #9ca3af; text-transform: uppercase;
      letter-spacing: 0.05em; margin-top: 0.5rem; margin-bottom: calc(0.4rem * 1.5);
      padding-bottom: 0.25rem; border-bottom: 1px solid #4b5563;
      padding-left: 0.5rem; padding-right: 0.5rem;
    }
    .shop-section-title:first-of-type { margin-top: 0; }
    .shop-section-items {
      display: grid; grid-template-columns: repeat(auto-fill, minmax(4.5rem, 1fr));
      gap: 0.5rem; align-items: center; justify-items: center; padding: 0 0.3rem;
    }
    shop-tooltip { margin: 0.5rem; flex-shrink: 0; }
    @media (max-width: 768px) {
       :host { padding: 2vh 0.5rem; }
       .shop-content-box { max-height: 90vh; }
       .shop-section-items { grid-template-columns: repeat(auto-fill, minmax(4rem, 1fr)); gap: 0.4rem; }
       shop-tooltip { margin: 0.4rem; }
    }
  `;

  // --- Ciclo de Vida, Lógica Interna, Manejadores, Template HTML, Helpers (SIN CAMBIOS) ---
  connectedCallback(): void {
    super.connectedCallback();
    this.addEventListener('click', this._handleBackdropClick); // <-- RE-AÑADIDO BACKDROP CLICK
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
     this.removeEventListener('click', this._handleBackdropClick); // <-- RE-AÑADIDO LIMPIEZA
  }

  protected updated(changedProperties: PropertyValueMap<any> | Map<PropertyKey, unknown>): void {
    super.updated(changedProperties);
    if (changedProperties.has('items')) {
      this._groupItemsByCategory();
    }
    if (changedProperties.has('_selectedItemId') || changedProperties.has('playerDataSnapshot')) {
      this._updateTooltipData();
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
    this._selectedItemData = this._selectedItemId ? this.items.find(item => item.id === this._selectedItemId) ?? null : null;
    const tooltip = this.shadowRoot?.querySelector('shop-tooltip');
    if (tooltip) {
        // Forzar actualización del tooltip pasándole la visibilidad explícitamente
        tooltip.isVisible = !!this._selectedItemId;
        tooltip.itemData = this._selectedItemData;
        tooltip.playerDataSnapshot = this.playerDataSnapshot;
    }
  }

  private _handleItemSelection(event: CustomEvent) {
    const itemId = event.detail?.itemId;
    if (this._selectedItemId === itemId) { this._selectedItemId = null; }
    else { this._selectedItemId = itemId; }
     this._updateTooltipData(); // <<< AÑADIDO: Forzar actualización tooltip al seleccionar/deseleccionar
  }
  private _handleBuyRequest(event: CustomEvent) {
    const itemId = event.detail?.itemId;
    if (itemId) {
      this.dispatchEvent(new CustomEvent('buy-item-requested', { detail: { itemId: itemId }, bubbles: true, composed: true }));
    }
  }
  private _handleCloseClick() {
    this.dispatchEvent(new CustomEvent('close-requested'));
  }
  private _handleBackdropClick(event: MouseEvent) { // <-- RE-AÑADIDO
      // Cierra solo si se hace clic directamente en el host (el fondo)
      if (event.target === this) {
          this.dispatchEvent(new CustomEvent('close-requested'));
      }
  }

  render() {
    // El return es el mismo
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
          ?isVisible=${!!this._selectedItemId} /* La visibilidad del tooltip sigue dependiendo de si hay item seleccionado */
          @buy-item-requested=${this._handleBuyRequest}
        ></shop-tooltip>

      </div>
    `;
  }

   private _calculateItemCost(itemData: ShopItemJsonData, playerData: PlayerData): number { /* ... */ const costParams = itemData.cost; let cost = costParams.base; if (itemData.isLeveled) { const levelRef = itemData.levelRef; const currentLevel = levelRef ? (playerData as any)[levelRef] ?? 0 : 0; if (costParams.type === 'exponential' && typeof costParams.multiplier === 'number') { cost = costParams.base * Math.pow(costParams.multiplier, currentLevel); } else { cost = costParams.base + (costParams.perLevel ?? 0) * currentLevel; } } else if (costParams.levelRef && typeof costParams.perLevel === 'number') { const linkedLevel = (playerData as any)[costParams.levelRef] ?? 0; cost = costParams.base + costParams.perLevel * linkedLevel; } return Math.round(cost); }
   private _checkItemIsPurchased(itemData: ShopItemJsonData, playerData: PlayerData): boolean { /* ... */ if (!itemData.isPurchasedCheck) return false; const check = itemData.isPurchasedCheck; const valueRef = check.valueRef; const currentValue = (playerData as any)[valueRef]; if (typeof currentValue === 'undefined') return false; switch (check.condition) { case 'isTrue': return currentValue === true; case 'isFalse': return currentValue === false; case 'greaterThan': return typeof currentValue === 'number' && typeof check.limit === 'number' && currentValue > check.limit; default: return false; } }
   private _checkItemCanPurchase(itemData: ShopItemJsonData, playerData: PlayerData): boolean { /* ... */ if (!itemData.purchaseCheck) return true; const check = itemData.purchaseCheck; const valueRef = check.valueRef; const currentValue = (playerData as any)[valueRef]; if (typeof currentValue === 'undefined') { return false; } switch (check.condition) { case 'lessThan': return typeof currentValue === 'number' && typeof check.limit === 'number' && currentValue < check.limit; case 'lessThanOrEqual': return typeof currentValue === 'number' && typeof check.limit === 'number' && currentValue <= check.limit; case 'isFalse': return currentValue === false; case 'isTrue': return currentValue === true; case 'greaterThan': return typeof currentValue === 'number' && typeof check.limit === 'number' && currentValue > check.limit; case 'greaterThanOrEqual': return typeof currentValue === 'number' && typeof check.limit === 'number' && currentValue >= check.limit; default: return false; } }
   private _getItemLevel(itemData: ShopItemJsonData, playerData: PlayerData): number { /* ... */ if (!itemData.isLeveled || !itemData.levelRef) return -1; return (playerData as any)[itemData.levelRef] ?? 0; }

}

// Declaración global
declare global {
  interface HTMLElementTagNameMap {
    'shop-popup': ShopPopup;
  }
}