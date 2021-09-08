import { Parameter, Value } from "./parameters";

export class Sequencer<T extends Parameter> {
  private _index = 0;
  private _values: T[];

  constructor(steps: number, initializer: () => T) {
    this._values = [...Array(steps)].map(() => initializer());
  }

  get values() {
    return this._values;
  }

  get index() {
    return this._index;
  }

  get current() {
    return this._values[this._index];
  }

  next() {
    this._index = (this._index + 1) % this._values.length;
  }

  step() {
    const current = this.current;
    this.next();
    return current;
  }

  set(value: Value, index: number) {
    this._values[index].value = value;
  }

}
