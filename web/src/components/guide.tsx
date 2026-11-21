"use client";

import { ArrowLeft, ArrowRight, ChevronDown, ChevronUp, TrainFront, X } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, useSyncExternalStore } from "react";

type Stop = { station: string; title: string; tag: string; body: string; href: string; target: string };

/**
 * The route through the site, as a ride down the Western line: one stop for each major part.
 * `href` is where the guide takes the visitor; `target` is the part of that page it scrolls to and rings.
 */
const STOPS: Stop[] = [
  {
    station: "Churchgate",
    title: "Poora Mumbai, ek nazar mein",
    tag: "Chalo, shuru karte hain.",
    body: "All 24 wards on one map. Darker means more risk. The Risk, Budget gap and Open issues tabs colour it three different ways, and 3D stands each ward as tall as its value.",
    href: "/#map",
    target: "#map",
  },
  {
    station: "Marine Lines",
    title: "Ward pakdo",
    tag: "Click karo, seedha wahan pahunch jao.",
    body: "Pick a ward and the map flies to it. A filled dot is paid for with the budget left; a ring is not. You can also search a ward, area or road, like Sion or Andheri.",
    href: "/?ward=F-N#map",
    target: "#map",
  },
  {
    station: "Charni Road",
    title: "Planner mein ghuso",
    tag: "Yahin asli kaam hota hai.",
    body: "Type any budget, choose riskiest first or most risk covered, and watch the budget line show where the money runs out. Open any issue to see the arithmetic behind its score.",
    href: "/plan/F-N",
    target: "#main h1, #main h2",
  },
  {
    station: "Grant Road",
    title: "Kiska kaam, kaisa kaam",
    tag: "Har contractor ka seedha hisaab.",
    body: "Eight contractors, each graded against what is expected for the same work, wards and weather. A hard patch is not marked down. Every grade links to the repair jobs behind it.",
    href: "/contractors",
    target: "#main h1, #main h2",
  },
  {
    station: "Mumbai Central",
    title: "Paisa kahan gaya",
    tag: "Jo ajeeb lage, woh yahan.",
    body: "Repair jobs where the bill, the timing or the warranty status did not add up. The headline is what flagged jobs billed, not money proven lost. Normal variation is not flagged.",
    href: "/audit",
    target: "#main h1, #main h2",
  },
  {
    station: "Dadar",
    title: "Meri shikayat ka kya hua?",
    tag: "Complaint se repair tak, poori kahani.",
    body: "Search a complaint ID or locality and follow it: the repair job, who did it, what it cost, and whether it held. Duplicate complaints are merged into one issue.",
    href: "/complaints?issue=ISS-0001",
    target: "#main h1, #main h2",
  },
  {
    station: "Bandra",
    title: "Kitna bharosa?",
    tag: "Seedhi baat, no gol gol.",
    body: "Each issue shows how sure we are: high, medium, or check on site. A ranking says where to look first, so confirm on the ground before sending a crew. This page shows how it was tested.",
    href: "/method",
    target: "#main h1, #main h2",
  },
];

// Where the visitor is in the guide, kept for the browser tab so it carries across pages.
const KEY = "guide-state";
type State = { open: boolean; step: number; seen: boolean };
const DEFAULT: State = { open: false, step: 0, seen: false };

const store = {
  subscribe(onChange: () => void) {
    window.addEventListener(KEY, onChange);
    return () => window.removeEventListener(KEY, onChange);
  },
  raw: () => {
    try {
      return sessionStorage.getItem(KEY) ?? "";
    } catch {
      return "";
    }
  },
  write(next: State) {
    try {
      sessionStorage.setItem(KEY, JSON.stringify(next));
    } catch {}
    window.dispatchEvent(new Event(KEY));
  },
};
const parse = (raw: string): State => {
  try {
    return raw ? { ...DEFAULT, ...JSON.parse(raw) } : DEFAULT;
  } catch {
    return DEFAULT;
  }
};

/** Scrolls to the part of the page a stop points at and rings it for a moment. Waits for the page to arrive. */
function flash(stop: Stop) {
  const want = new URL(stop.href, window.location.origin).pathname;
  let tries = 0;
  const timer = setInterval(() => {
    tries += 1;
    const el = window.location.pathname === want ? document.querySelector<HTMLElement>(stop.target) : null;
    if (el) {
      clearInterval(timer);
      const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      el.scrollIntoView({ behavior: calm ? "auto" : "smooth", block: "start" });
      el.classList.remove("guide-flash");
      void el.offsetWidth;
      el.classList.add("guide-flash");
      setTimeout(() => el.classList.remove("guide-flash"), 2800);
    } else if (tries > 25) clearInterval(timer);
  }, 160);
}

/**
 * A guided ride through the site. It is not a dialog: it sits at the corner, the page stays usable,
 * and Next takes the visitor to the next real page and rings the part it is talking about.
 */
export function Guide() {
  const router = useRouter();
  const pathname = usePathname();
  const state = parse(useSyncExternalStore(store.subscribe, store.raw, () => ""));
  const [small, setSmall] = useState(false);
  const stop = STOPS[Math.min(state.step, STOPS.length - 1)];
  const last = state.step === STOPS.length - 1;

  // First-time visitors to the home page get the guide opened for them once (not as a pop-up, and without moving them).
  useEffect(() => {
    if (parse(store.raw()).seen || window.location.pathname !== "/" || window.location.search) return;
    const timer = setTimeout(() => store.write({ ...parse(store.raw()), open: true, seen: true }), 1400);
    return () => clearTimeout(timer);
  }, []);

  const go = (step: number) => {
    const next = STOPS[step];
    store.write({ open: true, step, seen: true });
    if (!next) return;
    const here = window.location.pathname + window.location.search;
    const there = new URL(next.href, window.location.origin);
    if (here !== there.pathname + there.search) router.push(next.href);
    else if (there.hash) window.history.replaceState(null, "", next.href);
    flash(next);
  };
  const close = () => store.write({ ...state, open: false, seen: true });

  if (!state.open) {
    return (
      <div className="fixed bottom-4 right-4 z-40 flex flex-col items-end gap-2 sm:bottom-6 sm:right-6">
        {!state.seen && (
          <p className="soft max-w-52 rounded-2xl px-4 py-2.5 text-sm" role="status">
            Pehli baar aaye ho? Guide dekh lo.
          </p>
        )}
        <button
          type="button"
          onClick={() => store.write({ open: true, step: state.step, seen: true })}
          className="inline-flex min-h-12 items-center gap-2.5 rounded-full border border-foreground bg-foreground px-5 text-sm font-semibold text-background shadow-lg transition-transform duration-150 ease hover:-translate-y-0.5"
        >
          <TrainFront aria-hidden className="size-5 text-glow" />
          <span>Guide</span>
        </button>
      </div>
    );
  }

  return (
    <aside aria-label="Site guide" data-path={pathname} className="fixed inset-x-3 bottom-3 z-40 rounded-[1.75rem] border border-rule bg-background text-foreground shadow-2xl sm:inset-x-auto sm:bottom-6 sm:right-6 sm:w-[26rem]">
      <div className="flex items-center justify-between gap-3 rounded-t-[1.75rem] bg-peach px-5 py-3">
        <p className="label flex items-center gap-2">
          <TrainFront aria-hidden className="size-4 text-accent-ink" />
          Stop {state.step + 1} of {STOPS.length} · {stop.station}
        </p>
        <div className="flex gap-1">
          <button type="button" onClick={() => setSmall((v) => !v)} aria-expanded={!small} aria-label={small ? "Show the guide text" : "Shrink the guide"} className="inline-grid size-11 place-items-center rounded-full hover:bg-card">
            {small ? <ChevronUp aria-hidden className="size-5" /> : <ChevronDown aria-hidden className="size-5" />}
          </button>
          <button type="button" onClick={close} aria-label="Close the guide" className="inline-grid size-11 place-items-center rounded-full hover:bg-card">
            <X aria-hidden className="size-5" />
          </button>
        </div>
      </div>

      {!small && (
        <div className="px-5 pb-5 pt-4">
          <div role="status" aria-live="polite">
            <h2 className="display text-3xl">{stop.title}</h2>
            <p className="mt-1 font-medium text-accent-ink">{stop.tag}</p>
            <p className="mt-2 leading-relaxed text-muted">{stop.body}</p>
          </div>
          <ol className="mt-4 flex gap-1" aria-label="Stops">
            {STOPS.map((s, i) => (
              <li key={s.station}>
                <button
                  type="button"
                  onClick={() => go(i)}
                  aria-label={`Stop ${i + 1}: ${s.station}`}
                  aria-current={i === state.step ? "step" : undefined}
                  className={`inline-grid size-11 place-items-center rounded-full border-2 text-sm font-bold num ${i === state.step ? "border-sea-fill bg-sea-fill text-background" : "border-line bg-card hover:bg-mist"}`}
                >
                  {i + 1}
                </button>
              </li>
            ))}
          </ol>
          <div className="mt-4 flex gap-2">
            <button type="button" onClick={() => go(state.step - 1)} disabled={state.step === 0} className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-full border border-line bg-card px-4 text-sm font-semibold hover:bg-mist disabled:opacity-40">
              <ArrowLeft aria-hidden className="size-4" /> Back
            </button>
            {last ? (
              <button type="button" onClick={close} className="inline-flex min-h-12 flex-[2] items-center justify-center rounded-full bg-foreground px-4 text-sm font-semibold text-background hover:bg-foreground/85">
                Station aa gaya. Utro!
              </button>
            ) : (
              <button type="button" onClick={() => go(state.step + 1)} className="inline-flex min-h-12 flex-[2] items-center justify-center gap-2 rounded-full bg-foreground px-4 text-sm font-semibold text-background hover:bg-foreground/85">
                {state.step === 0 ? "Chalo, le chalo" : "Next stop"} <ArrowRight aria-hidden className="size-4" />
              </button>
            )}
          </div>
        </div>
      )}
    </aside>
  );
}
