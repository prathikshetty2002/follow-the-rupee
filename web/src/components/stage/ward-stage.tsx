"use client";

import "maplibre-gl/dist/maplibre-gl.css";
import { ArrowRight, Box, ChevronLeft, ChevronRight, LocateFixed, Minus, Plus, RotateCcw, RotateCw, Route, Search, TriangleAlert, X } from "lucide-react";
import type { ExpressionSpecification, FilterSpecification, Map as MapLibre } from "maplibre-gl";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { INK, WORKER_URL, basemapStyle } from "@/lib/basemap";
import { inrShort, int } from "@/lib/format";
import type { Bounds, StageData, StageWard } from "./types";

type Mode = "risk" | "gap" | "open";
type Hit = { key: string; label: string; sub: string; ward: StageWard; road?: string };

const MODES: { key: Mode; label: string; low: string; high: string; about: string }[] = [
  { key: "risk", label: "Risk", low: "Lower risk", high: "Higher risk", about: "How serious each ward's open issues are. The worst ward is 100." },
  { key: "gap", label: "Budget gap", low: "All paid for", high: "Least paid for", about: "The share of open issues the remaining budget cannot pay for." },
  { key: "open", label: "Open issues", low: "Fewer", high: "More", about: "How many complaints still have no repair ordered." },
];

const PITCH = 55; // how far the 3D map is tipped back, in degrees
const BEARING = -16; // and turned, so Mumbai's long north-south shape reads well
const union = (b: Bounds[]): Bounds => [Math.min(...b.map((x) => x[0])), Math.min(...b.map((x) => x[1])), Math.max(...b.map((x) => x[2])), Math.max(...b.map((x) => x[3]))];
const reducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const box = (b: Bounds): [[number, number], [number, number]] => [
  [b[0], b[1]],
  [b[2], b[3]],
];

/** The map's own data: wards with a 0-1 value per colouring, their label points, the roads with open issues, and the issues. */
function layersData(data: StageData) {
  const maxOpen = Math.max(...data.wards.map((w) => w.open), 1);
  return {
    wards: {
      type: "FeatureCollection" as const,
      features: data.wards.map((w) => ({
        type: "Feature" as const,
        properties: { code: w.code, v_risk: w.risk / 100, v_gap: w.open ? 1 - w.funded / w.open : 0, v_open: w.open / maxOpen },
        geometry: w.geometry as GeoJSON.Polygon | GeoJSON.MultiPolygon,
      })),
    },
    labels: {
      type: "FeatureCollection" as const,
      features: data.wards.map((w) => ({ type: "Feature" as const, properties: { code: w.code }, geometry: { type: "Point" as const, coordinates: w.center } })),
    },
    roads: {
      type: "FeatureCollection" as const,
      features: data.roads.map((r) => ({ type: "Feature" as const, properties: { ward: r.ward, hot: r.hot, name: r.name }, geometry: { type: "LineString" as const, coordinates: r.coords } })),
    },
    issues: {
      type: "FeatureCollection" as const,
      features: data.dots.map((d) => ({ type: "Feature" as const, properties: { ward: d.ward, rank: d.rank, funded: d.funded }, geometry: { type: "Point" as const, coordinates: d.at } })),
    },
  };
}

/** Our layers on top of the basemap. Paint that depends on the colouring or the chosen ward is set later, in one place. */
function addOverlays(m: MapLibre, d: ReturnType<typeof layersData>) {
  m.addSource("wards", { type: "geojson", data: d.wards });
  m.addSource("ward-labels", { type: "geojson", data: d.labels });
  m.addSource("our-roads", { type: "geojson", data: d.roads });
  m.addSource("issues", { type: "geojson", data: d.issues });
  const under = "sea-names"; // ward colour sits under the basemap's place names
  m.addLayer({ id: "wards-fill", type: "fill", source: "wards", paint: { "fill-color": INK.wardLow, "fill-opacity": 0.6 } }, under);
  m.addLayer({ id: "wards-3d", type: "fill-extrusion", source: "wards", layout: { visibility: "none" }, paint: { "fill-extrusion-color": INK.wardLow, "fill-extrusion-opacity": 0.88, "fill-extrusion-height": 0 } }, under);
  m.addLayer({ id: "wards-edge", type: "line", source: "wards", layout: { "line-join": "round" }, paint: { "line-color": INK.edge, "line-width": 1.4, "line-opacity": 0.95 } }, under);
  m.addLayer({ id: "our-roads", type: "line", source: "our-roads", layout: { "line-cap": "round", "line-join": "round" }, paint: { "line-color": INK.accent, "line-width": 1.6, "line-opacity": 0.6 } });
  m.addLayer({ id: "ward-hover", type: "line", source: "wards", filter: ["==", ["get", "code"], ""], paint: { "line-color": INK.ink, "line-width": 2, "line-opacity": 0.55 } });
  m.addLayer({ id: "ward-glow", type: "line", source: "wards", filter: ["==", ["get", "code"], ""], paint: { "line-color": INK.glow, "line-width": 12, "line-blur": 9, "line-opacity": 0.75 } });
  m.addLayer({ id: "ward-line", type: "line", source: "wards", filter: ["==", ["get", "code"], ""], layout: { "line-join": "round" }, paint: { "line-color": INK.accent, "line-width": 3 } });
  m.addLayer({ id: "issues", type: "circle", source: "issues", paint: { "circle-color": ["case", ["get", "funded"], INK.wardHigh, "#FFFFFF"], "circle-stroke-color": ["case", ["get", "funded"], "#FFFFFF", INK.accentInk], "circle-stroke-width": 1.4, "circle-radius": 3 } });
  m.addLayer({
    id: "issue-ranks",
    type: "symbol",
    source: "issues",
    filter: ["==", ["get", "ward"], ""],
    layout: { "text-field": ["to-string", ["get", "rank"]], "text-font": ["Noto Sans Bold"], "text-size": 10, "text-allow-overlap": true, "text-ignore-placement": true },
    paint: { "text-color": ["case", ["get", "funded"], "#FFFFFF", INK.accentInk] },
  });
  m.addLayer({
    id: "ward-codes",
    type: "symbol",
    source: "ward-labels",
    layout: { "text-field": ["get", "code"], "text-font": ["Noto Sans Bold"], "text-size": 13, "text-allow-overlap": true },
    paint: { "text-color": INK.ink, "text-halo-color": "#FFFFFF", "text-halo-width": 1.8 },
  });
}

/**
 * The ward map: a real map of Mumbai in the site's light palette with the 24 wards on top, flat or in 3D (each ward
 * stands as tall as its value, and opens up to show its buildings when chosen). Choose a ward (map, card, arrows or search)
 * and the map flies to it and opens its summary. Drag to move, Ctrl and scroll or two fingers to zoom, arrow keys when it has focus.
 */
export function WardStage({ data }: { data: StageData }) {
  const { wards } = data;
  const params = useSearchParams();
  const selected = wards.find((w) => w.slug === params.get("ward")) ?? null;

  const [mode, setMode] = useState<Mode>("risk");
  const [layers, setLayers] = useState({ roads: true, issues: true });
  const [tilt, setTilt] = useState(false);
  const [q, setQ] = useState("");
  const [listOpen, setListOpen] = useState(false);
  const [act, setAct] = useState(0);
  const [pinRoad, setPinRoad] = useState<string | null>(null);
  const [hover, setHover] = useState<{ ward: StageWard; x: number; y: number } | null>(null);
  const [size, setSize] = useState({ w: 1100, h: 720 });
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);

  const stageRef = useRef<HTMLDivElement>(null);
  const mapEl = useRef<HTMLDivElement>(null);
  const map = useRef<MapLibre | null>(null);
  const railRef = useRef<HTMLUListElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const focusCard = useRef(false);
  const restoreFocus = useRef<string | null>(null);

  const overlays = useMemo(() => layersData(data), [data]);
  const home = useMemo(() => union(wards.map((w) => w.bounds)), [wards]);
  const wide = size.w >= 950; // matches the lg layout: one row of controls, summary card on the right

  /** Room the panels take on each side of a w × h map, so the chosen area is framed in what stays visible. Never more than the map can give. */
  const padFor = (open: boolean, w: number, h: number) => {
    const big = w >= 950;
    const p = { top: big ? 96 : 220, bottom: big ? 236 : open ? 360 : 220, left: 32, right: big && open ? 412 : 32 };
    const v = Math.min(1, (h * 0.8) / (p.top + p.bottom));
    const across = Math.min(1, (w * 0.8) / (p.left + p.right));
    return { top: p.top * v, bottom: p.bottom * v, left: p.left * across, right: p.right * across };
  };

  const select = (w: StageWard | null, fromKeyboard = false, road: string | null = null) => {
    setPinRoad(w ? road : null);
    setHover(null);
    const url = new URL(window.location.href);
    if (w) url.searchParams.set("ward", w.slug);
    else url.searchParams.delete("ward");
    window.history.replaceState(null, "", url.pathname + url.search + url.hash);
    focusCard.current = fromKeyboard && !!w;
  };

  // Everything the map's own event handlers need, kept current without re-registering them.
  const live = useRef<{ wards: StageWard[]; pick: (w: StageWard) => void }>({ wards, pick: () => {} });
  useEffect(() => {
    live.current = { wards, pick: (w: StageWard) => select(w) };
  });

  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const watch = new ResizeObserver(([e]) => setSize({ w: e.contentRect.width, h: e.contentRect.height }));
    watch.observe(el);
    return () => watch.disconnect();
  }, []);

  // Start the map once, in the browser. MapLibre is loaded only here, so the server never runs it.
  const start = useRef({ overlays, home });
  useEffect(() => {
    let gone = false;
    let m: MapLibre | null = null;
    import("maplibre-gl")
      .then((ml) => {
        if (gone || !mapEl.current) return;
        ml.setWorkerUrl(WORKER_URL);
        m = new ml.Map({
          container: mapEl.current,
          style: basemapStyle(),
          bounds: box(start.current.home),
          fitBoundsOptions: { padding: 40 },
          attributionControl: false,
          cooperativeGestures: true,
          minZoom: 9,
          maxZoom: 17.5,
          maxPitch: 70,
        });
        map.current = m;
        const canvas = m.getCanvas();
        canvas.setAttribute("aria-label", "Map of Mumbai's wards. Arrow keys move it, plus and minus zoom, shift with an arrow turns or tilts it. Choose a ward with the search or the ward cards.");
        m.on("load", () => {
          addOverlays(m!, start.current.overlays);
          setReady(true);
        });
        m.on("error", (e) => {
          if (String(e.error?.message ?? "").includes("WebGL")) setFailed(true);
        });
        m.on("click", "wards-fill", (e) => {
          const code = e.features?.[0]?.properties?.code;
          const w = live.current.wards.find((x) => x.code === code);
          if (w) live.current.pick(w);
        });
        m.on("mousemove", "wards-fill", (e) => {
          const code = e.features?.[0]?.properties?.code;
          const w = live.current.wards.find((x) => x.code === code);
          canvas.style.cursor = "pointer";
          setHover(w ? { ward: w, x: e.originalEvent.clientX, y: e.originalEvent.clientY } : null);
        });
        m.on("mouseleave", "wards-fill", () => {
          canvas.style.cursor = "";
          setHover(null);
        });
        m.on("dragstart", () => setHover(null));
        // The camera, readable from the page (used by checks and the walkthrough recorder).
        m.on("moveend", () => {
          const c = m!.getCenter();
          mapEl.current?.setAttribute("data-view", `${c.lng.toFixed(4)},${c.lat.toFixed(4)},${m!.getZoom().toFixed(2)},${m!.getPitch().toFixed(0)}`);
        });
      })
      .catch(() => setFailed(true));
    return () => {
      gone = true;
      m?.remove();
      map.current = null;
    };
  }, []);

  useEffect(() => {
    map.current?.resize();
  }, [size]);

  // Colour, height and highlights follow the colouring, the chosen ward and the layer switches.
  const sel = selected?.code ?? "";
  const hoverCode = hover?.ward.code ?? "";
  useEffect(() => {
    const m = map.current;
    if (!ready || !m) return;
    const v = ["get", `v_${mode}`] as ExpressionSpecification;
    const isSel = ["==", ["get", "code"], sel] as ExpressionSpecification;
    const inSel = ["==", ["get", "ward"], sel] as ExpressionSpecification;
    const colour = ["interpolate", ["linear"], v, 0, INK.wardLow, 1, INK.wardHigh] as ExpressionSpecification;
    // In 3D a chosen ward drops flat so its streets show, and the others sink to low plinths around it.
    const tall = (k: number, base: number) => ["case", isSel, 0, ["*", sel ? 0.2 : 1, ["+", base, ["*", v, k]]]] as ExpressionSpecification;
    m.setPaintProperty("wards-fill", "fill-color", colour);
    m.setPaintProperty("wards-fill", "fill-opacity", sel ? ["case", isSel, 0.05, 0.4] : 0.62);
    m.setPaintProperty("wards-3d", "fill-extrusion-color", colour);
    m.setPaintProperty("wards-3d", "fill-extrusion-height", ["interpolate", ["linear"], ["zoom"], 10, tall(3600, 150), 12.6, tall(1300, 60), 13.6, 0]);
    m.setPaintProperty("wards-3d", "fill-extrusion-opacity", sel ? 0.7 : 0.9);
    m.setLayoutProperty("wards-3d", "visibility", tilt ? "visible" : "none");
    m.setLayoutProperty("buildings-3d", "visibility", tilt ? "visible" : "none");
    m.setLayoutProperty("buildings", "visibility", tilt ? "none" : "visible");
    const only = (code: string) => ["==", ["get", "code"], code] as FilterSpecification;
    m.setFilter("ward-line", only(sel));
    m.setFilter("ward-glow", only(sel));
    m.setFilter("ward-hover", only(hoverCode === sel ? "" : hoverCode));

    const pinned = ["==", ["get", "name"], pinRoad ?? ""] as ExpressionSpecification;
    m.setLayoutProperty("our-roads", "visibility", layers.roads ? "visible" : "none");
    m.setFilter("our-roads", ["any", ["get", "hot"], pinned] as FilterSpecification);
    m.setPaintProperty("our-roads", "line-width", ["case", pinned, 6, inSel, 2.6, 1.6]);
    m.setPaintProperty("our-roads", "line-opacity", sel ? ["case", pinned, 1, inSel, 0.95, 0.12] : 0.55);

    m.setLayoutProperty("issues", "visibility", layers.issues ? "visible" : "none");
    m.setLayoutProperty("issue-ranks", "visibility", layers.issues ? "visible" : "none");
    m.setFilter("issue-ranks", ["==", ["get", "ward"], sel]);
    m.setPaintProperty("issues", "circle-radius", ["interpolate", ["linear"], ["zoom"], 10, ["case", inSel, 6, 2.4], 13, ["case", inSel, 9, 4], 16, ["case", inSel, 12, 6]]);
    m.setPaintProperty("issues", "circle-opacity", sel ? ["case", inSel, 1, 0.35] : 1);
    m.setPaintProperty("issues", "circle-stroke-opacity", sel ? ["case", inSel, 1, 0.35] : 1);
    m.setPaintProperty("issues", "circle-stroke-width", ["case", inSel, 2, 1.4]);
    m.setFilter("ward-codes", layers.issues && sel ? (["!=", ["get", "code"], sel] as FilterSpecification) : null);
  }, [ready, mode, sel, hoverCode, layers, tilt, pinRoad]);

  // The camera frames the chosen ward (or the whole city), leaving room for the panels, and tips back in 3D.
  const frame = (w: StageWard | null, threeD = tilt) => {
    const m = map.current;
    if (!m) return;
    const pitch = threeD ? PITCH : 0;
    const bearing = threeD ? BEARING : 0;
    const el = m.getContainer();
    const cam = m.cameraForBounds(box(w ? w.bounds : home), { padding: padFor(!!w, el.clientWidth, el.clientHeight), pitch, bearing, maxZoom: 14.6 });
    if (!cam) return;
    // A tipped map shows the far side small, so in 3D come a little closer than a flat fit would.
    const zoom = (cam.zoom ?? 11) + (threeD ? (w ? 0.35 : 0.8) : 0);
    m.flyTo({ ...cam, zoom, pitch, bearing, duration: reducedMotion() ? 0 : 1500, essential: true });
  };
  const frameRef = useRef(frame);
  useEffect(() => {
    frameRef.current = frame;
  });
  useEffect(() => {
    if (!ready) return;
    frameRef.current(wards.find((w) => w.code === sel) ?? null, tilt);
  }, [ready, sel, tilt, wide, wards]);

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

  const ms = () => (reducedMotion() ? 0 : 400);
  const zoom = (by: number) => map.current?.easeTo({ zoom: map.current.getZoom() + by, duration: ms() });
  const turn = (deg: number) => map.current?.easeTo({ bearing: map.current.getBearing() + deg, duration: ms() });
  const toggle3d = () => setTilt((t) => !t);

  const valueOf = (w: StageWard, m: Mode) => {
    if (m === "risk") return w.risk / 100;
    if (m === "gap") return w.open ? 1 - w.funded / w.open : 0;
    return w.open / Math.max(...wards.map((x) => x.open));
  };
  const headline = (w: StageWard) => (mode === "risk" ? { big: String(w.risk), unit: "risk" } : mode === "gap" ? { big: `${Math.round(valueOf(w, "gap") * 100)}%`, unit: "unpaid" } : { big: String(w.open), unit: "open" });
  const ordered = [...wards].sort((a, b) => valueOf(b, mode) - valueOf(a, mode) || b.risk - a.risk);
  const at = selected ? ordered.findIndex((w) => w.code === selected.code) : -1;
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
  const modeInfo = MODES.find((m) => m.key === mode)!;

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
      {/* the real map of Mumbai, with the wards drawn on it */}
      <div className="stage-map absolute inset-0">
        <div ref={mapEl} className="size-full" />
      </div>
      {!ready && !failed && (
        <p role="status" className="stage-panel pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full px-5 py-2.5 text-sm font-medium">
          Loading the map of Mumbai…
        </p>
      )}
      {failed && (
        <p className="stage-panel absolute left-1/2 top-1/2 max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-3xl px-5 py-4 text-center text-sm">
          The map could not start in this browser. Use the search or the ward cards below, or the table further down the page.
        </p>
      )}

      {/* top: title and search, what to colour by, layers */}
      <div className="pointer-events-none absolute inset-x-0 top-0 grid grid-cols-[minmax(0,1fr)_auto] items-start gap-x-4 gap-y-3 p-4 sm:p-5 lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]">
        <div className="min-w-0 max-w-[17rem]">
          <h2 id="stage-h" className="sr-only">
            Pick a ward on the map
          </h2>
        </div>
        <div role="group" aria-label="Colour the map by" className="stage-panel pointer-events-auto col-span-2 row-start-2 flex gap-1 rounded-full p-1 lg:col-span-1 lg:col-start-2 lg:row-start-1">
          {MODES.map((m) => (
            <button key={m.key} type="button" aria-pressed={mode === m.key} onClick={() => setMode(m.key)} className="stage-pill">
              {m.label}
            </button>
          ))}
        </div>
        <div role="group" aria-label="Map layers and view" className="stage-panel pointer-events-auto col-start-2 row-start-1 flex justify-self-end gap-1 rounded-full p-1 lg:col-start-3">
          <button type="button" aria-pressed={tilt} onClick={toggle3d} className="stage-pill gap-2">
            <Box aria-hidden className="size-4" /> <span>3D</span>
          </button>
          <button type="button" aria-pressed={layers.roads} onClick={() => setLayers((l) => ({ ...l, roads: !l.roads }))} className="stage-pill gap-2">
            <Route aria-hidden className="size-4" /> <span className="max-sm:sr-only lg:max-xl:sr-only">Roads</span>
          </button>
          <button type="button" aria-pressed={layers.issues} onClick={() => setLayers((l) => ({ ...l, issues: !l.issues }))} className="stage-pill gap-2">
            <span aria-hidden className="size-3 rounded-full border-2 border-current" /> <span className="max-sm:sr-only lg:max-xl:sr-only">Open issues</span>
          </button>
        </div>
        <div
          className="pointer-events-auto relative col-span-2 row-start-3 lg:col-span-1 lg:col-start-1 lg:row-start-1 lg:max-w-[18rem]"
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
      <div role="group" aria-label="Zoom and turn" className="stage-panel absolute right-4 top-[14rem] flex flex-col gap-1 rounded-full p-1 sm:right-5 lg:top-24" style={{ right: wide && selected ? 392 : undefined }}>
        <button type="button" onClick={() => zoom(1)} aria-label="Zoom in" className="stage-icon">
          <Plus aria-hidden className="size-5" />
        </button>
        <button type="button" onClick={() => zoom(-1)} aria-label="Zoom out" className="stage-icon">
          <Minus aria-hidden className="size-5" />
        </button>
        <button type="button" onClick={() => frame(selected)} aria-label={selected ? `Centre on ward ${selected.code}` : "Show every ward"} className="stage-icon">
          <LocateFixed aria-hidden className="size-5" />
        </button>
        {tilt && (
          <>
            <button type="button" onClick={() => turn(-30)} aria-label="Turn the map left" className="stage-icon">
              <RotateCcw aria-hidden className="size-5" />
            </button>
            <button type="button" onClick={() => turn(30)} aria-label="Turn the map right" className="stage-icon">
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
        <div className="stage-panel flex flex-wrap items-center gap-x-5 gap-y-1 self-start rounded-2xl px-3 py-1.5 text-xs text-muted">
          <p className="flex items-center gap-2" title={modeInfo.about}>
            <span>{modeInfo.low}</span>
            <span aria-hidden className="h-2 w-24 rounded-full" style={{ background: "linear-gradient(90deg, color-mix(in oklab, var(--sea-fill) 8%, var(--sea-soft)), var(--sea-fill))" }} />
            <span>{modeInfo.high}</span>
            {tilt && <span>· taller = {mode === "risk" ? "higher risk" : mode === "gap" ? "less paid for" : "more open issues"}; a chosen ward opens up; zoom in to see its buildings</span>}
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
          <p className="hidden sm:block">Drag to move · Ctrl + scroll to zoom{tilt ? " · Right-drag to turn" : ""}</p>
          <p className="pointer-events-auto">
            Map ©{" "}
            <a href="https://www.openstreetmap.org/copyright" className="underline underline-offset-2">
              OpenStreetMap
            </a>{" "}
            ·{" "}
            <a href="https://openfreemap.org" className="underline underline-offset-2">
              OpenFreeMap
            </a>
          </p>
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
