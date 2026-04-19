import * as Tone from 'tone';
import { midiToName } from '../music/notes';

let polySynth: Tone.PolySynth | null = null;
let started = false;

function build() {
  if (polySynth) return polySynth;
  polySynth = new Tone.PolySynth(Tone.Synth, {
    oscillator: { type: 'triangle' },
    envelope: { attack: 0.01, decay: 0.4, sustain: 0.2, release: 1.2 },
  }).toDestination();
  polySynth.volume.value = -6;
  return polySynth;
}

export async function ensureAudio() {
  if (!started) {
    await Tone.start();
    started = true;
  }
  build();
}

export async function playNote(midi: number, durationSec = 1) {
  await ensureAudio();
  polySynth!.triggerAttackRelease(midiToName(midi), durationSec);
}

export async function playChord(midis: number[], durationSec = 1.4) {
  await ensureAudio();
  const names = midis.map(m => midiToName(m));
  polySynth!.triggerAttackRelease(names, durationSec);
}

export async function playSequence(midis: number[], noteSec = 0.35) {
  await ensureAudio();
  const now = Tone.now();
  midis.forEach((m, i) => {
    polySynth!.triggerAttackRelease(midiToName(m), noteSec * 0.9, now + i * noteSec);
  });
}
