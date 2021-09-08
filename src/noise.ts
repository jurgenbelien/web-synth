export class NoiseNode extends AudioBufferSourceNode {
  loop = true;
  constructor(context: AudioContext, length = 1000) {
    super(context);
    const { sampleRate } = context;
    const size = sampleRate * length;
    this.buffer = context.createBuffer(1, size, sampleRate);

    // Populate buffer
    const data = this.buffer.getChannelData(0);
    for (let i = 0; i < this.buffer.length; i++) {
      data[i] = (Math.random() * 2) - 1;
    }
  }
}
