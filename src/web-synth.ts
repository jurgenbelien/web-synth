import { LitElement, html } from 'lit';
import { customElement } from 'lit/decorators.js';

const ELEMENT_NAME = 'web-synth';
@customElement(ELEMENT_NAME)
export class WebSynth extends LitElement {
  render() {
    return html`
      <h1>Web Synth</h1>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    [ELEMENT_NAME]: WebSynth;
  }
}
