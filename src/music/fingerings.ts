import type { KeyName } from './keys';

// Standard piano fingerings for one-octave ascending major scales.
// Left hand reads bottom-up (pinky to thumb), right hand thumb to pinky.
// These are the fingerings taught in most method books (Hanon, Alfred, etc.).
// 1 = thumb, 5 = pinky.

export interface Fingering {
  rh: number[]; // right-hand ascending (8 notes)
  lh: number[]; // left-hand ascending (8 notes)
}

export const MAJOR_FINGERINGS: Record<KeyName, Fingering> = {
  C:  { rh: [1,2,3,1,2,3,4,5], lh: [5,4,3,2,1,3,2,1] },
  G:  { rh: [1,2,3,1,2,3,4,5], lh: [5,4,3,2,1,3,2,1] },
  D:  { rh: [1,2,3,1,2,3,4,5], lh: [5,4,3,2,1,3,2,1] },
  A:  { rh: [1,2,3,1,2,3,4,5], lh: [5,4,3,2,1,3,2,1] },
  E:  { rh: [1,2,3,1,2,3,4,5], lh: [5,4,3,2,1,3,2,1] },
  B:  { rh: [1,2,3,1,2,3,4,5], lh: [4,3,2,1,4,3,2,1] },
  'F#':{ rh:[2,3,4,1,2,3,1,2], lh: [4,3,2,1,3,2,1,2] },
  'C#':{ rh:[2,3,1,2,3,4,1,2], lh: [3,2,1,4,3,2,1,2] },
  F:  { rh: [1,2,3,4,1,2,3,4], lh: [5,4,3,2,1,3,2,1] },
  Bb: { rh: [2,1,2,3,1,2,3,4], lh: [3,2,1,4,3,2,1,2] },
  Eb: { rh: [3,1,2,3,1,2,3,4], lh: [3,2,1,4,3,2,1,2] },
  Ab: { rh: [3,4,1,2,3,1,2,3], lh: [3,2,1,4,3,2,1,2] },
  Db: { rh: [2,3,1,2,3,4,1,2], lh: [3,2,1,4,3,2,1,2] },
  Gb: { rh: [2,3,4,1,2,3,1,2], lh: [4,3,2,1,3,2,1,2] },
  Cb: { rh: [1,2,3,1,2,3,4,5], lh: [3,2,1,4,3,2,1,2] },
};
