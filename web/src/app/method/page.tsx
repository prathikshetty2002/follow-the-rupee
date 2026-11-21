import type { Metadata } from "next";
import { Card, PageTitle, Section, TableWrap, td, th } from "@/components/ui";
import { getNextRupee, getValidation } from "@/lib/data";
import { FACTOR_INFO, WORK_TYPE_SEVERITY_NOTE } from "@/lib/factors";
import { inr, int, pct } from "@/lib/format";
import { FAMILIES } from "@/lib/planner";

export const metadata: Metadata = { title: "How it works" };

const prose = "max-w-2xl leading-relaxed";
const list = "max-w-2xl list-disc space-y-2 pl-5 leading-relaxed marker:text-glow";

export default async function MethodPage() {
  const [plan, validation] = await Promise.all([getNextRupee(), getValidation()]);
  const w = plan.weights;
  const sev = Object.entries(plan.severity_by_work_type).sort((a, b) => b[1] - a[1]);
  const base = plan.weight_presets[0];
  const likelihood = plan.weight_presets.find((p) => p.key === "likelihood");
  const methods = plan.methods.filter((m) => ["Pothole", "Waterlogging"].includes(m.work_type));
  const open = plan.wards.reduce((s, x) => s + x.open_issues, 0);

  return (
    <div className="mx-auto max-w-6xl space-y-20">
      <PageTitle kicker="How it works" title="How the planner ranks, and what it cannot tell you" accent="what it cannot tell you">
        <p>Every number comes from ordinary code you can check. The ranking is a weighted score, not a black box, so you can change the weights and see what moves.</p>
      </PageTitle>

      <Section id="m1" title="What gets ranked" accent="ranked">
        <p className={prose}>
          An open issue is a road complaint with no repair ordered, merged with other complaints about the same road and problem within 14 days. Complaints come in English, Hinglish, Hindi and Marathi. We correct wrong categories from the photo description and the wording, and place each one on a road by GPS, by road name, or by locality. That leaves {int(open)} open issues across 24 wards.
        </p>
      </Section>

      <Section id="m2" title="How risk is scored" accent="scored">
        <p className={`${prose} mb-6`}>Each issue gets a score out of 100 that answers three questions. Every factor is first scaled from 0 to 1 against all roads in the city, then multiplied by its weight, and the points are added.</p>
        <Card className="!p-3 sm:!p-5">
          <TableWrap label="Factors and weights">
            <table className="w-full min-w-[34rem]">
              <caption className="sr-only">The six factors, their weights, and what each measures</caption>
              <thead>
                <tr>
                  <th scope="col" className={th}>Factor</th>
                  <th scope="col" className={`${th} text-right`}>Weight</th>
                  <th scope="col" className={th}>What it measures</th>
                </tr>
              </thead>
              {FAMILIES.map((fam) => (
                <tbody key={fam.key}>
                  <tr>
                    <th scope="rowgroup" colSpan={3} className="bg-mist/70 px-3 py-2 text-left font-serif text-lg font-normal">
                      {fam.label}
                    </th>
                  </tr>
                  {fam.factors.map((f) => (
                    <tr key={f}>
                      <th scope="row" className={`${td} text-left font-semibold`}>
                        {FACTOR_INFO[f].label}
                      </th>
                      <td className={`${td} num text-right`}>{pct(w[f])}</td>
                      <td className={`${td} text-muted`}>{FACTOR_INFO[f].help}</td>
                    </tr>
                  ))}
                </tbody>
              ))}
            </table>
          </TableWrap>
        </Card>
        <p className={`${prose} mt-4 text-sm text-muted`}>
          {WORK_TYPE_SEVERITY_NOTE} Seriousness by problem type, out of 5: {sev.map(([k, v]) => `${k.toLowerCase()} ${v.toFixed(1)}`).join(", ")}. A tiny extra for public concern only separates exact ties.
        </p>
      </Section>

      <Section id="m3" title="How a budget is applied" accent="applied">
        <ul className={list}>
          <li>
            <strong>Riskiest first</strong> pays for issues in risk order until the next one does not fit. That point is the orange <em>budget line</em>. Cheaper issues below it are then paid from whatever is left.
          </li>
          <li>
            <strong>Most risk covered</strong> finds the combination with the highest total risk that fits, checked exactly. It can skip one costly issue to pay for several cheaper ones.
          </li>
          <li>
            <strong>Warranty:</strong> a repair on a road still under its defect liability period costs BMC nothing, because the original contractor fixes it, so every plan includes it.
          </li>
          <li>
            <strong>Cost:</strong> the typical cost is the average of normal jobs of that kind, leaving out jobs billed far above the rate card. We also show the range the middle half of jobs fall in, and warn when a plan could overrun at the high end.
          </li>
          <li>
            <strong>Repair method:</strong> the method that failed least within 30 days for that kind of problem. For example {methods.slice(0, 2).map((m) => `${m.repair_method.toLowerCase()} for ${m.work_type.toLowerCase()} (${pct(m.reopen_rate)} failed, about ${inr(m.est_cost_inr)})`).join(" and ")}.
          </li>
        </ul>
      </Section>

      <Section id="m4" title="How we tested it" accent="tested">
        <p className={`${prose} mb-6`}>
          There is no answer sheet for where money should go, so we tested the ranking against what happened next. We built it from data before 1 August and compared it with the roads that needed the most repairs from 1 August to 30 September. Agreement runs from -1 to 1.
        </p>
        <Card className="!p-3 sm:!p-5">
          <TableWrap label="Backtest by weighting">
            <table className="w-full min-w-[42rem]">
              <caption className="sr-only">Test results for each weighting</caption>
              <thead>
                <tr>
                  <th scope="col" className={th}>Weighting</th>
                  <th scope="col" className={`${th} text-right`}>Across the city</th>
                  <th scope="col" className={`${th} text-right`}>Within a ward</th>
                  <th scope="col" className={`${th} text-right`}>Top 3 roads right</th>
                  <th scope="col" className={`${th} text-right`}>Top 3 shared with default</th>
                </tr>
              </thead>
              <tbody>
                {plan.weight_presets.map((p) => (
                  <tr key={p.key} className={p.key === base.key ? "bg-sea-soft" : undefined}>
                    <th scope="row" className={`${td} text-left font-normal`}>
                      <span className="font-semibold">{p.label}</span>
                      {p.key === base.key && <span className="ml-2 rounded-full bg-card px-2 py-0.5 text-xs font-semibold text-sea">used</span>}
                      <span className="block text-xs text-muted">{p.note}</span>
                    </th>
                    <td className={`${td} num text-right`}>{p.backtest.city.toFixed(2)}</td>
                    <td className={`${td} num text-right`}>{p.backtest.in_ward.toFixed(2)}</td>
                    <td className={`${td} num text-right`}>{pct(p.backtest.precision_at_3)}</td>
                    <td className={`${td} num text-right`}>{pct(p.top3_overlap_with_default)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableWrap>
        </Card>
        <ul className={`${list} mt-6 text-sm`}>
          <li>Weighting every factor equally, or ignoring past trouble, is clearly worse. Picking three roads at random in a ward would be right about {pct(validation.random_precision_at_3)} of the time.</li>
          <li>The default is about as good as counting past repairs across the city, and slightly better within a ward, which is the comparison a ward officer cares about. The gaps between the top few weightings are inside the noise: the city-wide figure is uncertain by about plus or minus 0.08.</li>
          <li>The test cannot judge seriousness, because there is no complaint category before the fact, or whether a road matters more when it carries more traffic. Those are stated judgements, so you can change them.</li>
          <li>Changing the weights moves the top three a lot: the likelihood-led weighting shares {pct(likelihood?.top3_overlap_with_default ?? 0)} of the default&apos;s top three. That is why the weights are visible and adjustable.</li>
        </ul>
      </Section>

      <Section id="m5" title="How sure each recommendation is" accent="sure">
        <p className={`${prose} mb-3`}>Every issue gets a confidence level from three things.</p>
        <ul className={list}>
          <li>
            <strong>Where the road is.</strong> GPS from the complaint is the most reliable (right about 87% of the time when we could check). A road name is weaker, about half right, because one name covers many stretches. A locality alone is weakest.
          </li>
          <li>
            <strong>How stable the rank is.</strong> We re-rank 1,000 times with every weight changed randomly by up to 50%. An issue whose rank barely moves is a safer call. Under those changes a ward&apos;s top three keep about {pct(plan.weight_stability.mean_top3_jaccard)} of their members.
          </li>
          <li>
            <strong>How many complaints report it.</strong> More independent reports are more evidence.
          </li>
        </ul>
        <p className={`${prose} mt-3 text-sm text-muted`}>&quot;Check on site&quot; means the location is a guess. Confirm the spot before a crew goes.</p>
      </Section>

      <Section id="m6" title="What it cannot tell you" accent="cannot">
        <ul className={list}>
          <li>The data is synthetic. Ward, road and hospital names are real, but every amount, date and record is made up.</li>
          <li>Budget left is the ward&apos;s season budget minus what it has already spent. The real figure may differ, which is why you can type your own.</li>
          <li>The weights are a judgement. The test supports the flooding and past-trouble parts; the rest are stated values.</li>
          <li>Costs are typical costs of similar jobs, not quotes. The range shows how much they vary.</li>
          <li>A ranking says where to look first. It does not say every item must be fixed.</li>
        </ul>
      </Section>
    </div>
  );
}
