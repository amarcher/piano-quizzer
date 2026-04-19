import { useState } from 'react';
import { ScalePlayground } from './advanced/ScalePlayground';
import { ChordPlayground } from './advanced/ChordPlayground';
import { ProgressionPlayground } from './advanced/ProgressionPlayground';
import './AdvancedMode.css';

type Sub = 'scales' | 'chords' | 'progressions';

export function AdvancedMode() {
  const [sub, setSub] = useState<Sub>('scales');
  return (
    <div className="adv-shell">
      <nav className="adv-shell__tabs">
        <button className={sub === 'scales' ? 'is-on' : ''} onClick={() => setSub('scales')}>Scales</button>
        <button className={sub === 'chords' ? 'is-on' : ''} onClick={() => setSub('chords')}>Chords</button>
        <button className={sub === 'progressions' ? 'is-on' : ''} onClick={() => setSub('progressions')}>Progressions</button>
      </nav>
      {sub === 'scales' && <ScalePlayground />}
      {sub === 'chords' && <ChordPlayground />}
      {sub === 'progressions' && <ProgressionPlayground />}
    </div>
  );
}
