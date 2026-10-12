import { useEffect, useRef, useState } from "react";

type PersonaOpts = {
  volume?: number; // 0..1
  rate?: number;   // 0.5..2
  pitch?: number;  // 0..2
  lang?: string;   // e.g., "en-US"
  voiceName?: string; // exact match if available
};

const TONE_PRESETS: Record<string, Partial<PersonaOpts>> = {
  emerald_calm: { rate: 0.95, pitch: 1.0 },
  neon_pulse:   { rate: 1.12, pitch: 1.05 },
  amber_flux:   { rate: 1.0, pitch: 1.0 },
};

export function useAIPersonaVoice(toneId: string, baseVolume = 0.25) {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [speaking, setSpeaking] = useState(false);
  const queueRef = useRef<string[]>([]);
  const currentRef = useRef<SpeechSynthesisUtterance | null>(null);

  // load available voices
  useEffect(() => {
    function load() {
      setVoices(window.speechSynthesis.getVoices());
    }
    load();
    window.speechSynthesis.onvoiceschanged = load;
  }, []);

  function stop() {
    window.speechSynthesis.cancel();
    queueRef.current = [];
    setSpeaking(false);
  }

  function speak(text: string, opts: PersonaOpts = {}) {
    if (!text) return;
    const preset = TONE_PRESETS[toneId] || {};
    const u = new SpeechSynthesisUtterance(text);
    u.volume = Math.min(1, Math.max(0, opts.volume ?? baseVolume));
    u.rate   = opts.rate   ?? preset.rate   ?? 1.0;
    u.pitch  = opts.pitch  ?? preset.pitch  ?? 1.0;
    u.lang   = opts.lang   ?? "en-US";

    if (opts.voiceName) {
      const v = voices.find(v => v.name === opts.voiceName);
      if (v) u.voice = v;
    } else {
      // pick a default English voice if present
      const v = voices.find(v => v.lang.startsWith("en")) || voices[0];
      if (v) u.voice = v;
    }

    u.onend = () => {
      const nxt = queueRef.current.shift();
      if (nxt) {
        speak(nxt, opts);
      } else {
        setSpeaking(false);
      }
    };

    currentRef.current = u;
    setSpeaking(true);
    window.speechSynthesis.speak(u);
  }

  function enqueue(texts: string[], opts?: PersonaOpts) {
    // if idle, speak first immediately
    if (!speaking && texts.length) {
      const [first, ...rest] = texts;
      queueRef.current = rest;
      speak(first, opts);
    } else {
      queueRef.current.push(...texts);
    }
  }

  return { voices, speaking, speak, enqueue, stop };
}
