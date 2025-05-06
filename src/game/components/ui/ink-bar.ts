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
  @property({ type: Number }) maxInkPerBar = 1000;
  @property({ type: Array }) rainbowColors: string[] = DEFAULT_RAINBOW_COLORS;
  @property({ type: String }) defaultBgColor: string = DEFAULT_BACKGROUND_COLOR;

  // --- Estado Interno (Calculado) ---
  @state() private _fullBars = 0;
  @state() private _currentBarPercentage = 0;
  @state() private _containerBgColor = DEFAULT_BACKGROUND_COLOR;
  @state() private _segmentBgColor = DEFAULT_RAINBOW_COLORS[0];

  // --- Estilos Encapsulados ---
  static styles: CSSResultGroup = css`
    :host {
      display: block;
      width: 120px;
      height: 12px;
      border-radius: 6px;
      overflow: hidden;
      position: relative;
      border: 1px solid #4b5563;
      /* <<< CORRECCIÓN: Solo usar la variable CSS >>> */
      background-color: var(--container-bg-color);
      transition: background-color 0.3s ease-out;
      box-sizing: border-box;
    }

    .ink-bar-segment {
      position: absolute;
      top: 0;
      left: 0;
      height: 100%;
      border-radius: inherit;
      /* <<< CORRECCIÓN: Solo usar la variable CSS >>> */
      background-color: var(--segment-bg-color);
      width: 0%; /* El ancho se establece dinámicamente */
      transition: width 0.3s ease-out, background-color 0.3s ease-out;
    }

    /* Media Queries (sin cambios) */
    @media (min-width: 768px) {
       /* :host { ... } */
    }
  `;

  // --- Ciclo de Vida: Calcular estado cuando las propiedades cambian ---
  protected updated(changedProperties: PropertyValueMap<any> | Map<PropertyKey, unknown>): void {
    super.updated(changedProperties);
    if (changedProperties.has('currentInk') || changedProperties.has('maxInkPerBar') || changedProperties.has('rainbowColors') || changedProperties.has('defaultBgColor')) {
      this._calculateBarState();
    }
  }

  // --- Lógica Interna (Sin cambios necesarios aquí, ya maneja el default) ---
  private _calculateBarState() {
    if (this.maxInkPerBar <= 0) {
        this._fullBars = 0;
        this._currentBarPercentage = 0;
        this._containerBgColor = this.defaultBgColor; // Usa la propiedad
        this._segmentBgColor = (this.rainbowColors.length > 0 ? this.rainbowColors : DEFAULT_RAINBOW_COLORS)[0];
        return;
    }

    this._fullBars = Math.max(0, Math.floor(this.currentInk / this.maxInkPerBar));
    const currentBarInk = this.currentInk % this.maxInkPerBar;

    if (this.currentInk > 0 && currentBarInk === 0) {
        this._currentBarPercentage = 100;
        this._fullBars = Math.max(0, this._fullBars - 1);
    } else {
        this._currentBarPercentage = (this.currentInk <= 0)
            ? 0
            : (currentBarInk / this.maxInkPerBar) * 100;
    }

    const colors = this.rainbowColors.length > 0 ? this.rainbowColors : DEFAULT_RAINBOW_COLORS;
    const numColors = colors.length;

    // Color de fondo (usa defaultBgColor si no hay barras llenas)
    this._containerBgColor = this._fullBars > 0
      ? colors[(this._fullBars - 1) % numColors]
      : this.defaultBgColor; // Usa la propiedad

    // Color del segmento
    this._segmentBgColor = colors[this._fullBars % numColors];
  }

  // --- Template HTML (Sin cambios) ---
  render() {
    // Inyectar las variables CSS calculadas para los estilos
    const dynamicStyles = html`
      <style>
        :host {
          --container-bg-color: ${this._containerBgColor};
        }
        .ink-bar-segment {
          --segment-bg-color: ${this._segmentBgColor};
          width: ${this._currentBarPercentage}%;
        }
      </style>
    `;

    return html`
      ${dynamicStyles}
      <div class="ink-bar-segment" part="segment"></div>
    `;
  }
}

// Declaración global (sin cambios)
declare global {
  interface HTMLElementTagNameMap {
    'ink-bar': InkBar;
  }
}