/**
 * The BMC head office at sunrise, drawn in the Mumbai dawn palette: the Victorian Gothic front opposite CST with its tall
 * central tower and pointed crown, corner turrets, banded stone and pointed arches, the statue in front, gulmohar trees,
 * a BEST bus and kaali-peeli taxis on the road, and Marine Drive's Art Deco blocks and the Nariman Point towers behind.
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


function Gulmohar({ x, s = 1 }: { x: number; s?: number }) {
  const blobs = [[0, -250, 78], [-70, -210, 62], [72, -214, 64], [-34, -300, 56], [40, -296, 54], [0, -190, 58]] as const;
  const flowers = [[-60, -250], [-20, -310], [34, -276], [68, -226], [-82, -204], [10, -226], [48, -330]] as const;
  return (
    <g>
      <path d={`M${x} ${GROUND} Q${x - 6 * s} ${GROUND - 120 * s} ${x + 4 * s} ${GROUND - 200 * s}`} stroke="var(--ch-trunk)" strokeWidth={16 * s} fill="none" strokeLinecap="round" />
      <path d={`M${x + 2 * s} ${GROUND - 150 * s} q${34 * s} ${-26 * s} ${60 * s} ${-60 * s} M${x} ${GROUND - 140 * s} q${-30 * s} ${-26 * s} ${-54 * s} ${-64 * s}`} stroke="var(--ch-trunk)" strokeWidth={8 * s} fill="none" strokeLinecap="round" />
      <g fill="var(--ch-leaf)">
        {blobs.map(([dx, dy, r], i) => (
          <circle key={i} cx={x + dx * s} cy={GROUND + dy * s} r={r * s} />
        ))}
      </g>
      <g fill="var(--ch-leaf-dark)" opacity={0.45}>
        {blobs.map(([dx, dy, r], i) => (
          <circle key={i} cx={x + dx * s + 14 * s} cy={GROUND + dy * s + 18 * s} r={r * s * 0.7} />
        ))}
      </g>
      <g fill="var(--glow)" opacity={0.95}>
        {flowers.map(([dx, dy], i) => (
          <circle key={i} cx={x + dx * s} cy={GROUND + dy * s} r={9 * s} />
        ))}
      </g>
    </g>
  );
}

/** A pointed (Gothic) arch, filled by the caller. */
const pointed = (x: number, y: number, w: number, h: number) => `M${x} ${y + h} V${y + w * 0.62} Q${x} ${y + w * 0.12} ${x + w / 2} ${y} Q${x + w} ${y + w * 0.12} ${x + w} ${y + w * 0.62} V${y + h} Z`;

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

export function BmcOffice({ className }: { className?: string }) {
  const far = blocks(11, 26, 56, 70, 230);
  const mid = blocks(29, 46, 92, 120, 250);
  const wing = (x0: number, n: number) => Array.from({ length: n }, (_, i) => x0 + i * 60);
  const left = wing(352, 4);
  const right = wing(1018, 4);
  const crenels = (x0: number, x1: number, y: number) => Array.from({ length: Math.floor((x1 - x0) / 22) }, (_, i) => <rect key={`${x0}-${i}`} x={x0 + i * 22} y={y} width={12} height={12} fill="var(--ch-trim)" />);

  return (
    <svg viewBox="0 170 1600 830" preserveAspectRatio="xMidYMax slice" aria-hidden="true" focusable="false" className={className}>
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

      <circle cx="1240" cy="700" r="420" fill="url(#ch-sun)" className="ch-pulse" />
      <circle cx="1240" cy="690" r="54" fill="var(--glow)" opacity="0.9" />

      <g fill="var(--card)" opacity="0.55" className="ch-drift">
        <ellipse cx="240" cy="150" rx="150" ry="22" />
        <ellipse cx="330" cy="132" rx="90" ry="18" />
        <ellipse cx="1240" cy="110" rx="130" ry="20" />
        <ellipse cx="1320" cy="94" rx="70" ry="14" />
        <ellipse cx="560" cy="250" rx="110" ry="16" />
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

      {/* the wings: banded stone, pointed windows, an arcade below, a crenellated parapet */}
      {[
        [300, 600],
        [1000, 1300],
      ].map(([x0, x1]) => (
        <g key={x0}>
          <rect x={x0} y="706" width={x1 - x0} height={GROUND - 706} fill="var(--ch-wall)" />
          <rect x={x0} y="706" width={x1 - x0} height={GROUND - 706} fill="var(--ch-shade)" opacity="0.25" />
          <rect x={x0 - 8} y="690" width={x1 - x0 + 16} height="20" fill="var(--ch-trim)" />
          {crenels(x0 - 4, x1 + 4, 678)}
          {[752, 806].map((y) => (
            <rect key={y} x={x0} y={y} width={x1 - x0} height="8" fill="var(--ch-shade)" opacity="0.55" />
          ))}
        </g>
      ))}
      {[...left, ...right].map((x) => (
        <g key={x}>
          <path d={pointed(x, 724, 34, 74)} fill="var(--ch-glass)" />
          <path d={pointed(x, 724, 34, 74)} fill="none" stroke="var(--ch-trim)" strokeWidth="4" />
          <rect x={x + 16} y="740" width="2.4" height="58" fill="var(--ch-trim)" />
          <path d={pointed(x - 4, 828, 42, 102)} fill="var(--ch-dark)" opacity="0.88" />
          <path d={pointed(x - 4, 828, 42, 102)} fill="none" stroke="var(--ch-trim)" strokeWidth="4" />
        </g>
      ))}

      {/* corner pavilions with pointed roofs */}
      {[
        [244, 316],
        [1284, 1356],
      ].map(([x0, x1]) => {
        const mx = (x0 + x1) / 2;
        return (
          <g key={x0}>
            <rect x={x0} y="650" width={x1 - x0} height={GROUND - 650} fill="var(--ch-wall)" />
            <rect x={x0} y="650" width={x1 - x0} height={GROUND - 650} fill="var(--ch-shade)" opacity="0.35" />
            <rect x={x0 - 6} y="636" width={x1 - x0 + 12} height="16" fill="var(--ch-trim)" />
            <polygon points={`${x0 - 4},636 ${mx},548 ${x1 + 4},636`} fill="var(--ch-shade)" />
            <polygon points={`${mx},548 ${x1 + 4},636 ${mx + 10},636`} fill="var(--ch-dark)" opacity="0.4" />
            <rect x={mx - 1.5} y="520" width="3" height="30" fill="var(--ch-trim)" />
            <path d={pointed(mx - 14, 676, 28, 70)} fill="var(--ch-glass)" />
            <path d={pointed(mx - 16, 800, 32, 130)} fill="var(--ch-dark)" opacity="0.88" />
          </g>
        );
      })}

      {/* inner turrets */}
      {[
        [596, 668],
        [932, 1004],
      ].map(([x0, x1]) => {
        const mx = (x0 + x1) / 2;
        return (
          <g key={x0}>
            <rect x={x0} y="560" width={x1 - x0} height={GROUND - 560} fill="var(--ch-wall)" />
            <rect x={x0} y="560" width={x1 - x0} height={GROUND - 560} fill="var(--ch-shade)" opacity="0.3" />
            <rect x={x0 - 6} y="546" width={x1 - x0 + 12} height="16" fill="var(--ch-trim)" />
            <polygon points={`${x0 - 4},546 ${mx},430 ${x1 + 4},546`} fill="var(--ch-shade)" />
            <polygon points={`${mx},430 ${x1 + 4},546 ${mx + 12},546`} fill="var(--ch-dark)" opacity="0.4" />
            <rect x={mx - 1.5} y="398" width="3" height="34" fill="var(--ch-trim)" />
            <circle cx={mx} cy="396" r="5" fill="var(--glow)" />
            {[590, 668, 746].map((y) => (
              <path key={y} d={pointed(mx - 12, y, 24, 56)} fill="var(--ch-glass)" />
            ))}
          </g>
        );
      })}

      {/* the central tower: clock, belfry, tall pointed crown */}
      <rect x="690" y="640" width="220" height={GROUND - 640} fill="var(--ch-wall)" />
      <rect x="690" y="640" width="220" height={GROUND - 640} fill="var(--ch-shade)" opacity="0.15" />
      <rect x="680" y="626" width="240" height="18" fill="var(--ch-trim)" />
      {crenels(684, 916, 614)}
      <rect x="722" y="440" width="156" height="190" fill="var(--ch-wall)" />
      <rect x="722" y="440" width="78" height="190" fill="var(--ch-shade)" opacity="0.22" />
      <rect x="712" y="430" width="176" height="14" fill="var(--ch-trim)" />
      <circle cx="800" cy="520" r="34" fill="var(--card)" stroke="var(--ch-trim)" strokeWidth="6" />
      <path d="M800 520 V496 M800 520 L818 530" stroke="var(--foreground)" strokeWidth="3.4" strokeLinecap="round" />
      {[742, 774, 806, 838].map((x) => (
        <path key={x} d={pointed(x, 568, 22, 52)} fill="var(--ch-glass)" />
      ))}
      <rect x="716" y="596" width="168" height="8" fill="var(--ch-trim)" />
      <path d="M730 430 Q730 340 800 250 Q870 340 870 430 Z" fill="var(--ch-shade)" />
      <path d="M800 250 Q870 340 870 430 H800 Z" fill="var(--ch-dark)" opacity="0.38" />
      <path d="M730 430 Q730 340 800 250" fill="none" stroke="var(--ch-trim)" strokeWidth="3" />
      {[[722, 424], [878, 424]].map(([x, y]) => (
        <g key={x}>
          <rect x={x - 6} y={y - 52} width="12" height="56" fill="var(--ch-trim)" />
          <polygon points={`${x - 8},${y - 52} ${x},${y - 80} ${x + 8},${y - 52}`} fill="var(--ch-shade)" />
        </g>
      ))}
      <rect x="798" y="196" width="4" height="58" fill="var(--ch-trim)" />
      <circle cx="800" cy="192" r="6" fill="var(--glow)" />
      <path d="M802 198 h38 l-8 9 l8 9 h-38 z" fill="var(--accent)" />

      {/* the entrance: a big pointed arch, lit, with steps */}
      <path d={pointed(750, 760, 100, 170)} fill="url(#ch-door)" />
      <path d={pointed(750, 760, 100, 170)} fill="none" stroke="var(--ch-trim)" strokeWidth="8" />
      <path d={pointed(734, 744, 132, 186)} fill="none" stroke="var(--ch-trim)" strokeWidth="5" opacity="0.8" />
      <rect x="716" y="672" width="168" height="34" rx="4" fill="var(--foreground)" opacity="0.9" />
      <text x="800" y="694" textAnchor="middle" fontSize="14.5" fontWeight="700" letterSpacing="2.2" fill="var(--background)" fontFamily="var(--font-instrument-sans), system-ui, sans-serif">
        BMC HEAD OFFICE
      </text>
      {[0, 1, 2].map((i) => (
        <rect key={i} x={716 - i * 14} y={GROUND - 6 - i * 0} width={168 + i * 28} height={6 + i * 4} fill="var(--ch-shade)" opacity={0.9 - i * 0.2} />
      ))}
      <rect x="300" y={GROUND - 22} width="1000" height="24" fill="var(--ch-shade)" opacity="0.6" />

      <Person x={776} y={GROUND} s={1.45} tone={1} />
      <Person x={824} y={GROUND} s={1.4} tone={2} />

      {/* the statue of Sir Pherozeshah Mehta, in front of the building */}
      <g>
        <rect x="1100" y="868" width="46" height="62" fill="var(--ch-trim)" />
        <rect x="1094" y="860" width="58" height="12" fill="var(--ch-shade)" />
        <rect x="1094" y="926" width="58" height="8" fill="var(--ch-shade)" />
        <g fill="var(--foreground)" opacity="0.75">
          <circle cx="1123" cy="810" r="9" />
          <path d="M1108 862 q-2 -36 6 -44 h18 q8 8 6 44 Z" />
        </g>
      </g>

      <Gulmohar x={150} s={1.05} />
      <Gulmohar x={1470} s={1.15} />

      {/* the road, with a BEST bus and kaali-peeli taxis */}
      <rect x="0" y={GROUND} width="1600" height="70" fill="var(--ch-road)" />
      <rect x="0" y={GROUND} width="1600" height="6" fill="var(--ch-shade)" />
      <g fill="var(--card)" opacity="0.75">
        {Array.from({ length: 14 }, (_, i) => (
          <rect key={i} x={i * 120 + 30} y="986" width="62" height="4" rx="2" />
        ))}
      </g>
      <g className="ch-vehicle">
        <Bus x={470} y={900} />
      </g>
      <Taxi x={250} y={926} />
      <Taxi x={1190} y={934} />

      {[236, 640, 960, 1370].map((x) => (
        <g key={x}>
          <rect x={x} y="770" width="5" height={GROUND - 770} fill="var(--foreground)" opacity="0.7" />
          <circle cx={x + 2.5} cy="766" r="9" fill="var(--glow)" opacity="0.9" />
          <circle cx={x + 2.5} cy="766" r="26" fill="var(--glow)" opacity="0.16" />
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
