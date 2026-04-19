import { useCallback, useEffect, useMemo, useState } from 'react';
import { SheetMusic, type Clef } from '../../components/SheetMusic';
import { Piano } from '../../components/Piano';
import { ALL_KEYS, type KeyName } from '../../music/keys';
import {
  DIATONIC_ROMANS,
  INVERSION_LABELS,
  buildDiatonicTriad,
  invertChord,
  matchesChordInversion,
  type Inversion,
  type Roman,
} from '../../music/chords';
import { midiToName, nameToMidi } from '../../music/notes';
import { useMidiInput } from '../../hooks/useMidiInput';
import { playChord } from '../../audio/piano';

const INVERSIONS: Inversion[] = ['root', '1st', '2nd'];
function pick<T>(arr: readonly T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }

export function InversionsPlayground() {
  const [key, setKey] = useState<KeyName>('C');
  const [target, setTarget] = useState<{ roman: Roman; inv: Inversion }>(() => ({
    roman: pick(DIATONIC_ROMANS),
    inv: pick(INVERSIONS),
  }));
  const [pressed, setPressed] = useState<Set<number>>(new Set());
  const [status, setStatus] = useState<'idle' | 'correct'>('idle');
  const [score, setScore] = useState({ right: 0, total: 0 });
  const [showNotes, setShowNotes] = useState(false);

  const rootPositionChord = useMemo(
    () => buildDiatonicTriad(key, DIATONIC_ROMANS.indexOf(target.roman) + 1),
    [key, target.roman]
  );
  const voiced = useMemo(
    () => invertChord(rootPositionChord, target.inv),
    [rootPositionChord, target.inv]
  );

  useEffect(() => { setPressed(new Set()); setStatus('idle'); setShowNotes(false); }, [target, key]);

  const nextTarget = useCallback(() => {
    setPressed(new Set());
    setStatus('idle');
    setShowNotes(false);
    setTimeout(() => {
      const roman = pick(DIATONIC_ROMANS);
      const inv = pick(INVERSIONS);
      setTarget({ roman, inv });
    }, 600);
  }, []);

  const check = useCallback((newPressed: Set<number>) => {
    if (status === 'correct') return;
    if (matchesChordInversion(newPressed, rootPositionChord, target.inv)) {
      setStatus('correct');
      setScore(s => ({ right: s.right + 1, total: s.total + 1 }));
      void playChord([...newPressed], 0.9);
      nextTarget();
    }
  }, [rootPositionChord, target.inv, status, nextTarget]);

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

  const bassMidi = voiced.midis[0];
  const clef: Clef = bassMidi >= nameToMidi('C4') ? 'treble' : 'bass';

  return (
    <div className="adv">
      <div className="adv__toolbar">
        <label className="adv__field">
          <span>Key</span>
          <select value={key} onChange={e => setKey(e.target.value as KeyName)}>
            {ALL_KEYS.map(k => <option key={k} value={k}>{k} major</option>)}
          </select>
        </label>
        <button type="button" className="adv__button" onClick={() => void playChord(voiced.midis, 1.4)}>▶ Play chord</button>
        {!midi.enabled && midi.supported && (
          <button type="button" className="adv__button adv__button--ghost" onClick={midi.request}>Connect MIDI</button>
        )}
        {midi.enabled && <span className="adv__chip">🎹 {midi.deviceName}</span>}
        <span className="adv__chip">Score {score.right}/{score.total}</span>
      </div>

      <div className="adv__grid">
        <div className="adv__staff">
          <div className="adv__prompt">
            Play the <strong className="adv__roman">{target.roman}</strong> chord in {key} major
            <small className="adv__prompt-sub">in <strong>{INVERSION_LABELS[target.inv]}</strong> — bass note must be {target.inv === 'root' ? 'the root' : target.inv === '1st' ? 'the third' : 'the fifth'}</small>
          </div>
          <SheetMusic
            midiNotes={showNotes || status === 'correct' ? voiced.midis : []}
            clef={clef}
            keyName={key}
            width={380}
            height={240}
          />
          <div className="adv__meta">
            <div>
              <strong>{key} major</strong>
              <span className="adv__scale-letters">{target.roman} {INVERSION_LABELS[target.inv]}</span>
            </div>
            <div className="adv__target">
              <span>Notes bottom-up</span>
              {showNotes || status === 'correct' ? (
                <strong>{voiced.midis.map(m => midiToName(m)).join(' · ')}</strong>
              ) : <strong>?</strong>}
            </div>
          </div>
        </div>

        <aside className="adv__cheat">
          <h3>Inversions cheatsheet</h3>
          <ul className="adv__inv-list">
            <li><strong>Root</strong> — bass is the <em>root</em>. Stack: 1–3–5.</li>
            <li><strong>1st inv</strong> — bass is the <em>third</em>. Stack: 3–5–1.</li>
            <li><strong>2nd inv</strong> — bass is the <em>fifth</em>. Stack: 5–1–3.</li>
          </ul>
          <p className="adv__inv-tip">
            Any octave works. Just get the three pitch classes right <em>and</em> put the correct note at the bottom.
          </p>
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
        targetMidi={showNotes || status === 'correct' ? new Set(voiced.midis) : undefined}
        onKeyDown={handlePianoDown}
        onKeyUp={handlePianoUp}
      />
    </div>
  );
}
