import { useEffect, useRef } from 'react';
import { Renderer, Stave, StaveNote, Voice, Formatter, Accidental } from 'vexflow';
import { midiToSpelling, midiToVexKey } from '../music/notes';
import { getKeySignature, type KeyName } from '../music/keys';

export type Clef = 'treble' | 'bass';

interface Props {
  midiNotes: number[]; // one or more MIDI numbers = single chord on one stave
  clef?: Clef;
  keyName?: KeyName;
  width?: number;
  height?: number;
  duration?: 'w' | 'h' | 'q' | '8' | '16';
  showClef?: boolean;
  showKeySig?: boolean;
}

// A minimal one-measure renderer: key signature + a single whole note (or chord).
// Accidentals that are in the key signature are omitted from the note; any
// accidental that deviates from the key signature gets drawn on the note.
export function SheetMusic({
  midiNotes,
  clef = 'treble',
  keyName = 'C',
  width = 280,
  height = 180,
  duration = 'w',
  showClef = true,
  showKeySig = true,
}: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = ref.current;
    if (!host) return;
    host.innerHTML = '';

    const renderer = new Renderer(host, Renderer.Backends.SVG);
    renderer.resize(width, height);
    const ctx = renderer.getContext();
    ctx.setFont('sans-serif', 10);

    const stave = new Stave(10, 20, width - 20);
    if (showClef) stave.addClef(clef);
    if (showKeySig) stave.addKeySignature(keyName);
    stave.setContext(ctx).draw();

    const sig = getKeySignature(keyName);
    const preferFlats = sig.preferFlats;

    // Which letters are altered by the key signature, and how?
    const keyAccidentals: Record<string, '#' | 'b'> = {};
    for (const n of sig.scaleNotes) {
      if (n.length > 1) keyAccidentals[n[0]] = n[1] as '#' | 'b';
    }

    const sortedKeys = [...midiNotes]
      .sort((a, b) => a - b)
      .map(m => midiToVexKey(m, preferFlats));
    if (sortedKeys.length === 0) return;

    const note = new StaveNote({
      clef,
      keys: sortedKeys,
      duration,
    });

    midiNotes
      .slice()
      .sort((a, b) => a - b)
      .forEach((m, i) => {
        const sp = midiToSpelling(m, preferFlats);
        const inKey = keyAccidentals[sp.letter] ?? '';
        if (sp.accidental === inKey) return;
        if (sp.accidental === '#') note.addModifier(new Accidental('#'), i);
        else if (sp.accidental === 'b') note.addModifier(new Accidental('b'), i);
        else note.addModifier(new Accidental('n'), i);
      });

    const beats = duration === 'w' ? 4 : duration === 'h' ? 2 : duration === 'q' ? 1 : duration === '8' ? 0.5 : 0.25;
    const voice = new Voice({ numBeats: beats, beatValue: 4 }).addTickables([note]);
    new Formatter().joinVoices([voice]).format([voice], width - 80);
    voice.draw(ctx, stave);
  }, [midiNotes, clef, keyName, width, height, duration, showClef, showKeySig]);

  return <div ref={ref} className="sheet-music" aria-hidden="true" />;
}
