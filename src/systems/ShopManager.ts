// src/systems/ShopManager.ts

import { ShopItemJsonData } from '../types/ShopItemData'; // Usar la nueva interfaz JSON
import { PlayerData } from '../game/PlayerData';
import { GameManager } from '../game/GameManager';

// Constantes para IDs de elementos HTML
const SHOP_POPUP_ID = 'shop-popup';
const SHOP_CLOSE_BUTTON_ID = 'shop-close-button';
const SHOP_PLAYER_SCORE_ID = 'shop-player-score';
const SHOP_ITEMS_CONTAINER_ID = 'shop-items-container'; // Asegúrate que este ID exista en tu HTML
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
  // Usar ShopItemJsonData para almacenar los datos cargados
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

  // Listeners (declarados aquí, asignados en addCloseListeners)
  private closeButtonListener: (() => void) | null = null;
  private backdropClickListener: ((event: MouseEvent) => void) | null = null;

  constructor(playerData: PlayerData, gameManager: GameManager) {
    console.log("ShopManager: Constructor iniciado.");
    this.playerData = playerData;
    this.gameManager = gameManager;

    // Obtener referencias a elementos HTML esenciales aquí
    this.shopPopupElement = document.getElementById(SHOP_POPUP_ID);
    this.shopCloseButtonElement = document.getElementById(SHOP_CLOSE_BUTTON_ID);
    this.shopPlayerScoreElement = document.getElementById(SHOP_PLAYER_SCORE_ID);
    this.shopItemsContainerElement = document.getElementById(SHOP_ITEMS_CONTAINER_ID);
    this.tooltipElement = document.getElementById(SHOP_TOOLTIP_ID);

    // Obtener referencias a elementos del tooltip
    if (this.tooltipElement) {
        this.tooltipNameElement = this.tooltipElement.querySelector(`#${TOOLTIP_NAME_ID}`);
        this.tooltipLevelElement = this.tooltipElement.querySelector(`#${TOOLTIP_LEVEL_ID}`);
        this.tooltipEffectElement = this.tooltipElement.querySelector(`#${TOOLTIP_EFFECT_ID}`);
        this.tooltipCostElement = this.tooltipElement.querySelector(`#${TOOLTIP_COST_ID}`);
        this.tooltipStatusElement = this.tooltipElement.querySelector(`#${TOOLTIP_STATUS_ID}`);
    }

    // Verificar si se encontraron los elementos esenciales
    if (!this.shopPopupElement || !this.shopCloseButtonElement || !this.shopItemsContainerElement || !this.tooltipElement) {
        console.error("ShopManager: No se encontraron elementos HTML esenciales para la tienda!");
        // Podrías lanzar un error o manejarlo de otra forma si es crítico
    }

    // --- MOVIDO: La llamada a addCloseListeners se hará en init() ---
    // this.addCloseListeners();
    console.log("ShopManager: Constructor finalizado (listeners se añadirán en init).");
  }

  /**
   * Inicializa la tienda cargando y procesando los datos JSON de los ítems,
   * crea los elementos HTML y añade los listeners necesarios.
   * @param itemJsonData - Array de objetos ShopItemJsonData cargados desde el JSON.
   */
  public init(itemJsonData: any[]): void { // Aceptar any[] y validar
    console.log("ShopManager: init - Procesando datos JSON de ítems...");
    this.items.clear();
    if (!Array.isArray(itemJsonData)) {
        console.error("ShopManager: Datos de ítems de tienda inválidos (no es un array).");
        return;
    }
    itemJsonData.forEach(itemData => {
        // TODO: Añadir validación más robusta de la estructura de itemData
        if (itemData?.id && typeof itemData.id === 'string') {
            this.items.set(itemData.id, itemData as ShopItemJsonData);
        } else {
            console.warn("ShopManager: Ítem inválido o sin ID en JSON.", itemData);
        }
    });
    console.log(`ShopManager: ${this.items.size} definiciones de ítems procesadas desde JSON.`);

    // Crear elementos HTML basados en los datos cargados
    this.createShopItemElements();

    // *** AÑADIR LISTENERS DESPUÉS DE CREAR ELEMENTOS ***
    this.addCloseListeners();
    console.log("ShopManager: Listeners de cierre añadidos.");
    // ***************************************************
  }

  /** Abre el popup de la tienda. */
  public openShop(): void {
    console.log("ShopManager: Abriendo tienda...");
    if (!this.shopPopupElement) {
        console.error("ShopManager: No se puede abrir la tienda, elemento popup no encontrado.");
        return;
    }
    this.updateShopUI(); // Asegurar que la UI esté actualizada antes de mostrar
    this.shopPopupElement.style.display = 'flex'; // Hacer visible
    void this.shopPopupElement.offsetHeight; // Forzar reflow para que la transición funcione
    this.shopPopupElement.classList.add('visible'); // Aplicar clase para transición de opacidad
    // Considerar pausar el juego aquí si es necesario
    // this.gameManager.pauseGame(); // Ejemplo
  }

  /** Cierra el popup de la tienda. */
  public closeShop(): void {
    console.log("ShopManager: Cerrando tienda...");
    if (!this.shopPopupElement) return;

    this.hideTooltip(); // Ocultar tooltip si está visible
    this.shopPopupElement.classList.remove('visible'); // Iniciar transición de opacidad

    // Esperar que termine la transición CSS antes de ocultar con display:none
    const transitionDuration = 300; // Debe coincidir con la duración en style.css
    setTimeout(() => {
        // Doble check por si se volvió a abrir rápidamente
        if (!this.shopPopupElement?.classList.contains('visible')) {
            this.shopPopupElement.style.display = 'none';
        }
    }, transitionDuration);

    // Considerar reanudar el juego si se pausó
    // this.gameManager.resumeGame(); // Ejemplo
  }

  /** Actualiza la UI de la tienda basándose en PlayerData y los datos JSON de los ítems. */
  public updateShopUI(): void {
    if (!this.playerData) return;

    // Actualizar puntuación del jugador
    if (this.shopPlayerScoreElement) {
        this.shopPlayerScoreElement.textContent = `Puntos: ${this.playerData.score}`;
    }

    // Actualizar estado visual de cada ítem (disabled, purchased, max-level)
    this.itemElements.forEach((itemElement, itemId) => {
        const itemData = this.items.get(itemId);
        if (!itemData) return; // Saltar si el ítem no existe

        // Calcular estados basados en los datos JSON y PlayerData
        const cost = this.calculateItemCost(itemData);
        const isAffordable = this.playerData.score >= cost;
        const isPurchased = this.checkItemIsPurchased(itemData);
        const canPurchase = this.checkItemCanPurchase(itemData);
        const level = this.getItemLevel(itemData);
        const isMaxLevel = itemData.isLeveled && typeof itemData.maxLevel === 'number' && level >= itemData.maxLevel;

        // Aplicar/Quitar clases CSS según el estado
        itemElement.classList.remove('disabled', 'purchased', 'max-level'); // Limpiar clases primero
        if (isMaxLevel) {
            itemElement.classList.add('max-level', 'disabled'); // Max nivel tiene precedencia
        } else if (isPurchased && !itemData.isLeveled) {
            itemElement.classList.add('purchased', 'disabled'); // Ítem no mejorable ya adquirido
        } else if (!canPurchase || !isAffordable) {
            itemElement.classList.add('disabled'); // No cumple condición o no alcanza el costo
        }
    });

     // Actualizar tooltip si hay un ítem hovereado (para reflejar cambios si la tienda estaba abierta)
     const hoveredItem = document.querySelector('.shop-item:hover');
     if (hoveredItem && this.tooltipElement?.classList.contains('visible')) {
         this.showTooltipForItem((hoveredItem as HTMLElement).dataset.itemId || '');
     }
  }

  /** Manejador de clic para un ítem de la tienda. */
  private handleItemClick(event: MouseEvent): void {
    const itemElement = event.currentTarget as HTMLElement;
    const itemId = itemElement?.dataset.itemId;

    // Validar que el ítem existe y no está deshabilitado
    if (!itemId || !this.items.has(itemId)) { console.error("Click en ítem inválido o sin ID."); return; }
    if (itemElement.classList.contains('disabled')) {
        console.log(`Intento de compra de ítem deshabilitado: ${itemId}`);
        this.showTooltipForItem(itemId); // Mostrar tooltip para ver la razón
        return;
    }

    const itemData = this.items.get(itemId)!; // Sabemos que existe por el check anterior
    console.log(`Intentando comprar ítem: ${itemId} (Action ID: ${itemData.actionId})`);

    // Ejecutar la acción de compra correspondiente
    const purchaseSuccessful = this.executePurchaseAction(itemData.actionId);

    // Dar feedback y actualizar UI
    if (purchaseSuccessful) {
        console.log(`Compra exitosa de ${itemId}`);
        this.gameManager.getAudioManager().playSound('purchase'); // Sonido de compra
        this.updateShopUI(); // Actualizar estado visual de todos los ítems
        this.showTooltipForItem(itemId); // Actualizar tooltip del ítem comprado
    } else {
        console.log(`Compra fallida de ${itemId}`);
        // Mostrar tooltip actualizado (probablemente indicará puntos insuficientes ahora)
        this.showTooltipForItem(itemId);
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

   /** Muestra el tooltip con la información actualizada para un ítem. */
  private showTooltipForItem(itemId: string): void {
    const itemData = this.items.get(itemId);
    // Validar que todo lo necesario exista
    if (!itemData || !this.tooltipElement || !this.playerData ||
        !this.tooltipNameElement || !this.tooltipEffectElement ||
        !this.tooltipLevelElement || !this.tooltipCostElement ||
        !this.tooltipStatusElement) {
        this.hideTooltip(); // Ocultar si falta algo
        return;
    }

    // Calcular valores dinámicos
    const cost = this.calculateItemCost(itemData);
    const isAffordable = this.playerData.score >= cost;
    const isPurchased = this.checkItemIsPurchased(itemData);
    const canPurchase = this.checkItemCanPurchase(itemData);
    const level = this.getItemLevel(itemData);
    const isMaxLevel = itemData.isLeveled && typeof itemData.maxLevel === 'number' && level >= itemData.maxLevel;
    const effectText = this.formatEffectText(itemData); // Obtener texto de efecto formateado

    // Actualizar contenido del tooltip
    this.tooltipNameElement.textContent = itemData.name;
    this.tooltipEffectElement.textContent = effectText;

    // Mostrar/Ocultar y actualizar nivel
    if (itemData.isLeveled && level >= 0) {
        this.tooltipLevelElement.textContent = `Nivel: ${level}`;
        this.tooltipLevelElement.classList.remove('hidden');
    } else {
        this.tooltipLevelElement.classList.add('hidden');
    }

    // Actualizar costo
    this.tooltipCostElement.textContent = isMaxLevel ? "Nivel Máximo" : `Costo: ${cost}`;

    // Determinar y mostrar estado (si aplica)
    let statusText = '';
    if (isMaxLevel) {
        statusText = "Nivel Máximo Alcanzado";
    } else if (isPurchased && !itemData.isLeveled) {
        statusText = "Ya comprado / Activo";
    } else if (!canPurchase && !isMaxLevel) { // Evitar "No disponible" si está a max nivel
        statusText = "No disponible";
    } else if (!isAffordable) {
        statusText = "Puntos insuficientes";
    }

    if (statusText) {
        this.tooltipStatusElement.textContent = statusText;
        this.tooltipStatusElement.classList.remove('hidden');
    } else {
        this.tooltipStatusElement.classList.add('hidden');
    }

    // Hacer visible el tooltip
    this.tooltipElement.classList.add('visible');
  }


  /** Crea los elementos HTML para cada ítem de la tienda basado en this.items. */
  private createShopItemElements(): void {
     if (!this.shopItemsContainerElement) {
         console.error("ShopManager: No se encontró el contenedor #shop-items-container. No se pueden crear ítems.");
         return;
     }
     this.shopItemsContainerElement.innerHTML = ''; // Limpiar contenedor existente
     this.itemElements.clear(); // Limpiar mapa de referencias a elementos
     console.log(`Creando elementos HTML para ${this.items.size} ítems...`);

     // Agrupar ítems por categoría para renderizar en secciones
     const itemsByCategory: { [key: string]: ShopItemJsonData[] } = {};
     this.items.forEach(item => {
         const category = item.category || 'general'; // Categoría por defecto
         if (!itemsByCategory[category]) {
             itemsByCategory[category] = [];
         }
         itemsByCategory[category].push(item);
     });

     // Iterar sobre las categorías y crear secciones
     for (const category in itemsByCategory) {
         // Crear título de la sección
         const sectionTitle = document.createElement('h3');
         sectionTitle.className = 'shop-section-title'; // Usar clase CSS definida
         sectionTitle.textContent = this.formatCategoryTitle(category); // Formatear nombre de categoría
         this.shopItemsContainerElement.appendChild(sectionTitle);

         // Crear contenedor para los ítems de esta categoría
         const categoryItemsContainer = document.createElement('div');
         categoryItemsContainer.className = 'shop-section-items'; // Usar clase CSS definida
         this.shopItemsContainerElement.appendChild(categoryItemsContainer);

         // Ordenar ítems dentro de la categoría (opcional, ej. por ID)
         itemsByCategory[category].sort((a, b) => a.id.localeCompare(b.id));

         // Crear elemento HTML para cada ítem en la categoría
         itemsByCategory[category].forEach(itemData => {
             const itemElement = document.createElement('div');
             itemElement.className = 'shop-item'; // Clase base del ítem
             itemElement.dataset.itemId = itemData.id; // Guardar ID para identificarlo al hacer clic/hover

             const iconElement = document.createElement('span');
             iconElement.className = 'shop-item-icon'; // Clase para el icono
             iconElement.textContent = itemData.icon || '❓'; // Usar icono del JSON o fallback
             itemElement.appendChild(iconElement);

             // Añadir listeners para interacción
             itemElement.addEventListener('click', (e) => this.handleItemClick(e));
             itemElement.addEventListener('mouseover', (e) => this.handleItemMouseOver(e));
             itemElement.addEventListener('mouseout', () => this.hideTooltip());

             categoryItemsContainer.appendChild(itemElement); // Añadir a la sección
             this.itemElements.set(itemData.id, itemElement); // Guardar referencia al elemento creado
         });
     }
     console.log("Elementos HTML de ítems creados.");
     this.updateShopUI(); // Aplicar estado inicial (disabled/purchased/etc.)
  }

   /** Formatea el nombre de la categoría para mostrarlo en la UI. */
  private formatCategoryTitle(categoryKey: string): string {
      // Mapeo simple, puede expandirse
      if (categoryKey === 'consumable') return 'Consumibles';
      if (categoryKey === 'unlockable') return 'Desbloqueables';
      if (categoryKey === 'upgradeable') return 'Mejorables';
      return 'General'; // Fallback
  }

  /** Añade los listeners para cerrar la tienda (botón y click fuera). */
  private addCloseListeners(): void {
      // Listener para el botón de cierre (X)
      if (this.shopCloseButtonElement) {
          // Crear la función listener una vez y guardarla para poder removerla después
          this.closeButtonListener = () => this.closeShop();
          this.shopCloseButtonElement.addEventListener('click', this.closeButtonListener);
      } else {
          console.warn("ShopManager: Botón de cierre no encontrado, no se añadió listener.");
      }

      // Listener para hacer clic fuera del contenido de la tienda (en el overlay/backdrop)
      if (this.shopPopupElement) {
          // Crear la función listener una vez
          this.backdropClickListener = (event: MouseEvent) => {
              // Cerrar solo si el clic fue directamente en el overlay (no en sus hijos)
              if (event.target === this.shopPopupElement) {
                  this.closeShop();
              }
          };
          this.shopPopupElement.addEventListener('click', this.backdropClickListener);
      }
  }

  /** Limpia los listeners al destruir el ShopManager. */
  public destroy(): void {
       console.log("ShopManager: Destruyendo y limpiando listeners...");
       // Remover listeners usando las referencias guardadas
       if (this.closeButtonListener && this.shopCloseButtonElement) {
           this.shopCloseButtonElement.removeEventListener('click', this.closeButtonListener);
           this.closeButtonListener = null;
       }
       if (this.backdropClickListener && this.shopPopupElement) {
           this.shopPopupElement.removeEventListener('click', this.backdropClickListener);
           this.backdropClickListener = null;
       }
       // Limpiar listeners de los ítems individuales
       this.itemElements.forEach(itemElement => {
           // Remover listeners anónimos puede ser complejo, idealmente se guardarían referencias
           // o se podría clonar y reemplazar el nodo para limpiarlos, pero es más simple
           // asegurarse que el contenedor se elimine correctamente.
       });
       this.itemElements.clear(); // Limpiar mapa de referencias
       console.log("ShopManager: Listeners limpiados.");
  }

  // --- Funciones Helper para Interpretar JSON ---

  /** Calcula el costo de un ítem basado en sus parámetros JSON y PlayerData. */
  private calculateItemCost(itemData: ShopItemJsonData): number {
      const costParams = itemData.cost;
      let cost = costParams.base; // Costo base siempre se aplica

      if (itemData.isLeveled) {
          // Calcular nivel actual del ítem
          const levelRef = itemData.levelRef;
          const currentLevel = levelRef ? (this.playerData as any)[levelRef] ?? 0 : 0;

          // Aplicar fórmula según el tipo de costo
          if (costParams.type === 'exponential' && typeof costParams.multiplier === 'number') {
              cost = costParams.base * Math.pow(costParams.multiplier, currentLevel);
          } else { // Asumir linear por defecto o si el tipo no es exponential
              cost = costParams.base + (costParams.perLevel ?? 0) * currentLevel;
          }
      } else if (costParams.levelRef && typeof costParams.perLevel === 'number') {
           // Costo basado en otro nivel (ej: costo de vida basado en vidas actuales)
           const linkedLevel = (this.playerData as any)[costParams.levelRef] ?? 0;
           cost = costParams.base + costParams.perLevel * linkedLevel;
      }
      // Añadir más lógicas de costo aquí si son necesarias

      return Math.round(cost); // Redondear costo final
  }

  /** Formatea el texto de efecto reemplazando placeholders con valores de PlayerData. */
  private formatEffectText(itemData: ShopItemJsonData): string {
      let text = itemData.effectTemplate;

      // Reemplazar placeholders específicos conocidos
      text = text.replace('{lives}', this.playerData.lives.toString());

      // Reemplazar placeholders basados en chequeos de estado
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

      // Reemplazar placeholder genérico {currentValue} para ítems mejorables
      if (text.includes('{currentValue}')) {
          let currentValue: string | number = '?';
          // Determinar qué valor mostrar basado en el ID del ítem
          if (itemData.id === 'comboMultiplier') currentValue = this.playerData.getCurrentComboMultiplier().toFixed(1);
          else if (itemData.id === 'inkCostReduction') currentValue = this.playerData.getCurrentInkCostPerPixel().toFixed(2);
          // Añadir más casos aquí para otros ítems que usen {currentValue}
          text = text.replace('{currentValue}', currentValue.toString());
      }

      return text;
  }

  /** Verifica si un ítem cumple la condición 'isPurchasedCheck' del JSON. */
   private checkItemIsPurchased(itemData: ShopItemJsonData): boolean {
       if (!itemData.isPurchasedCheck) return false; // Si no hay check, no se considera "comprado"

       const check = itemData.isPurchasedCheck;
       const valueRef = check.valueRef;
       const currentValue = (this.playerData as any)[valueRef];

       if (typeof currentValue === 'undefined') return false; // Valor no existe en PlayerData

       switch (check.condition) {
           case 'isTrue': return currentValue === true;
           case 'isFalse': return currentValue === false;
           case 'greaterThan': return typeof currentValue === 'number' && typeof check.limit === 'number' && currentValue > check.limit;
           // Añadir más condiciones si es necesario (ej. 'equals', 'notEquals')
           default:
               console.warn(`Condición isPurchasedCheck desconocida: ${check.condition}`);
               return false;
       }
   }

  /** Verifica si un ítem cumple la condición 'purchaseCheck' del JSON. */
   private checkItemCanPurchase(itemData: ShopItemJsonData): boolean {
       if (!itemData.purchaseCheck) return true; // Si no hay check, se asume que sí se puede (costo aparte)

       const check = itemData.purchaseCheck;
       const valueRef = check.valueRef;
       const currentValue = (this.playerData as any)[valueRef];

       if (typeof currentValue === 'undefined') {
            console.warn(`Purchase check failed for ${itemData.id}: valueRef '${valueRef}' not found in PlayerData.`);
            return false; // No se puede verificar la condición
       }

       // Evaluar la condición
       switch (check.condition) {
           case 'lessThan': return typeof currentValue === 'number' && typeof check.limit === 'number' && currentValue < check.limit;
           case 'lessThanOrEqual': return typeof currentValue === 'number' && typeof check.limit === 'number' && currentValue <= check.limit;
           case 'isFalse': return currentValue === false;
           case 'isTrue': return currentValue === true;
           case 'greaterThan': return typeof currentValue === 'number' && typeof check.limit === 'number' && currentValue > check.limit;
           case 'greaterThanOrEqual': return typeof currentValue === 'number' && typeof check.limit === 'number' && currentValue >= check.limit;
           // Añadir más condiciones si es necesario
           default:
                console.warn(`Condición purchaseCheck desconocida: ${check.condition}`);
                return false;
       }
   }

   /** Obtiene el nivel actual de un ítem mejorable desde PlayerData. */
   private getItemLevel(itemData: ShopItemJsonData): number {
       if (!itemData.isLeveled || !itemData.levelRef) return -1; // No aplicable
       // Acceder dinámicamente a la propiedad de PlayerData usando la clave guardada en levelRef
       return (this.playerData as any)[itemData.levelRef] ?? 0; // Devolver 0 si no existe
   }

  // --- Ejecutor de Acciones de Compra ---

  /** Ejecuta la acción de compra basada en el actionId, verificando costo y condiciones. */
  private executePurchaseAction(actionId: string): boolean {
      const itemData = this.items.get(actionId);
      if (!itemData) {
          console.error(`No se encontró itemData para actionId: ${actionId}`);
          return false;
      }

      const cost = this.calculateItemCost(itemData); // Calcular costo actual
      const canAfford = this.playerData.score >= cost;
      const passesCheck = this.checkItemCanPurchase(itemData); // Verificar condición específica
      const level = this.getItemLevel(itemData);
      const isMaxLevel = itemData.isLeveled && typeof itemData.maxLevel === 'number' && level >= itemData.maxLevel;

      // Verificar todas las condiciones antes de proceder
      if (!canAfford || !passesCheck || isMaxLevel) {
            console.log(`executePurchaseAction ${actionId}: Falló chequeo pre-compra (Afford: ${canAfford}, Check: ${passesCheck}, MaxLevel: ${isMaxLevel})`);
            return false; // No se puede comprar
      }

      let success = false;
      // Restar costo ANTES de intentar la acción
      this.playerData.score -= cost;

      // Llamar al método de acción correspondiente basado en actionId
      switch (actionId) {
          case 'purchaseLife': success = this.purchaseLifeAction(); break;
          case 'purchaseShield': success = this.purchaseShieldAction(); break;
          case 'purchaseHint': success = this.purchaseHintAction(); break;
          case 'purchaseUnlockDrawing': success = this.purchaseUnlockDrawingAction(); break;
          case 'purchaseComboMultiplier': success = this.purchaseComboMultiplierAction(); break;
          case 'purchaseInkCostReduction': success = this.purchaseInkCostReductionAction(); break;
          // Añadir casos para 'purchaseExtraCatSpawn', 'purchaseMaxCatsIncrease' si se implementan
          default:
              console.error(`Acción de compra desconocida: ${actionId}`);
              // Revertir costo si la acción no existe
              this.playerData.score += cost;
              success = false;
      }

       // Si la acción específica falló por alguna razón interna (aunque no deberían fallar ahora), revertir costo
       if (!success) {
            console.warn(`Acción ${actionId} falló internamente, revirtiendo costo.`);
            this.playerData.score += cost;
       }

      return success; // Indicar si la compra (incluyendo la acción) fue exitosa
  }

   /** Calcula el costo de un ítem por su ID. Devuelve -1 si no se encuentra. */
   private calculateItemCostById(itemId: string): number {
       const itemData = this.items.get(itemId);
       if (!itemData) {
           console.error(`Item ${itemId} no encontrado para calcular costo.`);
           return -1; // Indicar error
       }
       return this.calculateItemCost(itemData); // Reutilizar helper
   }

  // --- Acciones de Compra Reales (Modifican PlayerData o llaman a GameManager) ---
  // Estas funciones ahora solo aplican el efecto, asumiendo que el costo y las condiciones ya se verificaron.

  private purchaseLifeAction(): boolean {
    console.log("ShopManager: Ejecutando compra Vida...");
    this.gameManager.incrementLives(); // Llama a GameManager para manejar la lógica de vidas
    return true; // Asumir éxito si se llama
  }

  private purchaseShieldAction(): boolean {
    console.log("ShopManager: Ejecutando compra Escudo...");
    this.playerData.hasShield = true; // Actualizar PlayerData
    this.gameManager.updateExternalShieldUI(true); // Notificar a la UI externa
    return true;
  }

  private purchaseHintAction(): boolean {
      console.log("ShopManager: Ejecutando compra Pista...");
      const HINT_CHARGES_PER_PURCHASE = 3; // Podría venir del JSON si se necesita flexibilidad
      this.playerData.hintCharges += HINT_CHARGES_PER_PURCHASE; // Añadir cargas
      this.gameManager.updateExternalHintUI(this.playerData.hintCharges); // Notificar a la UI externa
      return true;
  }

  private purchaseUnlockDrawingAction(): boolean {
    console.log("ShopManager: Ejecutando desbloqueo Dibujo...");
    this.playerData.isDrawingUnlocked = true; // Actualizar PlayerData
    this.gameManager.enableDrawingFeature(); // Llamar a GameManager para activar UI/funcionalidad
    return true;
  }

  private purchaseComboMultiplierAction(): boolean {
    console.log("ShopManager: Ejecutando compra Mejora Multiplicador Combo...");
    // Asegurarse que levelRef exista en el JSON para este ítem
    const levelRef = this.items.get('comboMultiplier')?.levelRef;
    if (levelRef && typeof (this.playerData as any)[levelRef] === 'number') {
        (this.playerData as any)[levelRef]++; // Incrementar nivel en PlayerData
        return true;
    } else {
        console.error("Error al comprar Combo Multiplier: levelRef no definido o inválido en PlayerData.");
        return false; // Indicar fallo
    }
  }

  private purchaseInkCostReductionAction(): boolean {
     console.log("ShopManager: Ejecutando compra Mejora Reducción Costo Tinta...");
     // Asegurarse que levelRef exista
     const levelRef = this.items.get('inkCostReduction')?.levelRef;
     if (levelRef && typeof (this.playerData as any)[levelRef] === 'number') {
        (this.playerData as any)[levelRef]++; // Incrementar nivel
        // El costo se calculará dinámicamente usando el nuevo nivel
        // Podrías notificar a un InkManager si existiera
        return true;
     } else {
         console.error("Error al comprar Ink Cost Reduction: levelRef no definido o inválido.");
         return false;
     }
  }

  // Añadir aquí purchaseExtraCatSpawnAction y purchaseMaxCatsIncreaseAction si implementas esos ítems

} // Fin clase ShopManager