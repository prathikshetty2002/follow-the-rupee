import { FACTOR_INFO } from "@/lib/factors";
import { inr, inrShort, pct } from "@/lib/format";
import { FAMILIES, contributions, type Scored, type Weights } from "@/lib/planner";
import { Badge, cx } from "../ui";
import type { PlannerIssue } from "./types";

const CONFIDENCE = {
  high: { tone: "success", label: "High confidence" },
  medium: { tone: "neutral", label: "Medium confidence" },
  low: { tone: "warn", label: "Check on site" },
} as const;

export function IssueRow({ item, defaultRank, covered, why, weights }: { item: Scored<PlannerIssue>; defaultRank: number; covered: boolean; why?: { needs: number; short: number; cheaperFundedAbove: boolean }; weights: Weights }) {
  const pts = contributions(item, weights);
  const moved = defaultRank - item.rank;
  const conf = CONFIDENCE[item.confidence];
  const familyPts = FAMILIES.map((f) => ({ ...f, pts: f.factors.reduce((s, k) => s + pts[k], 0) }));
  const [lo, hi] = [item.costLow, item.costHigh];

  return (
    <li className={cx("rounded-xl border bg-surface", covered ? "border-border" : "border-border opacity-95")}>
      <details className="group">
        <summary className="flex cursor-pointer flex-wrap items-start gap-x-4 gap-y-2 p-4 sm:p-5 [&::-webkit-details-marker]:hidden">
          <div className="flex min-w-0 flex-1 items-start gap-3">
            <span className={cx("num flex size-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold", covered ? "bg-success-soft text-success" : "bg-surface-2 text-muted")} aria-label={`Rank ${item.rank}`}>
              {item.rank}
            </span>
            <div className="min-w-0">
              <h3 className="font-medium leading-snug">
                {item.workType} <span className="font-normal text-muted">on</span> {item.road}
              </h3>
              <p className="text-sm text-muted">
                {item.locality}
                {item.nComplaints > 1 ? `, ${item.nComplaints} complaints` : ""} · {item.method} · {item.dlp ? "free (warranty)" : inrShort(item.cost)}
              </p>
              {moved !== 0 && (
                <p className="mt-0.5 text-xs text-muted" aria-label={`${moved > 0 ? "Moved up" : "Moved down"} ${Math.abs(moved)} from the default order`}>
                  {moved > 0 ? "▲" : "▼"} {Math.abs(moved)} {moved > 0 ? "higher" : "lower"} than the default order
                </p>
              )}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {item.dlp ? <Badge tone="info">Free: under warranty</Badge> : covered ? <Badge tone="success">Covered</Badge> : <Badge tone="neutral">Not covered</Badge>}
            <Badge tone={conf.tone}>{conf.label}</Badge>
            <span className="num rounded-lg bg-surface-2 px-2.5 py-1 text-sm font-semibold" title="Risk score out of 100">
              {item.score * 100 >= 99.95 ? 100 : (item.score * 100).toFixed(0)}
              <span className="font-normal text-muted">/100</span>
            </span>
            <span aria-hidden className="text-muted transition-transform group-open:rotate-180">
              ▾
            </span>
          </div>
        </summary>

        <div className="grid gap-6 border-t border-border p-4 sm:p-5 lg:grid-cols-[1.1fr_1fr]">
          <section aria-label="Why it ranks here">
            <h4 className="mb-3 text-sm font-medium">Why it ranks here</h4>
            <div className="space-y-4">
              {familyPts.map((fam) => (
                <div key={fam.key}>
                  <div className="mb-1 flex items-baseline justify-between text-sm">
                    <span className="font-medium">{fam.label}</span>
                    <span className="num">{fam.pts.toFixed(0)} points</span>
                  </div>
                  {fam.factors.length > 1 ? (
                    <ul className="space-y-1.5">
                      {fam.factors.map((f) => (
                        <li key={f} className="grid grid-cols-[8.5rem_1fr_3.5rem] items-center gap-2 text-xs">
                          <span className="text-muted">{FACTOR_INFO[f].label}</span>
                          <div className="h-2 rounded-full bg-surface-2" role="img" aria-label={`${FACTOR_INFO[f].label}: ${Math.round(item.values[f] * 100)}% of the highest in the city`}>
                            <div className="h-2 rounded-full bg-accent" style={{ width: `${Math.round(item.values[f] * 100)}%` }} />
                          </div>
                          <span className="num text-right">{pts[f].toFixed(1)}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="h-2 rounded-full bg-surface-2" role="img" aria-label={`${FACTOR_INFO[fam.factors[0]].label}: ${Math.round(item.values[fam.factors[0]] * 100)}% of the highest in the city`}>
                      <div className="h-2 rounded-full bg-accent" style={{ width: `${Math.round(item.values[fam.factors[0]] * 100)}%` }} />
                    </div>
                  )}
                </div>
              ))}
            </div>
            <p className="mt-3 text-xs text-muted">Each bar shows how this issue compares with the highest in the city on that factor. Points are that share times the factor&apos;s weight. Points add up to the score{item.tiebreak > 0 ? `, plus ${(item.tiebreak * 100).toFixed(1)} for public concern` : ""}.</p>
            <h4 className="mb-2 mt-5 text-sm font-medium">The facts behind it</h4>
            <ul className="list-disc space-y-1 pl-5 text-sm leading-relaxed">
              {item.reasons.map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>
          </section>

          <div className="space-y-5">
            <section aria-label="What to do">
              <h4 className="mb-2 text-sm font-medium">What to do</h4>
              <dl className="space-y-2 text-sm">
                <div>
                  <dt className="text-muted">Repair method</dt>
                  <dd className="font-medium">{item.method}</dd>
                </div>
                <div>
                  <dt className="text-muted">Cost to BMC</dt>
                  <dd className="font-medium">
                    {item.dlp ? "₹0: the original contractor fixes it under warranty" : `${inr(item.cost)} typical`}
                    {!item.dlp && hi > lo && <span className="num block text-xs font-normal text-muted">Half of normal jobs like this cost {inr(lo)} to {inr(hi)}</span>}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted">Suggested contractors</dt>
                  <dd className="font-medium">{item.contractors.join(", ")}</dd>
                  {!item.dlp && <dd className="text-xs text-muted">Expected to need redoing about {pct(item.expectedFail)} of the time with them.</dd>}
                </div>
              </dl>
            </section>

            <section aria-label="How sure we are">
              <h4 className="mb-2 flex items-center gap-2 text-sm font-medium">
                How sure we are <Badge tone={conf.tone}>{conf.label}</Badge>
              </h4>
              <ul className="list-disc space-y-1 pl-5 text-sm leading-relaxed">
                {item.notes.map((n) => (
                  <li key={n}>{n}</li>
                ))}
              </ul>
              <p className="mt-2 text-xs text-muted">
                Complaint{item.complaintIds.length > 1 ? "s" : ""}: <span className="num">{item.complaintIds.slice(0, 4).join(", ")}</span>
                {item.complaintIds.length > 4 ? ` and ${item.complaintIds.length - 4} more` : ""}
              </p>
            </section>

            {!covered && why && (
              <p role="note" className="rounded-lg border border-border bg-surface-2 p-3 text-sm leading-snug">
                <strong>Not covered.</strong> It needs about {inr(why.needs)} and {why.short > 0 ? `${inr(why.short)} more than the budget has left` : "the budget is better spent on other issues"}.
                {why.cheaperFundedAbove ? " Cheaper issues lower down the list were paid for instead." : ""}
              </p>
            )}
          </div>
        </div>
      </details>
    </li>
  );
}

