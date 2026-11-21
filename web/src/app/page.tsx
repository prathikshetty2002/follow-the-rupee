import Link from "next/link";
import { PageTitle, TableWrap, td, th } from "@/components/ui";
import { WardMap, type MapWard } from "@/components/ward-map";
import { getNextRupee, getWardGeo, getWards } from "@/lib/data";
import { inrShort, int, wardSlug } from "@/lib/format";
import { projectFeatures } from "@/lib/map";

const W = 560;
const H = 640;

export default async function Home() {
  const [plan, wards, geo] = await Promise.all([getNextRupee(), getWards(), getWardGeo()]);
  const byCode = new Map(plan.wards.map((w) => [w.ward_code, w]));
  const name = new Map(wards.map((w) => [w.ward_code, w.ward_name]));

  const openIssues = plan.wards.reduce((s, w) => s + w.open_issues, 0);
  const need = plan.wards.reduce((s, w) => s + w.need_inr, 0);
  const left = plan.wards.reduce((s, w) => s + Math.max(w.remaining_budget_inr, 0), 0);
  const over = plan.wards.filter((w) => w.over_budget).length;

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
      covered: "",
    };
  });
  const rows = [...plan.wards].sort((a, b) => b.risk_score - a.risk_score);

  return (
    <div className="space-y-14">
      <PageTitle kicker="Mumbai monsoon roads, June to September 2025" title="Where should the next rupee go?">
        <p>
          <span className="num text-foreground">{int(openIssues)}</span> open road issues need about <span className="num text-foreground">{inrShort(need)}</span> to fix. The wards have <span className="num text-foreground">{inrShort(left)}</span> left between them, and {over} are already over budget. Choose a ward to see what its budget should fix first.
        </p>
      </PageTitle>

      <div className="grid gap-x-12 gap-y-10 lg:grid-cols-[minmax(0,1fr)_21rem]">
        <section aria-labelledby="wards-h" className="min-w-0 border-t-2 border-foreground pt-4">
          <h2 id="wards-h" className="mb-1 text-2xl font-bold">
            All 24 wards
          </h2>
          <p className="mb-5 text-sm text-muted">Most serious open issues first. The bar shows how much of the ward&apos;s open issues its remaining budget pays for.</p>
          <TableWrap label="Wards ranked by how serious their open issues are">
            <table className="w-full min-w-[40rem]">
              <caption className="sr-only">Wards, their open issues, the cost to fix them all, and what the remaining budget covers</caption>
              <thead>
                <tr>
                  <th scope="col" className={th}>Ward</th>
                  <th scope="col" className={`${th} text-right`}>Open</th>
                  <th scope="col" className={`${th} text-right`}>Cost to fix all</th>
                  <th scope="col" className={`${th} text-right`}>Budget left</th>
                  <th scope="col" className={th}>Paid for with budget left</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((p) => {
                  const share = p.open_issues ? p.funded_issues / p.open_issues : 0;
                  return (
                    <tr key={p.ward_code} className="hover:bg-foreground/5">
                      <th scope="row" className={`${td} text-left font-normal`}>
                        <Link href={`/plan/${wardSlug(p.ward_code)}`} className="-my-3 inline-flex min-h-11 items-center gap-3 py-3 hover:underline hover:decoration-accent hover:decoration-2 hover:underline-offset-4">
                          <span className="num font-semibold">{p.ward_code}</span>
                          <span>{name.get(p.ward_code)}</span>
                        </Link>
                      </th>
                      <td className={`${td} num text-right`}>{int(p.open_issues)}</td>
                      <td className={`${td} num text-right`}>{inrShort(p.need_inr)}</td>
                      <td className={`${td} num text-right ${p.over_budget ? "font-semibold text-accent" : ""}`}>{inrShort(p.remaining_budget_inr)}</td>
                      <td className={td}>
                        <span className="num block text-sm">
                          {p.funded_issues >= p.open_issues ? `All ${p.open_issues}` : `${p.funded_issues} of ${p.open_issues}`}
                          {p.over_budget && <span className="text-accent"> · over budget</span>}
                        </span>
                        <span aria-hidden className="mt-1.5 block h-1.5 w-32 bg-rule">
                          <span className="block h-1.5 bg-foreground" style={{ width: `${share * 100}%` }} />
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </TableWrap>
        </section>

        <aside aria-label="Map of wards" className="lg:sticky lg:top-6 lg:self-start">
          <WardMap wards={mapWards} width={W} height={H} />
        </aside>
      </div>
    </div>
  );
}
