// Injected into every page during recording: captions, a fake cursor, a highlight ring and the closing card.
(() => {
  if (window.__wt) return;
  const css = `
#wt-root{position:fixed;inset:0;pointer-events:none;z-index:2147483000;font-family:var(--font-instrument-sans),system-ui,sans-serif}
#wt-ring{position:fixed;border:4px solid #f28a24;border-radius:20px;box-shadow:0 0 0 7px rgba(242,138,36,.22),0 0 34px rgba(242,138,36,.45);opacity:0;transition:opacity .35s ease,left .45s cubic-bezier(.23,1,.32,1),top .45s cubic-bezier(.23,1,.32,1),width .45s cubic-bezier(.23,1,.32,1),height .45s cubic-bezier(.23,1,.32,1)}
#wt-cursor{position:fixed;left:720px;top:420px;width:30px;height:30px;transition-property:left,top;transition-timing-function:cubic-bezier(.45,0,.2,1);filter:drop-shadow(0 3px 6px rgba(0,0,0,.35))}
.wt-ripple{position:fixed;width:16px;height:16px;margin:-8px 0 0 -8px;border-radius:50%;border:3px solid #f28a24;animation:wt-rip .6s ease-out forwards}
@keyframes wt-rip{from{transform:scale(.6);opacity:1}to{transform:scale(3.4);opacity:0}}
#wt-cap{position:fixed;left:28px;bottom:28px;max-width:860px;background:rgba(30,29,27,.95);color:#fff;border-radius:24px;padding:16px 26px 20px;box-shadow:0 18px 50px rgba(0,0,0,.28);opacity:0;transform:translateY(12px);transition:opacity .3s ease,transform .3s ease}
#wt-cap.on{opacity:1;transform:none}
#wt-chap{display:flex;gap:6px;margin-bottom:10px}
#wt-chap span{font-size:12.5px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;padding:4px 11px;border-radius:999px;background:rgba(255,255,255,.1);color:rgba(255,255,255,.62)}
#wt-chap span.a-map{background:#bfe3ef;color:#0f3442}
#wt-chap span.a-planner{background:#f28a24;color:#1e1d1b}
#wt-chap span.a-evidence{background:#5ec8e5;color:#0d2a35}
#wt-tag{font-size:14px;font-weight:700;letter-spacing:.07em;text-transform:uppercase;color:#ffb067;margin-bottom:5px}
#wt-text{font-size:25px;line-height:1.38;font-weight:500}
#wt-out{position:fixed;inset:0;display:grid;place-items:center;background:rgba(251,247,241,.95);opacity:0;transition:opacity .6s ease;text-align:center;color:#1e1d1b}
#wt-out.on{opacity:1}
#wt-out img{width:120px;height:auto;margin:0 auto 18px}
#wt-out h2{font-family:var(--font-instrument-serif),Georgia,serif;font-weight:400;font-size:64px;line-height:1.05;letter-spacing:-.02em;margin:0}
#wt-out h2 em{color:#cc5a08}
#wt-out p{margin:22px auto 0;max-width:760px;font-size:21px;color:#5b5e63;line-height:1.45}
#wt-out .pills{margin-top:26px;display:flex;gap:10px;justify-content:center}
#wt-out .pills span{font-size:14px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;padding:7px 15px;border-radius:999px}
`;
  const CHAPTERS = [
    ["map", "1 · Map"],
    ["planner", "2 · Planner · main tool"],
    ["evidence", "3 · Evidence"],
  ];
  let target = null;
  let pad = 10;
  function mount() {
    if (document.getElementById("wt-root")) return;
    const style = document.createElement("style");
    style.textContent = css;
    document.head.appendChild(style);
    const root = document.createElement("div");
    root.id = "wt-root";
    root.innerHTML = `<div id="wt-ring"></div><div id="wt-cap"><div id="wt-chap"></div><div id="wt-tag"></div><div id="wt-text"></div></div>
<div id="wt-out"><div><img src="/logo.png" alt=""><h2>The planner decides where<br>the <em>next rupee</em> goes.</h2><h2 style="margin-top:6px">The evidence shows <em>why</em>.</h2>
<p>All data is synthetic. A ranking says where to look first, so confirm on site before sending a crew.</p>
<div class="pills"><span style="background:#f28a24">Next Rupee Planner</span><span style="background:#bfe3ef">Audit</span><span style="background:#bfe3ef">Contractors</span><span style="background:#bfe3ef">Complaint trail</span></div></div></div>
<svg id="wt-cursor" viewBox="0 0 24 24"><path d="M4 2.5l15.5 9.2-6.9 1.5 3.9 7.4-3 1.6-3.9-7.5-5.6 4.6z" fill="#fff" stroke="#1e1d1b" stroke-width="1.6" stroke-linejoin="round"/></svg>`;
    document.body.appendChild(root);
    const tick = () => {
      const ring = document.getElementById("wt-ring");
      if (ring && target && target.isConnected) {
        const r = target.getBoundingClientRect();
        ring.style.left = r.left - pad + "px";
        ring.style.top = r.top - pad + "px";
        ring.style.width = r.width + pad * 2 + "px";
        ring.style.height = r.height + pad * 2 + "px";
        ring.style.opacity = "1";
      } else if (ring) ring.style.opacity = "0";
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }
  /** The smallest element holding `text`, then its nearest card-like ancestor. */
  function byText(text, scope = document, sel = "*") {
    const all = [...scope.querySelectorAll(sel)].filter((e) => e.textContent && e.textContent.includes(text));
    all.sort((a, b) => a.textContent.length - b.textContent.length);
    return all[0] || null;
  }
  function card(el) {
    let e = el;
    while (e && e !== document.body) {
      const c = e.className && typeof e.className === "string" ? e.className : "";
      if (/rounded/.test(c) && /(border|bg-|soft)/.test(c)) return e;
      e = e.parentElement;
    }
    return el;
  }
  window.__wt = {
    mount,
    byText,
    card,
    caption(chapter, tag, text) {
      mount();
      const cap = document.getElementById("wt-cap");
      cap.classList.remove("on");
      setTimeout(() => {
        document.getElementById("wt-chap").innerHTML = CHAPTERS.map(([k, l]) => `<span class="${k === chapter ? "a-" + k : ""}">${l}</span>`).join("");
        document.getElementById("wt-tag").textContent = tag;
        document.getElementById("wt-text").textContent = text;
        cap.classList.add("on");
      }, 180);
    },
    ring(el, p = 10) {
      mount();
      target = el || null;
      pad = p;
    },
    cursor(x, y, ms) {
      mount();
      const c = document.getElementById("wt-cursor");
      c.style.transitionDuration = ms + "ms";
      c.style.left = x - 5 + "px";
      c.style.top = y - 3 + "px";
    },
    ripple(x, y) {
      const r = document.createElement("div");
      r.className = "wt-ripple";
      r.style.left = x + "px";
      r.style.top = y + "px";
      document.getElementById("wt-root").appendChild(r);
      setTimeout(() => r.remove(), 700);
    },
    outro() {
      mount();
      document.getElementById("wt-cap").classList.remove("on");
      target = null;
      document.getElementById("wt-out").classList.add("on");
      document.getElementById("wt-cursor").style.opacity = "0";
    },
  };
  if (document.body) mount();
  else document.addEventListener("DOMContentLoaded", mount);
})();
