// src/systems/ShopManager.ts
// <<< INICIO: Bloque Modificado >>>
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
const TOOLTIP_BUY_BUTTON_ID = 'tooltip-buy-button';

// Tipos para listeners (sin cambios)
type InteractionListenerInfo = {
    click: (event: MouseEvent | TouchEvent) => void;
    touchstart?: (event: TouchEvent) => void;
};

export class ShopManager {
    private items: Map<string, ShopItemJsonData> = new Map();
    private playerData: PlayerData;
    private gameManager: GameManager;
    private itemListeners: Map<HTMLElement, InteractionListenerInfo> = new Map();
    private itemElements: Map<string, HTMLElement> = new Map();

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
    private tooltipBuyButtonElement: HTMLButtonElement | null = null;

    // Listeners de cierre y compra (sin cambios estructura)
    private closeButtonListeners: InteractionListenerInfo | null = null;
    private backdropClickListeners: InteractionListenerInfo | null = null;
    private tooltipBuyButtonListener: InteractionListenerInfo | null = null;

    // Estado para selección
    private selectedItemId: string | null = null;
    // ELIMINADO: Ya no necesitamos isTouchDevice para esta lógica
    // private isTouchDevice: boolean = false;

    constructor(playerData: PlayerData, gameManager: GameManager) {
        console.log("ShopManager: Constructor iniciado.");
        this.playerData = playerData;
        this.gameManager = gameManager;

        // ELIMINADO: Detección de isTouchDevice
        // this.isTouchDevice = ('ontouchstart' in window || navigator.maxTouchPoints > 0);
        // console.log(`ShopManager: isTouchDevice = ${this.isTouchDevice}`);

        // Obtener referencias a elementos (sin cambios)
        this.shopPopupElement = document.getElementById(SHOP_POPUP_ID);
        this.shopCloseButtonElement = document.getElementById(SHOP_CLOSE_BUTTON_ID);
        this.shopPlayerScoreElement = document.getElementById(SHOP_PLAYER_SCORE_ID);
        this.shopItemsContainerElement = document.getElementById(SHOP_ITEMS_CONTAINER_ID);
        this.tooltipElement = document.getElementById(SHOP_TOOLTIP_ID);
        this.tooltipBuyButtonElement = document.getElementById(TOOLTIP_BUY_BUTTON_ID) as HTMLButtonElement | null;

        if (this.tooltipElement) {
            this.tooltipNameElement = this.tooltipElement.querySelector(`#${TOOLTIP_NAME_ID}`);
            this.tooltipLevelElement = this.tooltipElement.querySelector(`#${TOOLTIP_LEVEL_ID}`);
            this.tooltipEffectElement = this.tooltipElement.querySelector(`#${TOOLTIP_EFFECT_ID}`);
            this.tooltipCostElement = this.tooltipElement.querySelector(`#${TOOLTIP_COST_ID}`);
            this.tooltipStatusElement = this.tooltipElement.querySelector(`#${TOOLTIP_STATUS_ID}`);
        }

        if (!this.shopPopupElement || !this.shopCloseButtonElement || !this.shopItemsContainerElement || !this.tooltipElement || !this.tooltipBuyButtonElement) {
            console.error("ShopManager: No se encontraron elementos HTML esenciales para la tienda (incluyendo tooltip-buy-button)!");
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
        this.createShopItemElements();
        this.addCloseListeners();
        this.addTooltipBuyListener(); // Añadir listener para el botón de compra del tooltip
        console.log("ShopManager: Listeners de ítems, cierre y compra añadidos.");
    }

    // --- Abrir/Cerrar Tienda (sin cambios) ---
    public openShop(): void {
        console.log("ShopManager: Abriendo tienda...");
        if (!this.shopPopupElement) return;
        this.updateShopUI();
        this.shopPopupElement.style.display = 'flex';
        void this.shopPopupElement.offsetHeight;
        this.shopPopupElement.classList.add('visible');
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
        this.clearSelection(); // Limpiar selección al cerrar
        // hideTooltip() se llama dentro de clearSelection()
        this.shopPopupElement.classList.remove('visible');
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

    // --- Actualización de UI (sin cambios relevantes en esta función) ---
    public updateShopUI(): void {
        if (!this.playerData) return;
        if (this.shopPlayerScoreElement) { this.shopPlayerScoreElement.textContent = `Puntos: ${this.playerData.score}`; }
        this.itemElements.forEach((itemElement, itemId) => {
            const itemData = this.items.get(itemId); if (!itemData) return;
            const cost = this.calculateItemCost(itemData);
            const isAffordable = this.playerData.score >= cost;
            const isPurchased = this.checkItemIsPurchased(itemData);
            const canPurchaseCheck = this.checkItemCanPurchase(itemData);
            const level = this.getItemLevel(itemData);
            const isMaxLevel = itemData.isLeveled && typeof itemData.maxLevel === 'number' && level >= itemData.maxLevel;

            const isDisabled = isMaxLevel || (isPurchased && !itemData.isLeveled) || !canPurchaseCheck || !isAffordable;

            itemElement.classList.remove('disabled', 'purchased', 'max-level');
            if (isMaxLevel) { itemElement.classList.add('max-level', 'disabled'); }
            else if (isPurchased && !itemData.isLeveled) { itemElement.classList.add('purchased', 'disabled'); }
            else if (isDisabled) {
                 itemElement.classList.add('disabled');
                 if (this.selectedItemId === itemId) {
                      // No limpiamos selección aquí para que el tooltip muestre el estado
                      // this.clearSelection();
                 }
            }
            itemElement.classList.toggle('selected', this.selectedItemId === itemId);
        });

        // Si hay un ítem seleccionado, actualizar su tooltip
        if (this.selectedItemId) {
            this.showTooltipForItem(this.selectedItemId);
        } else {
            this.hideTooltip(); // Asegurar que se oculte si no hay selección
        }
    }


    // --- MODIFICADO: Manejo de Interacción Unificado ---
    private handleItemInteraction(event: MouseEvent | TouchEvent): void {
        const itemElement = event.currentTarget as HTMLElement;
        const itemId = itemElement?.dataset.itemId;

        if (event.type === 'touchstart') {
            event.preventDefault(); // Prevenir comportamiento por defecto (scroll, zoom)
        }

        if (!itemId || !this.items.has(itemId)) {
            console.error("Interacción en ítem inválido o sin ID.");
            return;
        }

        // --- Lógica Unificada: Seleccionar el ítem ---
        // Si el ítem tocado/clickeado es el mismo que ya está seleccionado,
        // lo deseleccionamos (comportamiento de toggle).
        if (this.selectedItemId === itemId) {
             this.clearSelection();
        } else {
            // Si se toca/clickea un ítem diferente (o ninguno estaba seleccionado)
            this.clearSelection(); // Deseleccionar el anterior si lo había
            this.selectedItemId = itemId;
            itemElement.classList.add('selected');
            this.showTooltipForItem(itemId); // Mostrar info y botón comprar si procede
        }
    }

    // --- MODIFICADO: Hover ya no muestra tooltip ---
    private handleItemMouseOver(_event: MouseEvent): void {
        // Ya no hacemos nada en hover, la interacción es por click/tap (selección)
        return;
    }

    // --- MODIFICADO: hideTooltip ahora también oculta el botón ---
    private hideTooltip(): void {
        if (this.tooltipElement) {
            this.tooltipElement.classList.remove('visible');
        }
        // Ocultar siempre el botón de compra cuando se oculta el tooltip
        if (this.tooltipBuyButtonElement) {
            this.tooltipBuyButtonElement.classList.add('hidden');
        }
    }

    // --- MODIFICADO: showTooltipForItem siempre evalúa y controla el botón de compra ---
    private showTooltipForItem(itemId: string): void {
        const itemData = this.items.get(itemId);
        const itemElement = this.itemElements.get(itemId); // Necesitamos el elemento para checkear 'disabled' visual

        if (!itemData || !this.tooltipElement || !this.playerData || !this.tooltipNameElement ||
            !this.tooltipEffectElement || !this.tooltipLevelElement || !this.tooltipCostElement ||
            !this.tooltipStatusElement || !this.tooltipBuyButtonElement || !itemElement) {
            this.hideTooltip();
            return;
        }

        // Cálculos de estado del ítem (igual que antes)
        const cost = this.calculateItemCost(itemData);
        const isAffordable = this.playerData.score >= cost;
        const isPurchased = this.checkItemIsPurchased(itemData);
        const canPurchaseCheck = this.checkItemCanPurchase(itemData);
        const level = this.getItemLevel(itemData);
        const isMaxLevel = itemData.isLeveled && typeof itemData.maxLevel === 'number' && level >= itemData.maxLevel;
        const effectText = this.formatEffectText(itemData);

        // Determinar si el ítem es *realmente* comprable ahora mismo
        const isCurrentlyPurchasable = !isMaxLevel && !(isPurchased && !itemData.isLeveled) && canPurchaseCheck && isAffordable;
        // *** Considerar el estado visual por si acaso ***
        const isDisabledVisually = itemElement.classList.contains('disabled');


        // Actualizar textos del tooltip (igual que antes)
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
        else if (!canPurchaseCheck && !isMaxLevel) { statusText = "No disponible"; }
        else if (!isAffordable) { statusText = "Puntos insuficientes"; }
        // else if (isDisabledVisually && !isCurrentlyPurchasable) { statusText = "No se puede comprar"; } // Opcional

        if (statusText) {
            this.tooltipStatusElement.textContent = statusText;
            this.tooltipStatusElement.classList.remove('hidden');
        } else {
            this.tooltipStatusElement.classList.add('hidden');
        }

        // --- Lógica Unificada para el Botón de Compra ---
        // Mostrar el botón siempre que un ítem esté seleccionado
        this.tooltipBuyButtonElement.classList.remove('hidden');
        // Habilitar/Deshabilitar basado en si es comprable
        this.tooltipBuyButtonElement.disabled = !isCurrentlyPurchasable;

        // --- FIN Lógica Unificada ---

        // Mostrar el tooltip
        this.tooltipElement.classList.add('visible');
    }


    // --- Creación de Elementos y Listeners (Modificar listeners) ---
    private createShopItemElements(): void {
        if (!this.shopItemsContainerElement) return;
        this.shopItemsContainerElement.innerHTML = '';
        this.itemElements.clear();
        this.itemListeners.clear();

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

                   // --- Listener Unificado para Selección ---
                   const interactionHandler = (e: MouseEvent | TouchEvent) => this.handleItemInteraction(e);
                   const itemL: InteractionListenerInfo = {
                       click: interactionHandler,
                       touchstart: interactionHandler // Mismo handler para tap
                   };
                   itemElement.addEventListener('click', itemL.click);
                   itemElement.addEventListener('touchstart', itemL.touchstart!, { passive: false }); // Asegurar passive: false

                   // --- REMOVER Listeners de Hover/Out para Tooltip ---
                   // itemElement.addEventListener('mouseover', (e) => this.handleItemMouseOver(e));
                   // itemElement.addEventListener('mouseout', () => this.hideTooltip()); // Ya no se oculta en mouseout

                   categoryItemsContainer.appendChild(itemElement);
                   this.itemElements.set(itemData.id, itemElement);
                   this.itemListeners.set(itemElement, itemL);
               });
            }
        });
        this.updateShopUI(); // Actualizar estado inicial visual
    }


    private formatCategoryTitle(categoryKey: string): string {
        // ... (sin cambios) ...
        if (categoryKey === 'consumable') return 'Consumibles';
        if (categoryKey === 'unlockable') return 'Desbloqueables';
        if (categoryKey === 'upgradeable') return 'Mejorables';
        return 'General';
    }

    // --- addCloseListeners (sin cambios relevantes, ya usa handler unificado) ---
    private addCloseListeners(): void {
        const handleCloseInteraction = (event: MouseEvent | TouchEvent) => {
            if (event.type === 'touchstart' && event.target === this.shopPopupElement) {
                 event.preventDefault();
            }
            if (event.target === this.shopPopupElement || event.currentTarget === this.shopCloseButtonElement) {
                 this.closeShop();
            }
        };
        if (this.shopCloseButtonElement) {
            this.closeButtonListeners = {
                click: handleCloseInteraction,
                touchstart: handleCloseInteraction
            };
            this.shopCloseButtonElement.addEventListener('click', this.closeButtonListeners.click);
            this.shopCloseButtonElement.addEventListener('touchstart', this.closeButtonListeners.touchstart!, { passive: false });
        } else { console.warn("ShopManager: Botón de cierre no encontrado."); }
        if (this.shopPopupElement) {
            this.backdropClickListeners = {
                click: handleCloseInteraction,
                touchstart: handleCloseInteraction
            };
            this.shopPopupElement.addEventListener('click', this.backdropClickListeners.click);
            this.shopPopupElement.addEventListener('touchstart', this.backdropClickListeners.touchstart!, { passive: false });
        }
    }


    // --- addTooltipBuyListener (sin cambios estructurales, la lógica está en el handler) ---
    private addTooltipBuyListener(): void {
         if (!this.tooltipBuyButtonElement) return;

         const handleBuyInteraction = (event: MouseEvent | TouchEvent) => {
             event.stopPropagation(); // Evitar que el click/tap se propague al overlay
             if (event.type === 'touchstart') {
                 event.preventDefault();
             }
             // Comprar SOLO si hay un item seleccionado y el botón NO está deshabilitado
             if (this.selectedItemId && !this.tooltipBuyButtonElement?.disabled) {
                 console.log(`Comprando ítem seleccionado [${this.selectedItemId}] desde botón tooltip...`);
                 const success = this.executePurchaseAction(this.selectedItemId); // executePurchaseAction ahora llama a clearSelection si hay éxito
                 // No necesitamos llamar a clearSelection aquí explícitamente
                 if (!success) {
                      // Si falla, mantener seleccionado para ver estado de error en tooltip
                      this.updateShopUI(); // Re-renderizar tooltip con estado actualizado
                 }
             } else {
                 console.warn("Intento de compra desde tooltip sin ítem seleccionado o botón deshabilitado.");
             }
         };

         this.tooltipBuyButtonListener = {
             click: handleBuyInteraction,
             touchstart: handleBuyInteraction // Mismo handler para tap
         };
         this.tooltipBuyButtonElement.addEventListener('click', this.tooltipBuyButtonListener.click);
         this.tooltipBuyButtonElement.addEventListener('touchstart', this.tooltipBuyButtonListener.touchstart!, { passive: false }); // Asegurar passive: false
    }


    // --- destroy (limpiar listener de tooltip buy) ---
    public destroy(): void {
        console.log("ShopManager: Destruyendo...");
        // Limpiar listeners de cierre (sin cambios)
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
        // Limpiar listener del botón de compra
        if (this.tooltipBuyButtonListener && this.tooltipBuyButtonElement) {
             this.tooltipBuyButtonElement.removeEventListener('click', this.tooltipBuyButtonListener.click);
             if (this.tooltipBuyButtonListener.touchstart) this.tooltipBuyButtonElement.removeEventListener('touchstart', this.tooltipBuyButtonListener.touchstart);
             this.tooltipBuyButtonListener = null;
        }
        // Limpiar listeners de ítems (sin cambios)
        this.itemListeners.forEach((listeners, itemElement) => {
             if (itemElement && itemElement.isConnected) {
                 itemElement.removeEventListener('click', listeners.click);
                 if (listeners.touchstart) itemElement.removeEventListener('touchstart', listeners.touchstart);
                 // Ya no hay listeners de hover/out
                 // itemElement.removeEventListener('mouseover', this.handleItemMouseOver);
                 // itemElement.removeEventListener('mouseout', this.hideTooltip);
             }
        });
        this.itemListeners.clear();
        this.itemElements.clear();
        this.selectedItemId = null; // Asegurarse de limpiar selección
        console.log("ShopManager: Listeners limpiados.");
    }

    // --- Método para limpiar la selección ---
    private clearSelection(): void {
        if (this.selectedItemId) {
            const previousElement = this.itemElements.get(this.selectedItemId);
            previousElement?.classList.remove('selected');
            this.selectedItemId = null;
        }
        this.hideTooltip(); // Ocultar tooltip al deseleccionar
    }

    // --- Funciones Helper (calculateItemCost, formatEffectText, etc. sin cambios) ---
    private calculateItemCost(itemData: ShopItemJsonData): number {
        const costParams = itemData.cost; let cost = costParams.base;
        if (itemData.isLeveled) { const levelRef = itemData.levelRef; const currentLevel = levelRef ? (this.playerData as any)[levelRef] ?? 0 : 0; if (costParams.type === 'exponential' && typeof costParams.multiplier === 'number') { cost = costParams.base * Math.pow(costParams.multiplier, currentLevel); } else { cost = costParams.base + (costParams.perLevel ?? 0) * currentLevel; } } else if (costParams.levelRef && typeof costParams.perLevel === 'number') { const linkedLevel = (this.playerData as any)[costParams.levelRef] ?? 0; cost = costParams.base + costParams.perLevel * linkedLevel; } return Math.round(cost);
    }
    private formatEffectText(itemData: ShopItemJsonData): string {
        let text = itemData.effectTemplate; text = text.replace('{lives}', this.playerData.lives.toString());
        if (text.includes('{isActive}')) { const valueRef = itemData.isPurchasedCheck?.valueRef; const isActive = valueRef ? !!(this.playerData as any)[valueRef] : false; text = text.replace('{isActive}', isActive ? '(Activo)' : ''); }
        if (text.includes('{isUnlocked}')) { const valueRef = itemData.isPurchasedCheck?.valueRef; const isUnlocked = valueRef ? !!(this.playerData as any)[valueRef] : false; text = text.replace('{isUnlocked}', isUnlocked ? '(Desbloqueado)' : ''); }
        if (text.includes('{charges}')) { const valueRef = itemData.isPurchasedCheck?.valueRef; const charges = valueRef ? (this.playerData as any)[valueRef] ?? 0 : 0; text = text.replace('{charges}', charges > 0 ? `(Cargas: ${charges})` : ''); }
        if (text.includes('{currentValue}')) { let currentValue: string | number = '?'; if (itemData.id === 'comboMultiplier') { currentValue = this.playerData.getCurrentComboMultiplier().toFixed(1); } else if (itemData.id === 'inkCostReduction') { currentValue = this.playerData.getCurrentInkCostPerPixel().toFixed(2); } else if (itemData.id === 'extraCat') { currentValue = this.playerData.getCatsPerCorrectAnswer(); } else if (itemData.id === 'maxCats') { currentValue = this.playerData.getMaxCatsAllowed(); } else if (itemData.id === 'maxCatSize') { currentValue = this.playerData.getCurrentMaxSizeLimit(); } else if (itemData.id === 'refillCatFood') { currentValue = this.playerData.currentCatFood; } text = text.replace('{currentValue}', currentValue.toString()); } return text;
    }
    private checkItemIsPurchased(itemData: ShopItemJsonData): boolean {
        if (!itemData.isPurchasedCheck) return false; const check = itemData.isPurchasedCheck; const valueRef = check.valueRef; const currentValue = (this.playerData as any)[valueRef]; if (typeof currentValue === 'undefined') return false; switch (check.condition) { case 'isTrue': return currentValue === true; case 'isFalse': return currentValue === false; case 'greaterThan': return typeof currentValue === 'number' && typeof check.limit === 'number' && currentValue > check.limit; default: return false; }
    }
    private checkItemCanPurchase(itemData: ShopItemJsonData): boolean {
        if (!itemData.purchaseCheck) return true; const check = itemData.purchaseCheck; const valueRef = check.valueRef; const currentValue = (this.playerData as any)[valueRef]; if (typeof currentValue === 'undefined') { console.warn(`Purchase check failed for ${itemData.id}: valueRef '${valueRef}' not found.`); return false; } switch (check.condition) { case 'lessThan': return typeof currentValue === 'number' && typeof check.limit === 'number' && currentValue < check.limit; case 'lessThanOrEqual': return typeof currentValue === 'number' && typeof check.limit === 'number' && currentValue <= check.limit; case 'isFalse': return currentValue === false; case 'isTrue': return currentValue === true; case 'greaterThan': return typeof currentValue === 'number' && typeof check.limit === 'number' && currentValue > check.limit; case 'greaterThanOrEqual': return typeof currentValue === 'number' && typeof check.limit === 'number' && currentValue >= check.limit; default: return false; }
    }
    private getItemLevel(itemData: ShopItemJsonData): number {
        if (!itemData.isLeveled || !itemData.levelRef) return -1; return (this.playerData as any)[itemData.levelRef] ?? 0;
    }


    // --- MODIFICADO: Acciones de Compra (llamar clearSelection al final si hay éxito) ---
    private executePurchaseAction(itemId: string): boolean {
        const itemData = this.items.get(itemId); if (!itemData) { console.error(`ShopManager: No itemData for ID '${itemId}'`); return false; }
        const cost = this.calculateItemCost(itemData); const canAfford = this.playerData.score >= cost; const passesCheck = this.checkItemCanPurchase(itemData); const level = this.getItemLevel(itemData); const isMaxLevel = itemData.isLeveled && typeof itemData.maxLevel === 'number' && level >= itemData.maxLevel;
        const isPurchased = this.checkItemIsPurchased(itemData);

        if (isMaxLevel || (isPurchased && !itemData.isLeveled) || !passesCheck || !canAfford) {
            this.showTooltipForItem(itemId); // Mostrar estado de por qué no se puede
            return false;
        }

        this.playerData.score -= cost; console.log(`ShopManager: Deduced ${cost}. Remaining: ${this.playerData.score}`); this.gameManager.updateExternalScoreUI();
        let success = false; const actionId = itemData.actionId; console.log(`ShopManager: Executing '${actionId}' for item '${itemId}'...`);
        try { switch (actionId) {
                // ... (casos de acciones sin cambios) ...
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

        // Actualizar UI completa
        this.updateShopUI();

        // --- LLAMAR A clearSelection SI HUBO ÉXITO ---
        if (success) {
            this.clearSelection();
        } else {
            // Si falló, re-mostrar tooltip con el estado actualizado (posiblemente error)
            this.showTooltipForItem(itemId);
        }
        // --- FIN CAMBIO ---

        // Ya no es necesario actualizar el score aquí, updateShopUI lo hace
        // if (this.shopPlayerScoreElement) { this.shopPlayerScoreElement.textContent = `Puntos: ${this.playerData.score}`; }
        return success;
      }

      // Implementaciones de acciones de compra (sin cambios)
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
// <<< FIN: Bloque Modificado >>>