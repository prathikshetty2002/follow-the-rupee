import Link from "next/link";
import { ButtonLink, Card, PageHeader, SectionTitle, Stat, Badge, TableWrap, th, td, link } from "@/components/ui";
import { WardMap, type MapWard } from "@/components/ward-map";
import { getAuditSummary, getContractors, getIssuesSummary, getNextRupee, getWardGeo, getWards } from "@/lib/data";
import { inrShort, int, pct, wardSlug } from "@/lib/format";
import { projectFeatures } from "@/lib/map";

const W = 560;
const H = 640;

export default async function Home() {
  const [wards, geo, audit, trail, plan, contractors] = await Promise.all([getWards(), getWardGeo(), getAuditSummary(), getIssuesSummary(), getNextRupee(), getContractors()]);

  const spent = wards.reduce((s, w) => s + w.spend_inr, 0);
  const budget = wards.reduce((s, w) => s + w.budget_inr, 0);
  const need = plan.wards.reduce((s, w) => s + w.need_inr, 0);
  const headroom = wards.reduce((s, w) => s + Math.max(w.remaining_budget_inr ?? 0, 0), 0);
  const jobs = wards.reduce((s, w) => s + w.work_orders, 0);
  const overBudget = wards.filter((w) => w.over_budget).length;
  const openIssues = trail.by_status.never_fixed?.issues ?? 0;

  const { paths, centroids } = projectFeatures(geo.features, W, H);
  const mapWards: MapWard[] = geo.features.map((f, i) => ({
    slug: f.properties.slug,
    code: f.properties.ward_code,
    name: f.properties.ward_name,
    d: paths[i],
    cx: centroids[i][0],
    cy: centroids[i][1],
    risk: f.properties.risk_score,
    budgetUsed: f.properties.budget_used_pct,
    reopen: f.properties.reopen_rate,
    openIssues: f.properties.open_issues,
    over: f.properties.over_budget,
  }));

  const topNeed = [...wards].sort((a, b) => b.risk_score - a.risk_score).slice(0, 8);
  const best = contractors[0];
  const worst = contractors[contractors.length - 1];

  return (
    <div className="space-y-14">
      <div className="rise">
        <PageHeader eyebrow="Mumbai monsoon roads, Jun to Sep 2025" title="Where did the road repair money go, did the fixes hold, and where should the next rupee go?">
          {inrShort(spent)} was spent on {int(jobs)} repairs across 24 wards. Here is what it bought, who did the work, and what is still broken.
        </PageHeader>
        <div className="flex flex-wrap gap-3">
          <ButtonLink href="#map">See the wards</ButtonLink>
          <ButtonLink href="/complaint" variant="ghost">
            Check a complaint
          </ButtonLink>
        </div>
      </div>

      <section aria-label="Key numbers" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Spent against a budget of" value={inrShort(spent)} hint={`${inrShort(budget)} budgeted. ${overBudget} wards are over budget.`} />
        <Stat label="Repairs that failed within 30 days" value={pct(trail.fixed_issues_that_failed_pct, 1)} tone="danger" hint={`${inrShort(trail.spend_on_failed_inr)} went on fixes that did not last.`} />
        <Stat label="Jobs listed for billing review" value={int(audit.city.billing_flagged_work_orders)} tone="accent" hint={`${inrShort(audit.city.billing_flagged_cost_inr)} billed on those jobs. Each links to its evidence.`} />
        <Stat label="Complaints still not fixed" value={int(openIssues)} hint={`About ${inrShort(need)} to fix them, against ${inrShort(headroom)} of budget left.`} />
      </section>

      <section id="map" aria-labelledby="map-h" className="scroll-mt-20">
        <SectionTitle id="map-h" aside="Select a ward to open it">
          The 24 wards
        </SectionTitle>
        <Card>
          <div className="mx-auto max-w-xl">
            <WardMap wards={mapWards} width={W} height={H} />
          </div>
        </Card>
      </section>

      <section aria-labelledby="need-h">
        <SectionTitle id="need-h" aside="Ranked by how serious the open complaints are">
          Where the next rupee is needed most
        </SectionTitle>
        <TableWrap label="Wards ranked by need">
          <table className="w-full min-w-[40rem]">
            <thead className="border-b border-border">
              <tr>
                <th className={th}>Ward</th>
                <th className={`${th} text-right`}>Open issues</th>
                <th className={`${th} text-right`}>Cost to fix</th>
                <th className={`${th} text-right`}>Budget left</th>
                <th className={th}>Position</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {topNeed.map((w) => {
                const p = plan.wards.find((x) => x.ward_code === w.ward_code)!;
                return (
                  <tr key={w.ward_code} className="hover:bg-surface-2">
                    <td className={td}>
                      <Link href={`/ward/${wardSlug(w.ward_code)}`} className={`${link} font-medium`}>
                        {w.ward_code}
                      </Link>
                      <span className="ml-2 text-muted">{w.ward_name}</span>
                    </td>
                    <td className={`${td} num text-right`}>{w.open_issues}</td>
                    <td className={`${td} num text-right`}>{inrShort(p.need_inr)}</td>
                    <td className={`${td} num text-right`}>{inrShort(w.remaining_budget_inr ?? 0)}</td>
                    <td className={td}>{w.over_budget ? <Badge tone="danger">Over budget</Badge> : p.funded_issues >= p.open_issues ? <Badge tone="success">Budget covers all</Badge> : <Badge tone="warn">Covers {p.funded_issues} of {p.open_issues}</Badge>}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </TableWrap>
      </section>

      <section aria-labelledby="who-h" className="grid gap-4 md:grid-cols-3">
        <h2 id="who-h" className="sr-only">
          Explore
        </h2>
        <Card className="flex flex-col">
          <h3 className="font-serif text-xl font-semibold">Audit</h3>
          <p className="mt-2 flex-1 text-sm text-muted">
            {audit.city.by_type.over_billed?.count} jobs were billed far above the rate card, {audit.city.by_type.double_billed?.count} look like repeat bills, and {audit.city.by_type.dlp_paid?.count} repairs were paid for on roads still under warranty.
          </p>
          <Link href="/audit" className={`${link} mt-4 text-sm font-medium`}>
            Open the audit
          </Link>
        </Card>
        <Card className="flex flex-col">
          <h3 className="font-serif text-xl font-semibold">Contractors</h3>
          <p className="mt-2 flex-1 text-sm text-muted">
            Scored against what is expected for the same kind of work. Best this season: {best.contractor_name.replace(" (synthetic)", "")} (grade {best.grade}). Lowest: {worst.contractor_name.replace(" (synthetic)", "")} (grade {worst.grade}).
          </p>
          <Link href="/contractors" className={`${link} mt-4 text-sm font-medium`}>
            See the scorecards
          </Link>
        </Card>
        <Card className="flex flex-col">
          <h3 className="font-serif text-xl font-semibold">What happened to my complaint?</h3>
          <p className="mt-2 flex-1 text-sm text-muted">
            Look up a complaint number to see the repair it led to, who did it, what it cost and whether it held.
          </p>
          <Link href="/complaint" className={`${link} mt-4 text-sm font-medium`}>
            Look up a complaint
          </Link>
        </Card>
      </section>
    </div>
  );
}
