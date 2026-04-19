import { useCallback, useMemo, useState } from 'react';
import { SheetMusic, type Clef } from '../components/SheetMusic';
import { Piano } from '../components/Piano';
import { midiToSpelling, nameToMidi } from '../music/notes';
import { DYNAMICS, NOTE_LENGTHS } from '../music/dynamics';
import { useMidiInput } from '../hooks/useMidiInput';
import { usePitchDetect } from '../hooks/usePitchDetect';
import { playNote } from '../audio/piano';
import './MiloMode.css';

type Sub = 'note-letter' | 'note-length' | 'dynamics';

// Notes Milo currently knows. Grow this list as he learns new ones.
// Treble: C4 (middle C), D4, E4, F4 — the first four notes ascending from middle C.
// Bass: middle C descending — C4, B3, A3, G3.
const TREBLE_RANGE = [
  nameToMidi('C4'), nameToMidi('D4'), nameToMidi('E4'), nameToMidi('F4'),
];
const BASS_RANGE = [
  nameToMidi('G3'), nameToMidi('A3'), nameToMidi('B3'), nameToMidi('C4'),
];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// The letters on the buttons only include ones Milo currently knows for the
// active clef, so he's not staring at letters he hasn't seen yet.
function answerLetters(clef: Clef): string[] {
  const pool = clef === 'treble' ? TREBLE_RANGE : BASS_RANGE;
  return Array.from(new Set(pool.map(m => midiToSpelling(m).letter))).sort();
}

export function MiloMode() {
  const [sub, setSub] = useState<Sub>('note-letter');
  return (
    <div className="milo">
      <header className="milo__tabs">
        <button onClick={() => setSub('note-letter')} className={sub === 'note-letter' ? 'is-on' : ''}>
          Letters
        </button>
        <button onClick={() => setSub('note-length')} className={sub === 'note-length' ? 'is-on' : ''}>
          How long?
        </button>
        <button onClick={() => setSub('dynamics')} className={sub === 'dynamics' ? 'is-on' : ''}>
          Loud & soft
        </button>
      </header>
      {sub === 'note-letter' && <NoteLetterDrill />}
      {sub === 'note-length' && <NoteLengthDrill />}
      {sub === 'dynamics' && <DynamicsDrill />}
    </div>
  );
}

function NoteLetterDrill() {
  const [clef, setClef] = useState<Clef>('treble');
  const [target, setTarget] = useState(() => pick(TREBLE_RANGE));
  const [status, setStatus] = useState<'idle' | 'correct' | 'wrong'>('idle');
  const [score, setScore] = useState({ right: 0, total: 0 });
  const [listenMode, setListenMode] = useState(false);

  const targetLetter = midiToSpelling(target).letter;

  const next = useCallback((wasCorrect: boolean) => {
    setScore(s => ({ right: s.right + (wasCorrect ? 1 : 0), total: s.total + 1 }));
    setTimeout(() => {
      const pool = clef === 'treble' ? TREBLE_RANGE : BASS_RANGE;
      let nextTarget = pick(pool);
      if (nextTarget === target) nextTarget = pick(pool);
      setTarget(nextTarget);
      setStatus('idle');
    }, 900);
  }, [clef, target]);

  const guess = (letter: string, silent = false) => {
    if (status !== 'idle') return;
    if (letter === targetLetter) {
      setStatus('correct');
      if (!silent) void playNote(target, 0.8);
      next(true);
    } else {
      setStatus('wrong');
      setTimeout(() => setStatus('idle'), 500);
      setScore(s => ({ ...s, total: s.total + 1 }));
    }
  };

  const handleMidi = useCallback<Parameters<typeof useMidiInput>[0]>((midi, _vel, kind) => {
    if (kind !== 'on' || status !== 'idle') return;
    if (midiToSpelling(midi).letter === targetLetter) {
      setStatus('correct');
      next(true);
    }
  }, [targetLetter, status, next]);
  const midi = useMidiInput(handleMidi);

  // Microphone input: match any octave of the target letter. We suppress
  // playback on correct so the synth doesn't echo back into the mic and loop.
  const pitch = usePitchDetect(sample => {
    if (status !== 'idle') return;
    if (midiToSpelling(sample.midi).letter === targetLetter) {
      guess(targetLetter, true);
    }
  });

  const swapClef = () => {
    const nextClef = clef === 'treble' ? 'bass' : 'treble';
    setClef(nextClef);
    setTarget(pick(nextClef === 'treble' ? TREBLE_RANGE : BASS_RANGE));
    setStatus('idle');
  };

  return (
    <div className={`milo__card milo__card--${status}`}>
      <div className="milo__toolbar">
        <button onClick={swapClef} className="milo__pill">
          {clef === 'treble' ? 'Treble clef 🎼' : 'Bass clef 🎵'}
        </button>
        <span className="milo__score">{score.right}/{score.total}</span>
        {!midi.enabled && midi.supported && (
          <button onClick={midi.request} className="milo__pill milo__pill--ghost">Connect MIDI</button>
        )}
        {midi.enabled && <span className="milo__pill milo__pill--ok">🎹 {midi.deviceName}</span>}
        {!pitch.listening ? (
          <button
            onClick={() => { setListenMode(true); void pitch.start(); }}
            className="milo__pill milo__pill--ghost"
          >
            🎤 Listen
          </button>
        ) : (
          <button
            onClick={() => { setListenMode(false); pitch.stop(); }}
            className="milo__pill milo__pill--ok"
          >
            🎤 Listening{listenMode ? '…' : ''}
          </button>
        )}
      </div>
      <div className="milo__stage">
        <SheetMusic midiNotes={[target]} clef={clef} keyName="C" width={320} height={200} />
      </div>
      <p className="milo__prompt">What letter is this note?</p>
      <div className="milo__answers">
        {answerLetters(clef).map(l => (
          <button
            key={l}
            type="button"
            className="milo__answer"
            onClick={() => guess(l)}
          >
            {l}
          </button>
        ))}
      </div>
      <Piano
        fromMidi={nameToMidi('C3')}
        toMidi={nameToMidi('C6')}
        targetMidi={status === 'correct' ? new Set([target]) : undefined}
        onKeyDown={m => {
          if (midiToSpelling(m).letter === targetLetter) {
            setStatus('correct');
            void playNote(m, 0.8);
            next(true);
          } else {
            setStatus('wrong');
            setTimeout(() => setStatus('idle'), 500);
            setScore(s => ({ ...s, total: s.total + 1 }));
          }
        }}
      />
    </div>
  );
}

function NoteLengthDrill() {
  const [idx, setIdx] = useState(() => Math.floor(Math.random() * NOTE_LENGTHS.length));
  const [status, setStatus] = useState<'idle' | 'correct' | 'wrong'>('idle');
  const current = NOTE_LENGTHS[idx];

  const options = useMemo(() => {
    const shuffled = [...NOTE_LENGTHS].sort(() => Math.random() - 0.5);
    return shuffled;
  }, [idx]);

  const durationCode: Record<string, 'w' | 'h' | 'q' | '8'> = {
    whole: 'w', half: 'h', quarter: 'q', eighth: '8',
  };

  const next = () => {
    setTimeout(() => {
      let n = Math.floor(Math.random() * NOTE_LENGTHS.length);
      if (n === idx) n = (n + 1) % NOTE_LENGTHS.length;
      setIdx(n);
      setStatus('idle');
    }, 800);
  };

  const guess = (name: string) => {
    if (status !== 'idle') return;
    if (name === current.name) { setStatus('correct'); next(); }
    else { setStatus('wrong'); setTimeout(() => setStatus('idle'), 400); }
  };

  return (
    <div className={`milo__card milo__card--${status}`}>
      <div className="milo__stage">
        <SheetMusic
          midiNotes={[nameToMidi('B4')]}
          clef="treble"
          keyName="C"
          duration={durationCode[current.name]}
          width={260}
          height={180}
          showKeySig={false}
        />
      </div>
      <p className="milo__prompt">How long do we hold this note?</p>
      <div className="milo__answers milo__answers--wide">
        {options.map(o => (
          <button key={o.name} type="button" className="milo__answer milo__answer--wide" onClick={() => guess(o.name)}>
            {o.name}
            <span className="milo__answer-tip">{o.kidTip}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function DynamicsDrill() {
  const [idx, setIdx] = useState(() => Math.floor(Math.random() * DYNAMICS.length));
  const [status, setStatus] = useState<'idle' | 'correct' | 'wrong'>('idle');
  const current = DYNAMICS[idx];
  const options = useMemo(() => [...DYNAMICS].sort(() => Math.random() - 0.5), [idx]);

  const next = () => {
    setTimeout(() => {
      let n = Math.floor(Math.random() * DYNAMICS.length);
      if (n === idx) n = (n + 1) % DYNAMICS.length;
      setIdx(n);
      setStatus('idle');
    }, 800);
  };

  const guess = (name: string) => {
    if (status !== 'idle') return;
    if (name === current.name) { setStatus('correct'); next(); }
    else { setStatus('wrong'); setTimeout(() => setStatus('idle'), 400); }
  };

  return (
    <div className={`milo__card milo__card--${status}`}>
      <div className="milo__stage milo__stage--dynamic">
        <em className="milo__dyn">{current.symbol}</em>
      </div>
      <p className="milo__prompt">What does this mean?</p>
      <div className="milo__answers milo__answers--wide">
        {options.map(o => (
          <button key={o.name} type="button" className="milo__answer milo__answer--wide" onClick={() => guess(o.name)}>
            {o.kidTip}
            <span className="milo__answer-tip">{o.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
}


