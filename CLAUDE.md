# CLAUDE.md

## Project Overview

Piano-learning flashcard web app for a parent and a four-and-a-half-year-old. Vite + React 19 + TypeScript. Two modes:

- **Milo mode** — treble/bass letter recognition, note-length quiz, dynamics quiz. Tap-only, oversized targets.
- **Advanced mode** — at-a-glance scale reader: pick a key, see the key signature and staff, walk the scale with standard fingerings, play audio, highlight the target note on an on-screen piano.

Both modes accept input via mouse/touch on the on-screen piano **or** a connected MIDI keyboard (Web MIDI API).

## Commands

- `npm run dev` — Vite dev server
- `npm run build` — `tsc -b && vite build`
- `npm run preview` — preview production build
- `npx tsc --noEmit -p tsconfig.app.json` — type check only
- `node scripts/generate-icons.mjs` — regenerate PWA PNG icons from the source SVGs

## Architecture

- **Routing**: `react-router-dom` v7. Three routes inside a shared `<Shell />`: `/`, `/milo`, `/advanced`.
- **Music theory**: lives in `src/music/`.
  - `notes.ts` — MIDI ↔ scientific pitch ↔ VexFlow `"c#/4"` key strings. `MIDDLE_C = 60`.
  - `keys.ts` — 15 major key signatures, `buildAscendingScale(key, octave)` returns 8 MIDI numbers, and `scaleNotes` is letter-correct (one of each A-G).
  - `fingerings.ts` — standard RH/LH fingerings for every major key, indexed by `KeyName`.
  - `dynamics.ts` — dynamic markings and note-length metadata, with `kidTip` strings for Milo mode.
- **Sheet music**: `src/components/SheetMusic.tsx` uses VexFlow 5. Renders a single whole-note chord on one stave with the correct key signature. Accidentals are suppressed when they're already in the key signature; a natural is drawn when a pitch overrides a key-signature alteration.
- **Piano**: `src/components/Piano.tsx` is a flex row of white keys with absolutely-positioned black keys; black-key position is `(whiteIdx + 1) * white-w - black-w/2` relative to its lower neighbor. Supports `activeMidi` (currently pressed), `targetMidi` (highlighted goal), and `fingerings` (Map<midi, number>).
- **Input**:
  - `useMidiInput(handler)` — Web MIDI. Browser support is Chromium-only; call `.request()` from a user gesture. Reattaches on `onstatechange` so hot-plugged controllers still work.
  - `usePitchDetect(cb)` — mic pitch detection via `pitchy`. Requires two consecutive matching reads above clarity threshold before firing, to avoid flapping.
- **Audio**: `src/audio/piano.ts` wraps a Tone.js `PolySynth<Synth>` (triangle + ADSR). `ensureAudio()` calls `Tone.start()` on first use — must be invoked from a user gesture.

## Key Files

- `src/music/notes.ts` — pitch math; all other music code depends on it.
- `src/music/keys.ts` — letter-correct scale spelling. Note the loop that picks between natural/sharp/flat to match `preferFlats`.
- `src/components/SheetMusic.tsx` — the accidental-suppression logic is the easy place to introduce display bugs; see the comment around `keyAccidentals`.
- `src/modes/MiloMode.tsx` / `AdvancedMode.tsx` — screen-level state machines for the two modes.

## PWA / Installable app

- **Manifest**: `public/manifest.webmanifest` — `display: standalone`, dark theme colors matching the app. Referenced from `index.html` via `<link rel="manifest">`.
- **Service worker**: `public/sw.js` — stale-while-revalidate. Cache name is versioned (bump `VERSION` when you want to force all installed clients to re-fetch). Navigation requests always resolve to the cached `/index.html` shell so deep links work offline and don't depend on the Vercel SPA rewrite. Registered from `src/main.tsx` only in production (so it doesn't fight Vite HMR in dev).
- **iOS specifics**: `index.html` includes `apple-mobile-web-app-capable`, `apple-mobile-web-app-status-bar-style: black-translucent`, `apple-mobile-web-app-title`, and an `apple-touch-icon` link. Safe-area insets are padded in `src/index.css` so content clears the notch and home indicator when launched from the home screen.
- **Icons**: source SVGs live in `public/` (`icon.svg` and `icon-maskable.svg` — the maskable one has a full-bleed background and ~60% safe-zone art). PNGs in `public/icons/` are rasterized from them via `scripts/generate-icons.mjs` (uses `sharp`). Regenerate after editing the SVGs; the PNGs are committed so CI builds don't need `sharp`.
- **Version bumping**: after shipping a change you want to force-push to installed clients, bump `VERSION` in `public/sw.js`. Otherwise the old service worker keeps serving the old shell until the client naturally revalidates.

## Gotchas

- **VexFlow 5** uses `numBeats` / `beatValue` (not `num_beats`). Renderer backend is `Renderer.Backends.SVG`.
- **Autoplay**: AudioContext cannot start without a user gesture. Tone.js logs warnings on mount but it's harmless — playback works the first time the user clicks.
- **Web MIDI**: unsupported in Safari. The hook exposes `supported` so the UI can hide the "Connect MIDI" button accordingly.
- **Scale octave direction**: `buildAscendingScale` bumps the octave whenever the next spelled note's MIDI would not exceed the previous one (handles keys like B major where the 7th degree A# is below B).
- **iOS home-screen icon caching**: iOS aggressively caches the apple-touch-icon. If an update doesn't appear, remove the installed app and re-add it.
- **`vite-plugin-pwa` not used** because it doesn't yet support Vite 8 (as of this writing). The manual setup here is small enough that adding the plugin later is easy.

## Not yet built (future work)

- Ear-training mode using the pitch-detect hook or playback + multiple-choice.
- Chord recognition (triads/seventh quality) as separate Advanced sub-mode.
- Yoto player integration (audio-only mode with a voice guide, no screen).
- ElevenLabs voice agent (see sister `periodic-table` project for the pattern).
- SRS scheduling of drill items (currently random picks).
- Key-signature identification quiz.
