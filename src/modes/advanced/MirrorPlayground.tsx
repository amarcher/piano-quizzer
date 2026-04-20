import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { SheetMusic, type Clef } from '../../components/SheetMusic';
import { Piano } from '../../components/Piano';
import { ALL_KEYS, getKeySignature, type KeyName } from '../../music/keys';
import { midiToName, midiToSpelling, nameToMidi } from '../../music/notes';
import { useMidiInput } from '../../hooks/useMidiInput';
import { usePitchDetect } from '../../hooks/usePitchDetect';
import { playNote } from '../../audio/piano';

type KeyMode = KeyName | 'none';

const LETTER_PC: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

// Convert a scale-note string like "F#" or "Bb" to a pitch class 0..11.
function noteNameToPc(name: string): number {
  const pc = LETTER_PC[name[0]] + (name.includes('#') ? 1 : name.includes('b') ? -1 : 0);
  return ((pc % 12) + 12) % 12;
}

export function MirrorPlayground() {
  const [key, setKey] = useState<KeyMode>('C');
  const [pressed, setPressed] = useState<Set<number>>(new Set());
  const [lastMidi, setLastMidi] = useState<number | null>(null);
  const [lastBad, setLastBad] = useState(false);
  const [flashTick, setFlashTick] = useState(0); // bumped on every out-of-key press so the CSS animation retriggers
  const micTimeoutsRef = useRef<Map<number, number>>(new Map());

  const sig = useMemo(() => key === 'none' ? null : getKeySignature(key), [key]);
  const preferFlats = sig?.preferFlats ?? false;

  // Set of in-scale pitch classes; null means "chromatic — everything is ok".
  const scalePcs = useMemo<Set<number> | null>(() => {
    if (!sig) return null;
    return new Set(sig.scaleNotes.map(noteNameToPc));
  }, [sig]);

  const isInScale = useCallback((midi: number) => {
    if (!scalePcs) return true;
    return scalePcs.has(((midi % 12) + 12) % 12);
  }, [scalePcs]);

  // Out-of-scale pitch classes for red-tinting the piano keys.
  const outOfScalePcs = useMemo<Set<number> | null>(() => {
    if (!scalePcs) return null;
    const all = new Set<number>();
    for (let pc = 0; pc < 12; pc++) if (!scalePcs.has(pc)) all.add(pc);
    return all;
  }, [scalePcs]);

  const registerPress = useCallback((m: number) => {
    setPressed(prev => new Set(prev).add(m));
    setLastMidi(m);
    const bad = !isInScale(m);
    setLastBad(bad);
    if (bad) setFlashTick(t => t + 1);
  }, [isInScale]);

  const registerRelease = useCallback((m: number) => {
    setPressed(prev => { const n = new Set(prev); n.delete(m); return n; });
  }, []);

  const handleMidi = useCallback<Parameters<typeof useMidiInput>[0]>((m, _v, kind) => {
    if (kind === 'on') registerPress(m);
    else registerRelease(m);
  }, [registerPress, registerRelease]);
  const midi = useMidiInput(handleMidi);

  // Mic detections don't have a note-off event. Simulate a short "hold"
  // so the detected pitch stays visible on the staff for a moment, then
  // fades. Pressing the same pitch again before the timeout resets it.
  // Mirror mode has no "target" to filter against, so it's extra sensitive
  // to phantom detections. Tighten both clarity and amplitude gates here.
  const pitch = usePitchDetect(sample => {
    const m = sample.midi;
    const prev = micTimeoutsRef.current.get(m);
    if (prev) clearTimeout(prev);
    registerPress(m);
    const id = window.setTimeout(() => {
      registerRelease(m);
      micTimeoutsRef.current.delete(m);
    }, 700);
    micTimeoutsRef.current.set(m, id);
  }, 0.95, 0.035);

  // Clear all mic timeouts on unmount.
  useEffect(() => () => {
    micTimeoutsRef.current.forEach(id => clearTimeout(id));
    micTimeoutsRef.current.clear();
  }, []);

  const handlePianoDown = (m: number) => {
    registerPress(m);
    void playNote(m, 0.5);
  };
  const handlePianoUp = (m: number) => registerRelease(m);

  const spelling = lastMidi != null ? midiToSpelling(lastMidi, preferFlats) : null;
  const accidentalGlyph = spelling?.accidental === '#' ? '♯' : spelling?.accidental === 'b' ? '♭' : '';

  // Staff needs a clef. Pick bass if the last played note is below middle C.
  const clef: Clef = lastMidi != null && lastMidi < nameToMidi('C4') ? 'bass' : 'treble';
  const pressedSorted = [...pressed].sort((a, b) => a - b);

  // Highlight out-of-scale piano keys in a red "target" hue so the user
  // can see which keys are wrong for the selected key.
  const warnKeys = useMemo(() => {
    if (!outOfScalePcs) return undefined;
    const set = new Set<number>();
    // Show the hint across a 3-octave span around middle C.
    for (let m = nameToMidi('C3'); m <= nameToMidi('C6'); m++) {
      if (outOfScalePcs.has(((m % 12) + 12) % 12)) set.add(m);
    }
    return set;
  }, [outOfScalePcs]);

  return (
    <div className="adv">
      <div className="adv__toolbar">
        <label className="adv__field">
          <span>Key</span>
          <select value={key} onChange={e => setKey(e.target.value as KeyMode)}>
            <option value="none">Chromatic (no key)</option>
            {ALL_KEYS.map(k => <option key={k} value={k}>{k} major</option>)}
          </select>
        </label>
        {!midi.enabled && midi.supported && (
          <button type="button" className="adv__button adv__button--ghost" onClick={midi.request}>Connect MIDI</button>
        )}
        {midi.enabled && <span className="adv__chip">🎹 {midi.deviceName}</span>}
        {!pitch.listening ? (
          <button type="button" className="adv__button adv__button--ghost" onClick={() => void pitch.start()}>🎤 Listen</button>
        ) : (
          <button type="button" className="adv__button" onClick={() => pitch.stop()}>🎤 Stop listening</button>
        )}
        {pitch.error && <span className="adv__chip" style={{ background: '#4a1e1e', color: '#ffb4b4', borderColor: '#8b3838' }}>{pitch.error}</span>}
      </div>

      <div className="adv__mirror-hero">
        <div
          className={`adv__mirror-letter ${lastBad ? 'is-bad' : 'is-ok'}`}
          key={flashTick}
          data-empty={lastMidi == null || undefined}
        >
          {spelling ? (
            <>
              <span className="adv__mirror-letter-main">{spelling.letter}{accidentalGlyph}</span>
              <span className="adv__mirror-letter-oct">{spelling.octave}</span>
            </>
          ) : (
            <span className="adv__mirror-letter-empty">play a note</span>
          )}
        </div>
      </div>

      <div className="adv__staff">
        <SheetMusic
          midiNotes={pressedSorted.slice(0, 6)}
          clef={clef}
          keyName={key === 'none' ? 'C' : key}
          width={480}
          height={240}
          showKeySig={key !== 'none'}
        />
        <div className="adv__meta">
          <div>
            <strong>{key === 'none' ? 'Chromatic' : `${key} major`}</strong>
            {sig && (
              <span className="adv__scale-letters">
                {sig.scaleNotes.map(n => <span key={n}>{n}</span>)}
              </span>
            )}
          </div>
          <div className="adv__target">
            <span>Holding</span>
            <strong>
              {pressedSorted.length === 0 ? '—' : pressedSorted.map(m => midiToName(m, preferFlats)).join(' · ')}
            </strong>
          </div>
        </div>
      </div>

      <Piano
        fromMidi={nameToMidi('E2')}
        toMidi={nameToMidi('G6')}
        activeMidi={pressed}
        warnMidi={warnKeys}
        onKeyDown={handlePianoDown}
        onKeyUp={handlePianoUp}
      />
      {warnKeys && (
        <p className="adv__mirror-legend">
          Keys highlighted on the piano are <em>not</em> in {key} major. Playing one flashes the note red.
        </p>
      )}
    </div>
  );
}
