"use client";

import { ArrowRight, Box, ChevronLeft, ChevronRight, LocateFixed, Minus, Plus, RotateCcw, RotateCw, Route, Search, TriangleAlert, X } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { inrShort, int } from "@/lib/format";
import { easeOut, fitView, lerpView, scaleOf, screenToPlane, zoomView, type Box as BBox, type View } from "@/lib/view";
import type { StageData, StageWard } from "./types";

type Mode = "risk" | "gap" | "open";
type Hit = { key: string; label: string; sub: string; ward: StageWard; road?: string };

const MODES: { key: Mode; label: string; low: string; high: string; about: string }[] = [
  { key: "risk", label: "Risk", low: "Lower risk", high: "Higher risk", about: "How serious each ward's open issues are. The worst ward is 100." },
  { key: "gap", label: "Budget gap", low: "All paid for", high: "Least paid for", about: "The share of open issues the remaining budget cannot pay for." },
  { key: "open", label: "Open issues", low: "Fewer", high: "More", about: "How many complaints still have no repair ordered." },
];

const LEVELS = 10; // how many steps tall a ward can stand in 3D
const STEP = 4.5; // pixels per step, small so the sides look smooth
const EDGE = 0.12; // each layer reaches this share of the stage beyond every edge, so panning and the 3D tip never show its border
const PITCH = 58; // how far the 3D map is tipped back, in degrees
const union = (boxes: BBox[]): BBox => [Math.min(...boxes.map((b) => b[0])), Math.min(...boxes.map((b) => b[1])), Math.max(...boxes.map((b) => b[2])), Math.max(...boxes.map((b) => b[3]))];
const reducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * An interactive map of the wards, flat or in 3D (each ward stands as tall as its value). Choose a ward (map, card or arrows)
 * and the camera flies to it and opens its summary. Drag to move, Ctrl and scroll or pinch to zoom, arrow keys when it has focus.
 */
export function WardStage({ data }: { data: StageData }) {
  const { wards } = data;
  const params = useSearchParams();
  const selected = wards.find((w) => w.slug === params.get("ward")) ?? null;

  const [mode, setMode] = useState<Mode>("risk");
  const [layers, setLayers] = useState({ roads: true, issues: true });
  const [tilt, setTilt] = useState(false);
  const [bearing, setBearing] = useState(-12);
  const [q, setQ] = useState("");
  const [listOpen, setListOpen] = useState(false);
  const [act, setAct] = useState(0);
  const [pinRoad, setPinRoad] = useState<string | null>(null);
  const [hover, setHover] = useState<{ ward: StageWard; x: number; y: number } | null>(null);
  const [size, setSize] = useState({ w: 1100, h: 720 });
  const [camera, setCamera] = useState<View | null>(null); // null: follow the selected ward

  const byWard = useMemo(() => {
    const roads = new Map<string, StageData["roads"]>();
    const dots = new Map<string, StageData["dots"]>();
    data.roads.forEach((r) => roads.set(r.ward, [...(roads.get(r.ward) ?? []), r]));
    data.dots.forEach((d) => dots.set(d.ward, [...(dots.get(d.ward) ?? []), d]));
    return { roads, dots };
  }, [data]);

  const stageRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<HTMLDivElement>(null);
  const railRef = useRef<HTMLUListElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const raf = useRef(0);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const drag = useRef<{ x: number; y: number; from: View; active: boolean; turn: boolean; bearing: number } | null>(null);
  const pinch = useRef<{ dist: number; from: View } | null>(null);
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
  const homeBox = union(wards.map((w) => w.box));

  /** The part of the stage the panels leave free for the map, and how far its centre sits from the stage's centre. */
  const freeArea = (open: boolean) => {
    const left = 16;
    const right = wide && open ? 392 : 16;
    const top = wide ? 84 : 206;
    const bottom = (wide ? 214 : open ? 56 : 196) + (!wide && open ? 290 : 0);
    const w = Math.max(size.w - left - right, 200);
    const h = Math.max(size.h - top - bottom, 160);
    return { w, h, dx: left + w / 2 - size.w / 2, dy: top + h / 2 - size.h / 2 };
  };
  const turnOf = (t: boolean) => (t ? { bearing, pitch: PITCH } : undefined);
  const homeFor = (t: boolean) => fitView(homeBox, size, freeArea(false), turnOf(t), 0, 1.1);
  const targetFor = (w: StageWard | null, t = tilt): View => (w ? fitView(w.box, size, freeArea(true), turnOf(t), scaleOf(homeFor(t), size) / 9, 1.08) : homeFor(t));
  const view = camera ?? targetFor(selected);
  const home = homeFor(tilt);
  const limits = { minW: home.w / 14, maxW: home.w * 1.6 };
  const offset = freeArea(!!selected);
  const s = scaleOf(view, size); // drawing units per screen pixel

  const latest = useRef({ view, size, tilt, limits, offset });
  useEffect(() => {
    latest.current = { view, size, tilt, limits, offset };
  });

  const fly = (to: View, follow: boolean) => {
    cancelAnimationFrame(raf.current);
    const from = latest.current.view;
    setCamera(from);
    if (reducedMotion()) return setCamera(follow ? null : to);
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

  const select = (w: StageWard | null, fromKeyboard = false, road: string | null = null) => {
    setPinRoad(w ? road : null);
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
    const strip = railRef.current;
    const card = selected && strip?.querySelector<HTMLElement>(`[data-slug="${selected.slug}"]`);
    if (strip && card) strip.scrollTo({ left: card.offsetLeft - strip.clientWidth / 2 + card.clientWidth / 2, behavior: reducedMotion() ? "auto" : "smooth" });
  }, [selected]);

  // Ctrl (or Cmd) and scroll, or a trackpad pinch, zooms toward the pointer. Plain scrolling still scrolls the page.
  useEffect(() => {
    const el = mapRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      cancelAnimationFrame(raf.current);
      const { view: v, size: sz, tilt: t, limits: lim, offset: off } = latest.current;
      const r = el.getBoundingClientRect();
      const fx = t ? 0.5 : (e.clientX - r.left - off.dx) / sz.w;
      const fy = t ? 0.5 : (e.clientY - r.top - off.dy) / sz.h;
      setCamera(zoomView(v, Math.exp(-Math.max(-60, Math.min(60, e.deltaY)) * 0.01), lim, fx, fy));
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  const zoom = (factor: number) => fly(zoomView(latest.current.view, factor, limits), false);
  const turn = (deg: number) => setBearing((b) => b + deg);
  const toggle3d = () => {
    const next = !tilt;
    setTilt(next);
    fly(targetFor(selected, next), true);
  };
  const pan = (dxPx: number, dyPx: number) => {
    const { view: v, tilt: t } = latest.current;
    const [px, py] = screenToPlane(dxPx, dyPx, t ? bearing : 0, t ? PITCH : 0);
    setCamera({ ...v, x: v.x + px * scaleOf(v, size), y: v.y + py * scaleOf(v, size) });
  };

  const valueOf = (w: StageWard, m: Mode) => {
    if (m === "risk") return w.risk / 100;
    if (m === "gap") return w.open ? 1 - w.funded / w.open : 0;
    return w.open / Math.max(...wards.map((x) => x.open));
  };
  const headline = (w: StageWard) => (mode === "risk" ? { big: String(w.risk), unit: "risk" } : mode === "gap" ? { big: `${Math.round(valueOf(w, "gap") * 100)}%`, unit: "unpaid" } : { big: String(w.open), unit: "open" });
  const ordered = [...wards].sort((a, b) => valueOf(b, mode) - valueOf(a, mode) || b.risk - a.risk);
  const at = selected ? ordered.findIndex((w) => w.code === selected.code) : -1;
  const level = (w: StageWard) => 1 + Math.round(valueOf(w, mode) * (LEVELS - 3)) + (selected?.code === w.code ? 2 : 0);
  const top = (w: StageWard) => {
    const fill = `color-mix(in oklab, var(--sea-fill) ${Math.round(8 + valueOf(w, mode) * 84)}%, var(--sea-soft))`;
    return selected && selected.code !== w.code && hover?.ward.code !== w.code ? `color-mix(in oklab, ${fill} 48%, var(--mist))` : fill;
  };
  const side = (w: StageWard, j: number, l: number) => `color-mix(in oklab, ${top(w)} ${Math.round(70 - 28 * (1 - j / l))}%, var(--foreground))`;
  const term = q.trim().toLowerCase();
  const hits: Hit[] = term
    ? [
        ...wards
          .filter((w) => w.code.toLowerCase() === term || w.code.toLowerCase().startsWith(term) || w.name.toLowerCase().includes(term) || w.zone.toLowerCase().includes(term))
          .sort((a, b) => Number(b.code.toLowerCase() === term) - Number(a.code.toLowerCase() === term))
          .slice(0, 6)
          .map((w) => ({ key: `w-${w.code}`, label: `Ward ${w.code}, ${w.name}`, sub: `${w.zone} · ${w.open} open issues`, ward: w })),
        ...[...new Map(data.roads.filter((r) => r.name.toLowerCase().includes(term)).map((r) => [`${r.name}|${r.ward}`, r])).values()]
          .slice(0, 6)
          .map((r) => {
            const w = wards.find((x) => x.code === r.ward)!;
            return { key: `r-${r.name}-${r.ward}`, label: r.name, sub: `Road in ward ${w.code}, ${w.name}`, ward: w, road: r.name };
          }),
      ]
    : [];
  const choose = (h: Hit, kb: boolean) => {
    setQ("");
    setListOpen(false);
    select(h.ward, kb, h.road ?? null);
  };
  const flat = 1 / Math.cos((PITCH * Math.PI) / 180);
  /** Keeps a label or marker upright and round on the tipped, turned map. */
  const upright = (x: number, y: number) => (tilt ? `translate(${x} ${y}) rotate(${-bearing}) scale(1 ${flat}) translate(${-x} ${-y})` : undefined);
  const modeInfo = MODES.find((m) => m.key === mode)!;
  const stack = Array.from({ length: LEVELS + 1 }, (_, j) => j);
  const lift = (j: number) => (tilt ? j * STEP : 0);
  const viewBox = `${view.x - EDGE * view.w} ${view.y - EDGE * view.h} ${view.w * (1 + 2 * EDGE)} ${view.h * (1 + 2 * EDGE)}`;
  const layerStyle = (z: number) => ({ left: `${-EDGE * 100}%`, top: `${-EDGE * 100}%`, width: `${(1 + 2 * EDGE) * 100}%`, height: `${(1 + 2 * EDGE) * 100}%`, transform: `translateZ(${z}px)`, transition: "transform 0.8s var(--ease-out)", pointerEvents: "none" as const });

  return (
    <section
      aria-labelledby="stage-h"
      className="stage relative h-[calc(100dvh-5.5rem)] min-h-[44rem] max-h-[62rem] overflow-hidden rounded-[2rem] sm:min-h-[40rem]"
      ref={stageRef}
      onKeyDown={(e) => {
        if (e.key !== "Escape" || !selected) return;
        restoreFocus.current = selected.slug;
        select(null);
      }}
    >
      {/* the map: a plane that can tip back and turn, with the wards stacked in layers to give them height */}
      <div
        ref={mapRef}
        tabIndex={0}
        role="group"
        aria-roledescription="map"
        aria-label="Ward map. With this focused, arrow keys move the map, plus and minus zoom, zero recentres, and shift with left or right arrow turns the 3D view. Choose a ward with the ward cards."
        className="absolute inset-0 cursor-grab touch-pan-y select-none outline-offset-[-4px] active:cursor-grabbing"
        style={{ perspective: "1700px", transform: `translate(${offset.dx}px, ${offset.dy}px)`, transition: "transform 0.8s var(--ease-out)" }}
        onKeyDown={(e) => {
          if (e.target !== e.currentTarget) return;
          const step = 70;
          const k = e.key;
          if (k === "ArrowLeft" && e.shiftKey && tilt) turn(-15);
          else if (k === "ArrowRight" && e.shiftKey && tilt) turn(15);
          else if (k === "ArrowLeft") pan(-step, 0);
          else if (k === "ArrowRight") pan(step, 0);
          else if (k === "ArrowUp") pan(0, -step);
          else if (k === "ArrowDown") pan(0, step);
          else if (k === "+" || k === "=") zoom(1.5);
          else if (k === "-" || k === "_") zoom(1 / 1.5);
          else if (k === "0") fly(targetFor(selected), true);
          else return;
          e.preventDefault();
        }}
        onPointerDown={(e) => {
          if (e.button !== 0) return;
          pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
          if (pointers.current.size === 2) {
            const [a, b] = [...pointers.current.values()];
            pinch.current = { dist: Math.hypot(a.x - b.x, a.y - b.y) || 1, from: latest.current.view };
            drag.current = null;
          } else drag.current = { x: e.clientX, y: e.clientY, from: latest.current.view, active: false, turn: e.shiftKey && tilt, bearing };
        }}
        onPointerMove={(e) => {
          if (!pointers.current.has(e.pointerId)) return;
          pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
          if (pinch.current && pointers.current.size === 2) {
            const [a, b] = [...pointers.current.values()];
            cancelAnimationFrame(raf.current);
            setCamera(zoomView(pinch.current.from, (Math.hypot(a.x - b.x, a.y - b.y) || 1) / pinch.current.dist, limits));
            return;
          }
          const d = drag.current;
          if (!d) return;
          const dx = e.clientX - d.x;
          const dy = e.clientY - d.y;
          if (!d.active) {
            if (Math.hypot(dx, dy) < 6) return;
            d.active = true;
            cancelAnimationFrame(raf.current);
            setHover(null);
            e.currentTarget.setPointerCapture(e.pointerId);
          }
          if (d.turn) return setBearing(d.bearing + dx * 0.4);
          const [px, py] = screenToPlane(dx, dy, tilt ? bearing : 0, tilt ? PITCH : 0);
          const u = scaleOf(d.from, size);
          setCamera({ ...d.from, x: d.from.x - px * u, y: d.from.y - py * u });
        }}
        onPointerUp={(e) => {
          pointers.current.delete(e.pointerId);
          pinch.current = null;
          drag.current = null;
        }}
        onPointerCancel={(e) => {
          pointers.current.delete(e.pointerId);
          pinch.current = null;
          drag.current = null;
        }}
      >
        <div className="absolute inset-0" style={{ transformStyle: "preserve-3d", transform: tilt ? `rotateX(${PITCH}deg) rotateZ(${bearing}deg)` : "none", transition: "transform 0.8s var(--ease-out)" }}>
          {stack.map((j) => (
            <svg key={j} viewBox={viewBox} aria-hidden="true" focusable="false" className="absolute" style={layerStyle(lift(j))}>
              {j === 0 && (
                <defs>
                  <filter id="stage-glow" x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur stdDeviation={6 * s} />
                  </filter>
                </defs>
              )}
              {wards.map((w) => {
                const l = level(w);
                if (l < j) return null;
                if (l > j) return <path key={w.code} d={w.d} fill={side(w, j, l)} stroke="none" />;
                const on = selected?.code === w.code;
                return (
                  <g key={w.code}>
                    <path
                      d={w.d}
                      fill={top(w)}
                      stroke="var(--card)"
                      strokeWidth={1.4}
                      vectorEffect="non-scaling-stroke"
                      strokeLinejoin="round"
                      style={{ pointerEvents: "auto", cursor: "pointer" }}
                      className="hover:brightness-110"
                      onPointerEnter={(e) => e.pointerType === "mouse" && setHover({ ward: w, x: e.clientX, y: e.clientY })}
                      onPointerMove={(e) => e.pointerType === "mouse" && !drag.current?.active && setHover({ ward: w, x: e.clientX, y: e.clientY })}
                      onPointerLeave={() => setHover(null)}
                      onClick={() => select(w)}
                    />
                    {on && (
                      <>
                        <path d={w.d} fill="none" stroke="var(--glow)" strokeWidth={6} vectorEffect="non-scaling-stroke" filter="url(#stage-glow)" opacity={0.95} pointerEvents="none" />
                        <path d={w.d} fill="none" stroke="var(--accent)" strokeWidth={3} vectorEffect="non-scaling-stroke" strokeLinejoin="round" pointerEvents="none" />
                      </>
                    )}
                    {/* roads, open issues and the label sit on the ward's own top, so they rise with it in 3D */}
                    <g pointerEvents="none">
                      {layers.roads && (
                        <g fill="none" strokeLinecap="round">
                          {(byWard.roads.get(w.code) ?? []).map((r, i) => {
                            const pinned = pinRoad === r.name;
                            return <path key={i} d={r.d} vectorEffect="non-scaling-stroke" strokeWidth={pinned ? 5 : r.hot ? 1.5 : 0.8} stroke={pinned || r.hot ? "var(--accent)" : "var(--foreground)"} opacity={pinned ? 1 : selected && !on ? 0.1 : on ? 0.9 : r.hot ? 0.6 : 0.22} />;
                          })}
                        </g>
                      )}
                      {layers.issues &&
                        (byWard.dots.get(w.code) ?? []).map((d, i) =>
                          on ? (
                            <g key={i} transform={upright(d.x, d.y)}>
                              <circle cx={d.x} cy={d.y} r={8.5 * s} fill={d.funded ? "var(--sea-fill)" : "var(--card)"} stroke={d.funded ? "var(--card)" : "var(--accent-ink)"} strokeWidth={(d.funded ? 1.6 : 2.2) * s} />
                              <text x={d.x} y={d.y} textAnchor="middle" dominantBaseline="central" fontSize={9.5 * s} fontWeight={700} fill={d.funded ? "var(--card)" : "var(--accent-ink)"}>
                                {d.rank}
                              </text>
                            </g>
                          ) : (
                            <g key={i} transform={upright(d.x, d.y)} opacity={selected ? 0.4 : 1}>
                              <circle cx={d.x} cy={d.y} r={2.8 * s} fill={d.funded ? "var(--sea-fill)" : "var(--card)"} stroke={d.funded ? "var(--card)" : "var(--accent-ink)"} strokeWidth={1.2 * s} />
                            </g>
                          ),
                        )}
                      {!(on && layers.issues) && (
                        <text x={w.cx} y={w.cy} transform={upright(w.cx, w.cy)} textAnchor="middle" dominantBaseline="central" fontWeight={700} fontSize={(on ? 14 : 11) * s} fill="var(--foreground)" stroke="var(--card)" strokeWidth={3.5 * s} paintOrder="stroke">
                          {w.code}
                        </text>
                      )}
                    </g>
                  </g>
                );
              })}
            </svg>
          ))}
        </div>
      </div>

      {/* top: title and search, what to colour by, layers */}
      <div className="pointer-events-none absolute inset-x-0 top-0 grid grid-cols-[minmax(0,1fr)_auto] items-start gap-x-4 gap-y-3 p-4 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] sm:p-5">
        <div className="min-w-0 max-w-[17rem]">
          <h2 id="stage-h" className="sr-only">
            Pick a ward on the map
          </h2>
        </div>
        <div role="group" aria-label="Colour the map by" className="stage-panel pointer-events-auto col-span-2 row-start-2 flex gap-1 rounded-full p-1 sm:col-span-1 sm:col-start-2 sm:row-start-1">
          {MODES.map((m) => (
            <button key={m.key} type="button" aria-pressed={mode === m.key} onClick={() => setMode(m.key)} className="stage-pill">
              {m.label}
            </button>
          ))}
        </div>
        <div role="group" aria-label="Map layers and view" className="stage-panel pointer-events-auto col-start-2 row-start-1 flex justify-self-end gap-1 rounded-full p-1 sm:col-start-3">
          <button type="button" aria-pressed={tilt} onClick={toggle3d} className="stage-pill gap-2">
            <Box aria-hidden className="size-4" /> <span>3D</span>
          </button>
          <button type="button" aria-pressed={layers.roads} onClick={() => setLayers((l) => ({ ...l, roads: !l.roads }))} className="stage-pill gap-2">
            <Route aria-hidden className="size-4" /> <span className="max-sm:sr-only">Roads</span>
          </button>
          <button type="button" aria-pressed={layers.issues} onClick={() => setLayers((l) => ({ ...l, issues: !l.issues }))} className="stage-pill gap-2">
            <span aria-hidden className="size-3 rounded-full border-2 border-current" /> <span className="max-sm:sr-only">Open issues</span>
          </button>
        </div>
        <div
          className="pointer-events-auto relative col-span-2 row-start-3 sm:col-span-1 sm:col-start-1 sm:row-start-1 sm:max-w-[18rem]"
          onBlur={(e) => {
            if (!e.currentTarget.contains(e.relatedTarget)) setListOpen(false);
          }}
        >
          <label htmlFor="stage-search" className="sr-only">
            Search wards, areas and roads
          </label>
          <input
            id="stage-search"
            type="search"
            role="combobox"
            aria-expanded={listOpen && hits.length > 0}
            aria-controls="stage-hits"
            aria-autocomplete="list"
            aria-activedescendant={listOpen && hits[act] ? `hit-${hits[act].key}` : undefined}
            autoComplete="off"
            placeholder="Search ward, area or road"
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setListOpen(true);
              setAct(0);
            }}
            onFocus={() => setListOpen(true)}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown" && hits.length) {
                e.preventDefault();
                setListOpen(true);
                setAct((a) => Math.min(a + 1, hits.length - 1));
              } else if (e.key === "ArrowUp" && hits.length) {
                e.preventDefault();
                setAct((a) => Math.max(a - 1, 0));
              } else if (e.key === "Enter" && listOpen && hits[act]) {
                e.preventDefault();
                choose(hits[act], true);
              } else if (e.key === "Escape" && (q || listOpen)) {
                e.stopPropagation();
                setQ("");
                setListOpen(false);
              }
            }}
            className="stage-panel h-11 w-full rounded-full pl-10 pr-4 text-sm text-foreground outline-offset-2 placeholder:text-muted"
          />
          <Search aria-hidden className="pointer-events-none absolute left-4 top-[1.375rem] size-4 -translate-y-1/2 text-muted" />
          {listOpen && term && (
            <ul id="stage-hits" role="listbox" aria-label="Search results" className="stage-panel absolute inset-x-0 top-12 z-30 max-h-72 overflow-y-auto rounded-3xl p-1.5">
              {hits.length === 0 && (
                <li role="presentation" className="px-3 py-2.5 text-sm text-muted">
                  No ward, area or road matches &ldquo;{q.trim()}&rdquo;.
                </li>
              )}
              {hits.map((h, i) => (
                <li
                  key={h.key}
                  id={`hit-${h.key}`}
                  role="option"
                  aria-selected={i === act}
                  onMouseDown={(e) => e.preventDefault()}
                  onMouseMove={() => setAct(i)}
                  onClick={(e) => choose(h, e.detail === 0)}
                  className={`min-h-11 cursor-pointer rounded-2xl px-3 py-1.5 ${i === act ? "bg-mist" : ""}`}
                >
                  <span className="block truncate text-sm font-medium">{h.label}</span>
                  <span className="block truncate text-xs text-muted">{h.sub}</span>
                </li>
              ))}
            </ul>
          )}
          <p className="sr-only" aria-live="polite">
            {listOpen && term ? (hits.length ? `${hits.length} results. Use the up and down arrows, then Enter.` : "No results.") : ""}
          </p>
        </div>
      </div>

      {/* zoom and turn */}
      <div role="group" aria-label="Zoom and turn" className="stage-panel absolute right-4 top-[14rem] flex flex-col gap-1 rounded-full p-1 sm:right-5 sm:top-24" style={{ right: wide && selected ? 392 : undefined }}>
        <button type="button" onClick={() => zoom(1.6)} aria-label="Zoom in" className="stage-icon">
          <Plus aria-hidden className="size-5" />
        </button>
        <button type="button" onClick={() => zoom(1 / 1.6)} aria-label="Zoom out" className="stage-icon">
          <Minus aria-hidden className="size-5" />
        </button>
        <button type="button" onClick={() => fly(targetFor(selected), true)} aria-label={selected ? `Centre on ward ${selected.code}` : "Show every ward"} className="stage-icon">
          <LocateFixed aria-hidden className="size-5" />
        </button>
        {tilt && (
          <>
            <button type="button" onClick={() => turn(-25)} aria-label="Turn the map left" className="stage-icon">
              <RotateCcw aria-hidden className="size-5" />
            </button>
            <button type="button" onClick={() => turn(25)} aria-label="Turn the map right" className="stage-icon">
              <RotateCw aria-hidden className="size-5" />
            </button>
          </>
        )}
      </div>

      {hover && (
        <div className="stage-panel pointer-events-none fixed z-20 rounded-xl px-3 py-2 text-sm" style={{ left: hover.x + 14, top: hover.y + 14 }}>
          <p className="font-semibold">
            <span className="num mr-1.5 rounded-full bg-mist px-2 py-0.5 text-xs">{hover.ward.code}</span>
            {hover.ward.name}
          </p>
          <p className="num mt-0.5 text-muted">
            {hover.ward.open} open issues · {inrShort(hover.ward.leftInr)} left
          </p>
        </div>
      )}

      {/* ward summary: a card on the right on wide screens, a sheet above the legend on narrow ones */}
      {selected && (
        <aside aria-label={`Ward ${selected.code} summary`} className={`stage-panel absolute z-10 flex flex-col overflow-hidden rounded-3xl ${wide ? "bottom-[13.75rem] right-5 top-24 w-[22rem]" : "inset-x-3 bottom-14"}`}>
          <div className="flex items-start justify-between gap-3 border-b border-rule p-4 pb-3">
            <div className="min-w-0">
              <p className="label">
                Ward {selected.code} · {selected.zone}
              </p>
              <h3 ref={titleRef} tabIndex={-1} className="display mt-1 text-[1.7rem] outline-offset-4">
                {selected.name}
              </h3>
              {pinRoad && <p className="mt-1 text-sm text-accent-ink">Showing {pinRoad} on the map</p>}
            </div>
            <div className="flex shrink-0 gap-1">
              <button type="button" aria-label="Previous ward" disabled={at <= 0} onClick={() => select(ordered[at - 1], true)} className="stage-icon">
                <ChevronLeft aria-hidden className="size-5" />
              </button>
              <button type="button" aria-label="Next ward" disabled={at >= ordered.length - 1} onClick={() => select(ordered[at + 1], true)} className="stage-icon">
                <ChevronRight aria-hidden className="size-5" />
              </button>
              <button
                type="button"
                aria-label="Close ward summary"
                onClick={() => {
                  restoreFocus.current = selected.slug;
                  select(null);
                }}
                className="stage-icon"
              >
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
                <div key={label} className="rounded-2xl bg-mist px-3 py-2.5">
                  <dt className="text-xs text-muted">{label}</dt>
                  <dd className="num mt-0.5 text-lg font-semibold">{value}</dd>
                </div>
              ))}
            </dl>
            <div>
              <p className="num text-sm">
                {selected.funded >= selected.open ? `All ${selected.open}` : `${selected.funded} of ${selected.open}`} paid for with the budget left
              </p>
              <span aria-hidden className="mt-1.5 block h-2 overflow-hidden rounded-full bg-unpaid">
                <span className="block h-2 rounded-full bg-sea-fill" style={{ width: `${selected.open ? (selected.funded / selected.open) * 100 : 0}%` }} />
              </span>
              {selected.over && (
                <p className="mt-2 flex items-start gap-2 text-sm text-accent-ink">
                  <TriangleAlert aria-hidden className="mt-0.5 size-4 shrink-0" /> Over budget already: only repairs that cost BMC nothing are paid for.
                </p>
              )}
            </div>
            <div className="max-sm:hidden">
              <h4 className="label">Fix first</h4>
              <ol className="mt-2 space-y-1.5">
                {selected.top.map((i) => (
                  <li key={i.rank} className="flex items-center gap-3 rounded-2xl bg-mist px-3 py-2 text-sm">
                    <span aria-hidden className={`num grid size-7 shrink-0 place-items-center rounded-full text-xs font-bold ${i.funded ? "bg-sea-fill text-card" : "border-2 border-accent-ink bg-card text-accent-ink"}`}>
                      {i.rank}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">
                        <span className="sr-only">Rank {i.rank}: </span>
                        {i.road}
                      </span>
                      <span className="num block text-muted">
                        {i.type} · {inrShort(i.costInr)} · {i.funded ? "paid for" : "not paid for"}
                      </span>
                    </span>
                  </li>
                ))}
              </ol>
            </div>
          </div>
          <div className="border-t border-rule p-4">
            <Link href={`/plan/${selected.slug}`} className="stage-cta w-full">
              Open the ward {selected.code} planner <ArrowRight aria-hidden className="size-4" />
            </Link>
          </div>
        </aside>
      )}

      {/* bottom: legend and the strip of wards */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 flex flex-col gap-2 p-4 pt-0 sm:p-5 sm:pt-0">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1 px-1 text-xs text-muted">
          <p className="flex items-center gap-2" title={modeInfo.about}>
            <span>{modeInfo.low}</span>
            <span aria-hidden className="h-2 w-24 rounded-full" style={{ background: "linear-gradient(90deg, color-mix(in oklab, var(--sea-fill) 8%, var(--sea-soft)), var(--sea-fill))" }} />
            <span>{modeInfo.high}</span>
            {tilt && <span>· taller = {mode === "risk" ? "higher risk" : mode === "gap" ? "less paid for" : "more open issues"}</span>}
          </p>
          {layers.issues && (
            <p className="flex items-center gap-3">
              <span className="flex items-center gap-1.5">
                <span aria-hidden className="size-2.5 rounded-full bg-sea-fill" /> Paid for
              </span>
              <span className="flex items-center gap-1.5">
                <span aria-hidden className="size-2.5 rounded-full border-2 border-accent-ink bg-card" /> Not paid for
              </span>
            </p>
          )}
          <p className="hidden sm:block">Drag to move · Ctrl + scroll or pinch to zoom{tilt ? " · Shift + drag to turn" : ""}</p>
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
                      <span className="num rounded-full bg-mist px-2.5 py-0.5 text-xs font-bold">{w.code}</span>
                      <span className="num text-xl font-semibold leading-none">
                        {h.big} <span className="text-xs font-medium text-muted">{h.unit}</span>
                      </span>
                    </span>
                    <span className="mt-2 block truncate text-sm font-medium">{w.name}</span>
                    <span aria-hidden className="mt-2 block h-1.5 overflow-hidden rounded-full bg-unpaid">
                      <span className="block h-1.5 rounded-full bg-sea-fill" style={{ width: `${Math.max(4, valueOf(w, mode) * 100)}%` }} />
                    </span>
                    <span className="num mt-1.5 block text-xs text-muted">
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
