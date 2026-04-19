import { useCallback, useEffect, useMemo, useState } from 'react';
import { SheetMusic, type Clef } from '../../components/SheetMusic';
import { Piano } from '../../components/Piano';
import { ALL_KEYS, buildAscendingScale, getKeySignature, type KeyName } from '../../music/keys';
import { MAJOR_FINGERINGS } from '../../music/fingerings';
import { midiToName, midiToSpelling, nameToMidi } from '../../music/notes';
import { useMidiInput } from '../../hooks/useMidiInput';
import { usePitchDetect } from '../../hooks/usePitchDetect';
import { playNote, playSequence } from '../../audio/piano';

type Hand = 'right' | 'left';

export function ScalePlayground() {
  const [key, setKey] = useState<KeyName>('C');
  const [hand, setHand] = useState<Hand>('right');
  const [stepIdx, setStepIdx] = useState(0);
  const [mode, setMode] = useState<'walk' | 'view'>('view');
  const [pressed, setPressed] = useState<Set<number>>(new Set());
  const [heard, setHeard] = useState<string | null>(null);

  const clef: Clef = hand === 'right' ? 'treble' : 'bass';
  const startOctave = hand === 'right' ? 4 : 2;
  const scale = useMemo(() => buildAscendingScale(key, startOctave), [key, startOctave]);
  const fingers = hand === 'right' ? MAJOR_FINGERINGS[key].rh : MAJOR_FINGERINGS[key].lh;
  const fingeringMap = useMemo(() => {
    const m = new Map<number, number>();
    scale.forEach((midi, i) => m.set(midi, fingers[i]));
    return m;
  }, [scale, fingers]);

  const target = scale[stepIdx];
  const sig = getKeySignature(key);

  const advance = useCallback(() => {
    setStepIdx(i => (i + 1) % scale.length);
  }, [scale.length]);

  const handleMidi = useCallback<Parameters<typeof useMidiInput>[0]>((midi, _v, kind) => {
    if (kind === 'on') {
      setPressed(p => new Set(p).add(midi));
      if (mode === 'walk' && midi === target) {
        void playNote(midi, 0.4);
        advance();
      }
    } else {
      setPressed(p => { const n = new Set(p); n.delete(midi); return n; });
    }
  }, [mode, target, advance]);
  const midi = useMidiInput(handleMidi);

  const pitch = usePitchDetect(sample => {
    setHeard(midiToName(sample.midi));
    const targetPc = ((target % 12) + 12) % 12;
    const heardPc = ((sample.midi % 12) + 12) % 12;
    if (heardPc === targetPc) advance();
  }, 0.88);

  const startListening = async () => {
    setMode('walk');
    await pitch.start();
  };

  useEffect(() => { setStepIdx(0); }, [key, hand]);

  const handlePianoDown = (m: number) => {
    setPressed(p => new Set(p).add(m));
    void playNote(m, 0.4);
    if (mode === 'walk' && m === target) advance();
  };
  const handlePianoUp = (m: number) => {
    setPressed(p => { const n = new Set(p); n.delete(m); return n; });
  };

  const playAll = () => { void playSequence(scale, 0.35); };

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
          <span>Hand</span>
          <select value={hand} onChange={e => setHand(e.target.value as Hand)}>
            <option value="right">Right</option>
            <option value="left">Left</option>
          </select>
        </label>
        <label className="adv__field">
          <span>Mode</span>
          <select value={mode} onChange={e => setMode(e.target.value as 'walk' | 'view')}>
            <option value="view">View scale</option>
            <option value="walk">Walk through</option>
          </select>
        </label>
        <button type="button" className="adv__button" onClick={playAll}>▶ Play scale</button>
        {!midi.enabled && midi.supported && (
          <button type="button" className="adv__button adv__button--ghost" onClick={midi.request}>Connect MIDI</button>
        )}
        {midi.enabled && <span className="adv__chip">🎹 {midi.deviceName}</span>}
        {!pitch.listening ? (
          <button type="button" className="adv__button adv__button--ghost" onClick={() => void startListening()}>
            🎤 Listen
          </button>
        ) : (
          <button type="button" className="adv__button" onClick={() => { pitch.stop(); setHeard(null); }}>
            🎤 Stop listening
          </button>
        )}
        {pitch.listening && <span className="adv__chip">heard: {heard ?? '—'}</span>}
      </div>

      <div className="adv__grid">
        <div className="adv__staff">
          <SheetMusic midiNotes={[target]} clef={clef} keyName={key} width={380} height={220} />
          <div className="adv__meta">
            <div>
              <strong>{key} major</strong>
              <span className="adv__scale-letters">
                {sig.scaleNotes.map(n => <span key={n}>{n}</span>)}
              </span>
            </div>
            <div className="adv__target">
              <span>Now playing</span>
              <strong>{midiToName(target)}</strong>
              <em>finger {fingeringMap.get(target)}</em>
            </div>
          </div>
        </div>

        <aside className="adv__cheat">
          <h3>At-a-glance</h3>
          <p>
            {key} has <strong>{Math.abs(sig.sharps)}</strong> {sig.sharps >= 0 ? 'sharp' : 'flat'}
            {Math.abs(sig.sharps) === 1 ? '' : 's'}.
          </p>
          <ol className="adv__steps">
            {scale.map((m, i) => {
              const active = i === stepIdx;
              const letter = midiToSpelling(m, sig.preferFlats);
              return (
                <li
                  key={i}
                  className={active ? 'is-active' : ''}
                  onClick={() => { setStepIdx(i); void playNote(m, 0.4); }}
                >
                  <span className="adv__deg">{i + 1}</span>
                  <span className="adv__name">
                    {letter.letter}
                    {letter.accidental === '#' ? '♯' : letter.accidental === 'b' ? '♭' : ''}
                  </span>
                  <span className="adv__finger">{fingers[i]}</span>
                </li>
              );
            })}
          </ol>
          <div className="adv__nav">
            <button onClick={() => setStepIdx(i => Math.max(0, i - 1))}>← back</button>
            <button onClick={advance}>next →</button>
          </div>
        </aside>
      </div>

      <Piano
        fromMidi={nameToMidi('E2')}
        toMidi={nameToMidi('G6')}
        activeMidi={pressed}
        targetMidi={mode === 'walk' ? new Set([target]) : new Set(scale)}
        fingerings={fingeringMap}
        onKeyDown={handlePianoDown}
        onKeyUp={handlePianoUp}
      />
    </div>
  );
}
