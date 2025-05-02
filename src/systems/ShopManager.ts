// src/systems/ShopManager.ts

import { ShopItemJsonData } from '../types/ShopItemData';
import { PlayerData } from '../game/PlayerData';
import { GameManager } from '../game/GameManager';
import { QuizGameplayState } from '../game/states/QuizGameplayState';

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

  /**
   * Inicializa la tienda procesando los datos JSON, creando los elementos HTML
   * y añadiendo los listeners necesarios.
   * @param itemJsonData - Array de objetos ShopItemJsonData cargados desde el JSON.
   */
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

  /** Abre el popup de la tienda. */
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

  /** Cierra el popup de la tienda. */
  public closeShop(): void {
    console.log("ShopManager: Cerrando tienda...");
    if (!this.shopPopupElement) return;

    this.hideTooltip();
    this.shopPopupElement.classList.remove('visible');

    const transitionDuration = 300; // Debe coincidir con CSS
    setTimeout(() => {
        if (!this.shopPopupElement?.classList.contains('visible')) {
            this.shopPopupElement.style.display = 'none';
        }
    }, transitionDuration);
  }

  /** Actualiza la UI de la tienda (puntuación y estado de los ítems). */
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

  /** Manejador de clic para un ítem de la tienda. */
  private handleItemClick(event: MouseEvent): void {
    const itemElement = event.currentTarget as HTMLElement;
    const itemId = itemElement?.dataset.itemId;

    if (!itemId || !this.items.has(itemId)) {
        console.error("Click en ítem inválido o sin ID.");
        return;
    }
    if (itemElement.classList.contains('disabled')) {
        console.log(`Intento de compra de ítem deshabilitado: ${itemId}`);
        this.showTooltipForItem(itemId); // Mostrar razón en tooltip
        return;
    }

    console.log(`Intentando comprar ítem: ${itemId}`);
    const purchaseSuccessful = this.executePurchaseAction(itemId);

    if (purchaseSuccessful) {
        console.log(`Compra exitosa de ${itemId}`);
        this.gameManager.getAudioManager().playSound('purchase');
        // UI y tooltip se actualizan dentro de executePurchaseAction si es exitoso
    } else {
        console.log(`Compra fallida de ${itemId}`);
        // Mostrar tooltip actualizado indicando el fallo (ya se hace en executePurchaseAction si falla pre-check)
        // Si falla la acción en sí, ya se mostró tooltip antes de revertir costo.
    }
  }

  /** Muestra el tooltip para un ítem específico al pasar el mouse. */
  private handleItemMouseOver(event: MouseEvent): void {
    const itemElement = event.currentTarget as HTMLElement;
    const itemId = itemElement?.dataset.itemId;
    if (itemId) {
        this.showTooltipForItem(itemId);
    }
  }

  /** Oculta el tooltip. */
  private hideTooltip(): void {
      if (this.tooltipElement) {
          this.tooltipElement.classList.remove('visible');
      }
  }

  /** Muestra el tooltip con la información actualizada para un ítem específico. */
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
    const effectText = this.formatEffectText(itemData); // Usar helper

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

  /** Crea los elementos HTML para cada ítem de la tienda. */
  private createShopItemElements(): void {
     if (!this.shopItemsContainerElement) {
         console.error("ShopManager: Contenedor #shop-items-container no encontrado.");
         return;
     }
     this.shopItemsContainerElement.innerHTML = '';
     this.itemElements.clear();
     // console.log(`Creando elementos HTML para ${this.items.size} ítems...`); // Log opcional

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

     // console.log("Elementos HTML de ítems creados."); // Log opcional
     this.updateShopUI();
  }

  /** Formatea el nombre de la categoría para mostrarlo en la UI. */
  private formatCategoryTitle(categoryKey: string): string {
      if (categoryKey === 'consumable') return 'Consumibles';
      if (categoryKey === 'unlockable') return 'Desbloqueables';
      if (categoryKey === 'upgradeable') return 'Mejorables';
      return 'General';
  }

  /** Añade los listeners para cerrar la tienda. */
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

  /** Limpia los listeners al destruir el ShopManager. */
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

  // --- Funciones Helper para Interpretar Datos JSON ---

  /** Calcula el costo de un ítem. */
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

  /** Formatea el texto de efecto reemplazando placeholders. */
  // MODIFICADO: Incluye caso para maxCatSize
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
           // *** NUEVO CASO ***
           else if (itemData.id === 'maxCatSize') { currentValue = this.playerData.getCurrentMaxSizeLimit(); }
           // *****************
           text = text.replace('{currentValue}', currentValue.toString());
       }
       return text;
   }

   /** Verifica si un ítem cumple la condición 'isPurchasedCheck'. */
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

  /** Verifica si un ítem cumple la condición 'purchaseCheck'. */
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

   /** Obtiene el nivel actual de un ítem mejorable. */
   private getItemLevel(itemData: ShopItemJsonData): number {
       if (!itemData.isLeveled || !itemData.levelRef) return -1;
       return (this.playerData as any)[itemData.levelRef] ?? 0;
   }

   /** Calcula el costo de un ítem por su ID. */
   private calculateItemCostById(itemId: string): number {
       const itemData = this.items.get(itemId);
       if (!itemData) return -1;
       return this.calculateItemCost(itemData);
   }

  // --- Ejecutor de Acciones de Compra ---

  // MODIFICADO: Incluye el nuevo case para 'purchaseMaxCatSize'
  private executePurchaseAction(itemId: string): boolean {
      const itemData = this.items.get(itemId);
      if (!itemData) { console.error(`No itemData for ${itemId}`); return false; }

      const cost = this.calculateItemCost(itemData);
      const canAfford = this.playerData.score >= cost;
      const passesCheck = this.checkItemCanPurchase(itemData);
      const level = this.getItemLevel(itemData);
      const isMaxLevel = itemData.isLeveled && typeof itemData.maxLevel === 'number' && level >= itemData.maxLevel;

      if (!canAfford || !passesCheck || isMaxLevel) {
          console.log(`executePurchaseAction ${itemId}: Pre-check failed (Afford:${canAfford}, Check:${passesCheck}, MaxLevel:${isMaxLevel})`);
          this.showTooltipForItem(itemId);
          return false;
      }

      let success = false;
      this.playerData.score -= cost; // Cobrar antes
      const actionId = itemData.actionId;

      try {
          switch (actionId) {
              case 'purchaseLife': success = this.purchaseLifeAction(); break;
              case 'purchaseShield': success = this.purchaseShieldAction(); break;
              case 'purchaseHint': success = this.purchaseHintAction(); break;
              case 'purchaseUnlockDrawing': success = this.purchaseUnlockDrawingAction(); break;
              case 'purchaseComboMultiplier': success = this.purchaseComboMultiplierAction(); break;
              case 'purchaseInkCostReduction': success = this.purchaseInkCostReductionAction(); break;
              case 'purchaseExtraCatSpawn': success = this.purchaseExtraCatSpawnAction(); break;
              case 'purchaseMaxCatsIncrease': success = this.purchaseMaxCatsIncreaseAction(); break;
              // *** NUEVO CASE ***
              case 'purchaseMaxCatSize': success = this.purchaseMaxCatSizeAction(); break;
              // *****************
              default:
                  console.error(`Unknown purchase action: ${actionId} for item ${itemId}`);
                  success = false;
          }
      } catch (error) {
           console.error(`Error executing action ${actionId} for ${itemId}:`, error);
           success = false;
      }

      if (!success) {
           console.warn(`Action ${actionId} for ${itemId} failed, reverting cost.`);
           this.playerData.score += cost; // Devolver puntos
      } else {
           this.gameManager.getAudioManager().playSound('purchase');
           this.updateShopUI(); // Actualizar UI solo si fue exitoso
           this.showTooltipForItem(itemId); // Actualizar tooltip
      }

      return success;
  }

  // --- Acciones de Compra Reales ---

  private purchaseLifeAction(): boolean {
    console.log("ShopManager: Executing purchaseLifeAction...");
    this.gameManager.incrementLives();
    return true;
  }

  private purchaseShieldAction(): boolean {
    console.log("ShopManager: Executing purchaseShieldAction...");
    this.playerData.hasShield = true;
    this.gameManager.updateExternalShieldUI(true);
    return true;
  }

  private purchaseHintAction(): boolean {
    console.log("ShopManager: Executing purchaseHintAction...");
    const HINT_CHARGES_PER_PURCHASE = 3;
    this.playerData.hintCharges += HINT_CHARGES_PER_PURCHASE;
    this.gameManager.updateExternalHintUI(this.playerData.hintCharges);
    // Apply hint immediately if in game
    try {
        const currentState = this.gameManager.getStateMachine().getCurrentState();
        if (currentState instanceof QuizGameplayState) {
             const currentQuestion = currentState.currentQuestion;
             if (currentQuestion) {
                 this.gameManager.getUIManager().applyHintVisuals(currentQuestion.correctAnswerKey);
                 (currentState as any).hintAppliedToQuestionId = currentQuestion.id;
             }
        }
    } catch (error) { console.error("Error applying hint immediately:", error); }
    return true;
  }

  private purchaseUnlockDrawingAction(): boolean {
    console.log("ShopManager: Executing purchaseUnlockDrawingAction...");
    if (this.playerData.isDrawingUnlocked) { return false; } // Evitar comprar de nuevo
    this.playerData.isDrawingUnlocked = true;
    this.gameManager.enableDrawingFeature();
    console.log(" -> Drawing feature unlocked.");
    return true;
  }

  private purchaseComboMultiplierAction(): boolean {
     console.log("ShopManager: Executing purchaseComboMultiplierAction...");
     const levelRef = this.items.get('comboMultiplier')?.levelRef;
     if (levelRef && typeof (this.playerData as any)[levelRef] === 'number') {
        (this.playerData as any)[levelRef]++;
        return true;
     } else { console.error("Error buying Combo Multiplier: invalid levelRef."); return false; }
  }

  private purchaseInkCostReductionAction(): boolean {
     console.log("ShopManager: Executing purchaseInkCostReductionAction...");
     const levelRef = this.items.get('inkCostReduction')?.levelRef;
     if (levelRef && typeof (this.playerData as any)[levelRef] === 'number') {
        (this.playerData as any)[levelRef]++;
        return true;
     } else { console.error("Error buying Ink Cost Reduction: invalid levelRef."); return false; }
  }

  private purchaseExtraCatSpawnAction(): boolean {
     console.log("ShopManager: Executing purchaseExtraCatSpawnAction...");
     const levelRef = this.items.get('extraCat')?.levelRef;
     if (levelRef && typeof (this.playerData as any)[levelRef] === 'number') {
        (this.playerData as any)[levelRef]++;
        console.log(` -> Extra Cat Level: ${(this.playerData as any)[levelRef]}, Cats per Correct: ${this.playerData.getCatsPerCorrectAnswer()}`);
        return true;
     } else { console.error("Error buying Extra Cat Spawn: invalid levelRef."); return false; }
  }

  private purchaseMaxCatsIncreaseAction(): boolean {
     console.log("ShopManager: Executing purchaseMaxCatsIncreaseAction...");
     const levelRef = this.items.get('maxCats')?.levelRef;
     if (levelRef && typeof (this.playerData as any)[levelRef] === 'number') {
        (this.playerData as any)[levelRef]++;
        console.log(` -> Max Cats Level: ${(this.playerData as any)[levelRef]}, Max Allowed: ${this.playerData.getMaxCatsAllowed()}`);
        return true;
     } else { console.error("Error buying Max Cats Increase: invalid levelRef."); return false; }
  }

  // *** NUEVA ACCIÓN ***
  private purchaseMaxCatSizeAction(): boolean {
      console.log("ShopManager: Executing purchaseMaxCatSizeAction...");
      const levelRef = this.items.get('maxCatSize')?.levelRef; // Obtener levelRef del JSON
      if (levelRef && typeof (this.playerData as any)[levelRef] === 'number') {
          (this.playerData as any)[levelRef]++; // Incrementar el nivel en PlayerData
          console.log(` -> Max Cat Size Level: ${(this.playerData as any)[levelRef]}, Current Limit: ${this.playerData.getCurrentMaxSizeLimit()}px`);
          // La lógica de comer en CatManager usará el nuevo límite calculado
          return true; // Indicar éxito
      } else {
          console.error("Error buying Max Cat Size: levelRef not defined or invalid in shop_items.json or PlayerData.");
          return false; // Indicar fallo
      }
  }
  // ******************

} // Fin clase ShopManager
