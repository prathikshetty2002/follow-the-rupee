"use client";

import { ArrowRight, TrainFront, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useSyncExternalStore } from "react";

type Stop = { station: string; title: string; tag: string; body: string; go?: { label: string; href: string } };

/** The route through the site, as a ride down the Western line: one stop for each thing worth knowing. */
const STOPS: Stop[] = [
  {
    station: "Churchgate",
    title: "Shuruaat",
    tag: "Chalo, shuru karte hain.",
    body: "This tool answers one question: where should a ward's next rupee go? It ranks every open road complaint by risk and shows what to fix first with the budget left. All the data is synthetic.",
  },
  {
    station: "Marine Lines",
    title: "Map pe nazar",
    tag: "Pehle poora Mumbai dekh lo.",
    body: "All 24 wards on one map. Darker means more risk. The Risk, Budget gap and Open issues tabs colour it three different ways.",
    go: { label: "Show me the map", href: "/#map" },
  },
  {
    station: "Charni Road",
    title: "Ward pakdo",
    tag: "Click karo, seedha wahan pahunch jao.",
    body: "Click a ward, or its card at the bottom, and the map flies there. A filled dot is paid for with the budget left; a ring is not. Can't spot it? Search a ward, area or road, like Sion or Andheri.",
    go: { label: "Try Matunga, Sion, Wadala", href: "/?ward=F-N#map" },
  },
  {
    station: "Grant Road",
    title: "3D ka maza",
    tag: "Ek dum jhakaas view.",
    body: "Press 3D and each ward stands as tall as its value. Ctrl and scroll zooms, Shift and drag turns the map, and on a phone you can pinch.",
    go: { label: "Take me to the map", href: "/#map" },
  },
  {
    station: "Mumbai Central",
    title: "Planner mein ghuso",
    tag: "Yahin asli kaam hota hai.",
    body: "Open a ward's planner. Type any budget, choose riskiest first or most risk covered, and watch the budget line show where the money runs out. Open any issue to see the arithmetic behind its score.",
    go: { label: "Open the ward F/N planner", href: "/plan/F-N" },
  },
  {
    station: "Dadar",
    title: "Kitna bharosa?",
    tag: "Seedhi baat, no gol gol.",
    body: "Each issue shows how sure we are: high, medium, or check on site. A ranking says where to look first, so confirm on the ground before sending a crew. The method page shows how it was tested.",
    go: { label: "How it works", href: "/method" },
  },
];

const KEY = "guide-seen";
const seen = {
  subscribe(onChange: () => void) {
    window.addEventListener("storage", onChange);
    window.addEventListener(KEY, onChange);
    return () => {
      window.removeEventListener("storage", onChange);
      window.removeEventListener(KEY, onChange);
    };
  },
  get: () => {
    try {
      return localStorage.getItem(KEY) === "1";
    } catch {
      return true;
    }
  },
  mark() {
    try {
      localStorage.setItem(KEY, "1");
    } catch {}
    window.dispatchEvent(new Event(KEY));
  },
};

/** A friendly tour of the site, told as a ride down the Western line. Opens as a dialog from a button on every page. */
export function Guide() {
  const dialog = useRef<HTMLDialogElement>(null);
  const known = useSyncExternalStore(seen.subscribe, seen.get, () => true);
  const close = () => dialog.current?.close();

  // First-time visitors to the home page get the guide opened for them, once, after the hero has had a moment to show.
  useEffect(() => {
    if (seen.get() || window.location.pathname !== "/" || window.location.search) return;
    const timer = setTimeout(() => {
      seen.mark();
      if (dialog.current && !dialog.current.open) dialog.current.showModal();
    }, 1400);
    return () => clearTimeout(timer);
  }, []);

  return (
    <>
      <div className="fixed bottom-4 right-4 z-40 flex flex-col items-end gap-2 sm:bottom-6 sm:right-6">
        {!known && (
          <p className="soft max-w-52 rounded-2xl px-4 py-2.5 text-sm" role="status">
            Pehli baar aaye ho? Guide dekh lo.
          </p>
        )}
        <button
          type="button"
          aria-haspopup="dialog"
          onClick={() => {
            seen.mark();
            dialog.current?.showModal();
          }}
          className="inline-flex min-h-12 items-center gap-2.5 rounded-full border border-foreground bg-foreground px-5 text-sm font-semibold text-background shadow-lg transition-transform duration-150 ease hover:-translate-y-0.5"
        >
          <TrainFront aria-hidden className="size-5 text-glow" />
          <span>Guide</span>
        </button>
      </div>

      <dialog
        ref={dialog}
        aria-labelledby="guide-h"
        onClick={(e) => e.target === e.currentTarget && close()}
        className="m-auto max-h-[90dvh] w-[min(44rem,calc(100%-1.5rem))] overflow-hidden rounded-[2rem] border border-rule bg-background p-0 text-foreground shadow-2xl backdrop:bg-foreground/50 backdrop:backdrop-blur-sm"
      >
        <div className="flex max-h-[90dvh] flex-col">
          <div className="flex items-start justify-between gap-4 border-b border-rule bg-peach px-6 py-5 sm:px-8">
            <div>
              <p className="label flex items-center gap-2">
                <TrainFront aria-hidden className="size-4 text-accent-ink" /> Mumbai Local · Western line
              </p>
              <h2 id="guide-h" className="display mt-2 text-4xl">
                Site ka <em>guide</em>
              </h2>
              <p className="mt-2 text-muted">Six stops, no tension. Chalo, ward-ward ghoomte hain.</p>
            </div>
            <button type="button" onClick={close} aria-label="Close the guide" className="inline-grid size-11 shrink-0 place-items-center rounded-full border border-line bg-card hover:bg-mist">
              <X aria-hidden className="size-5" />
            </button>
          </div>

          <div className="overflow-y-auto px-6 py-7 sm:px-8">
            <ol className="relative space-y-8">
              <span aria-hidden className="absolute bottom-3 left-[0.95rem] top-3 w-1 rounded-full bg-sea-fill/30" />
              {STOPS.map((s, i) => (
                <li key={s.station} className="relative pl-12">
                  <span aria-hidden className="absolute left-0 top-1 grid size-8 place-items-center rounded-full border-4 border-sea-fill bg-card text-xs font-bold text-sea-fill num">
                    {i + 1}
                  </span>
                  <p className="label">{s.station}</p>
                  <h3 className="display mt-1 text-3xl">{s.title}</h3>
                  <p className="mt-1 font-medium text-accent-ink">{s.tag}</p>
                  <p className="mt-2 leading-relaxed text-muted">{s.body}</p>
                  {s.go && (
                    <Link href={s.go.href} onClick={close} className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-full border border-line bg-card px-5 text-sm font-semibold hover:bg-mist">
                      {s.go.label} <ArrowRight aria-hidden className="size-4" />
                    </Link>
                  )}
                </li>
              ))}
            </ol>
            <p className="mt-9 rounded-2xl bg-mist px-5 py-4 text-center font-medium">Station aa gaya. Utro aur ward chuno, bhidu.</p>
            <button type="button" onClick={close} className="mt-4 inline-flex min-h-12 w-full items-center justify-center rounded-full bg-foreground px-6 font-semibold text-background hover:bg-foreground/85">
              Chalo, shuru karein
            </button>
          </div>
        </div>
      </dialog>
    </>
  );
}
