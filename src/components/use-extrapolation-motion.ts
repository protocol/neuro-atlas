import { useEffect, useRef, useState } from "react";

const DURATION = 800;

/** A single display-space clock keeps marks and their axes on the same frame. */
export function useExtrapolationMotion(enabled: boolean) {
  const [progress, setProgress] = useState(0);
  const displayed = useRef(0);
  useEffect(() => {
    const from = displayed.current;
    const to = enabled ? 1 : 0;
    if (from === to) return;
    const start = window.performance.now();
    const media = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    let frame: number | undefined;
    const finishIfReduced = () => {
      if (!media?.matches) return;
      if (frame !== undefined) cancelAnimationFrame(frame);
      displayed.current = to;
      setProgress(to);
    };
    const tick = (now: number) => {
      const elapsed = Math.min(1, (now - start) / DURATION);
      const eased = elapsed < .5 ? 4 * elapsed ** 3 : 1 - (-2 * elapsed + 2) ** 3 / 2;
      displayed.current = from + (to - from) * eased;
      setProgress(displayed.current);
      if (elapsed < 1) frame = requestAnimationFrame(tick);
    };
    media?.addEventListener("change", finishIfReduced);
    if (media?.matches) finishIfReduced();
    else frame = requestAnimationFrame(tick);
    return () => {
      if (frame !== undefined) cancelAnimationFrame(frame);
      media?.removeEventListener("change", finishIfReduced);
    };
  }, [enabled]);
  return progress;
}
