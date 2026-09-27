import { useState, useRef, useEffect, useCallback } from "react";

/* Zeitsteuerung für aktionsbasierte Plays (Sekunden).
   play/pause, seek (Scrubbing), playTo (Schritt bis zur nächsten Beat-Grenze), Tempo. */
export default function usePlayback(total) {
  const [time, setTimeState] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const timeRef = useRef(0);
  const stopAt = useRef(null);
  const speedRef = useRef(1);
  speedRef.current = speed;

  const setTime = (t) => { timeRef.current = t; setTimeState(t); };

  useEffect(() => {
    if (!playing) return;
    let raf;
    let last = performance.now();
    const step = (now) => {
      const dt = Math.min(0.1, (now - last) / 1000) * speedRef.current; // Tab-Wechsel: kein Riesensprung
      last = now;
      const limit = stopAt.current ?? total;
      const next = Math.min(limit, timeRef.current + dt);
      setTime(next);
      if (next >= limit - 1e-6) { stopAt.current = null; setPlaying(false); return; }
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [playing, total]);

  // Neues Play → zurück an den Anfang
  useEffect(() => { stopAt.current = null; setPlaying(false); setTime(0); }, [total]);

  const pause = useCallback(() => { stopAt.current = null; setPlaying(false); }, []);
  const seek = useCallback((t) => { stopAt.current = null; setPlaying(false); setTime(Math.max(0, Math.min(total, t))); }, [total]);
  const play = useCallback(() => {
    stopAt.current = null;
    if (timeRef.current >= total - 1e-3) setTime(0);
    setPlaying(true);
  }, [total]);
  const toggle = useCallback(() => (playing ? pause() : play()), [playing, pause, play]);
  const playTo = useCallback((target) => {
    if (target <= timeRef.current + 1e-6) return;
    stopAt.current = Math.min(total, target);
    setPlaying(true);
  }, [total]);

  return { time, playing, speed, setSpeed, play, pause, toggle, seek, playTo };
}
