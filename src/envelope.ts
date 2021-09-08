import { Taper } from "./parameters"

export type Stage = {
  from: number;
  to: number;
  duration: number;
  taper?: Taper;
}

function toSeconds(milliseconds: number) {
  return milliseconds / 1000;
}

export function applyStage(target: AudioParam, stage: Stage, currentTime: number) {
  target.cancelScheduledValues(currentTime);
  const { from, to, duration, taper } = stage;
  const endTime = currentTime + toSeconds(duration); // AudioParams use seconds
  target.setValueAtTime(from, currentTime);
  if (taper === Taper.LOG) {
    const nonZero = to === 0 ? 0.01 : to;
    target.exponentialRampToValueAtTime(nonZero, endTime);
  } else {
    target.linearRampToValueAtTime(to, endTime);
  }
  target.setValueAtTime(to, endTime);
}

export function applyEnvelope(target: AudioParam, stages: Stage[], currentTime: number) {
  stages.reduce((startTime, stage) => {
    applyStage(target, stage, startTime);
    return startTime + toSeconds(stage.duration);
  }, currentTime)
}
