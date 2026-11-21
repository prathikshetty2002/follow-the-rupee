import Link from "next/link";
import { Badge, Card, PageHeader, SectionTitle, TableWrap, link, td, th } from "@/components/ui";
import { WardMap, type MapWard } from "@/components/ward-map";
import { getNextRupee, getWardGeo, getWards } from "@/lib/data";
import { inrShort, int, wardSlug } from "@/lib/format";
import { projectFeatures } from "@/lib/map";

const W = 560;
const H = 640;

export default async function Home() {
  const [plan, wards, geo] = await Promise.all([getNextRupee(), getWards(), getWardGeo()]);
  const byCode = new Map(plan.wards.map((w) => [w.ward_code, w]));
  const wardInfo = new Map(wards.map((w) => [w.ward_code, w]));

  const covers = (code: string) => {
    const p = byCode.get(code)!;
    if (p.funded_issues >= p.open_issues) return <Badge tone="success">Covers all {p.open_issues}</Badge>;
    if (p.remaining_budget_inr <= 0) return <Badge tone="danger">Over budget: only free repairs</Badge>;
    return <Badge tone="warn">Covers {p.funded_issues} of {p.open_issues}</Badge>;
  };

  const { paths, centroids } = projectFeatures(geo.features, W, H);
  const mapWards: MapWard[] = geo.features.map((f, i) => {
    const p = byCode.get(f.properties.ward_code)!;
    return {
      slug: f.properties.slug,
      code: f.properties.ward_code,
      name: f.properties.ward_name,
      d: paths[i],
      cx: centroids[i][0],
      cy: centroids[i][1],
      need: p.risk_score,
      openIssues: p.open_issues,
      budgetLeft: inrShort(p.remaining_budget_inr),
      covered: p.funded_issues >= p.open_issues ? "Budget covers all." : p.remaining_budget_inr <= 0 ? "Over budget." : `Budget covers ${p.funded_issues}.`,
    };
  });
  const rows = [...plan.wards].sort((a, b) => b.risk_score - a.risk_score);

  return (
    <div className="space-y-14">
      <div className="rise">
        <PageHeader eyebrow="Mumbai monsoon roads, Jun to Sep 2025" title="Where should the next rupee go?">
          Pick a ward. The planner ranks every open road complaint by risk, then shows what the ward&apos;s remaining budget can fix, with the working behind every score.
        </PageHeader>
        <ol className="grid max-w-4xl gap-3 sm:grid-cols-3">
          {[
            ["1. Rank by risk", "Seriousness, flooding, past trouble, traffic, accidents, hospitals and schools."],
            ["2. Fit the budget", "Change the budget and see exactly what it pays for, and what it leaves out."],
            ["3. Check the working", "Each score is broken down, with a confidence note and how it was tested."],
          ].map(([t, d]) => (
            <li key={t} className="rounded-xl border border-border bg-surface p-4">
              <p className="font-medium">{t}</p>
              <p className="mt-1 text-sm leading-snug text-muted">{d}</p>
            </li>
          ))}
        </ol>
      </div>

      <section aria-labelledby="pick-h" className="grid gap-8 lg:grid-cols-[minmax(0,26rem)_minmax(0,1fr)] lg:items-start">
        <div className="min-w-0">
          <SectionTitle id="pick-h">Choose a ward</SectionTitle>
          <Card>
            <WardMap wards={mapWards} width={W} height={H} />
          </Card>
        </div>
        <div className="min-w-0">
          <SectionTitle aside="Most serious open issues first">All 24 wards</SectionTitle>
          <TableWrap label="Wards ranked by how serious their open issues are">
            <table className="w-full min-w-[36rem]">
              <thead className="border-b border-border">
                <tr>
                  <th className={th}>Ward</th>
                  <th className={`${th} text-right`}>Open issues</th>
                  <th className={`${th} text-right`}>Cost to fix all</th>
                  <th className={`${th} text-right`}>Budget left</th>
                  <th className={th}>Budget left covers</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map((p) => (
                  <tr key={p.ward_code} className="hover:bg-surface-2">
                    <td className={td}>
                      <Link href={`/plan/${wardSlug(p.ward_code)}`} className={`${link} font-medium`}>
                        {p.ward_code}
                      </Link>
                      <span className="ml-2 text-muted">{wardInfo.get(p.ward_code)?.ward_name}</span>
                    </td>
                    <td className={`${td} num text-right`}>{int(p.open_issues)}</td>
                    <td className={`${td} num text-right`}>{inrShort(p.need_inr)}</td>
                    <td className={`${td} num text-right`}>{inrShort(p.remaining_budget_inr)}</td>
                    <td className={td}>{covers(p.ward_code)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableWrap>
        </div>
      </section>
    </div>
  );
}
