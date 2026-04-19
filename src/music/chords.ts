import { buildAscendingScale, type KeyName } from './keys';

export type Roman = 'I' | 'ii' | 'iii' | 'IV' | 'V' | 'vi' | 'vii°';
export type Quality = 'maj' | 'min' | 'dim';

export const DIATONIC_ROMANS: Roman[] = ['I', 'ii', 'iii', 'IV', 'V', 'vi', 'vii°'];
const MAJOR_KEY_QUALITIES: Quality[] = ['maj', 'min', 'min', 'maj', 'maj', 'min', 'dim'];

export interface Chord {
  roman: Roman;
  root: number;    // MIDI of root
  midis: number[]; // all chord tones in a close-voicing triad
  quality: Quality;
  key: KeyName;
}

// Build a diatonic triad on the given scale degree (1-indexed) of a major key.
// `baseOctave` controls where the root lands — the third and fifth stack up
// from there, forming a close-voicing triad. Accepts degrees 1..7.
export function buildDiatonicTriad(key: KeyName, degree: number, baseOctave = 4): Chord {
  if (degree < 1 || degree > 7) throw new Error(`Bad degree: ${degree}`);

  // Grab an octave of the scale starting at baseOctave, plus the next octave
  // so we have enough letters above the root for the 3rd and 5th.
  const lower = buildAscendingScale(key, baseOctave);
  const upper = buildAscendingScale(key, baseOctave + 1);
  const combined = [...lower.slice(0, 7), ...upper]; // 15 notes, two octaves worth

  const rootIdx = degree - 1;
  const root = combined[rootIdx];
  const third = combined[rootIdx + 2];
  const fifth = combined[rootIdx + 4];

  return {
    roman: DIATONIC_ROMANS[degree - 1],
    root,
    midis: [root, third, fifth],
    quality: MAJOR_KEY_QUALITIES[degree - 1],
    key,
  };
}

// Standard progressions used for teaching — written in roman-numeral form
// so they read the same regardless of key.
export interface Progression {
  name: string;
  description: string;
  romans: Roman[];
}

export const PROGRESSIONS: Progression[] = [
  { name: 'I – IV – V – I',   description: 'The most common chord progression — countless hymns, folk tunes, and beginner pieces.',                  romans: ['I', 'IV', 'V', 'I'] },
  { name: 'I – V – vi – IV',  description: 'The "pop" progression — "Let It Be", "Don\'t Stop Believin\'", most of modern radio.',                  romans: ['I', 'V', 'vi', 'IV'] },
  { name: 'ii – V – I',       description: 'The jazz turnaround — every jazz standard uses this somewhere.',                                        romans: ['ii', 'V', 'I'] },
  { name: 'I – vi – IV – V',  description: 'The "50s doo-wop" progression — Stand By Me, countless ballads.',                                       romans: ['I', 'vi', 'IV', 'V'] },
  { name: 'vi – IV – I – V',  description: 'Relative-minor twist on the pop progression — darker, emotional.',                                      romans: ['vi', 'IV', 'I', 'V'] },
  { name: 'I – IV – I – V',   description: 'A bright, bluesy four-chord loop — the bones of 12-bar blues before the extensions.',                   romans: ['I', 'IV', 'I', 'V'] },
];

function romanToDegree(r: Roman): number {
  return DIATONIC_ROMANS.indexOf(r) + 1;
}

export function progressionToChords(p: Progression, key: KeyName, baseOctave = 4): Chord[] {
  return p.romans.map(r => buildDiatonicTriad(key, romanToDegree(r), baseOctave));
}

// Set-equality check for pressed pitch classes vs. a chord. Order and octave
// are ignored; the user can voice the chord in either hand. Extra notes fail.
export function matchesChord(pressedMidis: Iterable<number>, chord: Chord): boolean {
  const target = new Set(chord.midis.map(m => ((m % 12) + 12) % 12));
  const pressed = new Set<number>();
  for (const m of pressedMidis) pressed.add(((m % 12) + 12) % 12);
  if (pressed.size !== target.size) return false;
  for (const pc of target) if (!pressed.has(pc)) return false;
  return true;
}
