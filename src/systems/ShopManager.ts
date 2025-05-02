// src/systems/ShopManager.ts

import { ShopItemJsonData } from '../types/ShopItemData';
import { PlayerData } from '../game/PlayerData';
import { GameManager } from '../game/GameManager';
// ELIMINADO: import { QuizGameplayState } from '../game/states/QuizGameplayState'; // No se usaba

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
        console.error("ShopManager: No se encontraron elementos HTML esenciales para la tienda! Verifica los IDs en index.html.");
    }
    console.log("ShopManager: Constructor finalizado.");
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
    this.addCloseListeners();
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

    const transitionDuration = 300; // Debe coincidir con CSS
    // Corrección: Añadir chequeo explícito de null
    setTimeout(() => {
        if (this.shopPopupElement && !this.shopPopupElement.classList.contains('visible')) {
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

     const hoveredItem = this.shopItemsContainerElement?.querySelector('.shop-item:hover');
     if (hoveredItem && this.tooltipElement?.classList.contains('visible')) {
         this.showTooltipForItem((hoveredItem as HTMLElement).dataset.itemId || '');
     }
  }

  private handleItemClick(event: MouseEvent): void {
    const itemElement = event.currentTarget as HTMLElement;
    const itemId = itemElement?.dataset.itemId;

    if (!itemId || !this.items.has(itemId)) {
        console.error("Click en ítem inválido o sin ID.");
        return;
    }
    if (itemElement.classList.contains('disabled')) {
        console.log(`Intento de compra de ítem deshabilitado: ${itemId}`);
        this.showTooltipForItem(itemId);
        return;
    }

    console.log(`Intentando comprar ítem: ${itemId}`);
    const purchaseSuccessful = this.executePurchaseAction(itemId);

    if (purchaseSuccessful) {
        console.log(`Compra exitosa de ${itemId}`);
        this.gameManager.getAudioManager().playSound('purchase');
        // UI y tooltip se actualizan dentro de executePurchaseAction
    } else {
        console.log(`Compra fallida de ${itemId}`);
        // El tooltip ya debería haberse actualizado si falló el pre-check
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
         console.error("ShopManager: Contenedor #shop-items-container no encontrado.");
         return;
     }
     this.shopItemsContainerElement.innerHTML = '';
     this.itemElements.clear();

     const itemsByCategory: { [key: string]: ShopItemJsonData[] } = {};
     this.items.forEach(item => {
         const category = item.category || 'general';
         if (!itemsByCategory[category]) itemsByCategory[category] = [];
         itemsByCategory[category].push(item);
     });

     const categoryOrder = ['consumable', 'unlockable', 'upgradeable', 'general'];

     categoryOrder.forEach(category => {
        if (itemsByCategory[category]) {
            const sectionTitle = document.createElement('h3');
            sectionTitle.className = 'shop-section-title';
            sectionTitle.textContent = this.formatCategoryTitle(category);
            this.shopItemsContainerElement!.appendChild(sectionTitle);

            const categoryItemsContainer = document.createElement('div');
            categoryItemsContainer.className = 'shop-section-items';
            this.shopItemsContainerElement!.appendChild(categoryItemsContainer);

            itemsByCategory[category].sort((a, b) => a.name.localeCompare(b.name));

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
     });
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
          this.backdropClickListener = (event: MouseEvent) => {
              if (event.target === this.shopPopupElement) { this.closeShop(); }
          };
          this.shopPopupElement.addEventListener('click', this.backdropClickListener);
      }
  }

  public destroy(): void {
       console.log("ShopManager: Destruyendo...");
       if (this.closeButtonListener && this.shopCloseButtonElement) {
           this.shopCloseButtonElement.removeEventListener('click', this.closeButtonListener);
           this.closeButtonListener = null;
       }
       if (this.backdropClickListener && this.shopPopupElement) {
           this.shopPopupElement.removeEventListener('click', this.backdropClickListener);
           this.backdropClickListener = null;
       }
       this.itemElements.forEach(itemElement => {
            const clone = itemElement.cloneNode(true);
            itemElement.parentNode?.replaceChild(clone, itemElement);
       });
       this.itemElements.clear();
       console.log("ShopManager: Listeners limpiados.");
  }

  // --- Funciones Helper ---

  private calculateItemCost(itemData: ShopItemJsonData): number {
      const costParams = itemData.cost;
      let cost = costParams.base;
      if (itemData.isLeveled) {
          const levelRef = itemData.levelRef;
          const currentLevel = levelRef ? (this.playerData as any)[levelRef] ?? 0 : 0;
          if (costParams.type === 'exponential' && typeof costParams.multiplier === 'number') {
              cost = costParams.base * Math.pow(costParams.multiplier, currentLevel);
          } else { cost = costParams.base + (costParams.perLevel ?? 0) * currentLevel; }
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
            text = text.replace('{charges}', charges > 0 ? `(Cargas: ${charges})` : '');
       }
       if (text.includes('{currentValue}')) {
           let currentValue: string | number = '?';
           if (itemData.id === 'comboMultiplier') { currentValue = this.playerData.getCurrentComboMultiplier().toFixed(1); }
           else if (itemData.id === 'inkCostReduction') { currentValue = this.playerData.getCurrentInkCostPerPixel().toFixed(2); }
           else if (itemData.id === 'extraCat') { currentValue = this.playerData.getCatsPerCorrectAnswer(); }
           else if (itemData.id === 'maxCats') { currentValue = this.playerData.getMaxCatsAllowed(); }
           else if (itemData.id === 'maxCatSize') { currentValue = this.playerData.getCurrentMaxSizeLimit(); }
           else if (itemData.id === 'refillCatFood') { currentValue = this.playerData.currentCatFood; }
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
           default: return false;
       }
   }

  private checkItemCanPurchase(itemData: ShopItemJsonData): boolean {
       if (!itemData.purchaseCheck) return true;
       const check = itemData.purchaseCheck;
       const valueRef = check.valueRef;
       const currentValue = (this.playerData as any)[valueRef];
       if (typeof currentValue === 'undefined') {
            console.warn(`Purchase check failed for ${itemData.id}: valueRef '${valueRef}' not found.`);
            return false;
       }
       switch (check.condition) {
           case 'lessThan': return typeof currentValue === 'number' && typeof check.limit === 'number' && currentValue < check.limit;
           case 'lessThanOrEqual': return typeof currentValue === 'number' && typeof check.limit === 'number' && currentValue <= check.limit;
           case 'isFalse': return currentValue === false;
           case 'isTrue': return currentValue === true;
           case 'greaterThan': return typeof currentValue === 'number' && typeof check.limit === 'number' && currentValue > check.limit;
           case 'greaterThanOrEqual': return typeof currentValue === 'number' && typeof check.limit === 'number' && currentValue >= check.limit;
           default: return false;
       }
   }

   private getItemLevel(itemData: ShopItemJsonData): number {
       if (!itemData.isLeveled || !itemData.levelRef) return -1;
       return (this.playerData as any)[itemData.levelRef] ?? 0;
   }

   // ELIMINADO: Función calculateItemCostById no se usaba
   // private calculateItemCostById(itemId: string): number {
   //     const itemData = this.items.get(itemId);
   //     if (!itemData) return -1;
   //     return this.calculateItemCost(itemData);
   // }


// --- Ejecutor de Acciones de Compra ---
private executePurchaseAction(itemId: string): boolean {
    const itemData = this.items.get(itemId);
    if (!itemData) {
        console.error(`ShopManager: No se encontró itemData para el ID '${itemId}'`);
        return false;
    }

    const cost = this.calculateItemCost(itemData);
    const canAfford = this.playerData.score >= cost;
    const passesCheck = this.checkItemCanPurchase(itemData);
    const level = this.getItemLevel(itemData);
    const isMaxLevel = itemData.isLeveled && typeof itemData.maxLevel === 'number' && level >= itemData.maxLevel;

    if (!canAfford || !passesCheck || isMaxLevel) {
        console.log(`ShopManager executePurchaseAction(${itemId}): Pre-check fallido (Afford:${canAfford}, Check:${passesCheck}, MaxLevel:${isMaxLevel})`);
        this.showTooltipForItem(itemId);
        return false;
    }

    // --- Cobrar ANTES de intentar la acción ---
    this.playerData.score -= cost;
    console.log(`ShopManager: Puntos deducidos (${cost}). Puntos restantes: ${this.playerData.score}`);
    this.gameManager.updateExternalScoreUI(); // <--- LLAMADA AÑADIDA AQUÍ

    let success = false;
    const actionId = itemData.actionId;
    console.log(`ShopManager: Ejecutando acción '${actionId}' para item '${itemId}'...`);

    try {
        switch (actionId) {
            case 'purchaseLife':            success = this.purchaseLifeAction(); break;
            case 'purchaseShield':          success = this.purchaseShieldAction(); break;
            case 'purchaseHint':            success = this.purchaseHintAction(); break;
            case 'purchaseUnlockDrawing':   success = this.purchaseUnlockDrawingAction(); break;
            case 'purchaseUnlockCatFood':   success = this.purchaseUnlockCatFoodAction(); break;
            case 'purchaseRefillCatFood':   success = this.purchaseRefillCatFoodAction(); break;
            case 'purchaseComboMultiplier': success = this.purchaseComboMultiplierAction(); break;
            case 'purchaseInkCostReduction':success = this.purchaseInkCostReductionAction(); break;
            case 'purchaseExtraCatSpawn':   success = this.purchaseExtraCatSpawnAction(); break;
            case 'purchaseMaxCatsIncrease': success = this.purchaseMaxCatsIncreaseAction(); break;
            case 'purchaseMaxCatSize':      success = this.purchaseMaxCatSizeAction(); break;
            default:
                console.error(`ShopManager: Acción de compra desconocida: ${actionId} para item ${itemId}`);
                success = false;
        }
    } catch (error) {
         console.error(`ShopManager: Error ejecutando la acción ${actionId} para ${itemId}:`, error);
         success = false;
    }

    // --- Revertir costo si la acción falló ---
    if (!success) {
         console.warn(`ShopManager: La acción ${actionId} para ${itemId} falló. Revirtiendo costo.`);
         this.playerData.score += cost;
         this.gameManager.updateExternalScoreUI(); // <--- ACTUALIZAR TAMBIÉN AL REVERTIR
         this.updateShopUI();
         this.showTooltipForItem(itemId);
    } else {
         console.log(`ShopManager: Acción ${actionId} para ${itemId} completada exitosamente.`);
         this.gameManager.getAudioManager().playSound('purchase');
         this.updateShopUI();
         this.showTooltipForItem(itemId);
    }

    // Actualizar siempre la puntuación visible en la tienda
    if (this.shopPlayerScoreElement) {
        this.shopPlayerScoreElement.textContent = `Puntos: ${this.playerData.score}`;
    }

    return success;
}


// --- Implementaciones de Acciones de Compra Reales ---

/** Acción para comprar una vida. */
private purchaseLifeAction(): boolean {
    this.playerData.lives++;
    this.gameManager.updateExternalLivesUI();
    console.log(` -> Vida comprada. Vidas actuales: ${this.playerData.lives}`);
    return true;
}

/** Acción para comprar un escudo. */
private purchaseShieldAction(): boolean {
    this.playerData.hasShield = true;
    this.gameManager.updateExternalShieldUI(true);
    console.log(` -> Escudo comprado. Estado: ${this.playerData.hasShield}`);
    return true;
}

/** Acción para comprar una pista. */
private purchaseHintAction(): boolean {
    this.playerData.hintCharges++;
    this.gameManager.updateExternalHintUI(this.playerData.hintCharges);
    console.log(` -> Pista comprada. Cargas: ${this.playerData.hintCharges}`);
    return true;
}

/** Acción para desbloquear la función de dibujo. */
private purchaseUnlockDrawingAction(): boolean {
    console.log("ShopManager: Executing purchaseUnlockDrawingAction...");
    if (this.playerData.isDrawingUnlocked) {
         console.log(" -> Drawing ya desbloqueado. Acción abortada.");
         return false;
    }

    this.playerData.isDrawingUnlocked = true;
    console.log(`[ShopManager] Bandera isDrawingUnlocked establecida a: ${this.playerData.isDrawingUnlocked}`);

    let activationSuccessful = false;
    try {
         activationSuccessful = this.gameManager.enableDrawingFeature();
         console.log(` -> gameManager.enableDrawingFeature() returned: ${activationSuccessful}`);
    } catch (e) {
         console.error(" -> Error caught calling gameManager.enableDrawingFeature():", e);
         activationSuccessful = false;
    }

    if (!activationSuccessful) {
        console.error(" -> Activation FAILED. Reverting playerData.isDrawingUnlocked a false.");
        this.playerData.isDrawingUnlocked = false;
        return false;
    }

    console.log(` -> Activation successful. isDrawingUnlocked permanece: ${this.playerData.isDrawingUnlocked}`);
    return true;
}
/** Acción para mejorar el multiplicador de combo. */
private purchaseComboMultiplierAction(): boolean {
    this.playerData.comboMultiplierLevel++;
    console.log(` -> Nivel Multiplicador Combo incrementado a: ${this.playerData.comboMultiplierLevel}`);
    return true;
}

/** Acción para mejorar la reducción del costo de tinta. */
private purchaseInkCostReductionAction(): boolean {
    this.playerData.inkCostReductionLevel++;
    console.log(` -> Nivel Reducción Costo Tinta incrementado a: ${this.playerData.inkCostReductionLevel}`);
    this.gameManager.updateInkUI();
    return true;
}

/** Acción para mejorar los gatos extra por acierto. */
private purchaseExtraCatSpawnAction(): boolean {
    this.playerData.extraCatSpawnLevel++;
    console.log(` -> Nivel Gato Extra por Acierto incrementado a: ${this.playerData.extraCatSpawnLevel}`);
    return true;
}

/** Acción para aumentar el límite máximo de gatos. */
private purchaseMaxCatsIncreaseAction(): boolean {
    this.playerData.maxCatsLevel++;
    console.log(` -> Nivel Límite Máximo Gatos incrementado a: ${this.playerData.maxCatsLevel}`);
    return true;
}

/** Acción para aumentar el tamaño máximo de los gatos. */
private purchaseMaxCatSizeAction(): boolean {
    this.playerData.maxCatSizeLevel++;
    console.log(` -> Nivel Tamaño Máximo Gato incrementado a: ${this.playerData.maxCatSizeLevel}`);
    return true;
    }

  private purchaseUnlockCatFoodAction(): boolean {
      console.log("ShopManager: Executing purchaseUnlockCatFoodAction...");
      if (this.playerData.isCatFoodUnlocked) { return false; }
      this.playerData.isCatFoodUnlocked = true;
      this.playerData.refillCatFood();
      this.gameManager.enableCatFoodFeature();
      console.log(" -> Cat Food feature unlocked and refilled.");
      return true;
  }

  private purchaseRefillCatFoodAction(): boolean {
      console.log("ShopManager: Executing purchaseRefillCatFoodAction...");
      if (this.playerData.currentCatFood >= this.playerData.getMaxCatFood()) {
          console.log(" -> Cat food is already full.");
          return false;
      }
      this.playerData.refillCatFood();
      this.gameManager.updateCatFoodUI();
      return true;
  }

} // Fin Clase ShopManager