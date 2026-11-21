import { FACTOR_INFO } from "@/lib/factors";
import { inr, inrShort, pct } from "@/lib/format";
import { FAMILIES, contributions, normaliseWeights, type Fill, type Scored, type Strategy, type Weights } from "@/lib/planner";
import { cx } from "../ui";
import type { PlannerIssue } from "./types";

type Item = Scored<PlannerIssue>;

const CONFIDENCE = {
  high: { dots: 3, word: "High" },
  medium: { dots: 2, word: "Medium" },
  low: { dots: 1, word: "Check on site" },
} as const;

/** Row columns, widest layout: rank, issue, method, cost, running spend, risk, confidence, toggle. */
const COLS = "lg:grid-cols-[3.25rem_minmax(0,1fr)_10rem_5.5rem_5.5rem_4.5rem_8rem_1.25rem] md:grid-cols-[3.25rem_minmax(0,1fr)_5.5rem_4.5rem_1.25rem]";

function Mark({ paid }: { paid: boolean }) {
  return <span aria-hidden className={cx("inline-block size-3.5 shrink-0 rounded-sm", paid ? "bg-foreground" : "border-2 border-foreground")} />;
}

function status(item: Item, fill: Fill) {
  if (!fill.funded.has(item.id)) return "Not paid";
  if (item.dlp) return "Free: under warranty";
  if (fill.fromLeftover.has(item.id)) return "Paid from leftover";
  return "Paid";
}

export function Ledger({ items, defaultRank, fill, weights, strategy, cutoffId }: { items: Item[]; defaultRank: Map<string, number>; fill: Fill; weights: Weights; strategy: Strategy; cutoffId: string | null }) {
  const indexOf = new Map(items.map((i, k) => [i.id, k]));
  return (
    <div>
      <div aria-hidden className={cx("hidden gap-x-3 border-b-2 border-foreground px-3 pb-2 text-xs font-semibold uppercase tracking-[0.06em] text-muted md:grid", COLS)}>
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
            <li key={item.id} className="border-b border-rule">
              {showCutoff && (
                <p className="border-y-[3px] border-accent bg-accent-soft px-3 py-2 text-sm">
                  <strong className="text-accent">Budget runs out here.</strong> This issue needs <span className="num">{inr(item.cost)}</span> and only <span className="num">{inr(fill.leftAtCutoff)}</span> is left.
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
  const paid = fill.funded.has(item.id);
  const conf = CONFIDENCE[item.confidence];
  const moved = defaultRank - item.rank;
  const score = Math.min(item.score * 100, 100);
  return (
    <details className="group">
      <summary className={cx("grid cursor-pointer grid-cols-[2.5rem_minmax(0,1fr)_auto] items-start gap-x-3 gap-y-1 px-3 py-4 hover:bg-foreground/5 md:items-center", COLS, "[&::-webkit-details-marker]:hidden")}>
        <span className="flex items-center gap-2">
          <span className="num w-6 text-right text-base font-semibold">{item.rank}</span>
          <Mark paid={paid} />
        </span>
        <span className="min-w-0">
          <span className="sr-only">{status(item, fill)}. </span>
          <span className="block font-semibold leading-snug">
            {item.workType} <span className="font-normal text-muted">on</span> {item.road}
          </span>
          <span className="block text-sm text-muted">
            {item.locality}
            {item.nComplaints > 1 ? ` · ${item.nComplaints} complaints` : ""} · {status(item, fill)}
            {moved !== 0 && <span className="num"> · {moved > 0 ? "up" : "down"} {Math.abs(moved)} from default order</span>}
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
          <span aria-hidden className="ml-auto mt-1 block h-1 w-10 bg-rule md:ml-auto">
            <span className="block h-1 bg-foreground" style={{ width: `${score}%` }} />
          </span>
        </span>
        <span className="hidden items-center gap-2 text-sm lg:flex">
          <span aria-hidden className="flex gap-0.5">
            {[1, 2, 3].map((n) => (
              <span key={n} className={cx("size-2 rounded-full", n <= conf.dots ? (item.confidence === "low" ? "bg-warn" : "bg-foreground") : "border border-line")} />
            ))}
          </span>
          <span>
            <span className="sr-only">Confidence: </span>
            {conf.word}
          </span>
        </span>
        <span aria-hidden className="hidden text-muted transition-transform duration-150 ease group-open:rotate-90 md:block">
          ▸
        </span>
      </summary>
      <Working item={item} fill={fill} weights={weights} paid={paid} />
    </details>
  );
}

function Standing({ value }: { value: number }) {
  return (
    <span className="flex items-center gap-2">
      <span aria-hidden className="block h-1.5 w-24 bg-rule">
        <span className="block h-1.5 bg-foreground" style={{ width: `${Math.round(value * 100)}%` }} />
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
  return (
    <div className="grid gap-x-12 gap-y-8 border-t border-rule bg-panel px-3 py-6 sm:px-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
      <section className="min-w-0">
        <h3 className="mb-3 text-base font-bold">How the score adds up</h3>
        <div className="overflow-x-auto" role="region" aria-label="Score arithmetic" tabIndex={0}>
        <table className="w-full min-w-[19rem] text-sm">
          <caption className="sr-only">
            Risk score for {item.workType} on {item.road}: each factor&apos;s standing, its weight, and the points it adds.
          </caption>
          <thead>
            <tr>
              <th scope="col" className="pb-1.5 text-left text-xs font-semibold uppercase tracking-[0.06em] text-muted">Factor</th>
              <th scope="col" className="pb-1.5 text-left text-xs font-semibold uppercase tracking-[0.06em] text-muted">Standing in the city</th>
              <th scope="col" className="pb-1.5 text-right text-xs font-semibold uppercase tracking-[0.06em] text-muted">Weight</th>
              <th scope="col" className="pb-1.5 text-right text-xs font-semibold uppercase tracking-[0.06em] text-muted">Points</th>
            </tr>
          </thead>
          {FAMILIES.map((fam) =>
            fam.factors.length === 1 ? (
              <tbody key={fam.key}>
                <tr>
                  <th scope="row" className="border-t border-line py-2 pr-3 text-left font-semibold">
                    {fam.label}
                  </th>
                  <td className="border-t border-line py-2 pr-3">
                    <Standing value={item.values[fam.factors[0]]} />
                  </td>
                  <td className="num border-t border-line py-2 text-right text-muted">{pct(w[fam.factors[0]])}</td>
                  <td className="num border-t border-line py-2 text-right font-semibold">{pts[fam.factors[0]].toFixed(1)}</td>
                </tr>
              </tbody>
            ) : (
              <tbody key={fam.key}>
                <tr>
                  <th scope="rowgroup" colSpan={3} className="border-t border-line pt-3 text-left font-semibold">
                    {fam.label}
                  </th>
                  <td className="num border-t border-line pt-3 text-right font-semibold">{fam.factors.reduce((s, f) => s + pts[f], 0).toFixed(1)}</td>
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
                <th scope="row" colSpan={3} className="border-t border-line py-2 text-left font-normal text-muted">
                  Public concern (breaks ties)
                </th>
                <td className="num border-t border-line py-2 text-right">{(item.tiebreak * 100).toFixed(1)}</td>
              </tr>
            )}
            <tr>
              <th scope="row" colSpan={3} className="border-t-2 border-foreground py-2 text-left text-base font-bold">
                Risk score
              </th>
              <td className="num border-t-2 border-foreground py-2 text-right text-base font-bold">{(item.score * 100).toFixed(1)}</td>
            </tr>
          </tfoot>
        </table>
        </div>
        <p className="mt-2 text-xs text-muted">Standing is how this issue compares with the highest in the city on that factor. Points are standing times weight, out of 100.</p>
      </section>

      <div className="min-w-0 space-y-6">
        <section>
          <h3 className="mb-2 text-base font-bold">The facts behind it</h3>
          <ul className="list-disc space-y-1 pl-5 leading-relaxed marker:text-line">
            {item.reasons.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
        </section>
        <section>
          <h3 className="mb-2 text-base font-bold">What to do</h3>
          <dl className="grid grid-cols-[7.5rem_1fr] gap-x-4 gap-y-2 text-sm">
            <dt className="text-muted">Repair</dt>
            <dd className="font-semibold">{item.method}</dd>
            <dt className="text-muted">Cost to BMC</dt>
            <dd>
              <span className="num font-semibold">{item.dlp ? "₹0" : inr(item.cost)}</span>
              {item.dlp ? " The original contractor fixes it under warranty." : item.costHigh > item.costLow ? <span className="num block text-xs text-muted">Half of normal jobs like this cost {inr(item.costLow)} to {inr(item.costHigh)}</span> : null}
            </dd>
            <dt className="text-muted">Contractors</dt>
            <dd>
              {item.contractors.join(", ")}
              {!item.dlp && <span className="block text-xs text-muted">Expected to need redoing about {pct(item.expectedFail)} of the time with them.</span>}
            </dd>
          </dl>
        </section>
        <section>
          <h3 className="mb-2 text-base font-bold">
            How sure we are: <span className={item.confidence === "low" ? "text-warn" : undefined}>{conf.word}</span>
          </h3>
          <ul className="list-disc space-y-1 pl-5 text-sm leading-relaxed marker:text-line">
            {item.notes.map((n) => (
              <li key={n}>{n}</li>
            ))}
          </ul>
          <p className="num mt-2 text-xs text-muted">
            Complaint{item.complaintIds.length > 1 ? "s" : ""}: {item.complaintIds.slice(0, 4).join(", ")}
            {item.complaintIds.length > 4 ? ` and ${item.complaintIds.length - 4} more` : ""}
          </p>
        </section>
        {!paid && why && (
          <p role="note" className="border-l-4 border-foreground pl-3 text-sm leading-snug">
            <strong>Not paid for.</strong> It needs about <span className="num">{inr(why.needs)}</span>
            {why.short > 0 ? <>, which is <span className="num">{inr(why.short)}</span> more than is left.</> : ", but this budget does more by paying for other issues."}
            {why.cheaperFundedAbove ? " Cheaper issues lower down the list were paid for instead." : ""}
          </p>
        )}
      </div>
    </div>
  );
}
