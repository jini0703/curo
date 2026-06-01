import { useCallback, useEffect, useRef, useState } from "react";
import { createVoicePlayer, type RobotId } from "@/lib/curo/voice";

/** Minimal Web Speech types — TS lib doesn't ship them. */
type SR = {
  start: () => void;
  stop: () => void;
  abort: () => void;
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((e: any) => void) | null;
  onerror: ((e: any) => void) | null;
  onend: (() => void) | null;
};

type Opts = {
  robot: RobotId;
  onUserUtterance: (text: string) => void;
  onPartial?: (text: string) => void;
  silenceMs?: number;
};

export function useVoiceLoop({ robot, onUserUtterance, onPartial, silenceMs = 1400 }: Opts) {
  const [listening, setListening] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [supported, setSupported] = useState(true);
  const [partial, setPartial] = useState("");
  const recRef = useRef<SR | null>(null);
  const playerRef = useRef<ReturnType<typeof createVoicePlayer> | null>(null);
  const finalBufferRef = useRef("");
  const silenceTimerRef = useRef<number | null>(null);
  const wantsListenRef = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    playerRef.current = createVoicePlayer(robot);
    const Ctor = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!Ctor) {
      setSupported(false);
      return;
    }
    const r: SR = new Ctor();
    r.continuous = true;
    r.interimResults = true;
    r.lang = "en-US";
    r.onresult = (e: any) => {
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const res = e.results[i];
        if (res.isFinal) {
          finalBufferRef.current += " " + res[0].transcript;
        } else {
          interim += res[0].transcript;
        }
      }
      const live = (finalBufferRef.current + " " + interim).trim();
      setPartial(live);
      onPartial?.(live);

      if (silenceTimerRef.current) window.clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = window.setTimeout(() => {
        const text = finalBufferRef.current.trim();
        if (text.length > 1) {
          finalBufferRef.current = "";
          setPartial("");
          try { r.stop(); } catch {}
          onUserUtterance(text);
        }
      }, silenceMs);
    };
    r.onerror = () => {};
    r.onend = () => {
      setListening(false);
      if (wantsListenRef.current) {
        try { r.start(); setListening(true); } catch {}
      }
    };
    recRef.current = r;
    return () => {
      wantsListenRef.current = false;
      try { r.abort(); } catch {}
      playerRef.current?.cancel();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [robot]);

  const startListening = useCallback(() => {
    const r = recRef.current;
    if (!r) return;
    wantsListenRef.current = true;
    finalBufferRef.current = "";
    setPartial("");
    try { r.start(); setListening(true); } catch {}
  }, []);

  const stopListening = useCallback(() => {
    wantsListenRef.current = false;
    if (silenceTimerRef.current) window.clearTimeout(silenceTimerRef.current);
    try { recRef.current?.stop(); } catch {}
    setListening(false);
  }, []);

  const speak = useCallback(async (text: string) => {
    if (!playerRef.current) return;
    stopListening();
    setSpeaking(true);
    try {
      await playerRef.current.play(text);
    } finally {
      setSpeaking(false);
    }
  }, [stopListening]);

  const cancelSpeech = useCallback(() => {
    playerRef.current?.cancel();
    setSpeaking(false);
  }, []);

  const getAmplitude = useCallback(() => playerRef.current?.getAmplitude() ?? 0, []);

  return { listening, speaking, supported, partial, startListening, stopListening, speak, cancelSpeech, getAmplitude };
}
