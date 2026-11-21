import type { Metadata } from "next";
import { Badge, Card, PageHeader, SectionTitle, TableWrap, td, th } from "@/components/ui";
import { getNextRupee, getValidation } from "@/lib/data";
import { FACTOR_INFO, WORK_TYPE_SEVERITY_NOTE } from "@/lib/factors";
import { inr, pct } from "@/lib/format";
import { FACTORS, FAMILIES } from "@/lib/planner";

export const metadata: Metadata = { title: "How it works" };

export default async function MethodPage() {
  const [plan, validation] = await Promise.all([getNextRupee(), getValidation()]);
  const w = plan.weights;
  const sev = Object.entries(plan.severity_by_work_type).sort((a, b) => b[1] - a[1]);
  const methods = plan.methods.filter((m) => ["Pothole", "Waterlogging"].includes(m.work_type));
  const base = plan.weight_presets[0];

  return (
    <div className="space-y-12">
      <PageHeader eyebrow="How it works" title="How the planner ranks, what it can tell you, and what it cannot">
        Every number comes from ordinary code you can check. The ranking is a transparent weighted score, not a black box, so you can change the weights and see what moves.
      </PageHeader>

      <section aria-labelledby="m1" className="space-y-3">
        <SectionTitle id="m1">What gets ranked</SectionTitle>
        <p className="max-w-3xl leading-relaxed">
          An open issue is a complaint that has no repair ordered yet, merged with other complaints about the same road and problem within 14 days. Complaints arrive in English, Hinglish, Hindi and Marathi. We correct wrong categories using the photo description and wording, and place each on a road by GPS, by road name, or by locality. That gives {plan.wards.reduce((s, x) => s + x.open_issues, 0)} open issues across 24 wards.
        </p>
      </section>

      <section aria-labelledby="m2" className="space-y-4">
        <SectionTitle id="m2">How risk is scored</SectionTitle>
        <p className="max-w-3xl leading-relaxed">
          Each issue gets a score out of 100. It answers three questions, using six factors. Each factor is first scaled from 0 to 1 against every road in the city, then multiplied by its weight.
        </p>
        <div className="grid gap-4 md:grid-cols-3">
          {FAMILIES.map((fam) => (
            <Card key={fam.key} as="article">
              <h3 className="font-serif text-lg font-semibold">{fam.label}</h3>
              <ul className="mt-3 space-y-3">
                {fam.factors.map((f) => (
                  <li key={f}>
                    <div className="flex items-baseline justify-between text-sm">
                      <span className="font-medium">{FACTOR_INFO[f].label}</span>
                      <span className="num">{pct(w[f])}</span>
                    </div>
                    <p className="text-xs leading-snug text-muted">{FACTOR_INFO[f].help}</p>
                  </li>
                ))}
              </ul>
            </Card>
          ))}
        </div>
        <p className="max-w-3xl text-sm leading-relaxed text-muted">
          {WORK_TYPE_SEVERITY_NOTE} Seriousness by problem type: {sev.map(([k, v]) => `${k.toLowerCase()} ${v.toFixed(1)}/5`).join(", ")}. A tiny extra for public concern (upvotes) only separates exact ties.
        </p>
      </section>

      <section aria-labelledby="m3" className="space-y-4">
        <SectionTitle id="m3">How a budget is applied</SectionTitle>
        <ul className="max-w-3xl list-disc space-y-2 pl-5 leading-relaxed">
          <li>
            <strong>Riskiest first</strong> goes down the ranking and pays for each issue that still fits. An issue that costs more than what is left is skipped and the money goes to the next one that fits.
          </li>
          <li>
            <strong>Most risk covered</strong> finds the combination with the highest total risk that fits the budget, checked exactly. It can skip one costly issue to pay for several cheaper ones.
          </li>
          <li>
            <strong>Warranty:</strong> a repair on a road still under its defect liability period costs BMC nothing, because the original contractor fixes it, so every plan includes it.
          </li>
          <li>
            <strong>Cost:</strong> the typical cost is the average of normal jobs of that kind (jobs billed far above the rate card are left out). We also show the range the middle half of jobs fall in, and warn when the plan could overrun at the high end.
          </li>
          <li>
            <strong>Method:</strong> the repair method with the fewest failures within 30 days for that kind of problem:{" "}
            {methods.map((m) => `${m.repair_method.toLowerCase()} for ${m.work_type.toLowerCase()} (${pct(m.reopen_rate)} fail, about ${inr(m.est_cost_inr)})`).filter((_, i, a) => a.indexOf(a[i]) === i).slice(0, 4).join("; ")}.
          </li>
        </ul>
      </section>

      <section aria-labelledby="m4" className="space-y-4">
        <SectionTitle id="m4">How we tested it</SectionTitle>
        <p className="max-w-3xl leading-relaxed">
          There is no answer sheet for where money should go, so we tested the ranking against what happened next. We built it from data before 1 August and compared it with the roads that needed the most repairs from 1 August to 30 September. Agreement runs from -1 to 1.
        </p>
        <TableWrap label="Backtest by weighting">
          <table className="w-full min-w-[44rem]">
            <thead className="border-b border-border">
              <tr>
                <th className={th}>Weighting</th>
                <th className={`${th} text-right`}>Across the city</th>
                <th className={`${th} text-right`}>Within a ward</th>
                <th className={`${th} text-right`}>Top 3 roads right</th>
                <th className={`${th} text-right`}>Shares top 3 with default</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {plan.weight_presets.map((p) => (
                <tr key={p.key}>
                  <td className={td}>
                    <span className="font-medium">{p.label}</span> {p.key === base.key && <Badge tone="accent">used</Badge>}
                    <span className="block text-xs text-muted">{p.note}</span>
                  </td>
                  <td className={`${td} num text-right`}>{p.backtest.city.toFixed(2)}</td>
                  <td className={`${td} num text-right`}>{p.backtest.in_ward.toFixed(2)}</td>
                  <td className={`${td} num text-right`}>{pct(p.backtest.precision_at_3)}</td>
                  <td className={`${td} num text-right`}>{pct(p.top3_overlap_with_default)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableWrap>
        <ul className="max-w-3xl list-disc space-y-2 pl-5 text-sm leading-relaxed">
          <li>Weighting every factor equally, or ignoring past trouble, is clearly worse. Picking 3 roads at random in a ward would be right about {pct(validation.random_precision_at_3)} of the time.</li>
          <li>The default is about as good as simply counting past repairs across the city, and slightly better within a ward, which is the comparison a ward officer cares about. The gaps between the top few weightings are inside the noise: the city-wide figure has an uncertainty of about plus or minus 0.08.</li>
          <li>The test cannot judge seriousness (there is no complaint category before the fact), or whether a road is truly more important when it carries more traffic. Those are stated judgements, so you can change them.</li>
          <li>Changing the weights moves the top 3 a lot: the likelihood-led preset shares {pct(plan.weight_presets.find((p) => p.key === "likelihood")?.top3_overlap_with_default ?? 0)} of the default&apos;s top 3. That is why the weights are visible and adjustable.</li>
        </ul>
      </section>

      <section aria-labelledby="m5" className="space-y-3">
        <SectionTitle id="m5">How sure each recommendation is</SectionTitle>
        <p className="max-w-3xl leading-relaxed">Every issue gets a confidence level from three things:</p>
        <ul className="max-w-3xl list-disc space-y-2 pl-5 leading-relaxed">
          <li>
            <strong>Where the road is.</strong> From the complaint&apos;s GPS is the most reliable (about 87% right when we could check). From a road name is weaker (about half right, because one road name covers many stretches). From the locality alone is weakest.
          </li>
          <li>
            <strong>How stable the rank is.</strong> We re-rank 1,000 times with every weight changed randomly by up to 50%. An issue whose rank barely moves is a safer call than one that jumps around. Under those changes the top 3 of a ward keep about {pct(plan.weight_stability.mean_top3_jaccard)} of their members.
          </li>
          <li>
            <strong>How many complaints report it.</strong> More independent reports mean more evidence.
          </li>
        </ul>
        <p className="max-w-3xl text-sm text-muted">&quot;Check on site&quot; means the location is a guess: send someone to confirm before a crew goes.</p>
      </section>

      <section aria-labelledby="m6" className="space-y-3">
        <SectionTitle id="m6">What it cannot tell you</SectionTitle>
        <ul className="max-w-3xl list-disc space-y-2 pl-5 leading-relaxed">
          <li>The data is synthetic. Ward, road and hospital names are real, but every amount, date and record is made up.</li>
          <li>Budget left is the ward&apos;s season budget minus what it has already spent. The real figure may differ, which is why you can type your own.</li>
          <li>The weights are a judgement. The test supports the flood and past-trouble parts; the rest are stated values.</li>
          <li>Costs are typical costs of similar jobs, not quotes. The range shows how much they vary.</li>
          <li>A ranking says where to look first, not that every item must be fixed.</li>
        </ul>
        <p className="text-sm text-muted">Factors scored: {FACTORS.map((f) => FACTOR_INFO[f].label.toLowerCase()).join(", ")}.</p>
      </section>
    </div>
  );
}
