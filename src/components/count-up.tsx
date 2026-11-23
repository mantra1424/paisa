"use client";

import { useEffect, useState } from "react";
import { formatINR } from "@/lib/format";

/** Counts a rupee amount up from 0 on first show. Skipped when the OS asks for reduced motion. */
export function CountUp({ value, duration = 700 }: { value: number; duration?: number }) {
  const [shown, setShown] = useState(value);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || value === 0) {
      setShown(value);
      return;
    }
    let frame = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setShown(t === 1 ? value : Math.round(value * eased));
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value, duration]);

  // Screen readers get the final figure straight away.
  return (
    <>
      <span aria-hidden>{formatINR(shown)}</span>
      <span className="sr-only">{formatINR(value)}</span>
    </>
  );
}
