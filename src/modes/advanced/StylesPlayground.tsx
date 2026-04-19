import { useCallback, useEffect, useMemo, useState } from 'react';
import { SheetMusic, type Clef } from '../../components/SheetMusic';
import { Piano } from '../../components/Piano';
import { ALL_KEYS, type KeyName } from '../../music/keys';
import {
  MINOR_RELATIVE_MAJOR,
  MINOR_TONICS,
  STYLE_PROGRESSIONS,
  buildChordFromSpec,
  matchesChord,
  type MinorTonic,
  type StyleProgression,
} from '../../music/chords';
import { midiToName, nameToMidi } from '../../music/notes';
import { useMidiInput } from '../../hooks/useMidiInput';
import { playChord } from '../../audio/piano';

type Category = 'minor' | 'jazz' | 'modal';

// Pick a sensible default tonic per progression on load so the user doesn't
// have to fiddle before hearing something natural.
function defaultTonic(p: StyleProgression): KeyName | MinorTonic {
  return p.tonality === 'minor' ? 'A' : 'C';
}

export function StylesPlayground() {
  const [category, setCategory] = useState<Category>('minor');
  const filtered = useMemo(() => STYLE_PROGRESSIONS.filter(p => p.category === category), [category]);
  const [progId, setProgId] = useState<string>(filtered[0].id);
  const progression = useMemo(
    () => STYLE_PROGRESSIONS.find(p => p.id === progId) ?? filtered[0],
    [progId, filtered]
  );
  const [tonic, setTonic] = useState<KeyName | MinorTonic>(() => defaultTonic(progression));
  const [stepIdx, setStepIdx] = useState(0);
  const [pressed, setPressed] = useState<Set<number>>(new Set());
  const [showNotes, setShowNotes] = useState(false);

  // When the category changes, default to its first progression.
  useEffect(() => {
    setProgId(filtered[0].id);
    setStepIdx(0);
  }, [filtered]);

  // When the progression tonality changes, reset the tonic to a common default.
  useEffect(() => {
    setTonic(defaultTonic(progression));
    setStepIdx(0);
    setPressed(new Set());
    setShowNotes(false);
  }, [progression]);

  const tonicMidi = nameToMidi(`${tonic}${progression.tonality === 'minor' ? 3 : 4}`);
  const chords = useMemo(
    () => progression.chords.map(spec => buildChordFromSpec(spec, tonicMidi)),
    [progression, tonicMidi]
  );
  const chord = chords[stepIdx];

  // For display, render on the tonality's key signature. For minor tonics we
  // use the relative major's signature; for major tonics, the tonic itself.
  const displayKey: KeyName = progression.tonality === 'minor'
    ? MINOR_RELATIVE_MAJOR[tonic as MinorTonic]
    : (tonic as KeyName);

  const advance = useCallback(() => {
    setShowNotes(false);
    setStepIdx(i => (i + 1) % chords.length);
    setPressed(new Set());
  }, [chords.length]);

  const check = useCallback((newPressed: Set<number>) => {
    if (matchesChord(newPressed, chord)) {
      void playChord(chord.midis, 0.7);
      advance();
    }
  }, [chord, advance]);

  const handleMidi = useCallback<Parameters<typeof useMidiInput>[0]>((m, _v, kind) => {
    setPressed(prev => {
      const n = new Set(prev);
      if (kind === 'on') n.add(m); else n.delete(m);
      if (kind === 'on') check(n);
      return n;
    });
  }, [check]);
  const midi = useMidiInput(handleMidi);

  const handlePianoDown = (m: number) => {
    setPressed(prev => {
      const n = new Set(prev);
      n.add(m);
      check(n);
      return n;
    });
  };
  const handlePianoUp = (m: number) => {
    setPressed(prev => { const n = new Set(prev); n.delete(m); return n; });
  };

  const playAll = async () => {
    for (const c of chords) {
      void playChord(c.midis, 0.8);
      await new Promise(r => setTimeout(r, 900));
    }
  };

  const clef: Clef = chord.root >= nameToMidi('C4') ? 'treble' : 'bass';

  const tonicOptions = progression.tonality === 'minor'
    ? (MINOR_TONICS as readonly string[])
    : (ALL_KEYS as readonly string[]);

  return (
    <div className="adv">
      <div className="adv__toolbar">
        <label className="adv__field">
          <span>Style</span>
          <select value={category} onChange={e => setCategory(e.target.value as Category)}>
            <option value="minor">Minor-key</option>
            <option value="jazz">Jazz</option>
            <option value="modal">Modal</option>
          </select>
        </label>
        <label className="adv__field">
          <span>Progression</span>
          <select value={progId} onChange={e => setProgId(e.target.value)}>
            {filtered.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </label>
        <label className="adv__field">
          <span>Tonic</span>
          <select value={tonic} onChange={e => setTonic(e.target.value as KeyName | MinorTonic)}>
            {tonicOptions.map(t => (
              <option key={t} value={t}>
                {t} {progression.tonality}
              </option>
            ))}
          </select>
        </label>
        <button type="button" className="adv__button" onClick={() => void playAll()}>▶ Play progression</button>
        {!midi.enabled && midi.supported && (
          <button type="button" className="adv__button adv__button--ghost" onClick={midi.request}>Connect MIDI</button>
        )}
        {midi.enabled && <span className="adv__chip">🎹 {midi.deviceName}</span>}
      </div>

      <p className="adv__progression-desc">{progression.description}</p>

      <div className="adv__grid">
        <div className="adv__staff">
          <div className="adv__prompt">
            Play <strong className="adv__roman">{chord.roman}</strong>
            <small className="adv__prompt-sub">in {tonic} {progression.tonality}</small>
          </div>
          <SheetMusic
            midiNotes={showNotes ? chord.midis : []}
            clef={clef}
            keyName={displayKey}
            width={380}
            height={240}
          />
          <div className="adv__meta">
            <div>
              <strong>{tonic} {progression.tonality}</strong>
              <span className="adv__scale-letters" title="staff shows the relative-major key signature for minor tonics">
                staff: {displayKey} maj sig
              </span>
            </div>
            <div className="adv__target">
              <span>Chord tones</span>
              {showNotes ? (
                <strong>{chord.midis.map(m => midiToName(m)).join(' · ')}</strong>
              ) : <strong>?</strong>}
            </div>
          </div>
        </div>

        <aside className="adv__cheat">
          <h3>{progression.name}</h3>
          <ol className="adv__steps adv__steps--romans">
            {chords.map((c, i) => {
              const active = i === stepIdx;
              return (
                <li
                  key={i}
                  className={active ? 'is-active' : ''}
                  onClick={() => { setStepIdx(i); setPressed(new Set()); setShowNotes(false); }}
                >
                  <span className="adv__deg">{i + 1}</span>
                  <span className="adv__name">
                    {c.roman} — {midiToName(c.root).replace(/\d+$/, '')}
                  </span>
                </li>
              );
            })}
          </ol>
          <div className="adv__nav">
            <button onClick={() => setShowNotes(true)}>show me</button>
            <button onClick={advance}>skip →</button>
          </div>
        </aside>
      </div>

      <Piano
        fromMidi={nameToMidi('E2')}
        toMidi={nameToMidi('G6')}
        activeMidi={pressed}
        targetMidi={showNotes ? new Set(chord.midis) : undefined}
        onKeyDown={handlePianoDown}
        onKeyUp={handlePianoUp}
      />
    </div>
  );
}
