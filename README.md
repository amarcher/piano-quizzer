# Piano Quizzer

A flashcard app for learning to read piano sheet music, built for one small learner and one grown-up learner.

## Modes

**Milo** — for the four-year-old who's just learning to read music.

- **Letters**: a note appears on the treble or bass staff; identify it by tapping the letter, pressing the matching key on the on-screen piano, playing it on a connected MIDI keyboard, or singing/playing it into the mic. The pool starts tiny (treble C–F, bass G–C) and grows as Milo learns more.
- **How long?**: a whole / half / quarter / eighth note on a staff — pick the name.
- **Loud & soft**: *pp, p, mp, mf, f, ff* — pick what they mean.

**Advanced** — for the adult who wants to read any key at a glance.

- Pick a key (all 15 major keys), hand (left / right), and mode (view or walk-through).
- See the scale on staff with the correct key signature, the scale letters, the standard fingering, and a "now playing" readout with finger number.
- **Walk** mode advances through the scale every time you play the right note — MIDI, on-screen keyboard, or microphone.
- "Play scale" plays the scale through a Tone.js synth.

## Input methods

- **Click / tap** the on-screen piano.
- **MIDI keyboard** via the Web MIDI API (Chrome / Edge / Chromium only; Safari doesn't support it). Click "Connect MIDI" once per session.
- **Microphone** via `pitchy`'s McLeod pitch detector. Click "Listen" and sing or play into the mic; matching pitches (any octave) advance the card. Requires mic permission and needs HTTPS or localhost.

## Run it

```bash
npm install
npm run dev
```

Then open the printed local URL.

## Build

```bash
npm run build   # tsc -b && vite build
npm run preview # serve the built output
```

## Stack

- [Vite](https://vite.dev/) + React 19 + TypeScript
- [VexFlow 5](https://www.vexflow.com/) — sheet music rendering
- [Tone.js](https://tonejs.github.io/) — piano synth playback
- [pitchy](https://github.com/ianprime0509/pitchy) — microphone pitch detection
- Web MIDI API — hardware keyboard input

## Project layout

```
src/
  music/        MIDI ↔ pitch math, key signatures, scales, fingerings
  components/   SheetMusic (VexFlow), Piano (interactive keyboard)
  hooks/        useMidiInput, usePitchDetect
  audio/        Tone.js piano wrapper
  modes/        MiloMode, AdvancedMode
  App.tsx       routing and home screen
```

See [`CLAUDE.md`](./CLAUDE.md) for architecture notes and gotchas.

## License

MIT.
