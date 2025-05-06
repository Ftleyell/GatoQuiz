// src/systems/ShopManager.ts
import { ShopItemJsonData } from '../types/ShopItemData';
import { PlayerData } from '../game/PlayerData';
import { GameManager } from '../game/GameManager';
// <<< CAMBIO: Importar SOLO el componente ShopPopup y su tipo >>>
import '../game/components/ui/shop-popup.ts'; // Importar para registrar <shop-popup>
import type { ShopPopup } from '../game/components/ui/shop-popup'; // Importar el tipo

// IDs de Elementos (Solo los necesarios ahora)
const SHOP_POPUP_ID = 'shop-popup';
const SHOP_CLOSE_BUTTON_ID = 'shop-close-button'; // Aún necesario si el botón está fuera del shadow DOM del popup
const SHOP_PLAYER_SCORE_ID = 'shop-player-score'; // Aún necesario (o mover al componente popup)

// Tipo para listeners de cierre (se mantiene por ahora)
type InteractionListenerInfo = {
    click: (event: MouseEvent | TouchEvent) => void;
    touchstart?: (event: TouchEvent) => void;
};

export class ShopManager {
    private items: Map<string, ShopItemJsonData> = new Map();
    private playerData: PlayerData;
    private gameManager: GameManager;

    // <<< CAMBIO: Referencia principal es al componente <shop-popup> >>>
    private shopPopupElement: ShopPopup | null = null;
    // <<< FIN CAMBIO >>>

    // Referencias a elementos que *podrían* quedar fuera del componente popup
    private shopCloseButtonElement: HTMLElement | null = null; // Podría estar dentro del popup Lit
    private shopPlayerScoreElement: HTMLElement | null = null; // Podría estar dentro del popup Lit

    // Listeners de cierre (podrían eliminarse si el popup maneja todo)
    private closeButtonListeners: InteractionListenerInfo | null = null;
    private backdropClickListeners: InteractionListenerInfo | null = null;

    // Listener para el evento de compra del popup
    private buyRequestListener = (e: Event) => this.handleBuyRequest(e);

    constructor(playerData: PlayerData, gameManager: GameManager) {
        console.log("ShopManager: Constructor iniciado.");
        this.playerData = playerData;
        this.gameManager = gameManager;

        // <<< CAMBIO: Obtener referencia al componente <shop-popup> >>>
        this.shopPopupElement = document.getElementById(SHOP_POPUP_ID) as ShopPopup | null;
        // <<< FIN CAMBIO >>>

        // Obtener referencias a elementos que podrían estar fuera (o dentro) del shadow DOM
        // Si moviste el botón de cierre y el score DENTRO del render() de <shop-popup>,
        // estas líneas ya no son necesarias aquí.
        this.shopCloseButtonElement = document.getElementById(SHOP_CLOSE_BUTTON_ID);
        this.shopPlayerScoreElement = document.getElementById(SHOP_PLAYER_SCORE_ID);


        if (!this.shopPopupElement) {
            console.error("ShopManager: ¡Componente <shop-popup> no encontrado! Asegúrate de que el ID en index.html sea 'shop-popup' y la etiqueta sea <shop-popup>.");
        }
        // Advertir si los otros elementos no se encuentran (podría ser intencional si están dentro del componente Lit)
        if (!this.shopCloseButtonElement) console.warn("ShopManager: Botón de cierre (#shop-close-button) no encontrado fuera del popup.");
        if (!this.shopPlayerScoreElement) console.warn("ShopManager: Display de score (#shop-player-score) no encontrado fuera del popup.");

        console.log("ShopManager: Constructor finalizado.");
    }

    public init(itemJsonData: any[]): void {
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

        // <<< CAMBIO: Ya no creamos elementos aquí >>>
        // this.createShopItemElements();

        // <<< CAMBIO: Configurar listeners para eventos del popup >>>
        this.addPopupListeners();
        // <<< FIN CAMBIO >>>

        // <<< CAMBIO: Eliminar llamada a addTooltipBuyListener >>>
        console.log("ShopManager: Listeners del popup añadidos.");
    }

    // --- Abrir/Cerrar Tienda (Modificado para usar props del componente) ---
    public openShop(): void {
        console.log("[ShopManager] openShop() llamado!");
    
        // <<< VERIFICACIÓN ADICIONAL >>>
        // Volver a obtener la referencia por si acaso se perdió o el DOM cambió
        this.shopPopupElement = document.getElementById(SHOP_POPUP_ID) as ShopPopup | null;
    
        if (!this.shopPopupElement) {
            console.error("[ShopManager] ERROR CRÍTICO: <shop-popup> NO encontrado en openShop!");
            // Intentar mostrar un error al usuario o loguear más info
            alert("Error: No se pudo encontrar el componente de la tienda."); // Temporal para debug
            return; // Salir si no se encuentra
        }
        // <<< FIN VERIFICACIÓN >>>
    
        console.log("[ShopManager] shopPopupElement encontrado. Estableciendo props y isVisible = true...");
    
        try {
            // Pasar los datos necesarios al componente
            this.shopPopupElement.items = Array.from(this.items.values());
            // Pasar una copia para ayudar a Lit a detectar cambios si PlayerData muta
            this.shopPopupElement.playerDataSnapshot = { ...this.playerData };
            this.shopPopupElement.isVisible = true; // Hacer visible
    
            console.log(`[ShopManager] shopPopupElement.isVisible AHORA es: ${this.shopPopupElement.isVisible}`);
    
            // El backdrop se sigue manejando globalmente por ahora
            const backdrop = document.getElementById('blur-backdrop');
            if (backdrop) {
                backdrop.style.display = 'block';
                void backdrop.offsetHeight; // Forzar reflujo
                backdrop.classList.add('visible');
            }
        } catch (error) {
            console.error("[ShopManager] Error estableciendo props o visibilidad en <shop-popup>:", error);
            // Podríamos intentar ocultarlo si falla
             if (this.shopPopupElement) this.shopPopupElement.isVisible = false;
        }
    }

    public closeShop(): void {
        console.log("ShopManager: Cerrando tienda...");
        if (!this.shopPopupElement) return;

        this.shopPopupElement.isVisible = false; // Ocultar el componente

        // El backdrop se sigue manejando globalmente
        const backdrop = document.getElementById('blur-backdrop');
        const explanationOverlay = document.getElementById('explanation-overlay');
        if (backdrop && (!explanationOverlay || !explanationOverlay.classList.contains('visible'))) {
            backdrop.classList.remove('visible');
            // Esperar transición para ocultar display (opcional, el componente ya lo hace)
            // setTimeout(() => {
            //     if (backdrop && !backdrop.classList.contains('visible')) {
            //         backdrop.style.display = 'none';
            //     }
            // }, 400); // Coincidir con duración de transición CSS
        }
    }

    // --- Actualización de UI (Simplificada) ---
    public updateShopUI(): void {
        if (!this.playerData) return;

        // Actualizar score (si está fuera del componente Lit)
        if (this.shopPlayerScoreElement) {
            this.shopPlayerScoreElement.textContent = `Puntos: ${this.playerData.score}`;
        }

        // <<< CAMBIO: Solo actualizar playerDataSnapshot en el popup >>>
        if (this.shopPopupElement) {
            // Pasar una nueva referencia para que Lit detecte el cambio si PlayerData muta
            this.shopPopupElement.playerDataSnapshot = { ...this.playerData };
            // O si PlayerData es inmutable: this.shopPopupElement.playerDataSnapshot = this.playerData;
        }
        // <<< FIN CAMBIO >>>
    }

    // <<< CAMBIO: Añadir listeners para eventos del popup >>>
    private addPopupListeners(): void {
        if (!this.shopPopupElement) return;

        // Listener para cerrar
        this.shopPopupElement.addEventListener('close-requested', () => {
            console.log("ShopManager: Evento 'close-requested' recibido.");
            this.closeShop();
        });

        // Listener para comprar
        this.shopPopupElement.addEventListener('buy-item-requested', this.buyRequestListener);

        console.log("ShopManager: Listeners para 'close-requested' y 'buy-item-requested' añadidos a <shop-popup>.");

        // Mantener listeners de cierre externos si el botón/backdrop NO están en el Shadow DOM
        this.addExternalCloseListeners();
    }

    // <<< CAMBIO: Función separada para listeners externos (si son necesarios) >>>
    private addExternalCloseListeners(): void {
        const handleCloseInteraction = (event: MouseEvent | TouchEvent) => {
            // Solo cerrar si el clic es en el backdrop (el propio popup, si no está en shadow DOM)
            // o en el botón de cierre externo.
            if (event.target === this.shopPopupElement || event.currentTarget === this.shopCloseButtonElement) {
                 this.closeShop();
            }
        };

        if (this.shopCloseButtonElement) {
            // Evitar añadir listeners múltiples si se llama a init varias veces
            if (!this.closeButtonListeners) {
                this.closeButtonListeners = { click: handleCloseInteraction, touchstart: handleCloseInteraction };
                this.shopCloseButtonElement.addEventListener('click', this.closeButtonListeners.click);
                this.shopCloseButtonElement.addEventListener('touchstart', this.closeButtonListeners.touchstart!, { passive: false });
            }
        }
        // Listener de backdrop (si el popup NO maneja el clic en sí mismo internamente)
        // if (this.shopPopupElement && !this.backdropClickListeners) {
        //     this.backdropClickListeners = { click: handleCloseInteraction, touchstart: handleCloseInteraction };
        //     this.shopPopupElement.addEventListener('click', this.backdropClickListeners.click);
        //     this.shopPopupElement.addEventListener('touchstart', this.backdropClickListeners.touchstart!, { passive: false });
        // }
    }
    // <<< FIN CAMBIO >>>


    // <<< CAMBIO: Eliminar métodos de creación y manejo de selección/tooltip >>>
    // private createShopItemElements(): void { ... } // Eliminado
    // private handleItemInteraction(event: CustomEvent): void { ... } // Eliminado
    // private clearSelection(): void { ... } // Eliminado
    // private updateItemSelectionStates(): void { ... } // Eliminado
    // private hideTooltip(): void { ... } // Eliminado
    // private showTooltipForItem(itemId: string): void { ... } // Eliminado
    // <<< FIN CAMBIO >>>


    // --- Acciones de Compra (Llamada desde el listener del evento) ---
    private executePurchaseAction(itemId: string): boolean {
        const itemData = this.items.get(itemId); if (!itemData) { return false; }
        // Usar helpers internos para cálculos
        const cost = this._calculateItemCost(itemData, this.playerData);
        const canAfford = this.playerData.score >= cost;
        const passesCheck = this._checkItemCanPurchase(itemData, this.playerData);
        const level = this._getItemLevel(itemData, this.playerData);
        const isMaxLevel = itemData.isLeveled && typeof itemData.maxLevel === 'number' && level >= itemData.maxLevel;
        const isPurchased = this._checkItemIsPurchased(itemData, this.playerData);

        if (isMaxLevel || (isPurchased && !itemData.isLeveled) || !passesCheck || !canAfford) {
            console.warn(`ShopManager: Intento de compra inválido para ${itemId}.`);
            this.updateShopUI(); // Actualizar UI para mostrar estado de error en tooltip
            return false;
        }

        this.playerData.score -= cost; this.gameManager.updateExternalScoreUI();
        let success = false; const actionId = itemData.actionId;
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

        if (!success) {
             this.playerData.score += cost; // Revertir costo si falla
             this.gameManager.updateExternalScoreUI();
             console.warn(`ShopManager: Acción ${actionId} falló. Costo revertido.`);
        } else {
             this.gameManager.getAudioManager().playSound('purchase');
             console.log(`ShopManager: Acción ${actionId} exitosa.`);
        }

        // <<< CAMBIO: Ya no se llama a clearSelection, updateShopUI es suficiente >>>
        this.updateShopUI(); // Actualizar UI después de la compra (exitosa o fallida)
        // <<< FIN CAMBIO >>>

        return success;
      }

      // Implementaciones de acciones de compra (sin cambios)
      private purchaseLifeAction(): boolean { this.playerData.lives++; this.gameManager.updateExternalLivesUI(); return true; }
      private purchaseShieldAction(): boolean { this.playerData.hasShield = true; this.gameManager.updateExternalShieldUI(true); return true; }
      private purchaseHintAction(): boolean { this.playerData.hintCharges++; this.gameManager.updateExternalHintUI(this.playerData.hintCharges); return true; }
      private purchaseUnlockDrawingAction(): boolean { if (this.playerData.isDrawingUnlocked) return false; this.playerData.isDrawingUnlocked = true; let activationSuccessful = false; try { activationSuccessful = this.gameManager.enableDrawingFeature(); } catch (e) { activationSuccessful = false; } if (!activationSuccessful) { this.playerData.isDrawingUnlocked = false; return false; } return true; }
      private purchaseComboMultiplierAction(): boolean { this.playerData.comboMultiplierLevel++; return true; }
      private purchaseInkCostReductionAction(): boolean { this.playerData.inkCostReductionLevel++; this.gameManager.updateInkUI(); return true; }
      private purchaseExtraCatSpawnAction(): boolean { this.playerData.extraCatSpawnLevel++; return true; }
      private purchaseMaxCatsIncreaseAction(): boolean { this.playerData.maxCatsLevel++; return true; }
      private purchaseMaxCatSizeAction(): boolean { this.playerData.maxCatSizeLevel++; return true; }
      private purchaseUnlockCatFoodAction(): boolean { if (this.playerData.isCatFoodUnlocked) return false; this.playerData.isCatFoodUnlocked = true; this.playerData.refillCatFood(); this.gameManager.enableCatFoodFeature(); return true; }
      private purchaseRefillCatFoodAction(): boolean { if (this.playerData.currentCatFood >= this.playerData.getMaxCatFood()) return false; this.playerData.refillCatFood(); this.gameManager.updateCatFoodUI(); return true; }

      // <<< CAMBIO: Mantener helpers privados para cálculos (usados por executePurchaseAction) >>>
      private _calculateItemCost(itemData: ShopItemJsonData, playerData: PlayerData): number { const costParams = itemData.cost; let cost = costParams.base; if (itemData.isLeveled) { const levelRef = itemData.levelRef; const currentLevel = levelRef ? (playerData as any)[levelRef] ?? 0 : 0; if (costParams.type === 'exponential' && typeof costParams.multiplier === 'number') { cost = costParams.base * Math.pow(costParams.multiplier, currentLevel); } else { cost = costParams.base + (costParams.perLevel ?? 0) * currentLevel; } } else if (costParams.levelRef && typeof costParams.perLevel === 'number') { const linkedLevel = (playerData as any)[costParams.levelRef] ?? 0; cost = costParams.base + costParams.perLevel * linkedLevel; } return Math.round(cost); }
      private _checkItemIsPurchased(itemData: ShopItemJsonData, playerData: PlayerData): boolean { if (!itemData.isPurchasedCheck) return false; const check = itemData.isPurchasedCheck; const valueRef = check.valueRef; const currentValue = (playerData as any)[valueRef]; if (typeof currentValue === 'undefined') return false; switch (check.condition) { case 'isTrue': return currentValue === true; case 'isFalse': return currentValue === false; case 'greaterThan': return typeof currentValue === 'number' && typeof check.limit === 'number' && currentValue > check.limit; default: return false; } }
      private _checkItemCanPurchase(itemData: ShopItemJsonData, playerData: PlayerData): boolean { if (!itemData.purchaseCheck) return true; const check = itemData.purchaseCheck; const valueRef = check.valueRef; const currentValue = (playerData as any)[valueRef]; if (typeof currentValue === 'undefined') { return false; } switch (check.condition) { case 'lessThan': return typeof currentValue === 'number' && typeof check.limit === 'number' && currentValue < check.limit; case 'lessThanOrEqual': return typeof currentValue === 'number' && typeof check.limit === 'number' && currentValue <= check.limit; case 'isFalse': return currentValue === false; case 'isTrue': return currentValue === true; case 'greaterThan': return typeof currentValue === 'number' && typeof check.limit === 'number' && currentValue > check.limit; case 'greaterThanOrEqual': return typeof currentValue === 'number' && typeof check.limit === 'number' && currentValue >= check.limit; default: return false; } }
      private _getItemLevel(itemData: ShopItemJsonData, playerData: PlayerData): number { if (!itemData.isLeveled || !itemData.levelRef) return -1; return (playerData as any)[itemData.levelRef] ?? 0; }
      // <<< FIN CAMBIO >>>

    // --- destroy (Modificado para limpiar nuevos listeners) ---
    public destroy(): void {
        console.log("ShopManager: Destruyendo...");
        // Limpiar listeners de cierre externos (si se usaron)
        if (this.closeButtonListeners && this.shopCloseButtonElement) { this.shopCloseButtonElement.removeEventListener('click', this.closeButtonListeners.click); if (this.closeButtonListeners.touchstart) this.shopCloseButtonElement.removeEventListener('touchstart', this.closeButtonListeners.touchstart); this.closeButtonListeners = null; }
        if (this.backdropClickListeners && this.shopPopupElement) { this.shopPopupElement.removeEventListener('click', this.backdropClickListeners.click); if (this.backdropClickListeners.touchstart) this.shopPopupElement.removeEventListener('touchstart', this.backdropClickListeners.touchstart); this.backdropClickListeners = null; }

        // <<< CAMBIO: Limpiar listeners del componente popup >>>
        this.shopPopupElement?.removeEventListener('close-requested', this.closeShop); // Asume que closeShop es el handler
        this.shopPopupElement?.removeEventListener('buy-item-requested', this.buyRequestListener);
        // <<< FIN CAMBIO >>>

        this.items.clear(); // Limpiar mapa de items
        console.log("ShopManager: Listeners limpiados.");
    }

    // <<< CAMBIO: Handler para el evento de compra >>>
    private handleBuyRequest = (e: Event) => {
        const event = e as CustomEvent;
        const itemIdToBuy = event.detail?.itemId;
        if (itemIdToBuy) {
            console.log(`ShopManager: Evento 'buy-item-requested' capturado para ${itemIdToBuy}`);
            this.executePurchaseAction(itemIdToBuy);
        } else {
            console.warn("ShopManager: Evento 'buy-item-requested' capturado sin itemId.");
        }
    };
    // <<< FIN CAMBIO >>>

} // Fin Clase ShopManager