"use client";

import { Pause, Play } from "lucide-react";
import { useRef, useState } from "react";

/** Pauses and resumes the hero picture's motion (it moves by default, even with reduced motion, so people can stop it). */
export function MotionToggle() {
  const [paused, setPaused] = useState(false);
  const ref = useRef<HTMLButtonElement>(null);
  return (
    <button
      ref={ref}
      type="button"
      aria-pressed={paused}
      onClick={() => {
        const next = !paused;
        setPaused(next);
        const hero = ref.current?.closest("[data-hero]");
        if (hero) (hero as HTMLElement).dataset.paused = next ? "true" : "false";
      }}
      className="soft absolute left-4 top-4 z-10 inline-flex min-h-11 items-center gap-2 rounded-full px-4 text-sm font-semibold text-foreground transition-colors duration-150 ease hover:bg-mist"
    >
      {paused ? <Play aria-hidden className="size-4" /> : <Pause aria-hidden className="size-4" />}
      {paused ? "Play the animation" : "Pause the animation"}
    </button>
  );
}
