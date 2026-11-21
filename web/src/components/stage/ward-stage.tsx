"use client";

import { ArrowRight, ChevronLeft, ChevronRight, LocateFixed, Minus, Plus, Route, TriangleAlert, X } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { inrShort, int } from "@/lib/format";
import { easeOut, fitView, lerpView, zoomView, type Box, type Inset, type View } from "@/lib/view";
import type { StageData, StageWard } from "./types";

type Mode = "risk" | "gap" | "open";

const MODES: { key: Mode; label: string; low: string; high: string; about: string }[] = [
  { key: "risk", label: "Risk", low: "Lower risk", high: "Higher risk", about: "How serious each ward's open issues are. The worst ward is 100." },
  { key: "gap", label: "Budget gap", low: "All paid for", high: "Least paid for", about: "The share of open issues the remaining budget cannot pay for." },
  { key: "open", label: "Open issues", low: "Fewer", high: "More", about: "How many complaints still have no repair ordered." },
];

const union = (boxes: Box[]): Box => [Math.min(...boxes.map((b) => b[0])), Math.min(...boxes.map((b) => b[1])), Math.max(...boxes.map((b) => b[2])), Math.max(...boxes.map((b) => b[3]))];
const reducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** An interactive map of the wards. Choose a ward (map, card or arrows) and the camera flies to it and opens its summary. */
export function WardStage({ data }: { data: StageData }) {
  const { wards } = data;
  const params = useSearchParams();
  const selected = wards.find((w) => w.slug === params.get("ward")) ?? null;

  const [mode, setMode] = useState<Mode>("risk");
  const [layers, setLayers] = useState({ roads: true, issues: true });
  const [hover, setHover] = useState<{ ward: StageWard; x: number; y: number } | null>(null);
  const [size, setSize] = useState({ w: 1100, h: 720 });
  const [camera, setCamera] = useState<View | null>(null); // null: follow the selected ward

  const stageRef = useRef<HTMLDivElement>(null);
  const railRef = useRef<HTMLUListElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const raf = useRef(0);
  const drag = useRef<{ id: number; x: number; y: number; from: View; active: boolean } | null>(null);
  const focusCard = useRef(false);
  const restoreFocus = useRef<string | null>(null);

  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const watch = new ResizeObserver(([e]) => setSize({ w: e.contentRect.width, h: e.contentRect.height }));
    watch.observe(el);
    return () => watch.disconnect();
  }, []);
  useEffect(() => () => cancelAnimationFrame(raf.current), []);

  const wide = size.w >= 860;
  const aspect = size.w / size.h;
  const homeBox = union(wards.map((w) => w.box));

  /** The part of the screen the panels leave free, as shares of its size. */
  const insetFor = (open: boolean): Inset => {
    const rail = wide ? 214 : open ? 56 : 196;
    const sheet = !wide && open ? 290 : 0;
    return { top: (wide ? 76 : 150) / size.h, bottom: Math.min(0.8, (rail + sheet) / size.h), right: wide && open ? Math.min(0.5, 392 / size.w) : 0.02 };
  };
  const homeView = fitView(homeBox, aspect, insetFor(false));
  const targetFor = (w: StageWard | null): View => (w ? fitView(w.box, aspect, insetFor(true), homeView.h / 8) : homeView);
  const view = camera ?? targetFor(selected);
  const limits = { minH: homeView.h / 14, maxH: homeView.h * 1.5 };

  const viewRef = useRef(view);
  useEffect(() => {
    viewRef.current = view;
  });

  const fly = (to: View, follow: boolean) => {
    cancelAnimationFrame(raf.current);
    if (reducedMotion()) return setCamera(follow ? null : to);
    const from = viewRef.current;
    let t0 = 0;
    const step = (now: number) => {
      t0 ||= now;
      const t = Math.min(1, (now - t0) / 800);
      setCamera(lerpView(from, to, easeOut(t)));
      if (t < 1) raf.current = requestAnimationFrame(step);
      else if (follow) setCamera(null);
    };
    raf.current = requestAnimationFrame(step);
  };

  const select = (w: StageWard | null, fromKeyboard = false) => {
    setCamera(viewRef.current);
    const url = new URL(window.location.href);
    if (w) url.searchParams.set("ward", w.slug);
    else url.searchParams.delete("ward");
    window.history.replaceState(null, "", url.pathname + url.search + url.hash);
    focusCard.current = fromKeyboard && !!w;
    fly(targetFor(w), true);
  };

  // After a keyboard choice the summary opens and takes focus, so its link is the next thing to tab to.
  useEffect(() => {
    if (selected && focusCard.current) titleRef.current?.focus();
    focusCard.current = false;
    if (!selected && restoreFocus.current) document.getElementById(`rail-${restoreFocus.current}`)?.focus();
    restoreFocus.current = null;
    // keep the chosen card in view in the strip
    const strip = railRef.current;
    const card = selected && strip?.querySelector<HTMLElement>(`[data-slug="${selected.slug}"]`);
    if (strip && card) strip.scrollTo({ left: card.offsetLeft - strip.clientWidth / 2 + card.clientWidth / 2, behavior: reducedMotion() ? "auto" : "smooth" });
  }, [selected]);

  const zoom = (factor: number) => {
    const to = zoomView(viewRef.current, factor, insetFor(!!selected), limits);
    fly(to, false);
  };

  const valueOf = (w: StageWard, m: Mode) => {
    if (m === "risk") return w.risk / 100;
    if (m === "gap") return w.open ? 1 - w.funded / w.open : 0;
    return w.open / Math.max(...wards.map((x) => x.open));
  };
  const headline = (w: StageWard) => (mode === "risk" ? { big: String(w.risk), unit: "risk" } : mode === "gap" ? { big: `${Math.round(valueOf(w, "gap") * 100)}%`, unit: "unpaid" } : { big: String(w.open), unit: "open" });
  const ordered = [...wards].sort((a, b) => valueOf(b, mode) - valueOf(a, mode) || b.risk - a.risk);
  const at = selected ? ordered.findIndex((w) => w.code === selected.code) : -1;
  const fillOf = (w: StageWard) => `color-mix(in oklab, var(--st-hot) ${Math.round(6 + valueOf(w, mode) * 94)}%, var(--st-cool))`;
  const modeInfo = MODES.find((m) => m.key === mode)!;

  const k = view.w / size.w; // drawing units per screen pixel

  return (
    <section aria-labelledby="stage-h" className="stage relative h-[min(50rem,calc(100dvh-5.5rem))] min-h-[44rem] overflow-hidden rounded-[2rem] sm:min-h-[40rem]" ref={stageRef} onKeyDown={(e) => {
      if (e.key !== "Escape" || !selected) return;
      restoreFocus.current = selected.slug;
      select(null);
    }}>
      <svg
        viewBox={`${view.x} ${view.y} ${view.w} ${view.h}`}
        aria-hidden="true"
        focusable="false"
        className="absolute inset-0 size-full cursor-grab touch-pan-y select-none active:cursor-grabbing"
        onPointerDown={(e) => {
          if (e.button === 0) drag.current = { id: e.pointerId, x: e.clientX, y: e.clientY, from: viewRef.current, active: false };
        }}
        onPointerMove={(e) => {
          const d = drag.current;
          if (!d) return;
          const dx = e.clientX - d.x;
          const dy = e.clientY - d.y;
          if (!d.active) {
            if (Math.hypot(dx, dy) < 6) return;
            d.active = true;
            cancelAnimationFrame(raf.current);
            setHover(null);
            e.currentTarget.setPointerCapture(d.id);
          }
          const u = d.from.w / size.w;
          setCamera({ ...d.from, x: d.from.x - dx * u, y: d.from.y - dy * u });
        }}
        onPointerUp={() => (drag.current = null)}
        onPointerCancel={() => (drag.current = null)}
      >
        <defs>
          <filter id="stage-glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation={6 * k} />
          </filter>
        </defs>

        {wards.map((w) => {
          const dim = selected && selected.code !== w.code;
          return (
            <path
              key={w.code}
              d={w.d}
              data-ward={w.code}
              fill={fillOf(w)}
              opacity={dim ? (hover?.ward.code === w.code ? 0.9 : 0.4) : selected ? 0.5 : 1}
              stroke="rgb(255 255 255 / 0.3)"
              strokeWidth={1}
              vectorEffect="non-scaling-stroke"
              strokeLinejoin="round"
              className="cursor-pointer transition-opacity duration-200 hover:brightness-125"
              onPointerEnter={(e) => e.pointerType === "mouse" && setHover({ ward: w, x: e.clientX, y: e.clientY })}
              onPointerMove={(e) => e.pointerType === "mouse" && !drag.current?.active && setHover({ ward: w, x: e.clientX, y: e.clientY })}
              onPointerLeave={() => setHover(null)}
              onClick={() => select(w)}
            />
          );
        })}

        {selected && (
          <>
            <path d={selected.d} fill="none" stroke="var(--st-hot)" strokeWidth={5} vectorEffect="non-scaling-stroke" filter="url(#stage-glow)" opacity={0.9} pointerEvents="none" />
            <path d={selected.d} fill="none" stroke="#fff" strokeWidth={2.4} vectorEffect="non-scaling-stroke" strokeLinejoin="round" pointerEvents="none" />
          </>
        )}

        {layers.roads && (
          <g fill="none" strokeLinecap="round" pointerEvents="none">
            {data.roads.map((r, i) => (
              <path key={i} d={r.d} vectorEffect="non-scaling-stroke" strokeWidth={r.hot ? 1.4 : 0.8} stroke={r.hot ? "var(--st-hot-text)" : "rgb(255 255 255 / 0.5)"} opacity={selected ? (r.ward === selected.code ? 0.95 : 0.12) : r.hot ? 0.55 : 0.2} />
            ))}
          </g>
        )}

        {layers.issues && (
          <g pointerEvents="none">
            {data.dots
              .filter((d) => !selected || d.ward !== selected.code)
              .map((d, i) => (
                <circle key={i} cx={d.x} cy={d.y} r={2.6 * k} fill={d.funded ? "var(--st-sea)" : "var(--st-bg)"} stroke={d.funded ? "none" : "var(--st-hot-text)"} strokeWidth={1.2 * k} opacity={selected ? 0.35 : 0.9} />
              ))}
            {selected &&
              data.dots
                .filter((d) => d.ward === selected.code)
                .map((d, i) => (
                  <g key={i}>
                    <circle cx={d.x} cy={d.y} r={8 * k} fill={d.funded ? "var(--st-sea)" : "var(--st-bg)"} stroke={d.funded ? "var(--st-bg)" : "var(--st-hot-text)"} strokeWidth={(d.funded ? 1.5 : 2) * k} />
                    {d.rank <= 99 && (
                      <text x={d.x} y={d.y} textAnchor="middle" dominantBaseline="central" fontSize={9 * k} fontWeight={700} fill={d.funded ? "var(--st-bg)" : "var(--st-hot-text)"}>
                        {d.rank}
                      </text>
                    )}
                  </g>
                ))}
          </g>
        )}

        <g pointerEvents="none" fontWeight={700} textAnchor="middle" dominantBaseline="central">
          {wards.map((w) => (
            <text key={w.code} x={w.cx} y={w.cy} fontSize={(selected?.code === w.code ? 14 : 11) * k} fill="#fff" stroke="var(--st-bg)" strokeWidth={3.5 * k} paintOrder="stroke" opacity={selected && selected.code !== w.code ? 0.55 : 1} style={{ display: selected?.code === w.code && layers.issues ? "none" : undefined }}>
              {w.code}
            </text>
          ))}
        </g>
      </svg>

      {/* top: title, what to colour by, layers */}
      <div className="pointer-events-none absolute inset-x-0 top-0 grid grid-cols-[minmax(0,1fr)_auto] items-start gap-x-4 gap-y-3 p-4 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] sm:p-5">
        <div className="max-w-[17rem] min-w-0">
          <h1 id="stage-h" className="display text-3xl leading-none text-st-text sm:text-4xl">
            Where should the <em>next rupee</em> go?
          </h1>
          <p className="mt-2 hidden text-sm text-st-muted sm:block">Choose a ward to see what its remaining road budget should fix first.</p>
        </div>
        <div role="group" aria-label="Colour the map by" className="stage-panel pointer-events-auto order-3 col-span-2 flex gap-1 rounded-full p-1 sm:order-none sm:col-span-1">
          {MODES.map((m) => (
            <button key={m.key} type="button" aria-pressed={mode === m.key} onClick={() => setMode(m.key)} className="stage-pill">
              {m.label}
            </button>
          ))}
        </div>
        <div role="group" aria-label="Map layers" className="stage-panel pointer-events-auto flex justify-self-end gap-1 rounded-full p-1">
          <button type="button" aria-pressed={layers.roads} onClick={() => setLayers((l) => ({ ...l, roads: !l.roads }))} className="stage-pill gap-2">
            <Route aria-hidden className="size-4" /> <span className="max-sm:sr-only">Roads</span>
          </button>
          <button type="button" aria-pressed={layers.issues} onClick={() => setLayers((l) => ({ ...l, issues: !l.issues }))} className="stage-pill gap-2">
            <span aria-hidden className="size-3 rounded-full border-2 border-current" /> <span className="max-sm:sr-only">Open issues</span>
          </button>
        </div>
      </div>

      {/* zoom */}
      <div role="group" aria-label="Zoom" className="stage-panel absolute right-4 top-[10rem] flex flex-col gap-1 rounded-full p-1 sm:right-5 sm:top-24" style={{ right: wide && selected ? 392 : undefined }}>
        <button type="button" onClick={() => zoom(1.6)} aria-label="Zoom in" className="stage-icon">
          <Plus aria-hidden className="size-5" />
        </button>
        <button type="button" onClick={() => zoom(1 / 1.6)} aria-label="Zoom out" className="stage-icon">
          <Minus aria-hidden className="size-5" />
        </button>
        <button type="button" onClick={() => fly(targetFor(selected), true)} aria-label={selected ? `Centre on ward ${selected.code}` : "Show every ward"} className="stage-icon">
          <LocateFixed aria-hidden className="size-5" />
        </button>
      </div>

      {hover && (
        <div className="stage-panel pointer-events-none fixed z-20 rounded-xl px-3 py-2 text-sm" style={{ left: hover.x + 14, top: hover.y + 14 }}>
          <p className="font-semibold">
            <span className="num mr-1.5 rounded-full bg-white/15 px-2 py-0.5 text-xs">{hover.ward.code}</span>
            {hover.ward.name}
          </p>
          <p className="num mt-0.5 text-st-muted">
            {hover.ward.open} open issues · {inrShort(hover.ward.leftInr)} left
          </p>
        </div>
      )}

      {/* ward summary: a card on the right on wide screens, a sheet above the strip on narrow ones */}
      {selected && (
        <aside aria-label={`Ward ${selected.code} summary`} className={`stage-panel absolute z-10 flex flex-col overflow-hidden rounded-3xl ${wide ? "bottom-[13.75rem] right-5 top-24 w-[22rem]" : "inset-x-3 bottom-14"}`}>
          <div className="flex items-start justify-between gap-3 border-b border-st-line p-4 pb-3">
            <div className="min-w-0">
              <p className="label !text-st-muted">
                Ward {selected.code} · {selected.zone}
              </p>
              <h2 ref={titleRef} tabIndex={-1} className="display mt-1 text-[1.7rem] outline-offset-4">
                {selected.name}
              </h2>
            </div>
            <div className="flex shrink-0 gap-1">
              <button type="button" aria-label="Previous ward" disabled={at <= 0} onClick={() => select(ordered[at - 1], true)} className="stage-icon">
                <ChevronLeft aria-hidden className="size-5" />
              </button>
              <button type="button" aria-label="Next ward" disabled={at >= ordered.length - 1} onClick={() => select(ordered[at + 1], true)} className="stage-icon">
                <ChevronRight aria-hidden className="size-5" />
              </button>
              <button type="button" aria-label="Close ward summary" onClick={() => {
                  restoreFocus.current = selected.slug;
                  select(null);
                }}
                className="stage-icon">
                <X aria-hidden className="size-5" />
              </button>
            </div>
          </div>
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
            <dl className="grid grid-cols-3 gap-2">
              {[
                ["Open issues", int(selected.open)],
                ["Cost to fix all", inrShort(selected.needInr)],
                ["Budget left", inrShort(selected.leftInr)],
              ].map(([label, value]) => (
                <div key={label} className="rounded-2xl bg-white/[0.07] px-3 py-2.5">
                  <dt className="text-xs text-st-muted">{label}</dt>
                  <dd className="num mt-0.5 text-lg font-semibold">{value}</dd>
                </div>
              ))}
            </dl>
            <div>
              <p className="num text-sm">
                {selected.funded >= selected.open ? `All ${selected.open}` : `${selected.funded} of ${selected.open}`} paid for with the budget left
              </p>
              <span aria-hidden className="mt-1.5 block h-2 overflow-hidden rounded-full bg-white/15">
                <span className="block h-2 rounded-full bg-st-sea" style={{ width: `${selected.open ? (selected.funded / selected.open) * 100 : 0}%` }} />
              </span>
              {selected.over && (
                <p className="mt-2 flex items-start gap-2 text-sm text-st-hot-text">
                  <TriangleAlert aria-hidden className="mt-0.5 size-4 shrink-0" /> Over budget already: only repairs that cost BMC nothing are paid for.
                </p>
              )}
            </div>
            <div className="max-sm:hidden">
              <h3 className="label !text-st-muted">Fix first</h3>
              <ol className="mt-2 space-y-1.5">
                {selected.top.map((i) => (
                  <li key={i.rank} className="flex items-center gap-3 rounded-2xl bg-white/[0.07] px-3 py-2 text-sm">
                    <span aria-hidden className={`num grid size-7 shrink-0 place-items-center rounded-full text-xs font-bold ${i.funded ? "bg-st-sea text-st-bg" : "border-2 border-st-hot-text text-st-hot-text"}`}>
                      {i.rank}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">
                        <span className="sr-only">Rank {i.rank}: </span>
                        {i.road}
                      </span>
                      <span className="num block text-st-muted">
                        {i.type} · {inrShort(i.costInr)} · {i.funded ? "paid for" : "not paid for"}
                      </span>
                    </span>
                  </li>
                ))}
              </ol>
            </div>
          </div>
          <div className="border-t border-st-line p-4">
            <Link href={`/plan/${selected.slug}`} className="stage-cta w-full">
              Open the ward {selected.code} planner <ArrowRight aria-hidden className="size-4" />
            </Link>
          </div>
        </aside>
      )}

      {/* bottom: legend and the strip of wards */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 flex flex-col gap-2 p-4 pt-0 sm:p-5 sm:pt-0">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1 px-1 text-xs text-st-muted">
          <p className="flex items-center gap-2" title={modeInfo.about}>
            <span>{modeInfo.low}</span>
            <span aria-hidden className="h-2 w-24 rounded-full" style={{ background: "linear-gradient(90deg, color-mix(in oklab, var(--st-hot) 6%, var(--st-cool)), var(--st-hot))" }} />
            <span>{modeInfo.high}</span>
          </p>
          {layers.issues && (
            <p className="flex items-center gap-3">
              <span className="flex items-center gap-1.5">
                <span aria-hidden className="size-2.5 rounded-full bg-st-sea" /> Paid for
              </span>
              <span className="flex items-center gap-1.5">
                <span aria-hidden className="size-2.5 rounded-full border-2 border-st-hot-text" /> Not paid for
              </span>
            </p>
          )}
          <p className="hidden sm:block">Drag to move. {modeInfo.about}</p>
        </div>
        <div className={`stage-panel pointer-events-auto rounded-3xl p-2 ${selected && !wide ? "hidden" : ""}`}>
          <ul ref={railRef} aria-label={`Wards, most ${mode === "gap" ? "unpaid" : mode === "open" ? "open issues" : "risk"} first`} className="flex snap-x gap-2 overflow-x-auto pb-1">
            {ordered.map((w) => {
              const h = headline(w);
              const on = selected?.code === w.code;
              return (
                <li key={w.code} className="snap-start">
                  <button
                    type="button"
                    id={`rail-${w.slug}`}
                    data-slug={w.slug}
                    aria-pressed={on}
                    aria-label={`Ward ${w.code}, ${w.name}. ${h.big} ${h.unit}. ${w.open} open issues.`}
                    onClick={(e) => select(on ? null : w, e.detail === 0)}
                    className="stage-card"
                  >
                    <span className="flex items-center justify-between gap-2">
                      <span className="num rounded-full bg-white/15 px-2.5 py-0.5 text-xs font-bold">{w.code}</span>
                      <span className="num text-xl font-semibold leading-none">
                        {h.big} <span className="text-xs font-medium text-st-muted">{h.unit}</span>
                      </span>
                    </span>
                    <span className="mt-2 block truncate text-sm font-medium">{w.name}</span>
                    <span aria-hidden className="mt-2 block h-1.5 overflow-hidden rounded-full bg-white/15">
                      <span className="block h-1.5 rounded-full" style={{ width: `${Math.max(4, valueOf(w, mode) * 100)}%`, background: "var(--st-hot)" }} />
                    </span>
                    <span className="num mt-1.5 block text-xs text-st-muted">
                      {w.open} open · {inrShort(w.leftInr)} left
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </div>

      <p className="sr-only" aria-live="polite">
        {selected ? `Ward ${selected.code}, ${selected.name} selected. ${selected.open} open issues. The summary has a link to open its planner.` : "No ward selected."}
      </p>
    </section>
  );
}
