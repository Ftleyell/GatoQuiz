// src/systems/ShopManager.ts

import { ShopItemJsonData } from '../types/ShopItemData';
import { PlayerData } from '../game/PlayerData';
import { GameManager } from '../game/GameManager';

// Constantes para IDs de elementos HTML
const SHOP_POPUP_ID = 'shop-popup';
const SHOP_CLOSE_BUTTON_ID = 'shop-close-button';
const SHOP_PLAYER_SCORE_ID = 'shop-player-score';
const SHOP_ITEMS_CONTAINER_ID = 'shop-items-container';
const SHOP_TOOLTIP_ID = 'shop-tooltip';
const TOOLTIP_NAME_ID = 'tooltip-name';
const TOOLTIP_LEVEL_ID = 'tooltip-level';
const TOOLTIP_EFFECT_ID = 'tooltip-effect';
const TOOLTIP_COST_ID = 'tooltip-cost';
const TOOLTIP_STATUS_ID = 'tooltip-status';

/**
 * ShopManager: Gestiona la lógica de la tienda, la interacción con la UI,
 * la compra de ítems y la actualización del estado del jugador, basado en datos JSON.
 */
export class ShopManager {
  private items: Map<string, ShopItemJsonData> = new Map();
  private playerData: PlayerData;
  private gameManager: GameManager;
  private itemElements: Map<string, HTMLElement> = new Map();

  // Referencias a elementos de la UI
  private shopPopupElement: HTMLElement | null = null;
  private shopCloseButtonElement: HTMLElement | null = null;
  private shopPlayerScoreElement: HTMLElement | null = null;
  private shopItemsContainerElement: HTMLElement | null = null;
  private tooltipElement: HTMLElement | null = null;
  private tooltipNameElement: HTMLElement | null = null;
  private tooltipLevelElement: HTMLElement | null = null;
  private tooltipEffectElement: HTMLElement | null = null;
  private tooltipCostElement: HTMLElement | null = null;
  private tooltipStatusElement: HTMLElement | null = null;

  // Listeners
  private closeButtonListener: (() => void) | null = null;
  private backdropClickListener: ((event: MouseEvent) => void) | null = null;

  constructor(playerData: PlayerData, gameManager: GameManager) {
    console.log("ShopManager: Constructor iniciado.");
    this.playerData = playerData;
    this.gameManager = gameManager;

    // Obtener referencias a elementos HTML esenciales
    this.shopPopupElement = document.getElementById(SHOP_POPUP_ID);
    this.shopCloseButtonElement = document.getElementById(SHOP_CLOSE_BUTTON_ID);
    this.shopPlayerScoreElement = document.getElementById(SHOP_PLAYER_SCORE_ID);
    this.shopItemsContainerElement = document.getElementById(SHOP_ITEMS_CONTAINER_ID);
    this.tooltipElement = document.getElementById(SHOP_TOOLTIP_ID);

    if (this.tooltipElement) {
        this.tooltipNameElement = this.tooltipElement.querySelector(`#${TOOLTIP_NAME_ID}`);
        this.tooltipLevelElement = this.tooltipElement.querySelector(`#${TOOLTIP_LEVEL_ID}`);
        this.tooltipEffectElement = this.tooltipElement.querySelector(`#${TOOLTIP_EFFECT_ID}`);
        this.tooltipCostElement = this.tooltipElement.querySelector(`#${TOOLTIP_COST_ID}`);
        this.tooltipStatusElement = this.tooltipElement.querySelector(`#${TOOLTIP_STATUS_ID}`);
    }

    if (!this.shopPopupElement || !this.shopCloseButtonElement || !this.shopItemsContainerElement || !this.tooltipElement) {
        console.error("ShopManager: No se encontraron elementos HTML esenciales para la tienda!");
    }
    console.log("ShopManager: Constructor finalizado (listeners se añadirán en init).");
  }

  public init(itemJsonData: any[]): void {
    console.log("ShopManager: init - Procesando datos JSON de ítems...");
    this.items.clear();
    if (!Array.isArray(itemJsonData)) {
        console.error("ShopManager: Datos de ítems de tienda inválidos (no es un array).");
        return;
    }
    itemJsonData.forEach(itemData => {
        if (itemData?.id && typeof itemData.id === 'string') {
            this.items.set(itemData.id, itemData as ShopItemJsonData);
        } else {
            console.warn("ShopManager: Ítem inválido o sin ID en JSON.", itemData);
        }
    });
    console.log(`ShopManager: ${this.items.size} definiciones de ítems procesadas desde JSON.`);
    this.createShopItemElements();
    this.addCloseListeners(); // Mover listeners aquí es correcto
    console.log("ShopManager: Listeners de cierre añadidos.");
  }

  public openShop(): void {
    console.log("ShopManager: Abriendo tienda...");
    if (!this.shopPopupElement) {
        console.error("ShopManager: No se puede abrir la tienda, elemento popup no encontrado.");
        return;
    }
    this.updateShopUI();
    this.shopPopupElement.style.display = 'flex';
    void this.shopPopupElement.offsetHeight;
    this.shopPopupElement.classList.add('visible');
  }

  public closeShop(): void {
    console.log("ShopManager: Cerrando tienda...");
    if (!this.shopPopupElement) return;
    this.hideTooltip();
    this.shopPopupElement.classList.remove('visible');
    const transitionDuration = 300;
    setTimeout(() => {
        if (!this.shopPopupElement?.classList.contains('visible')) {
            this.shopPopupElement.style.display = 'none';
        }
    }, transitionDuration);
  }

  public updateShopUI(): void {
    if (!this.playerData) return;
    if (this.shopPlayerScoreElement) {
        this.shopPlayerScoreElement.textContent = `Puntos: ${this.playerData.score}`;
    }
    this.itemElements.forEach((itemElement, itemId) => {
        const itemData = this.items.get(itemId);
        if (!itemData) return;
        const cost = this.calculateItemCost(itemData);
        const isAffordable = this.playerData.score >= cost;
        const isPurchased = this.checkItemIsPurchased(itemData);
        const canPurchase = this.checkItemCanPurchase(itemData);
        const level = this.getItemLevel(itemData);
        const isMaxLevel = itemData.isLeveled && typeof itemData.maxLevel === 'number' && level >= itemData.maxLevel;

        itemElement.classList.remove('disabled', 'purchased', 'max-level');
        if (isMaxLevel) {
            itemElement.classList.add('max-level', 'disabled');
        } else if (isPurchased && !itemData.isLeveled) {
            itemElement.classList.add('purchased', 'disabled');
        } else if (!canPurchase || !isAffordable) {
            itemElement.classList.add('disabled');
        }
    });
     const hoveredItem = document.querySelector('.shop-item:hover');
     if (hoveredItem && this.tooltipElement?.classList.contains('visible')) {
         this.showTooltipForItem((hoveredItem as HTMLElement).dataset.itemId || '');
     }
  }

  private handleItemClick(event: MouseEvent): void {
    const itemElement = event.currentTarget as HTMLElement;
    const itemId = itemElement?.dataset.itemId; // <-- Este es el ID correcto ("shield")

    if (!itemId || !this.items.has(itemId)) { console.error("Click en ítem inválido o sin ID."); return; }
    if (itemElement.classList.contains('disabled')) {
        console.log(`Intento de compra de ítem deshabilitado: ${itemId}`);
        this.showTooltipForItem(itemId);
        return;
    }

    // const itemData = this.items.get(itemId)!; // No necesitamos obtener itemData aquí ahora

    console.log(`Intentando comprar ítem: ${itemId}`);

    // *** CORRECCIÓN: Pasar itemId en lugar de itemData.actionId ***
    const purchaseSuccessful = this.executePurchaseAction(itemId);

    if (purchaseSuccessful) {
        console.log(`Compra exitosa de ${itemId}`);
        this.gameManager.getAudioManager().playSound('purchase');
        this.updateShopUI();
        this.showTooltipForItem(itemId);
    } else {
        console.log(`Compra fallida de ${itemId}`);
        this.showTooltipForItem(itemId);
    }
  }

   private handleItemMouseOver(event: MouseEvent): void {
    const itemElement = event.currentTarget as HTMLElement;
    const itemId = itemElement?.dataset.itemId;
    if (itemId) {
        this.showTooltipForItem(itemId);
    }
  }

   private hideTooltip(): void {
      if (this.tooltipElement) {
          this.tooltipElement.classList.remove('visible');
      }
  }

   private showTooltipForItem(itemId: string): void {
    const itemData = this.items.get(itemId);
    if (!itemData || !this.tooltipElement || !this.playerData ||
        !this.tooltipNameElement || !this.tooltipEffectElement ||
        !this.tooltipLevelElement || !this.tooltipCostElement ||
        !this.tooltipStatusElement) {
        this.hideTooltip();
        return;
    }

    const cost = this.calculateItemCost(itemData);
    const isAffordable = this.playerData.score >= cost;
    const isPurchased = this.checkItemIsPurchased(itemData);
    const canPurchase = this.checkItemCanPurchase(itemData);
    const level = this.getItemLevel(itemData);
    const isMaxLevel = itemData.isLeveled && typeof itemData.maxLevel === 'number' && level >= itemData.maxLevel;
    const effectText = this.formatEffectText(itemData);

    this.tooltipNameElement.textContent = itemData.name;
    this.tooltipEffectElement.textContent = effectText;

    if (itemData.isLeveled && level >= 0) {
        this.tooltipLevelElement.textContent = `Nivel: ${level}`;
        this.tooltipLevelElement.classList.remove('hidden');
    } else {
        this.tooltipLevelElement.classList.add('hidden');
    }

    this.tooltipCostElement.textContent = isMaxLevel ? "Nivel Máximo" : `Costo: ${cost}`;

    let statusText = '';
    if (isMaxLevel) { statusText = "Nivel Máximo Alcanzado"; }
    else if (isPurchased && !itemData.isLeveled) { statusText = "Ya comprado / Activo"; }
    else if (!canPurchase && !isMaxLevel) { statusText = "No disponible"; }
    else if (!isAffordable) { statusText = "Puntos insuficientes"; }

    if (statusText) {
        this.tooltipStatusElement.textContent = statusText;
        this.tooltipStatusElement.classList.remove('hidden');
    } else {
        this.tooltipStatusElement.classList.add('hidden');
    }

    this.tooltipElement.classList.add('visible');
  }

  private createShopItemElements(): void {
     if (!this.shopItemsContainerElement) {
         console.error("ShopManager: No se encontró el contenedor #shop-items-container. No se pueden crear ítems.");
         return;
     }
     this.shopItemsContainerElement.innerHTML = '';
     this.itemElements.clear();
     console.log(`Creando elementos HTML para ${this.items.size} ítems...`);

     const itemsByCategory: { [key: string]: ShopItemJsonData[] } = {};
     this.items.forEach(item => {
         const category = item.category || 'general';
         if (!itemsByCategory[category]) { itemsByCategory[category] = []; }
         itemsByCategory[category].push(item);
     });

     for (const category in itemsByCategory) {
         const sectionTitle = document.createElement('h3');
         sectionTitle.className = 'shop-section-title';
         sectionTitle.textContent = this.formatCategoryTitle(category);
         this.shopItemsContainerElement.appendChild(sectionTitle);

         const categoryItemsContainer = document.createElement('div');
         categoryItemsContainer.className = 'shop-section-items';
         this.shopItemsContainerElement.appendChild(categoryItemsContainer);

         itemsByCategory[category].sort((a, b) => a.id.localeCompare(b.id));

         itemsByCategory[category].forEach(itemData => {
             const itemElement = document.createElement('div');
             itemElement.className = 'shop-item';
             itemElement.dataset.itemId = itemData.id;

             const iconElement = document.createElement('span');
             iconElement.className = 'shop-item-icon';
             iconElement.textContent = itemData.icon || '❓';
             itemElement.appendChild(iconElement);

             itemElement.addEventListener('click', (e) => this.handleItemClick(e));
             itemElement.addEventListener('mouseover', (e) => this.handleItemMouseOver(e));
             itemElement.addEventListener('mouseout', () => this.hideTooltip());

             categoryItemsContainer.appendChild(itemElement);
             this.itemElements.set(itemData.id, itemElement);
         });
     }
     console.log("Elementos HTML de ítems creados.");
     this.updateShopUI();
  }

  private formatCategoryTitle(categoryKey: string): string {
      if (categoryKey === 'consumable') return 'Consumibles';
      if (categoryKey === 'unlockable') return 'Desbloqueables';
      if (categoryKey === 'upgradeable') return 'Mejorables';
      return 'General';
  }

  private addCloseListeners(): void {
      if (this.shopCloseButtonElement) {
          this.closeButtonListener = () => this.closeShop();
          this.shopCloseButtonElement.addEventListener('click', this.closeButtonListener);
      } else { console.warn("ShopManager: Botón de cierre no encontrado."); }

      if (this.shopPopupElement) {
          this.backdropClickListener = (event: MouseEvent) => { if (event.target === this.shopPopupElement) this.closeShop(); };
          this.shopPopupElement.addEventListener('click', this.backdropClickListener);
      }
  }

  public destroy(): void {
       console.log("ShopManager: Destruyendo y limpiando listeners...");
       if (this.closeButtonListener && this.shopCloseButtonElement) this.shopCloseButtonElement.removeEventListener('click', this.closeButtonListener);
       if (this.backdropClickListener && this.shopPopupElement) this.shopPopupElement.removeEventListener('click', this.backdropClickListener);
       this.itemElements.forEach(itemElement => { /* Limpiar listeners de ítems si es necesario */ });
       this.itemElements.clear();
       console.log("ShopManager: Listeners limpiados.");
  }

  // --- Funciones Helper para Interpretar JSON ---

  private calculateItemCost(itemData: ShopItemJsonData): number {
      const costParams = itemData.cost;
      let cost = costParams.base;
      if (itemData.isLeveled) {
          const levelRef = itemData.levelRef;
          const currentLevel = levelRef ? (this.playerData as any)[levelRef] ?? 0 : 0;
          if (costParams.type === 'exponential' && typeof costParams.multiplier === 'number') {
              cost = costParams.base * Math.pow(costParams.multiplier, currentLevel);
          } else {
              cost = costParams.base + (costParams.perLevel ?? 0) * currentLevel;
          }
      } else if (costParams.levelRef && typeof costParams.perLevel === 'number') {
           const linkedLevel = (this.playerData as any)[costParams.levelRef] ?? 0;
           cost = costParams.base + costParams.perLevel * linkedLevel;
      }
      return Math.round(cost);
  }

  private formatEffectText(itemData: ShopItemJsonData): string {
      let text = itemData.effectTemplate;
      text = text.replace('{lives}', this.playerData.lives.toString());
      if (text.includes('{isActive}')) {
          const valueRef = itemData.isPurchasedCheck?.valueRef;
          const isActive = valueRef ? !!(this.playerData as any)[valueRef] : false;
          text = text.replace('{isActive}', isActive ? '(Activo)' : '');
      }
       if (text.includes('{isUnlocked}')) {
          const valueRef = itemData.isPurchasedCheck?.valueRef;
          const isUnlocked = valueRef ? !!(this.playerData as any)[valueRef] : false;
          text = text.replace('{isUnlocked}', isUnlocked ? '(Desbloqueado)' : '');
      }
      if (text.includes('{charges}')) {
           const valueRef = itemData.isPurchasedCheck?.valueRef;
           const charges = valueRef ? (this.playerData as any)[valueRef] ?? 0 : 0;
           text = text.replace('{charges}', charges > 0 ? `(${charges} restantes)` : '');
      }
      if (text.includes('{currentValue}')) {
          let currentValue: string | number = '?';
          if (itemData.id === 'comboMultiplier') currentValue = this.playerData.getCurrentComboMultiplier().toFixed(1);
          else if (itemData.id === 'inkCostReduction') currentValue = this.playerData.getCurrentInkCostPerPixel().toFixed(2);
          text = text.replace('{currentValue}', currentValue.toString());
      }
      return text;
  }

   private checkItemIsPurchased(itemData: ShopItemJsonData): boolean {
       if (!itemData.isPurchasedCheck) return false;
       const check = itemData.isPurchasedCheck;
       const valueRef = check.valueRef;
       const currentValue = (this.playerData as any)[valueRef];
       if (typeof currentValue === 'undefined') return false;
       switch (check.condition) {
           case 'isTrue': return currentValue === true;
           case 'isFalse': return currentValue === false;
           case 'greaterThan': return typeof currentValue === 'number' && typeof check.limit === 'number' && currentValue > check.limit;
           default: console.warn(`Condición isPurchasedCheck desconocida: ${check.condition}`); return false;
       }
   }

   private checkItemCanPurchase(itemData: ShopItemJsonData): boolean {
       if (!itemData.purchaseCheck) return true;
       const check = itemData.purchaseCheck;
       const valueRef = check.valueRef;
       const currentValue = (this.playerData as any)[valueRef];
       if (typeof currentValue === 'undefined') {
            console.warn(`Purchase check failed for ${itemData.id}: valueRef '${valueRef}' not found in PlayerData.`);
            return false;
       }
       switch (check.condition) {
           case 'lessThan': return typeof currentValue === 'number' && typeof check.limit === 'number' && currentValue < check.limit;
           case 'lessThanOrEqual': return typeof currentValue === 'number' && typeof check.limit === 'number' && currentValue <= check.limit;
           case 'isFalse': return currentValue === false;
           case 'isTrue': return currentValue === true;
           case 'greaterThan': return typeof currentValue === 'number' && typeof check.limit === 'number' && currentValue > check.limit;
           case 'greaterThanOrEqual': return typeof currentValue === 'number' && typeof check.limit === 'number' && currentValue >= check.limit;
           default: console.warn(`Condición purchaseCheck desconocida: ${check.condition}`); return false;
       }
   }

   private getItemLevel(itemData: ShopItemJsonData): number {
       if (!itemData.isLeveled || !itemData.levelRef) return -1;
       return (this.playerData as any)[itemData.levelRef] ?? 0;
   }

  // --- Ejecutor de Acciones de Compra ---

  /**
   * Ejecuta la acción de compra basada en el ID del ítem, verificando costo y condiciones.
   * @param itemId - El ID del ítem a comprar (ej: 'shield', 'life').
   */
  private executePurchaseAction(itemId: string): boolean { // <-- Cambiado a itemId
      // *** CORRECCIÓN: Obtener itemData usando itemId ***
      const itemData = this.items.get(itemId);
      if (!itemData) {
          console.error(`No se encontró itemData para itemId: ${itemId}`); // Mensaje de error más claro
          return false;
      }
      // ***********************************************

      const cost = this.calculateItemCost(itemData);
      const canAfford = this.playerData.score >= cost;
      const passesCheck = this.checkItemCanPurchase(itemData);
      const level = this.getItemLevel(itemData);
      const isMaxLevel = itemData.isLeveled && typeof itemData.maxLevel === 'number' && level >= itemData.maxLevel;

      if (!canAfford || !passesCheck || isMaxLevel) {
            console.log(`executePurchaseAction ${itemId}: Falló chequeo pre-compra (Afford: ${canAfford}, Check: ${passesCheck}, MaxLevel: ${isMaxLevel})`);
            return false;
      }

      let success = false;
      this.playerData.score -= cost; // Restar costo

      // Usar actionId del itemData para el switch
      const actionId = itemData.actionId;

      switch (actionId) {
          case 'purchaseLife': success = this.purchaseLifeAction(); break;
          case 'purchaseShield': success = this.purchaseShieldAction(); break;
          case 'purchaseHint': success = this.purchaseHintAction(); break;
          case 'purchaseUnlockDrawing': success = this.purchaseUnlockDrawingAction(); break;
          case 'purchaseComboMultiplier': success = this.purchaseComboMultiplierAction(); break;
          case 'purchaseInkCostReduction': success = this.purchaseInkCostReductionAction(); break;
          // Añadir más casos aquí
          default:
              console.error(`Acción de compra desconocida: ${actionId} para ítem ${itemId}`);
              this.playerData.score += cost; // Revertir costo
              success = false;
      }

       if (!success) {
            console.warn(`Acción ${actionId} falló internamente, revirtiendo costo.`);
            this.playerData.score += cost;
       }

      return success;
  }

   private calculateItemCostById(itemId: string): number {
       const itemData = this.items.get(itemId);
       if (!itemData) {
           console.error(`Item ${itemId} no encontrado para calcular costo.`);
           return -1;
       }
       return this.calculateItemCost(itemData);
   }

  // --- Acciones de Compra Reales (Modifican PlayerData o llaman a GameManager) ---

  private purchaseLifeAction(): boolean {
    console.log("ShopManager: Ejecutando compra Vida...");
    this.gameManager.incrementLives();
    return true;
  }

  private purchaseShieldAction(): boolean {
    console.log("ShopManager: Ejecutando compra Escudo...");
    this.playerData.hasShield = true;
    this.gameManager.updateExternalShieldUI(true);
    return true;
  }

  private purchaseHintAction(): boolean {
      console.log("ShopManager: Ejecutando compra Pista...");
      const HINT_CHARGES_PER_PURCHASE = 3;
      this.playerData.hintCharges += HINT_CHARGES_PER_PURCHASE;
      this.gameManager.updateExternalHintUI(this.playerData.hintCharges);
      return true;
  }

  private purchaseUnlockDrawingAction(): boolean {
    console.log("ShopManager: Ejecutando desbloqueo Dibujo...");
    this.playerData.isDrawingUnlocked = true;
    this.gameManager.enableDrawingFeature();
    return true;
  }

  private purchaseComboMultiplierAction(): boolean {
    console.log("ShopManager: Ejecutando compra Mejora Multiplicador Combo...");
    const levelRef = this.items.get('comboMultiplier')?.levelRef;
    if (levelRef && typeof (this.playerData as any)[levelRef] === 'number') {
        (this.playerData as any)[levelRef]++;
        return true;
    } else {
        console.error("Error al comprar Combo Multiplier: levelRef no definido o inválido en PlayerData.");
        return false;
    }
  }

  private purchaseInkCostReductionAction(): boolean {
     console.log("ShopManager: Ejecutando compra Mejora Reducción Costo Tinta...");
     const levelRef = this.items.get('inkCostReduction')?.levelRef;
     if (levelRef && typeof (this.playerData as any)[levelRef] === 'number') {
        (this.playerData as any)[levelRef]++;
        return true;
     } else {
         console.error("Error al comprar Ink Cost Reduction: levelRef no definido o inválido.");
         return false;
     }
  }

} // Fin clase ShopManager
