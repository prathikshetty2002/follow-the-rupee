/**
 * Churchgate station at sunrise, drawn in the Mumbai dawn palette: the long sandstone front with its arcade and pediment,
 * the domed Western Railway headquarters beside it, a local train under the platform canopy, a kaali-peeli taxi and a BEST bus
 * on Veer Nariman Road, palms, Marine Drive's Art Deco blocks and the Nariman Point towers behind.
 * Decorative only, so hidden from assistive tech. Colours come from tokens, so it follows light and dark.
 */

/** Small repeatable random numbers, so the picture is identical on every render. */
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

const GROUND = 930;

function blocks(seed: number, minW: number, maxW: number, minH: number, maxH: number) {
  const r = rng(seed);
  const out: { x: number; w: number; h: number }[] = [];
  let x = -20;
  while (x < 1620) {
    const w = minW + r() * (maxW - minW);
    out.push({ x, w, h: minH + r() * (maxH - minH) });
    x += w + 3;
  }
  return out;
}

const archPath = (x: number, y: number, w: number, h: number) => `M${x} ${y + h} V${y + w / 2} a${w / 2} ${w / 2} 0 0 1 ${w} 0 V${y + h} Z`;

function Palm({ x, lean = 1, s = 1 }: { x: number; lean?: number; s?: number }) {
  const top = [x + 46 * lean * s, GROUND - 330 * s] as const;
  const fronds = [-150, -112, -74, -30, 14, 52, 96, 140].map((a, i) => {
    const r = ((a - 90) * Math.PI) / 180;
    const len = (i % 2 ? 96 : 120) * s;
    const ex = top[0] + Math.cos(r) * len;
    const ey = top[1] + Math.sin(r) * len + 34 * s;
    return `M${top[0]} ${top[1]} Q${(top[0] + ex) / 2} ${top[1] + Math.sin(r) * len * 0.9 - 24 * s} ${ex} ${ey}`;
  });
  return (
    <g>
      <path d={`M${x} ${GROUND} Q${x + 8 * lean * s} ${GROUND - 170 * s} ${top[0]} ${top[1]}`} stroke="var(--ch-trunk)" strokeWidth={11 * s} fill="none" strokeLinecap="round" />
      <g stroke="var(--ch-leaf)" strokeWidth={9 * s} fill="none" strokeLinecap="round">
        {fronds.map((d, i) => (
          <path key={i} d={d} />
        ))}
      </g>
      <g stroke="var(--ch-leaf-dark)" strokeWidth={3 * s} fill="none" strokeLinecap="round" opacity={0.7}>
        {fronds.map((d, i) => (
          <path key={i} d={d} transform={`translate(0 ${4 * s})`} />
        ))}
      </g>
    </g>
  );
}

function Taxi({ x, y }: { x: number; y: number }) {
  return (
    <g>
      <ellipse cx={x + 68} cy={y + 62} rx={74} ry={6} fill="var(--foreground)" opacity={0.18} />
      <rect x={x} y={y + 22} width={136} height={30} rx={9} fill="#1e1d1b" />
      <path d={`M${x + 24} ${y + 22} L${x + 42} ${y} H${x + 94} L${x + 114} ${y + 22} Z`} fill="#f2b705" />
      <path d={`M${x + 33} ${y + 20} L${x + 46} ${y + 5} H${x + 66} V${y + 20} Z M${x + 71} ${y + 5} H${x + 91} L${x + 106} ${y + 20} H${x + 71} Z`} fill="var(--ch-glass)" opacity={0.9} />
      <rect x={x + 56} y={y - 7} width={24} height={7} rx={2} fill="#f2b705" />
      <rect x={x + 125} y={y + 30} width={9} height={6} rx={2} fill="var(--glow)" />
      {[x + 30, x + 106].map((cx) => (
        <g key={cx}>
          <circle cx={cx} cy={y + 52} r={12} fill="#1e1d1b" />
          <circle cx={cx} cy={y + 52} r={5} fill="#8c8f94" />
        </g>
      ))}
    </g>
  );
}

function Bus({ x, y }: { x: number; y: number }) {
  return (
    <g>
      <ellipse cx={x + 100} cy={y + 76} rx={108} ry={6} fill="var(--foreground)" opacity={0.18} />
      <rect x={x} y={y} width={200} height={70} rx={8} fill="#c4382c" />
      <rect x={x} y={y + 46} width={200} height={8} fill="#f6efe4" />
      <rect x={x + 8} y={y + 10} width={184} height={28} rx={3} fill="var(--ch-glass)" opacity={0.92} />
      {[0, 1, 2, 3, 4].map((i) => (
        <rect key={i} x={x + 44 + i * 36} y={y + 10} width={2.5} height={28} fill="#c4382c" />
      ))}
      <rect x={x + 184} y={y + 56} width={12} height={7} rx={2} fill="var(--glow)" />
      <rect x={x + 14} y={y - 6} width={46} height={7} rx={2} fill="#1e1d1b" />
      {[x + 36, x + 160].map((cx) => (
        <g key={cx}>
          <circle cx={cx} cy={y + 68} r={12} fill="#1e1d1b" />
          <circle cx={cx} cy={y + 68} r={5} fill="#8c8f94" />
        </g>
      ))}
    </g>
  );
}

function Person({ x, y, s = 1, tone = 0 }: { x: number; y: number; s?: number; tone?: number }) {
  const fills = ["var(--sky-near)", "var(--accent-ink)", "var(--sea)", "var(--foreground)"];
  return (
    <g fill={fills[tone % fills.length]} opacity={0.88}>
      <circle cx={x} cy={y - 40 * s} r={5.5 * s} />
      <path d={`M${x - 8 * s} ${y - 32 * s} q${8 * s} -4 ${16 * s} 0 l${2 * s} ${20 * s} h${-4 * s} v${14 * s} h${-5 * s} v${-14 * s} h${-2 * s} v${14 * s} h${-5 * s} v${-14 * s} h${-4 * s} Z`} />
    </g>
  );
}

export function Churchgate({ className }: { className?: string }) {
  const far = blocks(11, 26, 56, 70, 230);
  const mid = blocks(29, 46, 92, 120, 250);
  const left = Array.from({ length: 9 }, (_, i) => 316 + i * 70);
  const right = Array.from({ length: 9 }, (_, i) => 1006 + i * 70).filter((x) => x < 1280);
  const dentils = Array.from({ length: 70 }, (_, i) => 300 + i * 14.4);
  const lamps = [250, 600, 1010, 1330, 1500];
  const car = (i: number) => 1316 + i * 190;

  return (
    <svg viewBox="0 0 1600 1000" preserveAspectRatio="xMidYMax slice" aria-hidden="true" focusable="false" className={className}>
      <defs>
        <radialGradient id="ch-sun" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="var(--glow)" stopOpacity="0.85" />
          <stop offset="45%" stopColor="var(--glow)" stopOpacity="0.22" />
          <stop offset="100%" stopColor="var(--glow)" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="ch-door" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--glow)" stopOpacity="0.55" />
          <stop offset="100%" stopColor="var(--ch-dark)" stopOpacity="1" />
        </linearGradient>
        <linearGradient id="ch-haze" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--card)" stopOpacity="0" />
          <stop offset="100%" stopColor="var(--card)" stopOpacity="0.55" />
        </linearGradient>
      </defs>

      <circle cx="1160" cy="700" r="420" fill="url(#ch-sun)" className="ch-pulse" />
      <circle cx="1160" cy="690" r="54" fill="var(--glow)" opacity="0.9" />

      <g fill="var(--card)" opacity="0.55" className="ch-drift">
        <ellipse cx="260" cy="150" rx="150" ry="22" />
        <ellipse cx="350" cy="132" rx="90" ry="18" />
        <ellipse cx="1180" cy="110" rx="130" ry="20" />
        <ellipse cx="1260" cy="94" rx="70" ry="14" />
        <ellipse cx="720" cy="230" rx="110" ry="16" />
      </g>

      {/* Nariman Point towers, then Marine Drive's Art Deco blocks */}
      <g fill="var(--sky-far)">
        {far.map((b, i) => (
          <rect key={i} x={b.x} y={GROUND - b.h} width={b.w} height={b.h + 4} />
        ))}
      </g>
      <g fill="var(--sky-mid)">
        {mid.map((b, i) => (
          <g key={i}>
            <rect x={b.x} y={GROUND - b.h} width={b.w} height={b.h + 4} />
            {i % 3 === 1 && <rect x={b.x + b.w * 0.3} y={GROUND - b.h - 22} width={b.w * 0.4} height={22} />}
          </g>
        ))}
      </g>
      <g fill="var(--card)" opacity="0.28">
        {mid.flatMap((b, i) => [0.3, 0.5, 0.7].map((f) => <rect key={`${i}-${f}`} x={b.x} y={GROUND - b.h * f} width={b.w} height={3} />))}
      </g>
      <rect x="0" y={GROUND - 260} width="1600" height="270" fill="url(#ch-haze)" />

      {/* Western Railway headquarters, with its dome */}
      <g>
        <rect x="70" y="760" width="250" height={GROUND - 760} fill="var(--ch-shade)" />
        <rect x="80" y="746" width="230" height="16" fill="var(--ch-trim)" />
        <rect x="130" y="690" width="130" height="58" fill="var(--ch-wall)" />
        <path d={archPath(140, 700, 24, 46)} fill="var(--ch-glass)" />
        <path d={archPath(184, 700, 24, 46)} fill="var(--ch-glass)" />
        <path d={archPath(228, 700, 24, 46)} fill="var(--ch-glass)" />
        <rect x="136" y="680" width="118" height="12" fill="var(--ch-trim)" />
        <path d="M146 680 A49 49 0 0 1 244 680 Z" fill="var(--ch-wall)" />
        <path d="M146 680 A49 49 0 0 1 244 680 Z" fill="var(--ch-trim)" opacity="0.3" />
        <rect x="193" y="606" width="4" height="26" fill="var(--ch-trim)" />
        <circle cx="195" cy="604" r="5" fill="var(--glow)" />
        {[100, 266].map((x) => (
          <g key={x}>
            <rect x={x} y="718" width="28" height="30" fill="var(--ch-wall)" />
            <path d={`M${x} 718 A14 14 0 0 1 ${x + 28} 718 Z`} fill="var(--ch-trim)" />
          </g>
        ))}
        {[92, 140, 188, 236].map((x) => (
          <path key={x} d={archPath(x, 790, 26, 124)} fill="var(--ch-dark)" opacity="0.55" />
        ))}
        {[92, 140, 188, 236].map((x) => (
          <path key={`w${x}`} d={archPath(x, 772, 26, 34)} fill="var(--ch-glass)" opacity="0.9" />
        ))}
      </g>

      {/* the station front */}
      <rect x="296" y="738" width="1016" height={GROUND - 738} fill="var(--ch-wall)" />
      <rect x="296" y="738" width="344" height={GROUND - 738} fill="var(--ch-shade)" opacity="0.28" />
      <rect x="960" y="738" width="352" height={GROUND - 738} fill="var(--ch-shade)" opacity="0.28" />
      <rect x="286" y="716" width="1036" height="26" fill="var(--ch-trim)" />
      {dentils.slice(0, 70).map((x, i) => (
        <rect key={i} x={x} y="742" width="7" height="8" fill="var(--ch-shade)" />
      ))}
      <rect x="286" y={GROUND - 24} width="1036" height="26" fill="var(--ch-shade)" />

      {/* upper windows and the ground floor arcade, left and right of the entrance */}
      {[...left, ...right].map((x) => (
        <g key={x}>
          <path d={archPath(x, 772, 34, 62)} fill="var(--ch-glass)" />
          <path d={archPath(x, 772, 34, 62)} fill="none" stroke="var(--ch-trim)" strokeWidth="4" />
          <rect x={x + 16} y="772" width="2.4" height="62" fill="var(--ch-trim)" />
          <path d={archPath(x - 2, 858, 38, 72)} fill="var(--ch-dark)" opacity="0.85" />
          <path d={archPath(x - 2, 858, 38, 72)} fill="none" stroke="var(--ch-trim)" strokeWidth="4" />
        </g>
      ))}

      {/* entrance: pediment with clock, columns, lit arches */}
      <polygon points="626,718 800,612 974,718" fill="var(--ch-trim)" />
      <polygon points="664,712 800,630 936,712" fill="var(--ch-wall)" />
      <circle cx="800" cy="672" r="25" fill="var(--card)" stroke="var(--ch-shade)" strokeWidth="5" />
      <path d="M800 672 V654 M800 672 L813 679" stroke="var(--foreground)" strokeWidth="3" strokeLinecap="round" />
      <rect x="796" y="592" width="8" height="22" fill="var(--ch-trim)" />
      <path d="M804 594 h30 v14 h-30 z" fill="var(--accent)" />
      <rect x="626" y="716" width="348" height={GROUND - 716} fill="var(--ch-wall)" />
      <rect x="690" y="726" width="220" height="30" rx="3" fill="var(--foreground)" opacity="0.88" />
      <text x="800" y="747" textAnchor="middle" fontSize="19" fontWeight="700" letterSpacing="5" fill="var(--background)" fontFamily="var(--font-instrument-sans), system-ui, sans-serif">
        CHURCHGATE
      </text>
      {[660, 764, 836, 940].map((x, i) => (
        <rect key={x} x={x - (i === 0 || i === 3 ? 12 : 8)} y="760" width={i === 0 || i === 3 ? 24 : 16} height={GROUND - 760} fill="var(--ch-trim)" />
      ))}
      {[672, 752, 832].map((x) => (
        <g key={x}>
          <path d={archPath(x, 790, 64, 140)} fill="url(#ch-door)" />
          <path d={archPath(x, 790, 64, 140)} fill="none" stroke="var(--ch-trim)" strokeWidth="6" />
        </g>
      ))}
      <Person x={705} y={GROUND} s={1.35} tone={1} />
      <Person x={787} y={GROUND} s={1.4} tone={0} />
      <Person x={868} y={GROUND} s={1.3} tone={2} />

      {/* platform canopy and a local train */}
      <g>
        <rect x="1312" y="750" width="300" height={GROUND - 750} fill="var(--ch-shade)" opacity="0.4" />
        <g className="ch-train">
          {[0, 1, 2].map((i) => (
            <g key={i}>
              <rect x={car(i)} y="826" width="182" height="74" rx="9" fill="var(--card)" />
              <rect x={car(i)} y="868" width="182" height="11" fill="var(--sea-fill)" />
              <rect x={car(i)} y="880" width="182" height="4" fill="var(--accent)" />
              {[0, 1, 2, 3].map((w) => (
                <rect key={w} x={car(i) + 12 + w * 42} y="838" width="30" height="26" rx="3" fill="var(--ch-glass)" />
              ))}
              <rect x={car(i)} y="900" width="182" height="8" fill="var(--foreground)" opacity="0.55" />
            </g>
          ))}
          <rect x="1304" y="840" width="12" height="9" rx="2" fill="var(--glow)" />
        </g>
        <polygon points="1290,772 1610,744 1610,776 1290,806" fill="var(--foreground)" opacity="0.78" />
        <polygon points="1290,806 1610,776 1610,784 1290,814" fill="var(--ch-shade)" />
        {[1340, 1450, 1560].map((x) => (
          <rect key={x} x={x} y="806" width="8" height={GROUND - 806} fill="var(--foreground)" opacity="0.6" />
        ))}
      </g>

      {/* Marine Drive palms */}
      <Palm x={150} lean={-1} s={1} />
      <Palm x={1498} lean={1} s={1.1} />
      <Palm x={1080} lean={1} s={0.7} />

      {/* the road, with a kaali-peeli taxi and a BEST bus */}
      <rect x="0" y={GROUND} width="1600" height="70" fill="var(--ch-road)" />
      <rect x="0" y={GROUND} width="1600" height="6" fill="var(--ch-shade)" />
      <g fill="var(--card)" opacity="0.75">
        {Array.from({ length: 14 }, (_, i) => (
          <rect key={i} x={i * 120 + 30} y="986" width="62" height="4" rx="2" />
        ))}
      </g>
      <g className="ch-vehicle">
        <Bus x={520} y={900} />
      </g>
      <Taxi x={300} y={926} />
      <Taxi x={1180} y={934} />

      {lamps.map((x) => (
        <g key={x}>
          <rect x={x} y="760" width="5" height={GROUND - 760} fill="var(--foreground)" opacity="0.7" />
          <circle cx={x + 2.5} cy="756" r="9" fill="var(--glow)" opacity="0.9" />
          <circle cx={x + 2.5} cy="756" r="26" fill="var(--glow)" opacity="0.16" />
        </g>
      ))}

      <g fill="none" stroke="var(--sky-near)" strokeWidth="2.4" strokeLinecap="round">
        <path d="M170 360 q8 -10 16 0 q8 -10 16 0" />
        <path d="M250 320 q7 -9 14 0 q7 -9 14 0" />
        <path d="M120 290 q6 -8 12 0 q6 -8 12 0" />
        <path d="M1400 380 q7 -9 14 0 q7 -9 14 0" />
        <path d="M1470 330 q6 -8 12 0 q6 -8 12 0" />
      </g>
    </svg>
  );
}
