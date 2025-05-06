// src/game/components/ui/ink-bar.ts
import { LitElement, html, css, CSSResultGroup, PropertyValueMap } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';

// Colores por defecto si no se proporcionan
const DEFAULT_RAINBOW_COLORS = ['#a78bfa', '#7c3aed', '#2563eb', '#34d399', '#facc15', '#f97316', '#ef4444'];
const DEFAULT_BACKGROUND_COLOR = '#374151'; // Gris oscuro

@customElement('ink-bar')
export class InkBar extends LitElement {

  // --- Propiedades (Inputs) ---
  @property({ type: Number }) currentInk = 0;
  @property({ type: Number }) maxInkPerBar = 1000; // Valor por defecto razonable
  @property({ type: Array }) rainbowColors: string[] = DEFAULT_RAINBOW_COLORS;
  @property({ type: String }) defaultBgColor: string = DEFAULT_BACKGROUND_COLOR;

  // --- Estado Interno (Calculado) ---
  @state() private _fullBarsCompleted = 0; // Cuántas barras están 100% llenas
  @state() private _currentBarPercentage = 0; // Porcentaje de la barra actual
  @state() private _containerBgColor = DEFAULT_BACKGROUND_COLOR; // Color de fondo (barra anterior)
  @state() private _segmentBgColor = DEFAULT_RAINBOW_COLORS[0]; // Color del segmento actual

  // --- Estilos Encapsulados ---
  static styles: CSSResultGroup = css`
    :host {
      display: block; /* Ocupa el espacio asignado */
      width: 120px; /* Ancho base (móvil/default) */
      height: 12px; /* Altura base (móvil/default) */
      border-radius: 6px; /* Mitad de la altura */
      overflow: hidden;
      position: relative;
      border: 1px solid #4b5563; /* Borde como en el original */
      background-color: var(--container-bg-color); /* Usa variable CSS */
      transition: background-color 0.3s ease-out; /* Transición suave del fondo */
      box-sizing: border-box;
    }

    .ink-bar-segment {
      position: absolute;
      top: 0;
      left: 0;
      height: 100%;
      border-radius: inherit; /* Heredar redondeo */
      background-color: var(--segment-bg-color); /* Usa variable CSS */
      width: 0%; /* Inicial, se actualiza dinámicamente */
      transition: width 0.3s ease-out, background-color 0.3s ease-out; /* Transición suave */
    }

    /* Media Queries para ajustar tamaño si es necesario */
    @media (min-width: 768px) {
       /* :host { ... } */
    }
  `;

  // --- Ciclo de Vida: Calcular estado cuando las propiedades cambian ---
  protected updated(changedProperties: PropertyValueMap<any> | Map<PropertyKey, unknown>): void {
    super.updated(changedProperties);
    // Recalcular si alguna propiedad relevante cambió
    if (changedProperties.has('currentInk') || changedProperties.has('maxInkPerBar') || changedProperties.has('rainbowColors') || changedProperties.has('defaultBgColor')) {
      this._calculateBarState();
    }
  }

  // --- Lógica Interna (Revisada) ---
  private _calculateBarState() {
    const ink = Math.max(0, this.currentInk); // Asegurar que no sea negativo
    const capacity = this.maxInkPerBar > 0 ? this.maxInkPerBar : 1000; // Evitar división por cero
    const colors = this.rainbowColors.length > 0 ? this.rainbowColors : DEFAULT_RAINBOW_COLORS;
    const numColors = colors.length;

    // Calcular cuántas barras están 100% completas
    this._fullBarsCompleted = Math.floor(ink / capacity);

    // Calcular el porcentaje de la barra *actual* (la que se está llenando)
    const remainderInk = ink % capacity;

    if (ink === 0) {
        this._currentBarPercentage = 0;
        this._fullBarsCompleted = 0; // Asegurar que sea 0
    } else if (remainderInk === 0) {
        // Si es un múltiplo exacto (y no es 0), la barra *anterior* se completó al 100%
        this._currentBarPercentage = 100;
        // El número de barras completadas es uno menos que el total de barras alcanzadas
        this._fullBarsCompleted = Math.max(0, Math.floor(ink / capacity) - 1);
    } else {
        // Barra parcialmente llena
        this._currentBarPercentage = (remainderInk / capacity) * 100;
        // _fullBarsCompleted ya es correcto (el número de barras completadas antes de esta)
    }

    // Determinar color de fondo del contenedor: Es el color de la ÚLTIMA barra completada.
    // Si no hay barras completas, es el color por defecto.
    this._containerBgColor = this._fullBarsCompleted > 0
      ? colors[(this._fullBarsCompleted - 1) % numColors] // Usa el índice de la última barra completa
      : this.defaultBgColor;

    // Determinar color del segmento actual: Es el color correspondiente al índice de la barra que se está llenando ahora.
    // El índice de la barra actual es `_fullBarsCompleted` (0 para la primera, 1 para la segunda, etc.)
    this._segmentBgColor = colors[this._fullBarsCompleted % numColors];

    // Log para depuración (puedes quitarlo después)
    // console.log(`InkBar Update: ink=${ink.toFixed(0)}, capacity=${capacity}`);
    // console.log(` -> fullBarsCompleted=${this._fullBarsCompleted}, currentPerc=${this._currentBarPercentage.toFixed(1)}%`);
    // console.log(` -> containerBg=${this._containerBgColor}, segmentBg=${this._segmentBgColor}`);

    // Forzar un re-renderizado podría no ser necesario con @state, pero no hace daño
    this.requestUpdate();
  }


  // --- Template HTML ---
  render() {
    // Inyectar las variables CSS calculadas para los estilos
    // Usamos `style` directamente en el div para el ancho, es más simple
    const dynamicStyles = html`
      <style>
        :host {
          --container-bg-color: ${this._containerBgColor};
        }
        .ink-bar-segment {
          --segment-bg-color: ${this._segmentBgColor};
          /* El ancho se aplica directamente abajo */
        }
      </style>
    `;

    return html`
      ${dynamicStyles}
      <div
        class="ink-bar-segment"
        part="segment"
        style="width: ${this._currentBarPercentage}%;"
      ></div>
    `;
  }
}

// Declaración global
declare global {
  interface HTMLElementTagNameMap {
    'ink-bar': InkBar;
  }
}