// Dynamic markings for Milo mode flashcards.

export interface DynamicMarking {
  symbol: string;
  name: string;
  kidTip: string; // how we describe it to a 4-year-old
}

export const DYNAMICS: DynamicMarking[] = [
  { symbol: 'pp', name: 'pianissimo', kidTip: 'whisper quiet' },
  { symbol: 'p',  name: 'piano',      kidTip: 'soft' },
  { symbol: 'mp', name: 'mezzo-piano', kidTip: 'a little bit soft' },
  { symbol: 'mf', name: 'mezzo-forte', kidTip: 'a little bit loud' },
  { symbol: 'f',  name: 'forte',      kidTip: 'loud' },
  { symbol: 'ff', name: 'fortissimo', kidTip: 'super loud' },
];

export interface NoteLength {
  name: string;
  beats: number;
  kidTip: string;
}

export const NOTE_LENGTHS: NoteLength[] = [
  { name: 'whole',   beats: 4,   kidTip: 'hold for four' },
  { name: 'half',    beats: 2,   kidTip: 'hold for two' },
  { name: 'quarter', beats: 1,   kidTip: 'one beat' },
  { name: 'eighth',  beats: 0.5, kidTip: 'half a beat' },
];
