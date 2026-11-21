// Records a captioned walkthrough of the site in headless Chrome over the DevTools protocol.
// usage: node record.mjs [outDir] [baseUrl]
import { spawn, execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";

const OUT = process.argv[2] ?? "/tmp/walkthrough-out";
const BASE = process.argv[3] ?? "http://localhost:3100";
const W = 1440;
const H = 810;
const DSF = 4 / 3; // 1920 x 1080 frames
const OVERLAY = readFileSync(new URL("./overlay.js", import.meta.url), "utf8");

rmSync(OUT, { recursive: true, force: true });
mkdirSync(path.join(OUT, "frames"), { recursive: true });

const port = 9400 + Math.floor(Math.random() * 400);
const chrome = spawn("google-chrome-stable", ["--headless=new", "--no-sandbox", "--hide-scrollbars", "--force-color-profile=srgb", `--remote-debugging-port=${port}`, `--user-data-dir=${OUT}/profile`, "about:blank"], { stdio: "ignore" });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let list;
for (let i = 0; i < 60; i++) {
  try {
    list = await (await fetch(`http://127.0.0.1:${port}/json`)).json();
    if (list.find((t) => t.type === "page")) break;
  } catch {}
  await sleep(200);
}
const ws = new WebSocket(list.find((t) => t.type === "page").webSocketDebuggerUrl);
await new Promise((r) => (ws.onopen = r));
let id = 0;
const pending = new Map();
const frames = [];
let recording = false;
ws.onmessage = async (m) => {
  const d = JSON.parse(m.data);
  if (d.id && pending.has(d.id)) {
    pending.get(d.id)(d);
    pending.delete(d.id);
  } else if (d.method === "Page.screencastFrame") {
    const { data, metadata, sessionId } = d.params;
    if (recording) {
      const file = path.join(OUT, "frames", `${String(frames.length).padStart(5, "0")}.jpg`);
      writeFileSync(file, Buffer.from(data, "base64"));
      frames.push({ file, ts: metadata.timestamp });
    }
    ws.send(JSON.stringify({ id: ++id, method: "Page.screencastFrameAck", params: { sessionId } }));
  }
};
const send = (method, params = {}) =>
  new Promise((r) => {
    const i = ++id;
    pending.set(i, r);
    ws.send(JSON.stringify({ id: i, method, params }));
  });
const ev = async (expression) => {
  const r = await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
  if (r.result?.exceptionDetails) console.error("eval error:", expression.slice(0, 120), r.result.exceptionDetails.exception?.description?.slice(0, 200));
  return r.result?.result?.value;
};

await send("Page.enable");
await send("Emulation.setDeviceMetricsOverride", { width: W, height: H, deviceScaleFactor: DSF, mobile: false });
await send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-color-scheme", value: "light" }, { name: "prefers-reduced-motion", value: "no-preference" }] });
await send("Page.addScriptToEvaluateOnNewDocument", { source: OVERLAY });

// ---------- helpers ----------
let cx = W / 2;
let cy = H / 2;
let cap = null; // current caption, re-applied after full page loads
const cues = [];
let t0 = 0;
const now = () => (Date.now() - t0) / 1000;

async function caption(chapter, tag, text) {
  cap = [chapter, tag, text];
  if (cues.length) cues[cues.length - 1].end = now();
  cues.push({ start: now() + 0.2, end: null, text: `${tag}: ${text}` });
  await ev(`window.__wt && __wt.caption(${JSON.stringify(chapter)}, ${JSON.stringify(tag)}, ${JSON.stringify(text)})`);
}
async function ensureOverlay() {
  for (let i = 0; i < 30; i++) {
    const ok = await ev(`!!(window.__wt && document.getElementById('wt-root'))`);
    if (ok) break;
    await ev(`window.__wt && __wt.mount()`);
    await sleep(100);
  }
  if (cap) await ev(`__wt.caption(${cap.map((s) => JSON.stringify(s)).join(",")})`);
  await ev(`__wt.cursor(${cx}, ${cy}, 0)`);
}
/** `find` is a JS expression that yields an element. */
async function rect(find) {
  return ev(`(()=>{const el=(${find}); if(!el) return null; const r=el.getBoundingClientRect(); return {x:r.left+r.width/2, y:r.top+r.height/2, w:r.width, h:r.height, top:r.top}})()`);
}
async function ring(find, pad = 10) {
  await ev(`__wt.ring(${find ? `(${find})` : "null"}, ${pad})`);
}
async function scrollTo(find, block = "center", wait = 900) {
  await ev(`(()=>{const el=(${find}); if(el) el.scrollIntoView({behavior:'smooth', block:'${block}'})})()`);
  await sleep(wait);
}
async function scrollBy(dy, wait = 900) {
  await ev(`window.scrollBy({top:${dy}, behavior:'smooth'})`);
  await sleep(wait);
}
async function move(x, y, ms = 550) {
  await ev(`__wt.cursor(${x}, ${y}, ${ms})`);
  const steps = 6;
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    await send("Input.dispatchMouseEvent", { type: "mouseMoved", x: cx + (x - cx) * t, y: cy + (y - cy) * t });
    await sleep(ms / steps);
  }
  cx = x;
  cy = y;
}
async function click(find, { ms = 550, settle = 300 } = {}) {
  const r = await rect(find);
  if (!r) {
    console.error("click: not found", find);
    return false;
  }
  await move(r.x, r.y, ms);
  await ev(`__wt.ripple(${r.x}, ${r.y})`);
  await send("Input.dispatchMouseEvent", { type: "mousePressed", x: r.x, y: r.y, button: "left", clickCount: 1 });
  await send("Input.dispatchMouseEvent", { type: "mouseReleased", x: r.x, y: r.y, button: "left", clickCount: 1 });
  await sleep(settle);
  return true;
}
async function type(text, gap = 110) {
  for (const ch of text) {
    await send("Input.insertText", { text: ch });
    await sleep(gap);
  }
}
async function key(k, code, vk) {
  await send("Input.dispatchKeyEvent", { type: "keyDown", key: k, code, windowsVirtualKeyCode: vk });
  await send("Input.dispatchKeyEvent", { type: "keyUp", key: k, code, windowsVirtualKeyCode: vk });
}
async function waitFor(find, tries = 40) {
  for (let i = 0; i < tries; i++) {
    if (await ev(`!!(${find})`)) return true;
    await sleep(150);
  }
  console.error("waitFor timed out", find);
  return false;
}
/** Keeps each caption on screen for at least `secs`. */
async function hold(since, secs) {
  const left = secs - (now() - since);
  if (left > 0) await sleep(left * 1000);
}

const $ = (sel) => `document.querySelector(${JSON.stringify(sel)})`;
const btn = (text, scope = "document") => `[...${scope}.querySelectorAll('button')].find(b=>b.textContent.replace(/\\s+/g,' ').trim()===${JSON.stringify(text)})`;
const btnHas = (text, scope = "document") => `[...${scope}.querySelectorAll('button')].find(b=>b.textContent.includes(${JSON.stringify(text)}))`;
const GUIDE = $('aside[aria-label="Site guide"]');
const guideOpen = `document.querySelector('aside[aria-label="Site guide"] button[aria-label="Show the guide text"]')`;
const guideShrink = `document.querySelector('aside[aria-label="Site guide"] button[aria-label="Shrink the guide"]')`;
const guideNext = `[...document.querySelectorAll('aside[aria-label="Site guide"] button')].find(b=>/Next stop|Chalo, le chalo/.test(b.textContent))`;
const cardOf = (text, scope = "document.querySelector('#main')") => `__wt.card(__wt.byText(${JSON.stringify(text)}, ${scope}))`;

/** Rides the guide to its next stop: open it if shrunk, press Next, let the page arrive, then tuck it away. */
async function nextStop(path, show = 1400) {
  if (await ev(`!!${guideOpen}`)) await click(guideOpen, { ms: 550, settle: 450 });
  await click(guideNext, { ms: 600, settle: 300 });
  await waitFor(`location.pathname===${JSON.stringify(path)}`);
  await sleep(500);
  await ensureOverlay();
  await sleep(show);
  if (await ev(`!!${guideShrink}`)) await click(guideShrink, { ms: 500, settle: 300 });
}

// ---------- the walkthrough ----------
await send("Page.navigate", { url: BASE + "/" });
await sleep(900);
await ensureOverlay();
await send("Page.startScreencast", { format: "jpeg", quality: 90, maxWidth: 1920, maxHeight: 1080, everyNthFrame: 1 });
recording = true;
t0 = Date.now();

// Intro: the hero
let s = now();
await caption("", "Follow the Rupee · Mumbai monsoon roads", "Mumbai's 24 wards spend crores on monsoon road repairs. With the money left, what should be fixed first?");
await ring($("#hero-h"), 14);
await move(720, 470, 1200);
await hold(s, 5.6);

// The guide
s = now();
await ring(null);
await caption("", "Built-in guide", "A built-in guide rides the site like a Western line local, one stop per section.");
await waitFor(GUIDE);
await sleep(300);
if (await ev(`!!${guideOpen}`)) await click(guideOpen, { ms: 800, settle: 600 });
await ring(GUIDE, 6);
await hold(s, 4.8);

// Stop 1: the map
s = now();
await ring(null);
await click($('aside[aria-label="Site guide"] button[aria-label="Stop 1: Churchgate"]'), { ms: 600, settle: 200 });
await caption("map", "Stop 1 · Churchgate · The ward map", "All 24 wards on one map. Darker blue means riskier open issues. Filled dots are paid for; rings are not.");
await sleep(1100);
if (await ev(`!!${guideShrink}`)) await click(guideShrink, { ms: 550, settle: 300 });
await ring($("section.stage"), 4);
{
  const m = await rect($("section.stage"));
  await move(m.x + 10, m.y + 10, 800);
}
await hold(s, 6.2);

s = now();
await ring(null);
await caption("map", "Colour and 3D", "Recolour by risk, budget gap or open issues. In 3D, each ward stands as tall as its value.");
await click(btn("Budget gap", $('[aria-label="Colour the map by"]')), { ms: 550, settle: 1100 });
await click(btn("Risk", $('[aria-label="Colour the map by"]')), { ms: 500, settle: 400 });
await click(btn("3D", $('[aria-label="Map layers and view"]')), { ms: 550, settle: 2000 });
await click(btn("3D", $('[aria-label="Map layers and view"]')), { ms: 300, settle: 600 });
await hold(s, 6.0);

s = now();
await caption("map", "Search", "Search any ward, area or road, like Sion.");
await click($("#stage-search"), { ms: 550, settle: 200 });
await type("Sion");
await ring($("#stage-hits"), 6);
await sleep(1100);
await key("Escape", "Escape", 27);
await ring(null);
await hold(s, 3.8);

// Stop 2: a ward
s = now();
await caption("map", "Stop 2 · Marine Lines · Ward summary", "Pick a ward and the map flies there. Its summary shows open issues, cost, budget left and what to fix first.");
await nextStop("/", 1000);
await waitFor($('section.stage aside'));
await ring($("section.stage aside"), 6);
await hold(s, 6.4);

// Stop 3: the planner, the main tool
s = now();
await ring(null);
await caption("planner", "Stop 3 · Charni Road · The main tool", "The main tool: the Next Rupee Planner. Every open issue in the ward, ranked by risk and matched to the money left.");
await nextStop("/plan/F-N", 700);
await ring($("#main h1"), 12);
await hold(s, 6.0);

s = now();
await caption("planner", "Budget", "Start from the budget left, ₹10.9 lakh, or type any amount. At ₹5 lakh the plan recalculates instantly.");
await ring($('section[aria-label="Plan settings"]'), 10);
await scrollTo($('section[aria-label="Plan settings"]'), "center", 900);
await click(`[...document.querySelectorAll('section[aria-label="Plan settings"] button')].find(b=>b.textContent.replace(/\\s+/g,'')==='₹5L')`, { ms: 700, settle: 600 });
await hold(s, 5.5);

s = now();
await caption("planner", "Budget line", "Each block is one repair, as wide as it costs. Dark blocks are paid for; the marker shows where money runs out.");
await scrollTo($('section[aria-labelledby="result-h"]'), "center", 800);
await ring($('[aria-label^="Budget line"]'), 10);
{
  const b = await rect($('[aria-label^="Budget line"]'));
  if (b) await move(b.x - b.w / 4, b.y, 800);
}
await hold(s, 6.0);

s = now();
await caption("planner", "Two ways to spend", "Riskiest first pays in rank order. Most risk covered finds the exact mix that covers the most risk.");
await ring($('section[aria-label="Plan settings"]'), 10);
await scrollTo($('section[aria-label="Plan settings"]'), "center", 700);
await click(`document.querySelector('input[name="strategy"][value="most_risk"]').closest('label') || document.querySelector('input[name="strategy"][value="most_risk"]')`, { ms: 700, settle: 600 });
await scrollTo($('section[aria-labelledby="result-h"] dl'), "center", 700);
await ring($('section[aria-labelledby="result-h"] dl'), 10);
await hold(s, 5.8);

s = now();
await ring(null);
await caption("planner", "Show the working", "Each issue gets a risk score out of 100 and a confidence level. Open one to see the arithmetic behind it.");
await scrollTo($('section[aria-labelledby="ledger-h"]'), "start", 900);
await click($('section[aria-labelledby="ledger-h"] details summary'), { ms: 700, settle: 500 });
await scrollTo($('section[aria-labelledby="ledger-h"] details[open] [aria-label="Score arithmetic"]'), "center", 900);
await ring($('section[aria-labelledby="ledger-h"] details[open] [aria-label="Score arithmetic"]'), 10);
await hold(s, 6.2);

s = now();
await ring(null);
await caption("planner", "Your weights, tested", "Change how risk is weighed and see how each weighting did against later repairs.");
await scrollTo(`[...document.querySelectorAll('details summary')].find(x=>x.textContent.includes('Change how risk is weighed'))`, "start", 900);
await click(`[...document.querySelectorAll('details summary')].find(x=>x.textContent.includes('Change how risk is weighed'))`, { ms: 650, settle: 500 });
await ring(`[...document.querySelectorAll('details summary')].find(x=>x.textContent.includes('Change how risk is weighed')).parentElement`, 6);
await scrollBy(220, 600);
await hold(s, 4.8);

// Evidence
s = now();
await ring(null);
await caption("evidence", "The evidence behind the plan", "Below the plan, the evidence: where money already went, who did the work, whether it held.");
await scrollTo($('section[aria-labelledby="ev"]'), "center", 900);
await ring($('section[aria-labelledby="ev"]'), 8);
await hold(s, 5.0);

s = now();
await ring(null);
await caption("evidence", "Stop 4 · Grant Road · Contractor scorecards", "Contractor scorecards grade each firm against what is expected for the same work, wards and weather.");
await nextStop("/contractors", 700);
await ring(cardOf("Deccan Paving Solutions"), 8);
await hold(s, 5.6);

s = now();
await ring(null);
await caption("evidence", "Stop 5 · Mumbai Central · Audit", "The audit flags repair bills worth a second look, not proven losses. Every flag lists its jobs.");
await nextStop("/audit", 700);
await ring(cardOf("Billed on repair jobs worth a second look"), 8);
await hold(s, 5.4);

s = now();
await ring(null);
await caption("evidence", "Stop 6 · Dadar · Complaint trail", "Follow any complaint to its repair: who did it, what it cost, and whether it held.");
await nextStop("/complaints", 700);
await waitFor(`__wt.byText('Repaired, and it held', document.querySelector('#main'))`, 20);
await ring(cardOf("Repaired, and it held"), 8);
await hold(s, 5.4);

// Close
s = now();
if (cues.length) cues[cues.length - 1].end = now();
await ring(null);
await ev(`__wt.outro()`);
cues.push({ start: now(), end: null, text: "The planner decides where the next rupee goes. The evidence shows why. All data is synthetic; confirm on site before sending a crew." });
await hold(s, 5.0);
cues[cues.length - 1].end = now();

recording = false;
await send("Page.stopScreencast");
await sleep(300);
ws.close();
chrome.kill();

// ---------- encode ----------
const first = frames[0].ts;
const end = first + cues[cues.length - 1].end;
const lines = [];
frames.forEach((f, i) => {
  const next = i + 1 < frames.length ? frames[i + 1].ts : end;
  lines.push(`file '${f.file}'`, `duration ${Math.max(next - f.ts, 0.001).toFixed(4)}`);
});
lines.push(`file '${frames[frames.length - 1].file}'`);
writeFileSync(path.join(OUT, "frames.txt"), lines.join("\n"));
const fmt = (t) => {
  const ms = Math.max(0, Math.round(t * 1000));
  const h = String(Math.floor(ms / 3600000)).padStart(2, "0");
  const m = String(Math.floor((ms % 3600000) / 60000)).padStart(2, "0");
  const sec = String(Math.floor((ms % 60000) / 1000)).padStart(2, "0");
  return `${h}:${m}:${sec},${String(ms % 1000).padStart(3, "0")}`;
};
writeFileSync(path.join(OUT, "walkthrough.srt"), cues.map((c, i) => `${i + 1}\n${fmt(c.start)} --> ${fmt(c.end ?? now())}\n${c.text}\n`).join("\n"));
execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", path.join(OUT, "frames.txt"), "-vf", "fps=30,scale=1920:1080:flags=lanczos,format=yuv420p", "-c:v", "libx264", "-preset", "slow", "-crf", "20", "-movflags", "+faststart", path.join(OUT, "walkthrough.mp4")]);
console.log(JSON.stringify({ frames: frames.length, seconds: now().toFixed(1), out: path.join(OUT, "walkthrough.mp4") }));
