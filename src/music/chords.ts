import { ALL_KEYS, buildAscendingScale, type KeyName } from './keys';

export type Roman = 'I' | 'ii' | 'iii' | 'IV' | 'V' | 'vi' | 'vii°';
export type Quality = 'maj' | 'min' | 'dim' | 'aug' | 'maj7' | 'min7' | 'dom7' | 'min7b5' | 'dim7';

// Chord qualities mapped to semitone intervals above the root. Gives us a
// single source of truth whether we're building a triad, a 7th, a diminished,
// or something modal — root + these intervals is the chord.
export const QUALITY_INTERVALS: Record<Quality, number[]> = {
  maj:    [0, 4, 7],
  min:    [0, 3, 7],
  dim:    [0, 3, 6],
  aug:    [0, 4, 8],
  maj7:   [0, 4, 7, 11],
  min7:   [0, 3, 7, 10],
  dom7:   [0, 4, 7, 10],
  min7b5: [0, 3, 6, 10],
  dim7:   [0, 3, 6, 9],
};

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

// === Inversions ===

export type Inversion = 'root' | '1st' | '2nd';

export const INVERSION_LABELS: Record<Inversion, string> = {
  'root': 'root position',
  '1st':  '1st inversion',
  '2nd':  '2nd inversion',
};

// Rebuild a chord's MIDI notes to voice it in the given inversion. The root
// always rises up an octave in first inversion; the third and fifth drop to
// the bass in the appropriate inversion.
export function invertChord(chord: Chord, inv: Inversion): Chord {
  const [r, t, f] = chord.midis;
  const midis =
    inv === 'root' ? [r, t, f] :
    inv === '1st'  ? [t, f, r + 12] :
                     [f, r + 12, t + 12];
  return { ...chord, midis };
}

// Same set-equality as matchesChord, PLUS the lowest pressed note's pitch
// class must match the expected bass for this inversion.
export function matchesChordInversion(pressedMidis: Iterable<number>, chord: Chord, inv: Inversion): boolean {
  if (!matchesChord(pressedMidis, chord)) return false;
  const pressedArr = [...pressedMidis];
  if (pressedArr.length === 0) return false;
  const bassMidi = Math.min(...pressedArr);
  const bassPc = ((bassMidi % 12) + 12) % 12;
  const expectedPc =
    inv === 'root' ? ((chord.root % 12) + 12) % 12 :
    inv === '1st'  ? ((chord.midis[1] % 12) + 12) % 12 :
                     ((chord.midis[2] % 12) + 12) % 12;
  return bassPc === expectedPc;
}

// === Interval-based chord building (for 7ths, minor keys, modal stuff) ===

export interface ChordSpec {
  label: string;          // 'i', 'V7', '♭III', 'iim7♭5', etc.
  rootSemitones: number;  // semitones above the tonic (0=I, 2=II, 3=♭III, ...)
  quality: Quality;
}

export function buildChordFromSpec(spec: ChordSpec, tonicMidi: number): Chord {
  const rootMidi = tonicMidi + spec.rootSemitones;
  const intervals = QUALITY_INTERVALS[spec.quality];
  const qClass: 'maj' | 'min' | 'dim' =
    spec.quality === 'dim' || spec.quality === 'dim7' || spec.quality === 'min7b5' ? 'dim' :
    spec.quality === 'min' || spec.quality === 'min7' ? 'min' :
    'maj';
  return {
    roman: spec.label as Roman,
    root: rootMidi,
    midis: intervals.map(iv => rootMidi + iv),
    quality: qClass,
    key: 'C', // caller sets this for display
  };
}

// === Minor-key and jazz progressions built from specs ===

export interface StyleProgression {
  id: string;
  name: string;
  description: string;
  category: 'minor' | 'jazz' | 'modal';
  tonality: 'major' | 'minor'; // drives which key signature we render
  chords: ChordSpec[];
}

export const STYLE_PROGRESSIONS: StyleProgression[] = [
  {
    id: 'minor-i-iv-V-i',
    name: 'i – iv – V – i',
    description: 'The classical minor cadence — the V is raised from natural minor to give it that pull back home. Countless classical themes and folk laments live here.',
    category: 'minor',
    tonality: 'minor',
    chords: [
      { label: 'i',  rootSemitones: 0, quality: 'min' },
      { label: 'iv', rootSemitones: 5, quality: 'min' },
      { label: 'V',  rootSemitones: 7, quality: 'maj' },
      { label: 'i',  rootSemitones: 0, quality: 'min' },
    ],
  },
  {
    id: 'minor-epic',
    name: 'i – ♭VI – ♭III – ♭VII',
    description: 'The "epic" or cinematic progression — Game of Thrones, Lord of the Rings, and every movie trailer from the last decade.',
    category: 'minor',
    tonality: 'minor',
    chords: [
      { label: 'i',    rootSemitones: 0, quality: 'min' },
      { label: '♭VI',  rootSemitones: 8, quality: 'maj' },
      { label: '♭III', rootSemitones: 3, quality: 'maj' },
      { label: '♭VII', rootSemitones: 10, quality: 'maj' },
    ],
  },
  {
    id: 'minor-andalusian',
    name: 'i – ♭VII – ♭VI – V',
    description: 'The Andalusian cadence — Spanish/flamenco walk-down. "Hit the Road Jack" and countless guitar instrumentals.',
    category: 'minor',
    tonality: 'minor',
    chords: [
      { label: 'i',    rootSemitones: 0, quality: 'min' },
      { label: '♭VII', rootSemitones: 10, quality: 'maj' },
      { label: '♭VI',  rootSemitones: 8, quality: 'maj' },
      { label: 'V',    rootSemitones: 7, quality: 'maj' },
    ],
  },
  {
    id: 'minor-rock',
    name: 'i – ♭VII – ♭VI – ♭VII',
    description: '"House of the Rising Sun" / rock minor loop — dark but driving.',
    category: 'minor',
    tonality: 'minor',
    chords: [
      { label: 'i',    rootSemitones: 0, quality: 'min' },
      { label: '♭VII', rootSemitones: 10, quality: 'maj' },
      { label: '♭VI',  rootSemitones: 8, quality: 'maj' },
      { label: '♭VII', rootSemitones: 10, quality: 'maj' },
    ],
  },
  {
    id: 'jazz-ii-V-I',
    name: 'ii7 – V7 – Imaj7',
    description: 'The major 2-5-1 with 7ths — the fundamental jazz cadence. Every jazz standard uses this.',
    category: 'jazz',
    tonality: 'major',
    chords: [
      { label: 'ii7',   rootSemitones: 2, quality: 'min7' },
      { label: 'V7',    rootSemitones: 7, quality: 'dom7' },
      { label: 'Imaj7', rootSemitones: 0, quality: 'maj7' },
    ],
  },
  {
    id: 'jazz-minor-ii-V-i',
    name: 'iim7♭5 – V7 – im7',
    description: 'The minor 2-5-1 — the ii is half-diminished, the V is dominant with altered tensions. Mournful, cinematic jazz.',
    category: 'jazz',
    tonality: 'minor',
    chords: [
      { label: 'iim7♭5', rootSemitones: 2, quality: 'min7b5' },
      { label: 'V7',     rootSemitones: 7, quality: 'dom7' },
      { label: 'im7',    rootSemitones: 0, quality: 'min7' },
    ],
  },
  {
    id: 'jazz-rhythm-changes',
    name: 'Imaj7 – vi7 – ii7 – V7',
    description: '"Rhythm changes" — the Gershwin turnaround. Underpins hundreds of bebop heads including "I Got Rhythm" itself.',
    category: 'jazz',
    tonality: 'major',
    chords: [
      { label: 'Imaj7', rootSemitones: 0, quality: 'maj7' },
      { label: 'vi7',   rootSemitones: 9, quality: 'min7' },
      { label: 'ii7',   rootSemitones: 2, quality: 'min7' },
      { label: 'V7',    rootSemitones: 7, quality: 'dom7' },
    ],
  },
  {
    id: 'modal-mixolydian',
    name: 'I – ♭VII (Mixolydian)',
    description: 'Mixolydian vamp — major quality on tonic, flat 7th chord. "Sweet Child O\' Mine" verse, "Cinnamon Girl", Celtic fiddle tunes.',
    category: 'modal',
    tonality: 'major',
    chords: [
      { label: 'I',    rootSemitones: 0,  quality: 'maj' },
      { label: '♭VII', rootSemitones: 10, quality: 'maj' },
    ],
  },
  {
    id: 'modal-dorian',
    name: 'i – IV (Dorian)',
    description: 'Dorian groove — minor tonic with a bright major IV (raised 6th). "Scarborough Fair", "Oye Como Va", funk grooves.',
    category: 'modal',
    tonality: 'minor',
    chords: [
      { label: 'i',  rootSemitones: 0, quality: 'min' },
      { label: 'IV', rootSemitones: 5, quality: 'maj' },
    ],
  },
];

// === Minor-tonic → relative-major key signature for staff display ===

export const MINOR_TONICS = ['A', 'E', 'B', 'F#', 'C#', 'G#', 'D#', 'D', 'G', 'C', 'F', 'Bb', 'Eb', 'Ab'] as const;
export type MinorTonic = typeof MINOR_TONICS[number];

// Relative major of each minor key — three semitones up, spelled to match
// the conventional minor-key notation (e.g. A minor shares the signature of
// C major, C minor shares Eb major).
export const MINOR_RELATIVE_MAJOR: Record<MinorTonic, KeyName> = {
  A: 'C', E: 'G', B: 'D', 'F#': 'A', 'C#': 'E', 'G#': 'B', 'D#': 'F#',
  D: 'F', G: 'Bb', C: 'Eb', F: 'Ab', Bb: 'Db', Eb: 'Gb', Ab: 'Cb',
};

export const MAJOR_TONICS = ALL_KEYS;
