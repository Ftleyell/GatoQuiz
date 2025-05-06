// src/components/ui/test-element.ts
import { LitElement, html, css } from 'lit';
import { customElement } from 'lit/decorators.js';

@customElement('test-element')
export class TestElement extends LitElement {
  static styles = css`
    p {
      color: blue;
      font-size: 2rem; /* Hacerlo más visible */
      font-weight: bold;
      text-align: center;
      margin-top: 20px; /* Espacio para verlo */
    }
  `;

  render() {
    return html`<p>¡Lit funciona!</p>`;
  }
}