import { html, css, LitElement } from 'lit';
import { customElement, property } from 'lit/decorators.js';

import { Parameter } from './parameters';

export enum InputType {
  RANGE = 'range',
}

const ELEMENT_NAME = 'parameter-input';

@customElement(ELEMENT_NAME)
export class ParameterInput extends LitElement {
  @property({ type: String })
  name: string = ELEMENT_NAME;

  @property({ type: String })
  type: InputType = InputType.RANGE;

  @property({ type: Object })
  parameter!: Parameter;

  private precision = 0.01;

  updateInput(event: InputEvent) {
    this.parameter.relative = Number((event.currentTarget as HTMLInputElement).value)
  }

  render() {
    return html`
      <label for=${this.name}>
        <slot></slot>
      </label>
      <input
          id=${this.name}
          type="range"
          min="0"
          max="1"
          step=${this.precision}
          value=${this.parameter.relative}
          @input=${this.updateInput}
        >
    `;
  }

  static get styles() {
    return css`
      :host {
        display: block;
        margin-bottom: 1em;
        line-height: 1;
        position: relative;
        color: inherit;
      }
      label {
        text-align: inherit;
        display: block;
      }
      input {
        width: inherit;
        appearance: none;
        -webkit-appearance: none;
        border-radius: 1em;
        background-color: lightgrey;
        border: 1px solid currentColor;
      }

    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    [ELEMENT_NAME]: ParameterInput;
  }
}
