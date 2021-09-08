import './parameter-input';

import { LitElement, html, css } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { applyEnvelope } from './envelope';
import { NoiseNode } from './noise';
import { LinParameter, LogParameter, Duration, Pitch, Tempo } from './parameters';
import { Sequencer } from './sequencer';


const SEQUENCER_LENGTH = 8;

const ELEMENT_NAME = 'web-synth';
@customElement(ELEMENT_NAME)
export class WebSynth extends LitElement {
  @state() initialized = false;
  @state() playing = false;

  context = new AudioContext();

  get now() {
    return this.context.currentTime;
  }

  // Parameters
  @state() tempo = new Tempo(120);

  @state() oscDecay = new Duration(50);
  @state() osc1EnvAmount = new LinParameter(.02, 1, -1);
  @state() osc1Frequency = new LogParameter(50, 20000, 20);
  @state() osc1Gain = new LinParameter(1, 1, 0);
  @state() osc2EnvAmount = new LinParameter(0, 1, -1);
  @state() osc2Frequency = new LogParameter(500, 20000, 20);
  @state() osc2Gain = new LinParameter(1, 1, 0);

  @state() noiseGain = new LinParameter(0, 1);

  @state() filterCutoff = new LogParameter(20, 20000, 20);
  @state() filterResonance = new LogParameter(1, 1000, 0.0001);
  @state() filterDecay = new Duration(1000);
  @state() filterEnvAmount = new LinParameter(1, 1, -1);
  @state() filterModAmount = new LogParameter(8000, 10000, 0.0001)

  @state() outputDecay = new Duration(125);
  @state() outputGain = new LinParameter(.5, 1, 0);

  // Audio nodes
  osc1 = new OscillatorNode(this.context, {
    frequency: this.osc1Frequency.value,
    type: 'triangle'
  });
  osc2 = new OscillatorNode(this.context, {
    frequency: this.osc2Frequency.value,
    type: 'square'
  });
  noise = new NoiseNode(this.context);

  osc1Attenuator = new GainNode(this.context, { gain: this.osc1Gain.value });
  osc2Attenuator = new GainNode(this.context, { gain: this.osc2Gain.value });
  noiseAttenuator = new GainNode(this.context, { gain: this.noiseGain.value });

  filter = new BiquadFilterNode(this.context, {
    frequency: this.filterCutoff.value,
    Q: this.filterResonance.value,
  });
  filterModAttenuator = new GainNode(this.context, { gain: this.filterModAmount.value})
  outputAttenuator = new GainNode(this.context, { gain: 0 });

  // Sequencers
  pitchSequencer = new Sequencer<Pitch>(SEQUENCER_LENGTH, () => new Pitch(-5, 5, -5));
  velocitySequencer = new Sequencer<LinParameter>(SEQUENCER_LENGTH, () => new LinParameter(0, 1, 0));
  next() {
    this.pitchSequencer.next;
    this.velocitySequencer.next;
  }

  step() {
    if (!this.playing) return;

    const pitch = this.pitchSequencer.step();
    const velocity = this.velocitySequencer.step();
    this.trigger(pitch, velocity);

    setTimeout(() => {
      this.step();
    }, this.tempo.interval / 4); // BPM implies 1/4-notes, dividing by 4 results in 1/16ths
  }
  startStop() {
    this.playing = !this.playing;
    this.step();
  }

  constructor() {
    super();
    this.osc1.connect(this.osc1Attenuator);
    this.osc1Attenuator.connect(this.filter);
    this.osc1.connect(this.osc1Attenuator);
    this.osc1Gain.onChange = (value) => this.osc1Attenuator.gain.setValueAtTime(value, this.now);

    this.osc2.connect(this.osc2Attenuator);
    this.osc2Attenuator.connect(this.filter);
    this.osc2.connect(this.osc2Attenuator);
    this.osc2Gain.onChange = (value) => this.osc2Attenuator.gain.setValueAtTime(value, this.now);

    this.noise.connect(this.noiseAttenuator);
    this.noise.connect(this.filterModAttenuator);
    this.noiseGain.onChange = (value) => this.noiseAttenuator.gain.setValueAtTime(value, this.now);

    this.osc1Attenuator.connect(this.filter);
    this.osc2Attenuator.connect(this.filter);
    this.noiseAttenuator.connect(this.filter);

    this.filterModAttenuator.connect(this.filter.frequency);
    this.filterModAmount.onChange = (value) => this.filterModAttenuator.gain.setValueAtTime(value, this.now);
    this.filter.connect(this.outputAttenuator);

    this.outputAttenuator.connect(this.context.destination);

    // Kick/snare loop:
    this.velocitySequencer.set(1, 0);
    this.velocitySequencer.set(1, 4);
    this.pitchSequencer.set(5, 4); // Snare
  }

  connectedCallback() {
    super.connectedCallback();
    this.addEventListener('click', this.init, { once: true });
  }

  init() {
    // Start all sources
    Object.values(this)
      .filter(property => property instanceof AudioScheduledSourceNode)
      .forEach(source => source.start());
    this.initialized = true;
  }

  trigger(pitch: Pitch, velocity: LinParameter) {
    const outputEnvelope = [{
      from: this.outputGain.value * velocity.value,
      to: 0,
      duration: this.outputDecay.value
    }];

    const filterCutoffEnvelope = [{
      from: this.filterCutoff.value + this.filterCutoff.max * this.filterEnvAmount.value,
      to: this.filterCutoff.value,
      duration: this.filterDecay.value,
    }];

    const frequency1 = this.osc1Frequency.value;
    const pitchOsc1Envelope = [{
      from: frequency1 + this.osc1Frequency.max * this.osc1EnvAmount.value,
      to: frequency1,
      duration: this.oscDecay.value,
    }];

    const frequency2 = Pitch.pitchToFrequency(pitch.value, this.osc2Frequency.value);
    const pitchOsc2Envelope = [{
      from: frequency2 + this.osc2Frequency.max * this.osc2EnvAmount.value,
      to: frequency2,
      duration: this.oscDecay.value,
    }];

    applyEnvelope(this.outputAttenuator.gain, outputEnvelope, this.now);
    applyEnvelope(this.filter.frequency, filterCutoffEnvelope, this.now);
    applyEnvelope(this.osc1.frequency, pitchOsc1Envelope, this.now);
    applyEnvelope(this.osc2.frequency, pitchOsc2Envelope, this.now);
  }

  render() {
    return html`
      <h1>Web Synth</h1>
      <div class="columns">
        <div class="block">
          <fieldset>
            <legend>Sources</legend>
            <div class="columns">
              <fieldset>
                <legend>Pitch</legend>
                <parameter-input .parameter=${this.oscDecay}>
                  Envelope Decay
                </parameter-input>
              </fieldset>
              <fieldset>
                <legend>Oscillator 1</legend>
                <parameter-input .parameter=${this.osc1EnvAmount}>
                  Envelope Amount
                </parameter-input>
                <parameter-input .parameter=${this.osc1Frequency}>
                  Frequency
                </parameter-input>
              </fieldset>
              <fieldset>
                <legend>Oscillator 2</legend>
                <parameter-input .parameter=${this.osc2EnvAmount}>
                  Envelope Amount
                </parameter-input>
                <parameter-input .parameter=${this.osc2Frequency}>
                  Frequency
                </parameter-input>
              </fieldset>
              <fieldset>
                <legend>Mixer</legend>
                <parameter-input .parameter=${this.osc1Gain}>
                  VCO 1 Level
                </parameter-input>
                <parameter-input .parameter=${this.noiseGain}>
                  Noise Level
                </parameter-input>
                <parameter-input .parameter=${this.osc2Gain}>
                  VCO 2 Level
                </parameter-input>
              </fieldset>
            </div>
          </fieldset>
        </div>
        <div class="block">
          <fieldset>
            <legend>Filter</legend>
            <parameter-input .parameter=${this.filterCutoff}>
              Cutoff
            </parameter-input>
            <parameter-input .parameter=${this.filterResonance}>
              Resonance
            </parameter-input>
            <parameter-input .parameter=${this.filterDecay}>
              Envelope Decay
            </parameter-input>
            <parameter-input .parameter=${this.filterEnvAmount}>
              Envelope Amount
            </parameter-input>
            <parameter-input .parameter=${this.filterModAmount}>
              Modulation Amount
            </parameter-input>
          </fieldset>
        </div>
        <div class="block">
          <fieldset>
            <legend>Output</legend>
            <parameter-input .parameter=${this.outputGain}>
              Level
            </parameter-input>
            <parameter-input .parameter=${this.outputDecay}>
              Envelope Decay
            </parameter-input>
          </fieldset>
        </div>
      </div>

      <fieldset>
        <legend>Sequencer</legend>
        <div class="columns">
          <fieldset>
            <legend>Controls</legend>
            <parameter-input .parameter=${this.tempo}>
              Tempo
            </parameter-input>
            <button @click=${()=> this.trigger(this.pitchSequencer.current, this.velocitySequencer.current)}>Trigger</button>
            <button @click=${()=> this.startStop()}>${this.playing ? 'Stop' : 'Start'}</button>
          </fieldset>
          <div class="rows">
            <fieldset>
              <legend>Pitch</legend>
              <div class="sideways">
                ${this.pitchSequencer.values.map((parameter, index) => html`
                <parameter-input .parameter=${parameter}>
                  <span class="sr-only">Pitch ${index}</span>
                </parameter-input>
                `)}
              </div>
            </fieldset>
            <fieldset>
              <legend>Velocity</legend>
              <div class="sideways">
                ${this.velocitySequencer.values.map((parameter, index) => html`
                <parameter-input .parameter=${parameter}>
                  <span class="sr-only">Velocity ${index}</span>
                </parameter-input>
                `)}
              </div>
            </fieldset>
          </div>
        </div>
      </fieldset>
      </div>
    `;
  }

  static get styles() {
    return css`
      fieldset {
        border: none;
        border: 1px solid currentColor;
        text-align: center;
        margin: 0;
        margin: .25em;
      }
      legend {
        background-color: inherit;
        padding: 0 1em;
      }
      label {
        display: block;
      }
      .columns,
      .rows {
        justify-content: stretch;
        display: flex;
      }
      .columns {
        flex-direction: row;
      }
      .rows {
        flex-direction: column;
        width: 100%;
      }
      .block {
        display: flex;
        width: 100%;
        position: relative;
      }
      .block > *  {
        width: 100%;
        background-color: black;
        color: white;
        border-color: black;
      }
      .block:not(:last-child)::after {
        content: '';
        position: absolute;
        display: block;
        width: 0;
        height: 0;
        border-top: .5em solid transparent;
        border-bottom: .5em solid transparent;
        border-left: .5em solid black;
        right: -.25em;
        top: calc(50% - .25em);
      }

      .sideways {
        display: flex;
        justify-content: center;
        height: 6em;
      }
      .sideways > parameter-input {
        width: 5em;
        transform-origin: center;
        transform: rotate(-90deg) translateY(2.5em);
        margin: 0;
      }

      .sr-only {
        position: absolute;
        width: 1px;
        height: 1px;
        padding: 0;
        margin: -1px;
        overflow: hidden;
        clip: rect(0, 0, 0, 0);
        border: 0;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    [ELEMENT_NAME]: WebSynth;
  }
}
