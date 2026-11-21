/**
 * A quiet illustration of Mumbai at dawn, in three soft tones: Rajabai Tower, CST's dome, the Gateway of India,
 * the Bandra-Worli Sea Link, and the Marine Drive "Queen's Necklace" of lights. Decorative only, so hidden from assistive tech.
 * Colours come from the theme tokens, so it follows light and dark.
 */

/** Small repeatable random numbers, so the skyline is identical on every render. */
function rng(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const SEA = 262; // y of the horizon

function towers(seed: number, minW: number, maxW: number, minH: number, maxH: number, skip: [number, number][]) {
  const r = rng(seed);
  const out: { x: number; w: number; h: number }[] = [];
  let x = -10;
  while (x < 1210) {
    const w = minW + r() * (maxW - minW);
    const h = minH + r() * (maxH - minH);
    if (!skip.some(([a, b]) => x + w > a && x < b)) out.push({ x, w, h });
    x += w + 2;
  }
  return out;
}

/** Points on the Marine Drive curve, for the string of lights. */
function necklace(n: number) {
  const [x0, y0, cx, cy, x1, y1] = [-10, 306, 330, 238, 700, 306];
  return Array.from({ length: n + 1 }, (_, i) => {
    const t = i / n;
    return { x: (1 - t) ** 2 * x0 + 2 * (1 - t) * t * cx + t ** 2 * x1, y: (1 - t) ** 2 * y0 + 2 * (1 - t) * t * cy + t ** 2 * y1 };
  });
}

export function MumbaiSkyline({ className }: { className?: string }) {
  const landmarks: [number, number][] = [
    [220, 280],
    [350, 530],
    [590, 710],
  ];
  const far = towers(7, 22, 50, 34, 104, []);
  const mid = towers(21, 34, 70, 56, 138, [...landmarks, [780, 1200]]);
  const lights = necklace(34);
  const cables = (tx: number) =>
    Array.from({ length: 8 }, (_, i) => [
      <line key={`l${i}`} x1={tx} y1={112 + i * 11} x2={tx - (36 + i * 22)} y2={SEA - 28} />,
      <line key={`r${i}`} x1={tx} y1={112 + i * 11} x2={tx + (36 + i * 22)} y2={SEA - 28} />,
    ]);
  return (
    <svg viewBox="0 0 1200 320" preserveAspectRatio="xMidYMax slice" aria-hidden="true" focusable="false" className={className}>
      <defs>
        <radialGradient id="mumbai-sun" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="var(--glow)" stopOpacity="0.7" />
          <stop offset="55%" stopColor="var(--glow)" stopOpacity="0.18" />
          <stop offset="100%" stopColor="var(--glow)" stopOpacity="0" />
        </radialGradient>
      </defs>

      <circle cx="900" cy={SEA - 14} r="170" fill="url(#mumbai-sun)" />

      {/* soft clouds */}
      <g fill="var(--card)" opacity="0.5">
        <ellipse cx="170" cy="62" rx="96" ry="15" />
        <ellipse cx="226" cy="52" rx="58" ry="13" />
        <ellipse cx="760" cy="40" rx="80" ry="12" />
        <ellipse cx="820" cy="32" rx="46" ry="10" />
      </g>

      {/* far and middle skyline */}
      <g fill="var(--sky-far)">
        {far.map((t, i) => (
          <rect key={i} x={t.x} y={SEA - t.h} width={t.w} height={t.h + 2} />
        ))}
      </g>
      <g fill="var(--sky-mid)">
        {mid.map((t, i) => (
          <g key={i}>
            <rect x={t.x} y={SEA - t.h} width={t.w} height={t.h + 2} />
            {i % 3 === 0 && <rect x={t.x + t.w / 2 - 1.5} y={SEA - t.h - 14} width={3} height={14} />}
          </g>
        ))}
      </g>

      {/* landmarks, nearest tone */}
      <g fill="var(--sky-near)">
        {/* Rajabai Tower */}
        <rect x="226" y="186" width="48" height={SEA - 186 + 2} />
        <rect x="236" y="110" width="28" height="78" />
        <rect x="240" y="78" width="20" height="34" />
        <polygon points="237,78 250,40 263,78" />
        <rect x="249" y="26" width="2" height="16" />
        <rect x="230" y="168" width="7" height="20" />
        <rect x="263" y="168" width="7" height="20" />
        <polygon points="229,168 233.5,156 238,168" />
        <polygon points="262,168 266.5,156 271,168" />
        {/* CST */}
        <rect x="362" y="216" width="160" height={SEA - 216 + 2} />
        <rect x="426" y="190" width="28" height="28" />
        <path d="M426 190 A14 14 0 0 1 454 190 Z" />
        <rect x="439" y="162" width="2" height="14" />
        <rect x="368" y="196" width="14" height="22" />
        <polygon points="367,196 375,180 383,196" />
        <rect x="502" y="196" width="14" height="22" />
        <polygon points="501,196 509,180 517,196" />
        {/* Gateway of India, with its arch cut out */}
        <path d="M600 262 V188 H700 V262 H664 V222 A14 14 0 0 0 636 222 V262 Z" />
        <rect x="596" y="180" width="108" height="9" />
        <rect x="632" y="164" width="36" height="16" />
        <path d="M632 164 A18 18 0 0 1 668 164 Z" />
        <rect x="649" y="138" width="2" height="12" />
        <rect x="602" y="162" width="16" height="19" />
        <path d="M602 162 A8 8 0 0 1 618 162 Z" />
        <rect x="682" y="162" width="16" height="19" />
        <path d="M682 162 A8 8 0 0 1 698 162 Z" />
      </g>
      <g fill="var(--sea-band)" opacity="0.55">
        <rect x="372" y="206" width="3" height="10" />
        <rect x="396" y="226" width="3" height="14" />
        <rect x="480" y="226" width="3" height="14" />
        <rect x="506" y="206" width="3" height="10" />
      </g>

      {/* the sea */}
      <rect x="0" y={SEA} width="1200" height="60" fill="var(--sea-band)" />
      <g fill="var(--card)" opacity="0.5">
        <rect x="40" y="274" width="160" height="1.6" />
        <rect x="700" y="270" width="120" height="1.6" />
        <rect x="260" y="290" width="220" height="1.6" />
        <rect x="900" y="286" width="190" height="1.6" />
        <rect x="560" y="302" width="150" height="1.6" />
      </g>
      <g fill="var(--glow)" opacity="0.5">
        <rect x="868" y={SEA + 6} width="64" height="2" />
        <rect x="878" y={SEA + 14} width="44" height="2" />
        <rect x="886" y={SEA + 22} width="28" height="2" />
        <rect x="892" y={SEA + 30} width="16" height="2" />
      </g>

      {/* Bandra-Worli Sea Link */}
      <g fill="var(--sky-near)">
        <rect x="800" y={SEA - 28} width="410" height="5" />
        {Array.from({ length: 8 }, (_, i) => (
          <rect key={i} x={812 + i * 52} y={SEA - 23} width="3" height="26" />
        ))}
      </g>
      <g fill="none" stroke="var(--sky-near)" strokeLinejoin="round">
        <path d="M948 258 L960 92 L972 258" strokeWidth="5" />
        <path d="M1108 258 L1120 92 L1132 258" strokeWidth="5" />
        <rect x="953" y="168" width="14" height="3" fill="var(--sky-near)" stroke="none" />
        <rect x="1113" y="168" width="14" height="3" fill="var(--sky-near)" stroke="none" />
      </g>
      <g stroke="var(--sky-near)" strokeWidth="1.2" opacity="0.7">
        {cables(960)}
        {cables(1120)}
      </g>

      {/* Marine Drive: the Queen's Necklace */}
      <path d={`M-10 306 Q330 238 700 306`} fill="none" stroke="var(--sky-near)" strokeWidth="1.4" opacity="0.55" />
      <g fill="var(--glow)">
        {lights.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r="2.6" opacity={0.95} />
        ))}
      </g>

      {/* gulls */}
      <g fill="none" stroke="var(--sky-near)" strokeWidth="1.8" strokeLinecap="round">
        <path d="M760 108 q6 -8 12 0 q6 -8 12 0" />
        <path d="M812 84 q5 -7 10 0 q5 -7 10 0" />
        <path d="M730 70 q4 -6 8 0 q4 -6 8 0" />
      </g>
    </svg>
  );
}
