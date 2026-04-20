import { useEffect, useRef, useState } from 'react';
import { PitchDetector } from 'pitchy';

export interface PitchSample {
  midi: number;
  frequency: number;
  clarity: number;
}

// Continuous microphone pitch detection via pitchy's McLeod pitch method.
// Emits a sample only when (1) RMS amplitude clears minRms — stops ambient
// room noise from triggering, (2) clarity clears the threshold, and (3) the
// detected MIDI note is stable across two consecutive frames and differs
// from the previously reported note, so a sustained note fires once.
export function usePitchDetect(
  onPitch: (p: PitchSample) => void,
  clarityThreshold = 0.92,
  minRms = 0.015,
) {
  const [listening, setListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const onPitchRef = useRef(onPitch);
  onPitchRef.current = onPitch;

  const ctxRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);

  const start = async () => {
    if (listening) return;
    try {
      const ctx = new AudioContext();
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const src = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 2048;
      src.connect(analyser);

      const detector = PitchDetector.forFloat32Array(analyser.fftSize);
      const buf = new Float32Array(detector.inputLength);
      let lastStableMidi = -1; // candidate seen on the previous frame
      let lastFiredMidi = -1;  // the note we most recently reported
      let silenceFrames = 0;

      const tick = () => {
        analyser.getFloatTimeDomainData(buf);
        // RMS amplitude — cheap way to reject silence and background noise
        // before running (or trusting) the pitch detector.
        let sumSq = 0;
        for (let i = 0; i < buf.length; i++) sumSq += buf[i] * buf[i];
        const rms = Math.sqrt(sumSq / buf.length);
        const [freq, clarity] = detector.findPitch(buf, ctx.sampleRate);
        if (rms > minRms && clarity > clarityThreshold && freq > 40 && freq < 4500) {
          const midi = Math.round(69 + 12 * Math.log2(freq / 440));
          // Fire once when a NEW stable pitch starts — two consecutive frames
          // agreeing, and different from whatever we last reported. This
          // converts a sustained note into a single event.
          if (midi === lastStableMidi && midi !== lastFiredMidi) {
            onPitchRef.current({ midi, frequency: freq, clarity });
            lastFiredMidi = midi;
          }
          lastStableMidi = midi;
          silenceFrames = 0;
        } else {
          lastStableMidi = -1;
          silenceFrames += 1;
          // After ~120ms of quiet, reset so repeating the same note fires again.
          if (silenceFrames > 7) lastFiredMidi = -1;
        }
        rafRef.current = requestAnimationFrame(tick);
      };
      rafRef.current = requestAnimationFrame(tick);

      ctxRef.current = ctx;
      streamRef.current = stream;
      setListening(true);
      setError(null);
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const stop = () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    ctxRef.current?.close();
    ctxRef.current = null;
    setListening(false);
  };

  useEffect(() => () => stop(), []);

  return { listening, error, start, stop };
}
