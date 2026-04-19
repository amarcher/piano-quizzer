import { useState } from 'react';
import { ScalePlayground } from './advanced/ScalePlayground';
import { ChordPlayground } from './advanced/ChordPlayground';
import { InversionsPlayground } from './advanced/InversionsPlayground';
import { ProgressionPlayground } from './advanced/ProgressionPlayground';
import { StylesPlayground } from './advanced/StylesPlayground';
import { MirrorPlayground } from './advanced/MirrorPlayground';
import './AdvancedMode.css';

type Sub = 'mirror' | 'scales' | 'chords' | 'inversions' | 'progressions' | 'styles';

export function AdvancedMode() {
  const [sub, setSub] = useState<Sub>('mirror');
  return (
    <div className="adv-shell">
      <nav className="adv-shell__tabs">
        <button className={sub === 'mirror' ? 'is-on' : ''} onClick={() => setSub('mirror')}>Mirror</button>
        <button className={sub === 'scales' ? 'is-on' : ''} onClick={() => setSub('scales')}>Scales</button>
        <button className={sub === 'chords' ? 'is-on' : ''} onClick={() => setSub('chords')}>Chords</button>
        <button className={sub === 'inversions' ? 'is-on' : ''} onClick={() => setSub('inversions')}>Inversions</button>
        <button className={sub === 'progressions' ? 'is-on' : ''} onClick={() => setSub('progressions')}>Progressions</button>
        <button className={sub === 'styles' ? 'is-on' : ''} onClick={() => setSub('styles')}>Jazz &amp; Minor</button>
      </nav>
      {sub === 'mirror' && <MirrorPlayground />}
      {sub === 'scales' && <ScalePlayground />}
      {sub === 'chords' && <ChordPlayground />}
      {sub === 'inversions' && <InversionsPlayground />}
      {sub === 'progressions' && <ProgressionPlayground />}
      {sub === 'styles' && <StylesPlayground />}
    </div>
  );
}
