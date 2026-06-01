/**
 * ElevenLabs-backed speak with graceful fallback to browser SpeechSynthesis.
 * Returns an object with `play(text)`, `cancel()` and `analyser` (for lipsync).
 */

export type RobotId = "aria" | "leo";

export function createVoicePlayer(robot: RobotId) {
  let audioCtx: AudioContext | null = null;
  let analyser: AnalyserNode | null = null;
  let currentAudio: HTMLAudioElement | null = null;
  let currentSource: MediaElementAudioSourceNode | null = null;

  function ensureCtx() {
    if (!audioCtx) {
      const Ctor = (window.AudioContext || (window as any).webkitAudioContext) as typeof AudioContext;
      audioCtx = new Ctor();
      analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
    }
    return { audioCtx: audioCtx!, analyser: analyser! };
  }

  function cancel() {
    try {
      if (currentAudio) {
        currentAudio.pause();
        currentAudio.src = "";
      }
    } catch {}
    currentAudio = null;
    try { window.speechSynthesis?.cancel(); } catch {}
  }

  async function fallbackSpeak(text: string): Promise<void> {
    return new Promise((resolve) => {
      if (typeof window === "undefined" || !("speechSynthesis" in window)) return resolve();
      const u = new SpeechSynthesisUtterance(text);
      const voices = window.speechSynthesis.getVoices();
      const pick = voices.find((v) =>
        robot === "aria"
          ? /female|samantha|victoria|zira|google us english/i.test(v.name)
          : /male|daniel|alex|mark|google uk english male/i.test(v.name),
      );
      if (pick) u.voice = pick;
      u.rate = 1.02;
      u.pitch = robot === "aria" ? 1.15 : 0.95;
      u.onend = () => resolve();
      u.onerror = () => resolve();
      window.speechSynthesis.speak(u);
    });
  }

  async function play(text: string): Promise<void> {
    cancel();
    try {
      const res = await fetch("/api/elevenlabs/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, robot }),
      });
      if (!res.ok) throw new Error(`tts ${res.status}`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audio.crossOrigin = "anonymous";
      currentAudio = audio;

      try {
        const { audioCtx, analyser } = ensureCtx();
        if (audioCtx.state === "suspended") await audioCtx.resume();
        currentSource = audioCtx.createMediaElementSource(audio);
        currentSource.connect(analyser);
        analyser.connect(audioCtx.destination);
      } catch {
        // analyser optional
      }

      await new Promise<void>((resolve) => {
        audio.onended = () => { URL.revokeObjectURL(url); resolve(); };
        audio.onerror = () => { URL.revokeObjectURL(url); resolve(); };
        audio.play().catch(() => resolve());
      });
    } catch {
      await fallbackSpeak(text);
    }
  }

  function getAmplitude(): number {
    if (!analyser) return 0;
    const buf = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteFrequencyData(buf);
    let sum = 0;
    for (let i = 0; i < buf.length; i++) sum += buf[i];
    return sum / (buf.length * 255);
  }

  return { play, cancel, getAmplitude };
}
