import { useCallback, useEffect, useMemo, useState } from 'react';
import { SheetMusic, type Clef } from '../../components/SheetMusic';
import { Piano } from '../../components/Piano';
import { ALL_KEYS, getKeySignature, type KeyName } from '../../music/keys';
import { PROGRESSIONS, matchesChord, progressionToChords } from '../../music/chords';
import { midiToName, midiToSpelling, nameToMidi } from '../../music/notes';
import { useMidiInput } from '../../hooks/useMidiInput';
import { playChord, playSequence } from '../../audio/piano';

export function ProgressionPlayground() {
  const [key, setKey] = useState<KeyName>('C');
  const [progIdx, setProgIdx] = useState(0);
  const [stepIdx, setStepIdx] = useState(0);
  const [pressed, setPressed] = useState<Set<number>>(new Set());
  const [showNotes, setShowNotes] = useState(false);

  const progression = PROGRESSIONS[progIdx];
  const chords = useMemo(() => progressionToChords(progression, key), [progression, key]);
  const chord = chords[stepIdx];
  const sig = getKeySignature(key);

  useEffect(() => { setStepIdx(0); setPressed(new Set()); setShowNotes(false); }, [key, progIdx]);

  const advance = useCallback(() => {
    setShowNotes(false);
    setStepIdx(i => (i + 1) % chords.length);
    setPressed(new Set());
  }, [chords.length]);

  const check = useCallback((newPressed: Set<number>) => {
    if (matchesChord(newPressed, chord)) {
      void playChord(chord.midis, 0.6);
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
    // Play each chord in sequence with a short gap.
    for (let i = 0; i < chords.length; i++) {
      void playChord(chords[i].midis, 0.8);
      await new Promise(r => setTimeout(r, 900));
    }
  };

  const clef: Clef = chord.root >= nameToMidi('C4') ? 'treble' : 'bass';

  return (
    <div className="adv">
      <div className="adv__toolbar">
        <label className="adv__field">
          <span>Key</span>
          <select value={key} onChange={e => setKey(e.target.value as KeyName)}>
            {ALL_KEYS.map(k => <option key={k} value={k}>{k} major</option>)}
          </select>
        </label>
        <label className="adv__field">
          <span>Progression</span>
          <select value={progIdx} onChange={e => setProgIdx(Number(e.target.value))}>
            {PROGRESSIONS.map((p, i) => <option key={i} value={i}>{p.name}</option>)}
          </select>
        </label>
        <button type="button" className="adv__button" onClick={() => void playAll()}>▶ Play progression</button>
        <button type="button" className="adv__button adv__button--ghost" onClick={() => void playSequence(chord.midis, 0.25)}>▶ This chord</button>
        {!midi.enabled && midi.supported && (
          <button type="button" className="adv__button adv__button--ghost" onClick={midi.request}>Connect MIDI</button>
        )}
        {midi.enabled && <span className="adv__chip">🎹 {midi.deviceName}</span>}
      </div>

      <p className="adv__progression-desc">{progression.description}</p>

      <div className="adv__grid">
        <div className="adv__staff">
          <div className="adv__prompt">
            Play <strong className="adv__roman">{chord.roman}</strong> in {key} major
          </div>
          <SheetMusic
            midiNotes={showNotes ? chord.midis : []}
            clef={clef}
            keyName={key}
            width={380}
            height={220}
          />
          <div className="adv__meta">
            <div>
              <strong>{key} major</strong>
              <span className="adv__scale-letters">
                {sig.scaleNotes.map(n => <span key={n}>{n}</span>)}
              </span>
            </div>
            <div className="adv__target">
              <span>Expected</span>
              {showNotes ? (
                <strong>{chord.midis.map(m => midiToName(m)).join(' · ')}</strong>
              ) : (
                <strong>?</strong>
              )}
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
                    {c.roman} – {midiToSpelling(c.root, sig.preferFlats).letter}
                    {c.quality === 'min' ? 'm' : c.quality === 'dim' ? '°' : ''}
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
