import { useEffect, useRef, useState } from 'react';

export type MidiHandler = (midi: number, velocity: number, kind: 'on' | 'off') => void;

interface State {
  supported: boolean;
  enabled: boolean;
  deviceName?: string;
  error?: string;
}

// Wraps the Web MIDI API. Call `request()` once to prompt for access
// (Chromium/Edge implement it; Safari does not). All Note-On/Note-Off events
// across connected inputs are forwarded to the supplied handler.
export function useMidiInput(handler: MidiHandler) {
  const [state, setState] = useState<State>({
    supported: typeof navigator !== 'undefined' && !!(navigator as Navigator).requestMIDIAccess,
    enabled: false,
  });
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  const accessRef = useRef<MIDIAccess | null>(null);

  useEffect(() => {
    return () => {
      const access = accessRef.current;
      if (!access) return;
      access.inputs.forEach(input => { input.onmidimessage = null; });
    };
  }, []);

  const request = async () => {
    if (!state.supported) {
      setState(s => ({ ...s, error: 'Web MIDI not supported in this browser. Try Chrome or Edge.' }));
      return;
    }
    try {
      const access = await navigator.requestMIDIAccess({ sysex: false });
      accessRef.current = access;
      attach(access);
      access.onstatechange = () => attach(access);
    } catch (err) {
      setState(s => ({ ...s, error: (err as Error).message }));
    }
  };

  function attach(access: MIDIAccess) {
    const names: string[] = [];
    access.inputs.forEach(input => {
      names.push(input.name ?? 'MIDI Input');
      input.onmidimessage = (e: MIDIMessageEvent) => {
        if (!e.data) return;
        const [status, data1, data2] = e.data;
        const cmd = status & 0xf0;
        if (cmd === 0x90 && data2 > 0) handlerRef.current(data1, data2, 'on');
        else if (cmd === 0x80 || (cmd === 0x90 && data2 === 0)) handlerRef.current(data1, 0, 'off');
      };
    });
    setState({
      supported: true,
      enabled: names.length > 0,
      deviceName: names.join(', ') || undefined,
    });
  }

  return { ...state, request };
}
