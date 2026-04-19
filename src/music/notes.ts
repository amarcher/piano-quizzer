// MIDI 60 = middle C (C4). This module converts between MIDI numbers,
// human-readable names, and the lowercase "pitch/octave" strings VexFlow uses.

export type Accidental = '#' | 'b' | '';

export const SHARP_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'] as const;
export const FLAT_NAMES = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'] as const;

export const MIDDLE_C = 60;
export const PIANO_MIN_MIDI = 21; // A0
export const PIANO_MAX_MIDI = 108; // C8

export interface PitchSpelling {
  letter: 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G';
  accidental: Accidental;
  octave: number; // scientific pitch octave (C4 = middle C)
}

export function midiToPitchClass(midi: number): number {
  return ((midi % 12) + 12) % 12;
}

export function midiToOctave(midi: number): number {
  return Math.floor(midi / 12) - 1;
}

export function midiToName(midi: number, preferFlats = false): string {
  const names = preferFlats ? FLAT_NAMES : SHARP_NAMES;
  return `${names[midiToPitchClass(midi)]}${midiToOctave(midi)}`;
}

export function midiToSpelling(midi: number, preferFlats = false): PitchSpelling {
  const names = preferFlats ? FLAT_NAMES : SHARP_NAMES;
  const raw = names[midiToPitchClass(midi)];
  const letter = raw[0] as PitchSpelling['letter'];
  const accidental = (raw.slice(1) as Accidental) || '';
  return { letter, accidental, octave: midiToOctave(midi) };
}

// VexFlow wants "c/4", "f#/5", "eb/3" — letter is lowercase,
// accidental stays (# or b), octave is the scientific pitch octave.
export function midiToVexKey(midi: number, preferFlats = false): string {
  const { letter, accidental, octave } = midiToSpelling(midi, preferFlats);
  return `${letter.toLowerCase()}${accidental}/${octave}`;
}

export function spellingToMidi(s: PitchSpelling): number {
  const letterPc: Record<PitchSpelling['letter'], number> = {
    C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11,
  };
  const pc = letterPc[s.letter] + (s.accidental === '#' ? 1 : s.accidental === 'b' ? -1 : 0);
  return (s.octave + 1) * 12 + pc;
}

export function nameToMidi(name: string): number {
  const m = name.match(/^([A-G])([#b]?)(-?\d+)$/);
  if (!m) throw new Error(`Invalid note name: ${name}`);
  return spellingToMidi({
    letter: m[1] as PitchSpelling['letter'],
    accidental: (m[2] as Accidental) || '',
    octave: parseInt(m[3], 10),
  });
}

// true for the 5 black keys of an octave
export function isBlackKey(midi: number): boolean {
  return [1, 3, 6, 8, 10].includes(midiToPitchClass(midi));
}
