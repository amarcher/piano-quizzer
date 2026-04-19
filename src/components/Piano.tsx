import { useMemo } from 'react';
import { isBlackKey, midiToName, midiToSpelling } from '../music/notes';
import './Piano.css';

interface Props {
  fromMidi?: number;
  toMidi?: number;
  activeMidi?: Set<number>;
  targetMidi?: Set<number>;
  fingerings?: Map<number, number>;
  showLetters?: boolean;
  onKeyDown?: (midi: number) => void;
  onKeyUp?: (midi: number) => void;
}

// Renders a horizontal piano keyboard with pointer input. White keys are
// rendered in order; black keys are absolutely-positioned on top of the
// neighboring white-key boundary.
export function Piano({
  fromMidi = 48, // C3
  toMidi = 84, // C6
  activeMidi,
  targetMidi,
  fingerings,
  showLetters = true,
  onKeyDown,
  onKeyUp,
}: Props) {
  const whiteKeys = useMemo(() => {
    const arr: number[] = [];
    for (let m = fromMidi; m <= toMidi; m++) if (!isBlackKey(m)) arr.push(m);
    return arr;
  }, [fromMidi, toMidi]);

  const blackKeys = useMemo(() => {
    const arr: number[] = [];
    for (let m = fromMidi; m <= toMidi; m++) if (isBlackKey(m)) arr.push(m);
    return arr;
  }, [fromMidi, toMidi]);

  const whiteIndexByMidi = useMemo(() => {
    const map = new Map<number, number>();
    whiteKeys.forEach((m, i) => map.set(m, i));
    return map;
  }, [whiteKeys]);

  const handleDown = (midi: number) => (e: React.PointerEvent) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    onKeyDown?.(midi);
  };
  const handleUp = (midi: number) => () => onKeyUp?.(midi);

  return (
    <div
      className="piano"
      style={{ ['--white-count' as string]: whiteKeys.length }}
    >
      {whiteKeys.map(m => {
        const sp = midiToSpelling(m);
        const isC = sp.letter === 'C';
        return (
          <button
            key={m}
            type="button"
            className={`piano__key piano__key--white
              ${activeMidi?.has(m) ? 'is-active' : ''}
              ${targetMidi?.has(m) ? 'is-target' : ''}
              ${isC ? 'is-c' : ''}`}
            onPointerDown={handleDown(m)}
            onPointerUp={handleUp(m)}
            onPointerCancel={handleUp(m)}
            onPointerLeave={e => { if (e.buttons) handleUp(m)(); }}
            aria-label={midiToName(m)}
          >
            {fingerings?.has(m) && (
              <span className="piano__finger">{fingerings.get(m)}</span>
            )}
            {showLetters && (
              <span className="piano__label">
                {sp.letter}
                {isC && <sub>{sp.octave}</sub>}
              </span>
            )}
          </button>
        );
      })}
      {blackKeys.map(m => {
        // Position the black key so its center sits on the boundary between
        // its lower and upper neighbor white keys.
        const lowerWhite = m - 1;
        const idx = whiteIndexByMidi.get(lowerWhite);
        if (idx === undefined) return null;
        return (
          <button
            key={m}
            type="button"
            className={`piano__key piano__key--black
              ${activeMidi?.has(m) ? 'is-active' : ''}
              ${targetMidi?.has(m) ? 'is-target' : ''}`}
            style={{ left: `calc(${(idx + 1)} * var(--white-w) - var(--black-w) / 2)` }}
            onPointerDown={handleDown(m)}
            onPointerUp={handleUp(m)}
            onPointerCancel={handleUp(m)}
            onPointerLeave={e => { if (e.buttons) handleUp(m)(); }}
            aria-label={midiToName(m)}
          >
            {fingerings?.has(m) && (
              <span className="piano__finger piano__finger--black">{fingerings.get(m)}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
