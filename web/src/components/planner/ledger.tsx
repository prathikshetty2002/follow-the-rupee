import { FACTOR_INFO } from "@/lib/factors";
import { inr, inrShort, pct } from "@/lib/format";
import { FAMILIES, contributions, normaliseWeights, type Fill, type Scored, type Strategy, type Weights } from "@/lib/planner";
import Link from "next/link";
import { cx, link } from "../ui";
import type { PlannerIssue } from "./types";

type Item = Scored<PlannerIssue>;

const CONFIDENCE = {
  high: { dots: 3, word: "High" },
  medium: { dots: 2, word: "Medium" },
  low: { dots: 1, word: "Check on site" },
} as const;

/** Row columns, widest layout: rank, issue, repair, cost, running spend, risk, confidence, toggle. */
const COLS = "lg:grid-cols-[2.5rem_minmax(0,1fr)_10rem_5.5rem_5.5rem_4.5rem_8rem_1.75rem] md:grid-cols-[2.5rem_minmax(0,1fr)_5.5rem_4.5rem_1.75rem]";

function statusOf(item: Item, fill: Fill) {
  if (!fill.funded.has(item.id)) return { word: "Not paid", glyph: "□", paid: false };
  if (item.dlp) return { word: "Free: under warranty", glyph: "◆", paid: true };
  if (fill.fromLeftover.has(item.id)) return { word: "Paid from leftover", glyph: "■", paid: true };
  return { word: "Paid", glyph: "■", paid: true };
}

/** Status as a pill: a shape and a word, so it never depends on colour alone. */
function StatusPill({ item, fill }: { item: Item; fill: Fill }) {
  const s = statusOf(item, fill);
  return (
    <span className={cx("inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold", s.paid ? "bg-sea-soft text-sea" : "border border-line text-muted")}>
      <span aria-hidden>{s.glyph}</span>
      {s.word}
    </span>
  );
}

export function Ledger({ items, defaultRank, fill, weights, strategy, cutoffId }: { items: Item[]; defaultRank: Map<string, number>; fill: Fill; weights: Weights; strategy: Strategy; cutoffId: string | null }) {
  const indexOf = new Map(items.map((i, k) => [i.id, k]));
  return (
    <div className="soft overflow-hidden rounded-3xl">
      <div aria-hidden className={cx("hidden gap-x-3 bg-mist/70 px-5 py-3 text-xs font-semibold uppercase tracking-[0.06em] text-muted md:grid", COLS)}>
        <span>Rank</span>
        <span>Issue</span>
        <span className="hidden lg:block">Repair</span>
        <span className="text-right">Cost</span>
        <span className="hidden text-right lg:block">Running</span>
        <span className="text-right">Risk</span>
        <span className="hidden lg:block">Confidence</span>
        <span />
      </div>
      <ol>
        {items.map((item) => {
          const showCutoff = strategy === "risk_first" && cutoffId === item.id;
          return (
            <li key={item.id} className="border-t border-rule first:border-t-0">
              {showCutoff && (
                <p className="mx-3 my-3 rounded-2xl bg-peach px-5 py-3 text-sm sm:mx-5">
                  <strong className="text-accent-ink">Budget runs out here.</strong> This issue needs <span className="num">{inr(item.cost)}</span> and only <span className="num">{inr(fill.leftAtCutoff)}</span> is left.
                  {fill.fromLeftover.size > 0 ? " Cheaper issues below are paid from that leftover." : ""}
                </p>
              )}
              <Row item={item} defaultRank={defaultRank.get(item.id) ?? item.rank} fill={fill} weights={weights} running={fill.funded.has(item.id) ? fill.runningSpend[indexOf.get(item.id)!] : null} />
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function Row({ item, defaultRank, fill, weights, running }: { item: Item; defaultRank: number; fill: Fill; weights: Weights; running: number | null }) {
  const s = statusOf(item, fill);
  const conf = CONFIDENCE[item.confidence];
  const moved = defaultRank - item.rank;
  const score = Math.min(item.score * 100, 100);
  return (
    <details className="group">
      <summary className={cx("grid cursor-pointer grid-cols-[2.5rem_minmax(0,1fr)_auto] items-start gap-x-3 gap-y-1 px-4 py-4 transition-colors duration-150 ease hover:bg-mist/50 sm:px-5 md:items-center", COLS)}>
        <span className={cx("num flex size-9 items-center justify-center rounded-full text-sm font-semibold", s.paid ? "bg-sea-soft text-sea" : "bg-mist text-muted")}>{item.rank}</span>
        <span className="min-w-0">
          <span className="sr-only">{s.word}. </span>
          <span className="block font-semibold leading-snug">
            {item.workType} <span className="font-normal text-muted">on</span> {item.road}
          </span>
          <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted">
            <span>
              {item.locality}
              {item.nComplaints > 1 ? ` · ${item.nComplaints} complaints` : ""}
            </span>
            <StatusPill item={item} fill={fill} />
            {moved !== 0 && (
              <span className="num">
                {moved > 0 ? "▲" : "▼"} {Math.abs(moved)} from default order
              </span>
            )}
          </span>
          <span className="mt-1 block text-sm text-muted md:hidden">
            {item.method} · <span className="num">{item.dlp ? "free" : inrShort(item.cost)}</span>
          </span>
        </span>
        <span className="hidden text-sm lg:block">{item.method}</span>
        <span className="num hidden text-right text-sm md:block">{item.dlp ? "Free" : inrShort(item.cost)}</span>
        <span className="num hidden text-right text-sm text-muted lg:block">{running === null ? "–" : inrShort(running)}</span>
        <span className="text-right">
          <span className="num text-lg font-semibold">{score >= 99.5 ? 100 : score.toFixed(0)}</span>
          <span className="sr-only"> out of 100</span>
          <span aria-hidden className="ml-auto mt-1 block h-1.5 w-10 overflow-hidden rounded-full bg-unpaid">
            <span className="block h-1.5 rounded-full bg-sea-fill" style={{ width: `${score}%` }} />
          </span>
        </span>
        <span className="hidden items-center gap-2 text-sm lg:flex">
          <span aria-hidden className="flex gap-0.5">
            {[1, 2, 3].map((n) => (
              <span key={n} className={cx("size-2 rounded-full", n <= conf.dots ? (item.confidence === "low" ? "bg-accent" : "bg-sea-fill") : "border border-line")} />
            ))}
          </span>
          <span>
            <span className="sr-only">Confidence: </span>
            {conf.word}
          </span>
        </span>
        <span aria-hidden className="hidden size-7 items-center justify-center rounded-full bg-mist text-xs text-muted transition-transform duration-150 ease group-open:rotate-90 md:flex">
          ▸
        </span>
      </summary>
      <Working item={item} fill={fill} weights={weights} paid={s.paid} />
    </details>
  );
}

function Standing({ value }: { value: number }) {
  return (
    <span className="flex items-center gap-2">
      <span aria-hidden className="block h-2 w-24 overflow-hidden rounded-full bg-unpaid">
        <span className="block h-2 rounded-full bg-sea-fill" style={{ width: `${Math.round(value * 100)}%` }} />
      </span>
      <span className="num text-xs">{Math.round(value * 100)}%</span>
    </span>
  );
}

function Working({ item, fill, weights, paid }: { item: Item; fill: Fill; weights: Weights; paid: boolean }) {
  const pts = contributions(item, weights);
  const w = normaliseWeights(weights);
  const conf = CONFIDENCE[item.confidence];
  const why = fill.notCovered.get(item.id);
  const h = "pb-1.5 text-left text-xs font-semibold uppercase tracking-[0.06em] text-muted";
  return (
    <div className="mx-3 mb-4 grid gap-x-12 gap-y-8 rounded-2xl bg-mist/50 px-5 py-6 sm:mx-5 sm:px-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
      <section className="min-w-0">
        <h3 className="mb-3 font-serif text-2xl">How the score adds up</h3>
        <div className="overflow-x-auto" role="region" aria-label="Score arithmetic" tabIndex={0}>
          <table className="w-full min-w-[19rem] text-sm">
            <caption className="sr-only">
              Risk score for {item.workType} on {item.road}: each factor&apos;s standing, its weight, and the points it adds.
            </caption>
            <thead>
              <tr>
                <th scope="col" className={h}>Factor</th>
                <th scope="col" className={h}>Standing in the city</th>
                <th scope="col" className={cx(h, "text-right")}>Weight</th>
                <th scope="col" className={cx(h, "text-right")}>Points</th>
              </tr>
            </thead>
            {FAMILIES.map((fam) =>
              fam.factors.length === 1 ? (
                <tbody key={fam.key}>
                  <tr>
                    <th scope="row" className="border-t border-rule py-2 pr-3 text-left font-semibold">
                      {fam.label}
                    </th>
                    <td className="border-t border-rule py-2 pr-3">
                      <Standing value={item.values[fam.factors[0]]} />
                    </td>
                    <td className="num border-t border-rule py-2 text-right text-muted">{pct(w[fam.factors[0]])}</td>
                    <td className="num border-t border-rule py-2 text-right font-semibold">{pts[fam.factors[0]].toFixed(1)}</td>
                  </tr>
                </tbody>
              ) : (
                <tbody key={fam.key}>
                  <tr>
                    <th scope="rowgroup" colSpan={3} className="border-t border-rule pt-3 text-left font-semibold">
                      {fam.label}
                    </th>
                    <td className="num border-t border-rule pt-3 text-right font-semibold">{fam.factors.reduce((s, f) => s + pts[f], 0).toFixed(1)}</td>
                  </tr>
                  {fam.factors.map((f) => (
                    <tr key={f}>
                      <th scope="row" className="py-1.5 pr-3 text-left font-normal text-muted">
                        {FACTOR_INFO[f].label}
                      </th>
                      <td className="py-1.5 pr-3">
                        <Standing value={item.values[f]} />
                      </td>
                      <td className="num py-1.5 text-right text-muted">{pct(w[f])}</td>
                      <td className="num py-1.5 text-right">{pts[f].toFixed(1)}</td>
                    </tr>
                  ))}
                </tbody>
              ),
            )}
            <tfoot>
              {item.tiebreak > 0 && (
                <tr>
                  <th scope="row" colSpan={3} className="border-t border-rule py-2 text-left font-normal text-muted">
                    Public concern (breaks ties)
                  </th>
                  <td className="num border-t border-rule py-2 text-right">{(item.tiebreak * 100).toFixed(1)}</td>
                </tr>
              )}
              <tr>
                <th scope="row" colSpan={3} className="border-t-2 border-foreground py-2.5 text-left font-serif text-xl font-normal">
                  Risk score
                </th>
                <td className="num border-t-2 border-foreground py-2.5 text-right text-lg font-semibold">{(item.score * 100).toFixed(1)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
        <p className="mt-2 text-xs text-muted">Standing is how this issue compares with the highest in the city on that factor. Points are standing times weight, out of 100.</p>
      </section>

      <div className="min-w-0 space-y-6">
        <section>
          <h3 className="mb-2 font-serif text-2xl">The facts behind it</h3>
          <ul className="list-disc space-y-1 pl-5 leading-relaxed marker:text-glow">
            {item.reasons.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
        </section>
        <section>
          <h3 className="mb-2 font-serif text-2xl">What to do</h3>
          <dl className="grid grid-cols-[7.5rem_1fr] gap-x-4 gap-y-2 text-sm">
            <dt className="text-muted">Repair</dt>
            <dd className="font-semibold">{item.method}</dd>
            <dt className="text-muted">Cost to BMC</dt>
            <dd>
              <span className="num font-semibold">{item.dlp ? "₹0" : inr(item.cost)}</span>
              {item.dlp ? (
                <>
                  {" "}
                  The original contractor fixes it under warranty.{" "}
                  <Link href={`/audit?type=dlp_paid&ward=${encodeURIComponent(item.ward)}`} className={link}>
                    See warranty-road bills in this ward
                  </Link>
                </>
              ) : item.costHigh > item.costLow ? <span className="num block text-xs text-muted">Half of normal jobs like this cost {inr(item.costLow)} to {inr(item.costHigh)}</span> : null}
            </dd>
            <dt className="text-muted">Contractors</dt>
            <dd>
              {item.contractors.map((n, k) => {
                const id = item.contractorIds[k];
                return (
                  <span key={`${n}-${k}`}>
                    {k > 0 && ", "}
                    {id && /^CT\d+$/.test(id) ? (
                      <Link href={`/contractors?c=${id}`} className={link}>
                        {n}
                      </Link>
                    ) : (
                      n
                    )}
                  </span>
                );
              })}
              {!item.dlp && <span className="block text-xs text-muted">Expected to need redoing about {pct(item.expectedFail)} of the time with them.</span>}
            </dd>
          </dl>
        </section>
        <section>
          <h3 className="mb-2 font-serif text-2xl">
            How sure we are: <em className={item.confidence === "low" ? "text-accent-ink" : "text-sea"}>{conf.word}</em>
          </h3>
          <ul className="list-disc space-y-1 pl-5 text-sm leading-relaxed marker:text-glow">
            {item.notes.map((n) => (
              <li key={n}>{n}</li>
            ))}
          </ul>
          <p className="num mt-2 text-xs text-muted">
            Complaint{item.complaintIds.length > 1 ? "s" : ""}:{" "}
            {item.complaintIds.slice(0, 4).map((c, k) => (
              <span key={c}>
                {k > 0 && ", "}
                <Link href={`/complaints?q=${c}`} className={link}>
                  {c}
                </Link>
              </span>
            ))}
            {item.complaintIds.length > 4 ? ` and ${item.complaintIds.length - 4} more` : ""}
          </p>
        </section>
        {!paid && why && (
          <p role="note" className="rounded-2xl bg-card px-4 py-3 text-sm leading-snug">
            <strong>Not paid for.</strong> It needs about <span className="num">{inr(why.needs)}</span>
            {why.short > 0 ? <>, which is <span className="num">{inr(why.short)}</span> more than is left.</> : ", but this budget does more by paying for other issues."}
            {why.cheaperFundedAbove ? " Cheaper issues lower down the list were paid for instead." : ""}
          </p>
        )}
      </div>
    </div>
  );
}
