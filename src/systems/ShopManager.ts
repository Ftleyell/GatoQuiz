// src/systems/ShopManager.ts

import { ShopItemJsonData } from '../types/ShopItemData';
import { PlayerData } from '../game/PlayerData';
import { GameManager } from '../game/GameManager';

// IDs de Elementos (sin cambios)
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

// Ajuste: Tipo para listeners de cierre
type CloseListenerInfo = {
    click: (event: MouseEvent) => void;
    touchstart?: (event: TouchEvent) => void;
};

export class ShopManager {
  private items: Map<string, ShopItemJsonData> = new Map();
  private playerData: PlayerData;
  private gameManager: GameManager;
  // Ajuste: Mapa para listeners de ítems (similar a UIManager)
  private itemListeners: Map<HTMLElement, { click: (e: MouseEvent) => void; touchstart?: (e: TouchEvent) => void }> = new Map();
  private itemElements: Map<string, HTMLElement> = new Map(); // Mantenemos este mapa

  // Elementos UI (sin cambios)
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

  // Ajuste: Tipo para listeners de cierre
  private closeButtonListeners: CloseListenerInfo | null = null;
  private backdropClickListeners: CloseListenerInfo | null = null;

  constructor(playerData: PlayerData, gameManager: GameManager) {
    console.log("ShopManager: Constructor iniciado.");
    this.playerData = playerData;
    this.gameManager = gameManager;

    // Obtener referencias (sin cambios)
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
    console.log("ShopManager: Constructor finalizado.");
  }

  public init(itemJsonData: any[]): void {
    // ... (procesamiento de JSON sin cambios) ...
    console.log("ShopManager: init - Procesando datos JSON de ítems...");
    this.items.clear();
    if (!Array.isArray(itemJsonData)) {
        console.error("ShopManager: Datos de ítems de tienda inválidos."); return;
    }
    itemJsonData.forEach(itemData => {
        if (itemData?.id && typeof itemData.id === 'string') {
            this.items.set(itemData.id, itemData as ShopItemJsonData);
        } else { console.warn("ShopManager: Ítem inválido o sin ID.", itemData); }
    });
    console.log(`ShopManager: ${this.items.size} ítems procesados.`);
    this.createShopItemElements(); // Ahora añade listeners de touch también
    this.addCloseListeners(); // Ahora añade listeners de touch también
    console.log("ShopManager: Listeners de ítems y cierre añadidos.");
  }

  // openShop, closeShop, updateShopUI (sin cambios funcionales)
  public openShop(): void {
    console.log("ShopManager: Abriendo tienda...");
    if (!this.shopPopupElement) return;
    this.updateShopUI();
    this.shopPopupElement.style.display = 'flex';
    void this.shopPopupElement.offsetHeight;
    this.shopPopupElement.classList.add('visible');
    // Asegurar que el backdrop de blur esté visible
    const backdrop = document.getElementById('blur-backdrop');
    if (backdrop) {
        backdrop.style.display = 'block';
        void backdrop.offsetHeight;
        backdrop.classList.add('visible');
    }
  }

  public closeShop(): void {
    console.log("ShopManager: Cerrando tienda...");
    if (!this.shopPopupElement) return;
    this.hideTooltip();
    this.shopPopupElement.classList.remove('visible');
    // Ocultar backdrop si no hay otros overlays visibles
    const backdrop = document.getElementById('blur-backdrop');
    const explanationOverlay = document.getElementById('explanation-overlay');
    if (backdrop && (!explanationOverlay || !explanationOverlay.classList.contains('visible'))) {
        backdrop.classList.remove('visible');
    }
    const transitionDuration = 300;
    setTimeout(() => {
        if (this.shopPopupElement && !this.shopPopupElement.classList.contains('visible')) {
            this.shopPopupElement.style.display = 'none';
            if (backdrop && !backdrop.classList.contains('visible')) {
                backdrop.style.display = 'none';
            }
        }
    }, transitionDuration);
  }

  public updateShopUI(): void {
     // ... (lógica interna de updateShopUI sin cambios) ...
     if (!this.playerData) return;
     if (this.shopPlayerScoreElement) { this.shopPlayerScoreElement.textContent = `Puntos: ${this.playerData.score}`; }
     this.itemElements.forEach((itemElement, itemId) => {
         const itemData = this.items.get(itemId); if (!itemData) return;
         const cost = this.calculateItemCost(itemData);
         const isAffordable = this.playerData.score >= cost;
         const isPurchased = this.checkItemIsPurchased(itemData);
         const canPurchase = this.checkItemCanPurchase(itemData);
         const level = this.getItemLevel(itemData);
         const isMaxLevel = itemData.isLeveled && typeof itemData.maxLevel === 'number' && level >= itemData.maxLevel;
         itemElement.classList.remove('disabled', 'purchased', 'max-level');
         if (isMaxLevel) { itemElement.classList.add('max-level', 'disabled'); }
         else if (isPurchased && !itemData.isLeveled) { itemElement.classList.add('purchased', 'disabled'); }
         else if (!canPurchase || !isAffordable) { itemElement.classList.add('disabled'); }
     });
      const hoveredItem = this.shopItemsContainerElement?.querySelector('.shop-item:hover');
      if (hoveredItem && this.tooltipElement?.classList.contains('visible')) {
          this.showTooltipForItem((hoveredItem as HTMLElement).dataset.itemId || '');
      }
  }

  // --- Modificación: Manejador unificado para click/touch en ítems ---
  private handleItemInteraction(event: MouseEvent | TouchEvent): void {
      const itemElement = event.currentTarget as HTMLElement;
      const itemId = itemElement?.dataset.itemId;

      // Prevenir comportamiento táctil por defecto si es touch
      if (event.type === 'touchstart') {
          event.preventDefault();
      }

      if (!itemId || !this.items.has(itemId)) {
          console.error("Interacción en ítem inválido o sin ID.");
          return;
      }
      if (itemElement.classList.contains('disabled')) {
          console.log(`Intento de compra de ítem deshabilitado: ${itemId}`);
          this.showTooltipForItem(itemId); // Mostrar tooltip al tocar deshabilitado
          return;
      }

      console.log(`Intentando comprar ítem: ${itemId}`);
      const purchaseSuccessful = this.executePurchaseAction(itemId);

      if (purchaseSuccessful) {
          console.log(`Compra exitosa de ${itemId}`);
          // La UI y tooltip se actualizan en executePurchaseAction
          // Sonido se reproduce en executePurchaseAction
      } else {
          console.log(`Compra fallida de ${itemId}`);
          // El tooltip ya debería haberse actualizado si falló el pre-check
      }
  }
  // --- Fin Modificación ---

  // handleItemMouseOver y hideTooltip sin cambios funcionales
  private handleItemMouseOver(event: MouseEvent): void {
    const itemElement = event.currentTarget as HTMLElement;
    const itemId = itemElement?.dataset.itemId;
    if (itemId) { this.showTooltipForItem(itemId); }
  }
  private hideTooltip(): void {
      if (this.tooltipElement) { this.tooltipElement.classList.remove('visible'); }
  }

  // showTooltipForItem sin cambios funcionales
  private showTooltipForItem(itemId: string): void {
    const itemData = this.items.get(itemId);
    if (!itemData || !this.tooltipElement || !this.playerData || !this.tooltipNameElement || !this.tooltipEffectElement || !this.tooltipLevelElement || !this.tooltipCostElement || !this.tooltipStatusElement) {
        this.hideTooltip(); return;
    }
    const cost = this.calculateItemCost(itemData); const isAffordable = this.playerData.score >= cost; const isPurchased = this.checkItemIsPurchased(itemData); const canPurchase = this.checkItemCanPurchase(itemData); const level = this.getItemLevel(itemData); const isMaxLevel = itemData.isLeveled && typeof itemData.maxLevel === 'number' && level >= itemData.maxLevel; const effectText = this.formatEffectText(itemData);
    this.tooltipNameElement.textContent = itemData.name; this.tooltipEffectElement.textContent = effectText;
    if (itemData.isLeveled && level >= 0) { this.tooltipLevelElement.textContent = `Nivel: ${level}`; this.tooltipLevelElement.classList.remove('hidden'); } else { this.tooltipLevelElement.classList.add('hidden'); }
    this.tooltipCostElement.textContent = isMaxLevel ? "Nivel Máximo" : `Costo: ${cost}`;
    let statusText = ''; if (isMaxLevel) { statusText = "Nivel Máximo Alcanzado"; } else if (isPurchased && !itemData.isLeveled) { statusText = "Ya comprado / Activo"; } else if (!canPurchase && !isMaxLevel) { statusText = "No disponible"; } else if (!isAffordable) { statusText = "Puntos insuficientes"; }
    if (statusText) { this.tooltipStatusElement.textContent = statusText; this.tooltipStatusElement.classList.remove('hidden'); } else { this.tooltipStatusElement.classList.add('hidden'); }
    this.tooltipElement.classList.add('visible');
  }

  private createShopItemElements(): void {
     if (!this.shopItemsContainerElement) return;
     this.shopItemsContainerElement.innerHTML = '';
     this.itemElements.clear();
     this.itemListeners.clear(); // Limpiar listeners antiguos

     const itemsByCategory: { [key: string]: ShopItemJsonData[] } = {};
     this.items.forEach(item => { /* ... (agrupación por categoría sin cambios) ... */
         const category = item.category || 'general';
         if (!itemsByCategory[category]) itemsByCategory[category] = [];
         itemsByCategory[category].push(item);
     });
     const categoryOrder = ['consumable', 'unlockable', 'upgradeable', 'general'];

     categoryOrder.forEach(category => {
        if (itemsByCategory[category]) {
            // ... (creación de títulos de sección sin cambios) ...
            const sectionTitle = document.createElement('h3');
            sectionTitle.className = 'shop-section-title';
            sectionTitle.textContent = this.formatCategoryTitle(category);
            this.shopItemsContainerElement!.appendChild(sectionTitle);
            const categoryItemsContainer = document.createElement('div');
            categoryItemsContainer.className = 'shop-section-items';
            this.shopItemsContainerElement!.appendChild(categoryItemsContainer);
            itemsByCategory[category].sort((a, b) => a.name.localeCompare(b.name));

            itemsByCategory[category].forEach(itemData => {
                // ... (creación de itemElement y iconElement sin cambios) ...
                const itemElement = document.createElement('div');
                itemElement.className = 'shop-item';
                itemElement.dataset.itemId = itemData.id;
                const iconElement = document.createElement('span');
                iconElement.className = 'shop-item-icon';
                iconElement.textContent = itemData.icon || '❓';
                itemElement.appendChild(iconElement);

                // --- Modificación: Añadir listeners click y touch ---
                const interactionHandler = (e: MouseEvent | TouchEvent) => this.handleItemInteraction(e);
                const itemL: { click: (e: MouseEvent) => void; touchstart?: (e: TouchEvent) => void } = {
                    click: interactionHandler,
                    touchstart: interactionHandler
                };
                itemElement.addEventListener('click', itemL.click);
                itemElement.addEventListener('touchstart', itemL.touchstart!, { passive: false }); // Añadir touchstart
                // --- Fin Modificación ---

                // Listeners de hover/out para tooltip (sin cambios)
                itemElement.addEventListener('mouseover', (e) => this.handleItemMouseOver(e));
                itemElement.addEventListener('mouseout', () => this.hideTooltip());

                categoryItemsContainer.appendChild(itemElement);
                this.itemElements.set(itemData.id, itemElement);
                this.itemListeners.set(itemElement, itemL); // Guardar referencia a listeners
            });
         }
     });
     this.updateShopUI();
  }

  // formatCategoryTitle (sin cambios)
  private formatCategoryTitle(categoryKey: string): string {
      if (categoryKey === 'consumable') return 'Consumibles';
      if (categoryKey === 'unlockable') return 'Desbloqueables';
      if (categoryKey === 'upgradeable') return 'Mejorables';
      return 'General';
  }

  // --- Modificación: Añadir listeners de touch para cierre ---
  private addCloseListeners(): void {
      // Handler unificado para cierre
      const handleCloseInteraction = (event: MouseEvent | TouchEvent) => {
          // Prevenir comportamiento por defecto solo en touch en el backdrop
          if (event.type === 'touchstart' && event.target === this.shopPopupElement) {
               event.preventDefault();
          }
          // Verificar si el click/touch fue en el backdrop o en el botón de cierre
          if (event.target === this.shopPopupElement || event.currentTarget === this.shopCloseButtonElement) {
               this.closeShop();
          }
      };

      // Botón de Cierre ('X')
      if (this.shopCloseButtonElement) {
          this.closeButtonListeners = {
              click: handleCloseInteraction,
              touchstart: handleCloseInteraction
          };
          this.shopCloseButtonElement.addEventListener('click', this.closeButtonListeners.click);
          this.shopCloseButtonElement.addEventListener('touchstart', this.closeButtonListeners.touchstart!, { passive: false });
      } else { console.warn("ShopManager: Botón de cierre no encontrado."); }

      // Backdrop (Click/Tap fuera del contenido)
      if (this.shopPopupElement) {
          this.backdropClickListeners = {
              click: handleCloseInteraction,
              touchstart: handleCloseInteraction
          };
          this.shopPopupElement.addEventListener('click', this.backdropClickListeners.click);
          this.shopPopupElement.addEventListener('touchstart', this.backdropClickListeners.touchstart!, { passive: false });
      }
  }
  // --- Fin Modificación ---


  // --- Modificación: Limpiar listeners de touch ---
  public destroy(): void {
       console.log("ShopManager: Destruyendo...");
       // Limpiar listeners de cierre
       if (this.closeButtonListeners && this.shopCloseButtonElement) {
           this.shopCloseButtonElement.removeEventListener('click', this.closeButtonListeners.click);
           if (this.closeButtonListeners.touchstart) this.shopCloseButtonElement.removeEventListener('touchstart', this.closeButtonListeners.touchstart);
           this.closeButtonListeners = null;
       }
       if (this.backdropClickListeners && this.shopPopupElement) {
           this.shopPopupElement.removeEventListener('click', this.backdropClickListeners.click);
            if (this.backdropClickListeners.touchstart) this.shopPopupElement.removeEventListener('touchstart', this.backdropClickListeners.touchstart);
           this.backdropClickListeners = null;
       }

       // Limpiar listeners de ítems
       this.itemListeners.forEach((listeners, itemElement) => {
            if (itemElement && itemElement.isConnected) { // Verificar si el elemento todavía está en el DOM
                itemElement.removeEventListener('click', listeners.click);
                if (listeners.touchstart) itemElement.removeEventListener('touchstart', listeners.touchstart);
                // Remover también listeners de hover/out
                // Nota: Esto puede ser menos crítico, pero es buena práctica
                itemElement.removeEventListener('mouseover', this.handleItemMouseOver); // Asumiendo que se añadió así
                itemElement.removeEventListener('mouseout', this.hideTooltip); // Asumiendo que se añadió así
            }
       });
       this.itemListeners.clear();
       this.itemElements.clear(); // Limpiar mapa de elementos también
       console.log("ShopManager: Listeners limpiados.");
  }
  // --- Fin Modificación ---

  // --- Funciones Helper (calculateItemCost, formatEffectText, etc. sin cambios) ---
  private calculateItemCost(itemData: ShopItemJsonData): number { /* ... */
      const costParams = itemData.cost; let cost = costParams.base;
      if (itemData.isLeveled) { const levelRef = itemData.levelRef; const currentLevel = levelRef ? (this.playerData as any)[levelRef] ?? 0 : 0; if (costParams.type === 'exponential' && typeof costParams.multiplier === 'number') { cost = costParams.base * Math.pow(costParams.multiplier, currentLevel); } else { cost = costParams.base + (costParams.perLevel ?? 0) * currentLevel; } } else if (costParams.levelRef && typeof costParams.perLevel === 'number') { const linkedLevel = (this.playerData as any)[costParams.levelRef] ?? 0; cost = costParams.base + costParams.perLevel * linkedLevel; } return Math.round(cost);
   }
  private formatEffectText(itemData: ShopItemJsonData): string { /* ... */
       let text = itemData.effectTemplate; text = text.replace('{lives}', this.playerData.lives.toString());
       if (text.includes('{isActive}')) { const valueRef = itemData.isPurchasedCheck?.valueRef; const isActive = valueRef ? !!(this.playerData as any)[valueRef] : false; text = text.replace('{isActive}', isActive ? '(Activo)' : ''); }
       if (text.includes('{isUnlocked}')) { const valueRef = itemData.isPurchasedCheck?.valueRef; const isUnlocked = valueRef ? !!(this.playerData as any)[valueRef] : false; text = text.replace('{isUnlocked}', isUnlocked ? '(Desbloqueado)' : ''); }
       if (text.includes('{charges}')) { const valueRef = itemData.isPurchasedCheck?.valueRef; const charges = valueRef ? (this.playerData as any)[valueRef] ?? 0 : 0; text = text.replace('{charges}', charges > 0 ? `(Cargas: ${charges})` : ''); }
       if (text.includes('{currentValue}')) { let currentValue: string | number = '?'; if (itemData.id === 'comboMultiplier') { currentValue = this.playerData.getCurrentComboMultiplier().toFixed(1); } else if (itemData.id === 'inkCostReduction') { currentValue = this.playerData.getCurrentInkCostPerPixel().toFixed(2); } else if (itemData.id === 'extraCat') { currentValue = this.playerData.getCatsPerCorrectAnswer(); } else if (itemData.id === 'maxCats') { currentValue = this.playerData.getMaxCatsAllowed(); } else if (itemData.id === 'maxCatSize') { currentValue = this.playerData.getCurrentMaxSizeLimit(); } else if (itemData.id === 'refillCatFood') { currentValue = this.playerData.currentCatFood; } text = text.replace('{currentValue}', currentValue.toString()); } return text;
   }
   private checkItemIsPurchased(itemData: ShopItemJsonData): boolean { /* ... */
       if (!itemData.isPurchasedCheck) return false; const check = itemData.isPurchasedCheck; const valueRef = check.valueRef; const currentValue = (this.playerData as any)[valueRef]; if (typeof currentValue === 'undefined') return false; switch (check.condition) { case 'isTrue': return currentValue === true; case 'isFalse': return currentValue === false; case 'greaterThan': return typeof currentValue === 'number' && typeof check.limit === 'number' && currentValue > check.limit; default: return false; }
   }
  private checkItemCanPurchase(itemData: ShopItemJsonData): boolean { /* ... */
       if (!itemData.purchaseCheck) return true; const check = itemData.purchaseCheck; const valueRef = check.valueRef; const currentValue = (this.playerData as any)[valueRef]; if (typeof currentValue === 'undefined') { console.warn(`Purchase check failed for ${itemData.id}: valueRef '${valueRef}' not found.`); return false; } switch (check.condition) { case 'lessThan': return typeof currentValue === 'number' && typeof check.limit === 'number' && currentValue < check.limit; case 'lessThanOrEqual': return typeof currentValue === 'number' && typeof check.limit === 'number' && currentValue <= check.limit; case 'isFalse': return currentValue === false; case 'isTrue': return currentValue === true; case 'greaterThan': return typeof currentValue === 'number' && typeof check.limit === 'number' && currentValue > check.limit; case 'greaterThanOrEqual': return typeof currentValue === 'number' && typeof check.limit === 'number' && currentValue >= check.limit; default: return false; }
   }
   private getItemLevel(itemData: ShopItemJsonData): number { /* ... */
       if (!itemData.isLeveled || !itemData.levelRef) return -1; return (this.playerData as any)[itemData.levelRef] ?? 0;
   }
  private executePurchaseAction(itemId: string): boolean { /* ... (sin cambios en la lógica interna de acciones) ... */
    const itemData = this.items.get(itemId); if (!itemData) { console.error(`ShopManager: No itemData for ID '${itemId}'`); return false; }
    const cost = this.calculateItemCost(itemData); const canAfford = this.playerData.score >= cost; const passesCheck = this.checkItemCanPurchase(itemData); const level = this.getItemLevel(itemData); const isMaxLevel = itemData.isLeveled && typeof itemData.maxLevel === 'number' && level >= itemData.maxLevel;
    if (!canAfford || !passesCheck || isMaxLevel) { this.showTooltipForItem(itemId); return false; }
    this.playerData.score -= cost; console.log(`ShopManager: Deduced ${cost}. Remaining: ${this.playerData.score}`); this.gameManager.updateExternalScoreUI();
    let success = false; const actionId = itemData.actionId; console.log(`ShopManager: Executing '${actionId}' for item '${itemId}'...`);
    try { switch (actionId) {
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
            default: console.error(`ShopManager: Unknown action: ${actionId}`); success = false; }
    } catch (error) { console.error(`ShopManager: Error executing ${actionId}:`, error); success = false; }
    if (!success) { console.warn(`ShopManager: Action ${actionId} failed. Reverting cost.`); this.playerData.score += cost; this.gameManager.updateExternalScoreUI(); }
    else { console.log(`ShopManager: Action ${actionId} successful.`); this.gameManager.getAudioManager().playSound('purchase'); }
    this.updateShopUI(); this.showTooltipForItem(itemId);
    if (this.shopPlayerScoreElement) { this.shopPlayerScoreElement.textContent = `Puntos: ${this.playerData.score}`; } return success;
  }
  // Implementaciones de acciones de compra (purchaseLifeAction, etc. sin cambios)
  private purchaseLifeAction(): boolean { this.playerData.lives++; this.gameManager.updateExternalLivesUI(); console.log(` -> Life purchased. Current: ${this.playerData.lives}`); return true; }
  private purchaseShieldAction(): boolean { this.playerData.hasShield = true; this.gameManager.updateExternalShieldUI(true); console.log(` -> Shield purchased. Status: ${this.playerData.hasShield}`); return true; }
  private purchaseHintAction(): boolean { this.playerData.hintCharges++; this.gameManager.updateExternalHintUI(this.playerData.hintCharges); console.log(` -> Hint purchased. Charges: ${this.playerData.hintCharges}`); return true; }
  private purchaseUnlockDrawingAction(): boolean { console.log("ShopManager: Executing purchaseUnlockDrawingAction..."); if (this.playerData.isDrawingUnlocked) { console.log(" -> Drawing already unlocked."); return false; } this.playerData.isDrawingUnlocked = true; let activationSuccessful = false; try { activationSuccessful = this.gameManager.enableDrawingFeature(); console.log(` -> enableDrawingFeature returned: ${activationSuccessful}`); } catch (e) { console.error(" -> Error calling enableDrawingFeature:", e); activationSuccessful = false; } if (!activationSuccessful) { console.error(" -> Activation FAILED. Reverting."); this.playerData.isDrawingUnlocked = false; return false; } console.log(` -> Activation successful.`); return true; }
  private purchaseComboMultiplierAction(): boolean { this.playerData.comboMultiplierLevel++; console.log(` -> Combo Multiplier Lvl: ${this.playerData.comboMultiplierLevel}`); return true; }
  private purchaseInkCostReductionAction(): boolean { this.playerData.inkCostReductionLevel++; console.log(` -> Ink Cost Reduction Lvl: ${this.playerData.inkCostReductionLevel}`); this.gameManager.updateInkUI(); return true; }
  private purchaseExtraCatSpawnAction(): boolean { this.playerData.extraCatSpawnLevel++; console.log(` -> Extra Cat Spawn Lvl: ${this.playerData.extraCatSpawnLevel}`); return true; }
  private purchaseMaxCatsIncreaseAction(): boolean { this.playerData.maxCatsLevel++; console.log(` -> Max Cats Lvl: ${this.playerData.maxCatsLevel}`); return true; }
  private purchaseMaxCatSizeAction(): boolean { this.playerData.maxCatSizeLevel++; console.log(` -> Max Cat Size Lvl: ${this.playerData.maxCatSizeLevel}`); return true; }
  private purchaseUnlockCatFoodAction(): boolean { console.log("ShopManager: Executing purchaseUnlockCatFoodAction..."); if (this.playerData.isCatFoodUnlocked) { return false; } this.playerData.isCatFoodUnlocked = true; this.playerData.refillCatFood(); this.gameManager.enableCatFoodFeature(); console.log(" -> Cat Food unlocked and refilled."); return true; }
  private purchaseRefillCatFoodAction(): boolean { console.log("ShopManager: Executing purchaseRefillCatFoodAction..."); if (this.playerData.currentCatFood >= this.playerData.getMaxCatFood()) { console.log(" -> Cat food already full."); return false; } this.playerData.refillCatFood(); this.gameManager.updateCatFoodUI(); return true; }

} // Fin Clase ShopManager