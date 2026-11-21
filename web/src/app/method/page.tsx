import type { Metadata } from "next";
import { Card, PageHeader, SectionTitle, TableWrap, td, th } from "@/components/ui";
import { getAuditSummary, getIssuesSummary, getMeta, getNextRupee, getValidation } from "@/lib/data";
import { FACTOR_LABEL, int, pct } from "@/lib/format";

export const metadata: Metadata = { title: "Method" };

export default async function MethodPage() {
  const [plan, validation, audit, trail, meta] = await Promise.all([getNextRupee(), getValidation(), getAuditSummary(), getIssuesSummary(), getMeta()]);
  const weights = Object.entries(plan.weights);
  const results = validation.results;
  return (
    <div className="space-y-12">
      <PageHeader eyebrow="Method" title="How this works, and where it can be wrong">
        Everything here is computed from the synthetic dataset. Numbers come from ordinary code that anyone can check. Claude writes the plain-language text from those numbers and is not allowed to add any of its own.
      </PageHeader>

      <section aria-labelledby="m1" className="space-y-3">
        <SectionTitle id="m1">From complaints to a money trail</SectionTitle>
        <p className="max-w-3xl leading-relaxed">
          {int(trail.complaints)} complaints arrive in English, Hinglish, Hindi and Marathi through four channels. We fix wrong categories using the photo description and the wording of the complaint, place each one on a road, and merge repeats about the same problem into one issue. That gives {int(trail.issues)} issues, each linked to the repair BMC ordered for it, or marked as not fixed yet, or outside BMC&apos;s scope.
        </p>
        <p className="max-w-3xl leading-relaxed text-muted">{pct(trail.fixed_issues_that_failed_pct, 1)} of repaired issues failed within 30 days. The median fix took {trail.median_days_to_fix} days and {pct(trail.met_target_pct)} met their target time.</p>
      </section>

      <section aria-labelledby="m2" className="space-y-4">
        <SectionTitle id="m2">How the next rupee is ranked</SectionTitle>
        <p className="max-w-3xl leading-relaxed">
          Each open issue gets a score out of 100 from six factors. The weights are our judgement, set in one place so they can be debated and changed. The method chosen for each issue is the one that failed least often in this season&apos;s data, and contractors who fail least are suggested first.
        </p>
        <Card>
          <ul className="space-y-3">
            {weights.map(([k, v]) => (
              <li key={k} className="grid grid-cols-[9rem_1fr_3rem] items-center gap-3 text-sm">
                <span>{FACTOR_LABEL[k]}</span>
                <div className="h-2.5 rounded-full bg-surface-2" role="img" aria-label={`${FACTOR_LABEL[k]} weight ${Math.round(v * 100)} percent`}>
                  <div className="h-2.5 rounded-full bg-accent" style={{ width: `${v * 100 * 2.5}%` }} />
                </div>
                <span className="num text-right">{Math.round(v * 100)}%</span>
              </li>
            ))}
          </ul>
        </Card>
        <p className="max-w-3xl text-sm leading-relaxed text-muted">
          Each ward then funds issues in priority order until its remaining budget (budget minus this season&apos;s spend) runs out. Repairs on roads under warranty cost BMC nothing, so they are always shown as covered. We also solve the same problem exactly, to see whether a different order buys more total priority for the same money. It sometimes does, because one costly top issue can crowd out several cheap ones.
        </p>
      </section>

      <section aria-labelledby="m3" className="space-y-4">
        <SectionTitle id="m3">Did we check it? A backtest</SectionTitle>
        <p className="max-w-3xl leading-relaxed">
          There is no answer sheet for where money should go, so we tested the ranking against what happened next. We built it from data before 1 August and compared it with the roads that generated the most repairs from 1 August to 30 September. Rank agreement runs from -1 to 1.
        </p>
        <TableWrap label="Backtest results">
          <table className="w-full min-w-[40rem]">
            <thead className="border-b border-border">
              <tr>
                <th className={th}>Ranking</th>
                <th className={`${th} text-right`}>Across the city</th>
                <th className={`${th} text-right`}>Within a ward</th>
                <th className={`${th} text-right`}>Top 3 right</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {results.map((r) => (
                <tr key={r.score}>
                  <td className={td}>{r.score}</td>
                  <td className={`${td} num text-right`}>{r.work_orders_city.toFixed(2)}</td>
                  <td className={`${td} num text-right`}>{r.work_orders_in_ward.toFixed(2)}</td>
                  <td className={`${td} num text-right`}>{pct(r.precision_at_3_work_orders)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableWrap>
        <p className="max-w-3xl text-sm leading-relaxed text-muted">
          What this shows: weighting every factor equally clearly does worse. Our index is about as good as simply counting past repairs across the city, and slightly better inside a ward, which is the comparison that matters for a ward officer. The backtest cannot judge the traffic, accident and hospital factors, because they did not predict where repairs happened; they are there because they measure how much a failure would hurt. Picking three roads at random in a ward would get about {pct(validation.random_precision_at_3)} right.
        </p>
      </section>

      <section aria-labelledby="m4" className="space-y-3">
        <SectionTitle id="m4">What gets listed for review, and what does not</SectionTitle>
        <ul className="max-w-3xl list-disc space-y-2 pl-5 leading-relaxed">
          <li>
            <strong>Billed far above the rate card:</strong> more than {audit.thresholds.over_billed_ratio} times the standard rate. Normal jobs sit between {audit.thresholds.normal_cost_range_vs_rate_card[0]} and {audit.thresholds.normal_cost_range_vs_rate_card[1]} times, so ordinary variation is never listed.
          </li>
          <li>
            <strong>Possible repeat bill:</strong> no complaint is linked, and the same road and type of work was billed in the previous {audit.thresholds.double_bill_window_days} days.
          </li>
          <li>
            <strong>Paid on a road under warranty:</strong> the original contractor should repair it free. Drainage and pumping jobs are rated low because a warranty may not cover them.
          </li>
          <li>
            <strong>Late fixes</strong> count only when the work took at least {audit.thresholds.sla_flag_ratio} times the target, and rate one level lower if heavy rain fell. About half of all jobs miss their target, so a single miss means little.
          </li>
        </ul>
      </section>

      <section aria-labelledby="m5" className="space-y-3">
        <SectionTitle id="m5">Fair scorecards</SectionTitle>
        <p className="max-w-3xl leading-relaxed">
          A contractor is compared with what the whole city gets for the same repair methods, road surfaces, flood-prone wards, work types and rainy weeks. A gap smaller than two standard errors is called &quot;in line with expectations&quot;, so chance is not mistaken for quality. Score is 40% lasting repairs, 30% billing and 30% speed, and the amount of work a contractor does is never counted.
        </p>
      </section>

      <section aria-labelledby="m6" className="space-y-3">
        <SectionTitle id="m6">Where Claude is used</SectionTitle>
        <p className="max-w-3xl leading-relaxed">
          Claude writes the scorecard and ward summary paragraphs. Each draft is checked automatically before it is used: under the word limit, every number it contains must appear in the facts we supplied (including numbers spelled out in words), no accusatory language, and the contractor is named. A draft that fails is retried once, then replaced by a template. Text written for this build: contractors {JSON.stringify(meta.text_sources?.contractors)}, wards {JSON.stringify(meta.text_sources?.wards)}.
        </p>
      </section>

      <section aria-labelledby="m7" className="space-y-3">
        <SectionTitle id="m7">Limits</SectionTitle>
        <ul className="max-w-3xl list-disc space-y-2 pl-5 leading-relaxed">
          <li>The data is synthetic. Names of wards, roads and hospitals are real, but every amount, date and record is made up, and the contractors are fictional.</li>
          <li>The factor weights are a judgement. The backtest supports the flood and past-trouble parts, not the rest.</li>
          <li>Complaints with no GPS are placed on a road by name or locality, which is right about half the time, so a few open issues may sit on a neighbouring road.</li>
          <li>Expected rates come from a simple model of the city&apos;s own results. They are a fair yardstick, not a legal standard.</li>
          <li>Being listed for review is not a finding of wrongdoing.</li>
        </ul>
      </section>
    </div>
  );
}
