import { FLAT_NAMES, SHARP_NAMES, nameToMidi } from './notes';

export type KeyName =
  | 'C' | 'G' | 'D' | 'A' | 'E' | 'B' | 'F#' | 'C#'
  | 'F' | 'Bb' | 'Eb' | 'Ab' | 'Db' | 'Gb' | 'Cb';

export interface KeySignature {
  key: KeyName;
  sharps: number; // negative means that many flats
  preferFlats: boolean;
  // Ascending major scale pitch classes starting at the tonic, as note letters+accidentals
  scaleNotes: string[]; // e.g. C major: ['C','D','E','F','G','A','B']
}

const CIRCLE: Array<{ key: KeyName; sharps: number }> = [
  { key: 'C',  sharps:  0 },
  { key: 'G',  sharps:  1 },
  { key: 'D',  sharps:  2 },
  { key: 'A',  sharps:  3 },
  { key: 'E',  sharps:  4 },
  { key: 'B',  sharps:  5 },
  { key: 'F#', sharps:  6 },
  { key: 'C#', sharps:  7 },
  { key: 'F',  sharps: -1 },
  { key: 'Bb', sharps: -2 },
  { key: 'Eb', sharps: -3 },
  { key: 'Ab', sharps: -4 },
  { key: 'Db', sharps: -5 },
  { key: 'Gb', sharps: -6 },
  { key: 'Cb', sharps: -7 },
];

const MAJOR_STEPS = [0, 2, 4, 5, 7, 9, 11];

function tonicPc(key: KeyName): number {
  const letter = key[0] as 'A'|'B'|'C'|'D'|'E'|'F'|'G';
  const letterPc: Record<string, number> = { C:0, D:2, E:4, F:5, G:7, A:9, B:11 };
  let pc = letterPc[letter];
  if (key.includes('#')) pc += 1;
  if (key.includes('b')) pc -= 1;
  return ((pc % 12) + 12) % 12;
}

export function getKeySignature(key: KeyName): KeySignature {
  const entry = CIRCLE.find(k => k.key === key)!;
  const preferFlats = entry.sharps < 0 || key === 'F';
  const names = preferFlats ? FLAT_NAMES : SHARP_NAMES;
  const rootPc = tonicPc(key);
  // Spell the scale using one of each letter A-G.
  // Start from the tonic letter and walk 7 letters, picking the enharmonic
  // that matches the key's accidental preference.
  const letters = ['C','D','E','F','G','A','B'];
  const startIdx = letters.indexOf(key[0]);
  const scaleNotes: string[] = [];
  for (let i = 0; i < 7; i++) {
    const letter = letters[(startIdx + i) % 7];
    const expectedPc = (rootPc + MAJOR_STEPS[i]) % 12;
    // Try natural, sharp, flat; pick the one matching expectedPc with preferred accidental.
    const candidates = [
      `${letter}`,
      `${letter}${preferFlats ? 'b' : '#'}`,
      `${letter}${preferFlats ? '#' : 'b'}`,
    ];
    const chosen = candidates.find(n => {
      // look up pc by searching names
      const plain = n[0] + (n[1] ?? '');
      const idxSharp = SHARP_NAMES.indexOf(plain as typeof SHARP_NAMES[number]);
      const idxFlat = FLAT_NAMES.indexOf(plain as typeof FLAT_NAMES[number]);
      const pc = idxSharp >= 0 ? idxSharp : idxFlat;
      return pc === expectedPc;
    }) || `${letter}`;
    scaleNotes.push(chosen);
    void names;
  }
  return { key, sharps: entry.sharps, preferFlats, scaleNotes };
}

// Build the actual MIDI sequence of an ascending octave of the scale starting
// from a given octave, e.g. C major from octave 4 => [C4, D4, ..., B4, C5].
export function buildAscendingScale(key: KeyName, octave: number): number[] {
  const sig = getKeySignature(key);
  const midis: number[] = [];
  let lastMidi = -Infinity;
  let currentOctave = octave;
  for (let i = 0; i <= 7; i++) {
    const note = sig.scaleNotes[i % 7];
    let midi = nameToMidi(`${note}${currentOctave}`);
    if (midi <= lastMidi) {
      currentOctave += 1;
      midi = nameToMidi(`${note}${currentOctave}`);
    }
    midis.push(midi);
    lastMidi = midi;
  }
  return midis;
}

export const ALL_KEYS: KeyName[] = [
  'C','G','D','A','E','B','F#','C#',
  'F','Bb','Eb','Ab','Db','Gb','Cb',
];
