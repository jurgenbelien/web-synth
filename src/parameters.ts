export enum Taper {
  LIN = 'lin',
  LOG = 'log',
}

export type Value = number;

export class Parameter {
  value: Value;
  private _min: Value;
  private _max: Value;
  private _taper: Taper;

  constructor(initial: Value, max: Value, min = 0, taper: Taper = Taper.LOG) {
    this.value = initial;
    this._max = max;
    this._min = min;
    this._taper = taper;
  }

  get min() {
    return this._min;
  }

  get max() {
    return this._max;
  }

  get taper() {
    return this._taper;
  }

  get relative() {
    let value = this.value;
    let min = this.min;
    let max = this.max;

    if (this.taper === Taper.LOG) {
      value = Math.log2(this.value);
      min = Math.log2(this.min);
      max = Math.log2(this.max);
    }
    return (value - min) / (max - min);
  }

  set relative(relative) {
    let value;
    if (this.taper === Taper.LOG) {
      const min = Math.log2(this.min);
      const max = Math.log2(this.max);
      value = Math.pow(2, relative * (max - min) + min);
    } else {
      const min = this.min;
      const max = this.max;
      value = relative * (max - min) + min;
    }
    this.value = value;
  }
}

export class LinParameter extends Parameter {
  constructor(initial: Value, max: Value, min: Value = 0) {
    super(initial, max, min, Taper.LIN);
  }
}

export class LogParameter extends Parameter {
  constructor(initial: Value, max: Value, min: Value = 0.001) {
    super(initial, max, min, Taper.LOG);
  }
}

/**
 * Duration parameter in milliseconds
 *
 * @export
 * @class Duration
 * @extends {Parameter}
 */
export class Duration extends LinParameter {
  constructor(milliseconds = 0, max = 1000, min = 0) {
    super(milliseconds, max, min);
  }
  set seconds(value) {
    this.value = value * 1000;
  }
  get seconds() {
    return this.value / 1000;
  }
  set milliseconds(value) {
    this.value = value;
  }
  get milliseconds() {
    return this.value;
  }
}

export class Pitch extends LinParameter {
  constructor(initial = 0.0, max = 5.0, min = -5.0) {
    super(initial, max, min);
  }
  toFrequency(base: number) {
    return Pitch.pitchToFrequency(this.value, base);
  }
  static pitchToFrequency(pitch: number, base: number) {
    return base * Math.pow(2, pitch);
  }
}

/**
 * Frequency in BPM
 *
 * @export
 * @class Tempo
 * @extends {Parameter}
 */
export class Tempo extends LinParameter {
  constructor(initial = 120, max = 360, min = 10) {
    super(initial, max, min);
  }
  get interval() {
    return 60 * 1000 / this.value;
  }
  get frequency() {
    return this.value / 60;
  }
}

