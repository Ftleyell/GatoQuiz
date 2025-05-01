// src/systems/ShopManager.ts

import { ShopItemData } from '../types/ShopItemData';
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
 * la compra de ítems y la actualización del estado del jugador.
 */
export class ShopManager {
  private items: Map<string, ShopItemData> = new Map();
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

    // Obtener referencias a elementos HTML
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

    this.addCloseListeners();
    console.log("ShopManager: Constructor finalizado.");
  }

  public init(itemDefinitions: ShopItemData[]): void {
    console.log("ShopManager: init - Inicializando ítems...");
    this.items.clear();
    itemDefinitions.forEach(itemDef => this.items.set(itemDef.id, itemDef));
    console.log(`ShopManager: ${this.items.size} definiciones de ítems cargadas.`);
    this.createShopItemElements();
  }

  public openShop(): void {
    console.log("ShopManager: Abriendo tienda...");
    if (!this.shopPopupElement) return;
    this.updateShopUI();
    this.shopPopupElement.style.display = 'flex';
    void this.shopPopupElement.offsetHeight; // Reflow
    this.shopPopupElement.classList.add('visible');
    // Pausar juego si es necesario
  }

  public closeShop(): void {
    console.log("ShopManager: Cerrando tienda...");
    if (!this.shopPopupElement) return;
    this.hideTooltip();
    this.shopPopupElement.classList.remove('visible');
    const transitionDuration = 300; // Ajustar si es necesario
    setTimeout(() => {
        if (!this.shopPopupElement?.classList.contains('visible')) {
            this.shopPopupElement.style.display = 'none';
        }
    }, transitionDuration);
    // Reanudar juego si se pausó
  }

  public updateShopUI(): void {
    if (!this.playerData) return;
    if (this.shopPlayerScoreElement) {
        this.shopPlayerScoreElement.textContent = `Puntos: ${this.playerData.score}`;
    }
    this.itemElements.forEach((itemElement, itemId) => {
        const itemData = this.items.get(itemId);
        if (!itemData) return;
        const cost = itemData.getCost(this.playerData);
        const isAffordable = this.playerData.score >= cost;
        const isPurchased = itemData.isPurchased ? itemData.isPurchased(this.playerData) : false;
        const canPurchase = itemData.canPurchaseCheck ? itemData.canPurchaseCheck(this.playerData) : true;
        const level = itemData.getLevel ? itemData.getLevel(this.playerData) : -1;
        const isMaxLevel = itemData.isLeveled && typeof itemData.maxLevel !== 'undefined' && level >= itemData.maxLevel;

        itemElement.classList.remove('disabled', 'purchased', 'max-level');
        if (isMaxLevel) itemElement.classList.add('max-level', 'disabled');
        else if (isPurchased && !itemData.isLeveled) itemElement.classList.add('purchased', 'disabled');
        else if (!canPurchase || !isAffordable) itemElement.classList.add('disabled');
    });
  }

  private handleItemClick(event: MouseEvent): void {
    const itemElement = event.currentTarget as HTMLElement;
    const itemId = itemElement?.dataset.itemId;
    if (!itemId || !this.items.has(itemId)) { console.error("Click en ítem inválido"); return; }
    if (itemElement.classList.contains('disabled')) {
        console.log(`Intento de compra de ítem deshabilitado: ${itemId}`);
        this.showTooltipForItem(itemId); // Mostrar por qué está deshabilitado
        return;
    }
    const itemData = this.items.get(itemId)!;
    console.log(`Intentando comprar ítem: ${itemId}`);
    // Llamar a la acción de compra definida en la configuración del ítem
    const purchaseSuccessful = itemData.purchaseAction(this); // 'this' es la instancia de ShopManager

    if (purchaseSuccessful) {
        console.log(`Compra exitosa de ${itemId}`);
        this.gameManager.getAudioManager().playSound('purchase');
        this.updateShopUI(); // Actualizar estado visual de todos los ítems
        this.showTooltipForItem(itemId); // Actualizar tooltip del ítem comprado
    } else {
        console.log(`Compra fallida de ${itemId}`);
        this.showTooltipForItem(itemId); // Mostrar tooltip indicando el fallo (ej: puntos insuficientes)
    }
  }

  private showTooltipForItem(itemId: string): void {
    const itemData = this.items.get(itemId);
    if (!itemData || !this.tooltipElement || !this.playerData) { this.hideTooltip(); return; }
    const cost = itemData.getCost(this.playerData);
    const isAffordable = this.playerData.score >= cost;
    const isPurchased = itemData.isPurchased ? itemData.isPurchased(this.playerData) : false;
    const canPurchase = itemData.canPurchaseCheck ? itemData.canPurchaseCheck(this.playerData) : true;
    const level = itemData.getLevel ? itemData.getLevel(this.playerData) : -1;
    const isMaxLevel = itemData.isLeveled && typeof itemData.maxLevel !== 'undefined' && level >= itemData.maxLevel;

    if (this.tooltipNameElement) this.tooltipNameElement.textContent = itemData.name;
    if (this.tooltipEffectElement) this.tooltipEffectElement.textContent = itemData.getEffectText(this.playerData);
    if (this.tooltipLevelElement) {
        if (itemData.isLeveled) { this.tooltipLevelElement.textContent = `Nivel: ${level}`; this.tooltipLevelElement.classList.remove('hidden'); }
        else { this.tooltipLevelElement.classList.add('hidden'); }
    }
    if (this.tooltipCostElement) { this.tooltipCostElement.textContent = isMaxLevel ? "Nivel Máximo" : `Costo: ${cost}`; }
    if (this.tooltipStatusElement) {
        let statusText = '';
        if (isMaxLevel) statusText = "Nivel Máximo Alcanzado";
        else if (isPurchased && !itemData.isLeveled) statusText = "Ya comprado / Activo";
        else if (!canPurchase) statusText = "No disponible";
        else if (!isAffordable) statusText = "Puntos insuficientes";
        if (statusText) { this.tooltipStatusElement.textContent = statusText; this.tooltipStatusElement.classList.remove('hidden'); }
        else { this.tooltipStatusElement.classList.add('hidden'); }
    }
    this.tooltipElement.classList.add('visible');
  }

  private handleItemMouseOver(event: MouseEvent): void {
    const itemElement = event.currentTarget as HTMLElement;
    const itemId = itemElement?.dataset.itemId;
    if (itemId) this.showTooltipForItem(itemId);
  }

  private hideTooltip(): void { if (this.tooltipElement) this.tooltipElement.classList.remove('visible'); }

  private createShopItemElements(): void {
    if (!this.shopItemsContainerElement) { console.error("Falta #shop-items-container."); return; }
    this.shopItemsContainerElement.innerHTML = '';
    this.itemElements.clear();
    console.log(`Creando elementos HTML para ${this.items.size} ítems...`);
    const itemsByCategory: { [key: string]: ShopItemData[] } = {};
    this.items.forEach(item => {
        const category = item.category || 'general';
        if (!itemsByCategory[category]) itemsByCategory[category] = [];
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
    this.updateShopUI(); // Aplicar estado inicial
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
      }
      if (this.shopPopupElement) {
          this.backdropClickListener = (event: MouseEvent) => { if (event.target === this.shopPopupElement) this.closeShop(); };
          this.shopPopupElement.addEventListener('click', this.backdropClickListener);
      }
  }

  public destroy(): void {
       console.log("ShopManager: Destruyendo...");
       if (this.closeButtonListener && this.shopCloseButtonElement) this.shopCloseButtonElement.removeEventListener('click', this.closeButtonListener);
       if (this.backdropClickListener && this.shopPopupElement) this.shopPopupElement.removeEventListener('click', this.backdropClickListener);
       this.itemElements.forEach(itemElement => { /* Remover listeners si es necesario */ });
       this.itemElements.clear();
  }

  // --- Acciones de Compra Implementadas ---

  /** Intenta comprar una vida extra. */
  public purchaseLife(): boolean {
    const itemId = 'life'; // ID consistente
    const itemData = this.items.get(itemId);
    if (!itemData) { console.error(`Item ${itemId} no definido.`); return false; }
    const cost = itemData.getCost(this.playerData);

    // Verificar si puede comprar (puntos y condición extra)
    if (this.playerData.score >= cost && (itemData.canPurchaseCheck ? itemData.canPurchaseCheck(this.playerData) : true)) {
        console.log("ShopManager: Comprando Vida...");
        this.playerData.score -= cost; // Restar puntos
        this.gameManager.incrementLives(); // Llamar a GameManager para añadir vida (que actualiza PlayerData)
        // Actualizar UI de vidas fuera de la tienda (GameManager o estado global podrían manejar esto)
        // Ejemplo: this.gameManager.updateExternalLivesUI();
        return true; // Compra exitosa
    }
    console.log(`Compra fallida de ${itemId}: Puntos ${this.playerData.score}/${cost}, Condición: ${itemData.canPurchaseCheck ? itemData.canPurchaseCheck(this.playerData) : 'N/A'}`);
    return false; // Fondos insuficientes o condición no cumplida
  }

  /** Intenta comprar un escudo. */
  public purchaseShield(): boolean {
    const itemId = 'shield';
    const itemData = this.items.get(itemId);
    if (!itemData) { console.error(`Item ${itemId} no definido.`); return false; }
    const cost = itemData.getCost(this.playerData);

    if (this.playerData.score >= cost && (itemData.canPurchaseCheck ? itemData.canPurchaseCheck(this.playerData) : true)) {
        console.log("ShopManager: Comprando Escudo...");
        this.playerData.score -= cost;
        this.playerData.hasShield = true; // Actualizar estado en PlayerData
        // TODO: Actualizar UI externa para mostrar icono de escudo
        this.gameManager.updateExternalShieldUI(true); // Ejemplo
        return true;
    }
     console.log(`Compra fallida de ${itemId}: Puntos ${this.playerData.score}/${cost}, Condición: ${itemData.canPurchaseCheck ? itemData.canPurchaseCheck(this.playerData) : 'N/A'}`);
    return false;
  }

  /** Intenta comprar cargas de pista. */
   public purchaseHint(): boolean {
       const itemId = 'hint';
       const itemData = this.items.get(itemId);
       if (!itemData) { console.error(`Item ${itemId} no definido.`); return false; }
       const cost = itemData.getCost(this.playerData);
       const HINT_CHARGES_PER_PURCHASE = 3; // Podría estar en itemData

       if (this.playerData.score >= cost && (itemData.canPurchaseCheck ? itemData.canPurchaseCheck(this.playerData) : true)) {
           console.log("ShopManager: Comprando Pista...");
           this.playerData.score -= cost;
           this.playerData.hintCharges += HINT_CHARGES_PER_PURCHASE; // Añadir cargas
           // TODO: Actualizar UI externa para mostrar icono/cargas de pista
           this.gameManager.updateExternalHintUI(this.playerData.hintCharges); // Ejemplo
           return true;
       }
        console.log(`Compra fallida de ${itemId}: Puntos ${this.playerData.score}/${cost}, Condición: ${itemData.canPurchaseCheck ? itemData.canPurchaseCheck(this.playerData) : 'N/A'}`);
       return false;
   }

  /** Intenta desbloquear la función de dibujo. */
  public purchaseUnlockDrawing(): boolean {
    const itemId = 'unlockDrawing';
    const itemData = this.items.get(itemId);
    if (!itemData) { console.error(`Item ${itemId} no definido.`); return false; }
    const cost = itemData.getCost(this.playerData);

    if (this.playerData.score >= cost && (itemData.canPurchaseCheck ? itemData.canPurchaseCheck(this.playerData) : true)) {
        console.log("ShopManager: Desbloqueando Dibujo...");
        this.playerData.score -= cost;
        this.playerData.isDrawingUnlocked = true; // Actualizar estado
        this.gameManager.enableDrawingFeature(); // Llamar a GameManager para activar la UI/funcionalidad
        return true;
    }
     console.log(`Compra fallida de ${itemId}: Puntos ${this.playerData.score}/${cost}, Condición: ${itemData.canPurchaseCheck ? itemData.canPurchaseCheck(this.playerData) : 'N/A'}`);
    return false;
  }

  /** Intenta comprar un nivel de Gato Extra por Acierto. */
  public purchaseExtraCatSpawn(): boolean {
    const itemId = 'extraCat';
    const itemData = this.items.get(itemId);
    if (!itemData) { console.error(`Item ${itemId} no definido.`); return false; }
    const cost = itemData.getCost(this.playerData);

    if (this.playerData.score >= cost && (itemData.canPurchaseCheck ? itemData.canPurchaseCheck(this.playerData) : true)) {
        console.log("ShopManager: Comprando Mejora Gato Extra...");
        this.playerData.score -= cost;
        this.playerData.extraCatSpawnLevel++; // Incrementar nivel
        // La lógica en QuizGameplayState que llame a getCatsPerCorrectAnswer() usará el nuevo valor
        return true;
    }
     console.log(`Compra fallida de ${itemId}: Puntos ${this.playerData.score}/${cost}, Condición: ${itemData.canPurchaseCheck ? itemData.canPurchaseCheck(this.playerData) : 'N/A'}`);
    return false;
  }

  /** Intenta comprar un nivel de Límite Máximo de Gatos. */
  public purchaseMaxCatsIncrease(): boolean {
    const itemId = 'maxCats';
    const itemData = this.items.get(itemId);
    if (!itemData) { console.error(`Item ${itemId} no definido.`); return false; }
    const cost = itemData.getCost(this.playerData);

    if (this.playerData.score >= cost && (itemData.canPurchaseCheck ? itemData.canPurchaseCheck(this.playerData) : true)) {
        console.log("ShopManager: Comprando Mejora Límite Gatos...");
        this.playerData.score -= cost;
        this.playerData.maxCatsLevel++; // Incrementar nivel
        // La lógica en CatManager (si limita el spawn) que llame a getMaxCatsAllowed() usará el nuevo valor
        // Ejemplo: this.gameManager.getCatManager().updateMaxCatsLimit(this.playerData.getMaxCatsAllowed());
        return true;
    }
     console.log(`Compra fallida de ${itemId}: Puntos ${this.playerData.score}/${cost}, Condición: ${itemData.canPurchaseCheck ? itemData.canPurchaseCheck(this.playerData) : 'N/A'}`);
    return false;
  }

  /** Intenta comprar un nivel de Multiplicador de Combo. */
  public purchaseComboMultiplier(): boolean {
    const itemId = 'comboMultiplier';
    const itemData = this.items.get(itemId);
    if (!itemData) { console.error(`Item ${itemId} no definido.`); return false; }
    const cost = itemData.getCost(this.playerData);

    if (this.playerData.score >= cost && (itemData.canPurchaseCheck ? itemData.canPurchaseCheck(this.playerData) : true)) {
        console.log("ShopManager: Comprando Mejora Multiplicador Combo...");
        this.playerData.score -= cost;
        this.playerData.comboMultiplierLevel++; // Incrementar nivel
        // La lógica en QuizGameplayState que llame a getCurrentComboMultiplier() usará el nuevo valor
        return true;
    }
     console.log(`Compra fallida de ${itemId}: Puntos ${this.playerData.score}/${cost}, Condición: ${itemData.canPurchaseCheck ? itemData.canPurchaseCheck(this.playerData) : 'N/A'}`);
    return false;
  }

  /** Intenta comprar un nivel de Reducción de Costo de Tinta. */
  public purchaseInkCostReduction(): boolean {
    const itemId = 'inkCostReduction';
    const itemData = this.items.get(itemId);
    if (!itemData) { console.error(`Item ${itemId} no definido.`); return false; }
    const cost = itemData.getCost(this.playerData);

    // Asegurarse que el dibujo esté desbloqueado Y que no esté al nivel máximo
    const canBuy = this.playerData.isDrawingUnlocked &&
                   (itemData.canPurchaseCheck ? itemData.canPurchaseCheck(this.playerData) : true);

    if (this.playerData.score >= cost && canBuy) {
        console.log("ShopManager: Comprando Mejora Reducción Costo Tinta...");
        this.playerData.score -= cost;
        this.playerData.inkCostReductionLevel++; // Incrementar nivel
        // La lógica en InkManager (o donde se calcule el costo) que llame a getCurrentInkCostPerPixel() usará el nuevo valor
        // Ejemplo: this.gameManager.getInkManager().updateInkCost();
        return true;
    }
     console.log(`Compra fallida de ${itemId}: Puntos ${this.playerData.score}/${cost}, Condición: ${canBuy}`);
    return false;
  }

} // Fin clase ShopManager
