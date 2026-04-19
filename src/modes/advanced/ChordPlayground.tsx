import { useCallback, useEffect, useMemo, useState } from 'react';
import { SheetMusic, type Clef } from '../../components/SheetMusic';
import { Piano } from '../../components/Piano';
import { ALL_KEYS, getKeySignature, type KeyName } from '../../music/keys';
import { DIATONIC_ROMANS, buildDiatonicTriad, matchesChord, type Roman } from '../../music/chords';
import { midiToName, midiToSpelling, nameToMidi } from '../../music/notes';
import { useMidiInput } from '../../hooks/useMidiInput';
import { playChord } from '../../audio/piano';

type Mode = 'quiz' | 'study';

function pick<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }

export function ChordPlayground() {
  const [key, setKey] = useState<KeyName>('C');
  const [mode, setMode] = useState<Mode>('quiz');
  const [target, setTarget] = useState<Roman>(() => pick(DIATONIC_ROMANS));
  const [pressed, setPressed] = useState<Set<number>>(new Set());
  const [status, setStatus] = useState<'idle' | 'correct'>('idle');
  const [score, setScore] = useState({ right: 0, total: 0 });
  const [showNotes, setShowNotes] = useState(false);

  const chord = useMemo(
    () => buildDiatonicTriad(key, DIATONIC_ROMANS.indexOf(target) + 1),
    [key, target]
  );
  const sig = getKeySignature(key);

  // Reset target when the key changes so the chord refreshes on-screen.
  useEffect(() => { setPressed(new Set()); setStatus('idle'); }, [key, target]);

  const nextTarget = useCallback(() => {
    setStatus('idle');
    setPressed(new Set());
    setShowNotes(false);
    setTimeout(() => {
      let r: Roman = pick(DIATONIC_ROMANS);
      if (r === target && DIATONIC_ROMANS.length > 1) r = pick(DIATONIC_ROMANS.filter(x => x !== target));
      setTarget(r);
    }, 600);
  }, [target]);

  const check = useCallback((newPressed: Set<number>) => {
    if (status === 'correct') return;
    if (matchesChord(newPressed, chord)) {
      setStatus('correct');
      setScore(s => ({ right: s.right + 1, total: s.total + 1 }));
      if (mode === 'quiz') nextTarget();
    }
  }, [chord, status, mode, nextTarget]);

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

  const giveUp = () => {
    setShowNotes(true);
    setScore(s => ({ ...s, total: s.total + 1 }));
  };

  const clef: Clef = chord.root >= nameToMidi('C4') ? 'treble' : 'bass';
  const qualityLabel = chord.quality === 'maj' ? 'major' : chord.quality === 'min' ? 'minor' : 'diminished';

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
          <span>Mode</span>
          <select value={mode} onChange={e => setMode(e.target.value as Mode)}>
            <option value="quiz">Quiz me</option>
            <option value="study">Study (cycle manually)</option>
          </select>
        </label>
        <button type="button" className="adv__button" onClick={() => void playChord(chord.midis, 1.2)}>▶ Play chord</button>
        {!midi.enabled && midi.supported && (
          <button type="button" className="adv__button adv__button--ghost" onClick={midi.request}>Connect MIDI</button>
        )}
        {midi.enabled && <span className="adv__chip">🎹 {midi.deviceName}</span>}
        <span className="adv__chip">Score {score.right}/{score.total}</span>
      </div>

      <div className="adv__grid">
        <div className="adv__staff">
          <div className="adv__prompt">
            Play the <strong className="adv__roman">{target}</strong> chord in {key} major
            <small className="adv__prompt-sub">({qualityLabel})</small>
          </div>
          <SheetMusic
            midiNotes={showNotes || status === 'correct' || mode === 'study' ? chord.midis : []}
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
              <span>Chord tones</span>
              {showNotes || status === 'correct' || mode === 'study' ? (
                <strong>{chord.midis.map(m => midiToName(m)).join(' · ')}</strong>
              ) : (
                <strong>?</strong>
              )}
            </div>
          </div>
        </div>

        <aside className="adv__cheat">
          <h3>Diatonic chords in {key}</h3>
          <ol className="adv__steps adv__steps--romans">
            {DIATONIC_ROMANS.map((r, i) => {
              const c = buildDiatonicTriad(key, i + 1);
              const active = r === target;
              return (
                <li
                  key={r}
                  className={active ? 'is-active' : ''}
                  onClick={() => { setTarget(r); setStatus('idle'); setPressed(new Set()); setShowNotes(false); }}
                >
                  <span className="adv__deg">{r}</span>
                  <span className="adv__name">
                    {midiToSpelling(c.root, sig.preferFlats).letter}
                    {c.quality === 'min' ? 'm' : c.quality === 'dim' ? '°' : ''}
                  </span>
                  <span className="adv__finger" style={{
                    background: c.quality === 'maj' ? '#7c5cff' : c.quality === 'min' ? '#4e8cff' : '#d6473a',
                    fontSize: 10,
                  }}>
                    {c.quality}
                  </span>
                </li>
              );
            })}
          </ol>
          <div className="adv__nav">
            <button onClick={giveUp}>show me</button>
            <button onClick={nextTarget}>skip →</button>
          </div>
        </aside>
      </div>

      <Piano
        fromMidi={nameToMidi('E2')}
        toMidi={nameToMidi('G6')}
        activeMidi={pressed}
        targetMidi={showNotes || status === 'correct' ? new Set(chord.midis) : undefined}
        onKeyDown={handlePianoDown}
        onKeyUp={handlePianoUp}
      />
    </div>
  );
}
