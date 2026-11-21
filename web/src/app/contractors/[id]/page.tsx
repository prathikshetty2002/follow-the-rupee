import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { PageSkeleton } from "@/components/skeletons";
import { Badge, Card, PageHeader, SectionTitle, Stat, TableWrap, VsExpected, link, td, th } from "@/components/ui";
import { getContractors, getWorkOrdersById } from "@/lib/data";
import { FLAG_LABEL, fmtDate, gradeTone, inr, inrShort, int, pct, verdictTone, wardSlug } from "@/lib/format";

export async function generateStaticParams() {
  return (await getContractors()).map((c) => ({ id: c.contractor_id }));
}

export async function generateMetadata(props: PageProps<"/contractors/[id]">): Promise<Metadata> {
  const { id } = await props.params;
  const c = (await getContractors()).find((x) => x.contractor_id === id);
  return { title: c ? c.contractor_name.replace(" (synthetic)", "") : "Contractor" };
}

export default function ContractorPage(props: PageProps<"/contractors/[id]">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Content params={props.params} />
    </Suspense>
  );
}

const GROUPS = [
  ["over_billed", "Billed far above the rate card", "over_billed"],
  ["double_billed", "Possible repeat bills", "double_billed"],
  ["reopened", "Repairs that failed within 30 days", "reopened"],
  ["sla_missed", "Slowest fixes (not explained by heavy rain)", "sla_missed"],
] as const;

async function Content({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const all = await getContractors();
  const c = all.find((x) => x.contractor_id === id);
  if (!c || !c.adjusted || !c.billing || !c.evidence || !c.context || !c.city || !c.scores) notFound();
  const name = c.contractor_name.replace(" (synthetic)", "");
  const wos = await getWorkOrdersById(Object.values(c.evidence).flat());
  const byId = new Map(wos.map((w) => [w.work_order_id, w]));
  const a = c.adjusted;

  return (
    <div className="space-y-12">
      <div className="rise">
        <p className="mb-3 text-sm">
          <Link href="/contractors" className={link}>
            All contractors
          </Link>
        </p>
        <PageHeader eyebrow={`Rank ${c.rank} of ${all.length}`} title={name}>
          <p>{c.scorecard_text}</p>
        </PageHeader>
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={gradeTone(c.grade)}>Grade {c.grade}</Badge>
          <Badge tone="neutral">{c.context_adjusted_score}/100 fairness-adjusted score</Badge>
          {c.scorecard_source === "claude" && <Badge tone="neutral" title="Written by Claude from the numbers on this page, then checked automatically">Written by Claude</Badge>}
        </div>
      </div>

      <section aria-label="Key numbers" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Repairs done" value={int(c.work_orders)} hint={`Mostly in wards ${c.wards.slice(0, 3).join(", ")}.`} />
        <Stat label="Total billed" value={inrShort(c.spend_inr)} hint={`${c.cost_vs_rate_pct > 0 ? "+" : ""}${c.cost_vs_rate_pct}% against the rate card (city ${c.city.cost_vs_rate_pct > 0 ? "+" : ""}${c.city.cost_vs_rate_pct}%).`} />
        <Stat label="Jobs billed far above the rate card" value={c.billing.over_billed_jobs} tone={c.billing.over_billed_jobs > 10 ? "danger" : undefined} hint={`${inrShort(c.billing.over_billed_excess_inr)} above the normal range.`} />
        <Stat label="Possible repeat bills" value={c.billing.double_billed_jobs} hint={`${inrShort(c.billing.double_billed_inr)} billed on those jobs.`} />
      </section>

      <Card>
        <h2 className="font-serif text-xl font-semibold">Judged against what is expected for the same work</h2>
        <p className="mt-1 text-sm text-muted">
          The marker shows what the city typically gets for this contractor&apos;s mix of repair methods, road types, flood-prone wards and rainy weeks. {Math.round(c.context.low_lying_share * 100)}% of its jobs were in flood-prone wards and {Math.round(c.context.heavy_rain_window_share * 100)}% fell in heavy-rain windows.
        </p>
        <div className="mt-5 grid gap-6 md:grid-cols-2">
          <div className="space-y-2">
            <VsExpected label="Repairs redone within 30 days" actual={c.reopen_rate} expected={a.reopen_expected_rate} format={(n) => pct(n)} higherIsBetter={false} />
            <Badge tone={verdictTone(a.durability_verdict)}>{a.durability_verdict}</Badge>
            <p className="text-xs text-muted">
              Range allowing for chance: {pct(a.reopen_rate_ci95[0])} to {pct(a.reopen_rate_ci95[1])}. City average {pct(c.city.reopen_rate)}.
            </p>
          </div>
          <div className="space-y-2">
            <VsExpected label="Fixed within the target time" actual={c.sla_met_rate} expected={a.sla_expected_rate} format={(n) => pct(n)} higherIsBetter />
            <Badge tone={verdictTone(a.speed_verdict)}>{a.speed_verdict}</Badge>
            <p className="text-xs text-muted">City average {pct(c.city.sla_met_rate)}.</p>
          </div>
        </div>
        <p className="mt-5 border-t border-border pt-4 text-sm text-muted">
          Score parts: lasting repairs {c.scores.durability}, billing {c.scores.billing}, speed {c.scores.speed} (weighted 40, 30 and 30). Paying for repairs on roads under warranty ({c.billing.paid_on_dlp_roads_jobs} jobs, {inrShort(c.billing.paid_on_dlp_roads_inr)}) is BMC&apos;s decision, so it is shown but not scored.
        </p>
      </Card>

      <section aria-labelledby="ev-h" className="space-y-8">
        <SectionTitle id="ev-h">The work orders behind this scorecard</SectionTitle>
        {GROUPS.map(([key, title]) => {
          const ids = c.evidence![key];
          if (!ids.length) return null;
          return (
            <div key={key}>
              <h3 className="mb-2 font-medium">{title}</h3>
              <TableWrap label={title}>
                <table className="w-full min-w-[40rem]">
                  <thead className="border-b border-border">
                    <tr>
                      <th className={th}>Work order</th>
                      <th className={th}>Ward</th>
                      <th className={th}>Work</th>
                      <th className={th}>Finished</th>
                      <th className={`${th} text-right`}>Billed</th>
                      <th className={`${th} text-right`}>Rate card</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {ids.map((wid) => {
                      const w = byId.get(wid);
                      if (!w) return null;
                      return (
                        <tr key={wid} className="hover:bg-surface-2">
                          <td className={td}>
                            <Link href={`/work-order/${wid}`} className={`${link} num`}>
                              {wid}
                            </Link>
                            <div className="mt-1 flex flex-wrap gap-1">
                              {w.flags.map((f) => (
                                <Badge key={f} tone="neutral">{FLAG_LABEL[f]}</Badge>
                              ))}
                            </div>
                          </td>
                          <td className={td}>
                            <Link href={`/ward/${wardSlug(w.ward_code)}`} className={link}>
                              {w.ward_code}
                            </Link>
                          </td>
                          <td className={td}>
                            {w.work_type}
                            <span className="block text-muted">{w.repair_method}</span>
                          </td>
                          <td className={td}>{fmtDate(w.completed_at)}</td>
                          <td className={`${td} num text-right`}>{inr(w.cost_inr)}</td>
                          <td className={`${td} num text-right text-muted`}>{inr(w.expected_cost_inr)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </TableWrap>
            </div>
          );
        })}
      </section>
    </div>
  );
}
