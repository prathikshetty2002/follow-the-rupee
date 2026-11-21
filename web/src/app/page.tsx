import Link from "next/link";
import { MumbaiSkyline } from "@/components/mumbai-skyline";
import { Card, Chip, Display, TableWrap, btnPrimary, td, th } from "@/components/ui";
import { WardMap, type MapWard } from "@/components/ward-map";
import { getNextRupee, getWardGeo, getWards } from "@/lib/data";
import { inrShort, int, wardSlug } from "@/lib/format";
import { projectFeatures } from "@/lib/map";

const W = 560;
const H = 640;

function Stat({ value, label, note }: { value: string; label: string; note?: string }) {
  return (
    <div className="glass rounded-2xl px-5 py-4 text-left">
      <p className="num text-3xl font-semibold leading-none">{value}</p>
      <p className="mt-2 text-sm font-medium">{label}</p>
      {note && <p className="mt-0.5 text-sm text-muted">{note}</p>}
    </div>
  );
}

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
    return { slug: f.properties.slug, code: f.properties.ward_code, name: f.properties.ward_name, d: paths[i], cx: centroids[i][0], cy: centroids[i][1], need: p.risk_score, openIssues: p.open_issues, budgetLeft: inrShort(p.remaining_budget_inr), covered: "" };
  });
  const rows = [...plan.wards].sort((a, b) => b.risk_score - a.risk_score);

  return (
    <div className="space-y-20">
      <section aria-labelledby="hero-h" className="soft relative overflow-hidden rounded-[2rem] px-5 pb-8 pt-14 text-center sm:px-12 sm:pt-20" style={{ background: "linear-gradient(180deg, var(--peach) 0%, color-mix(in oklab, var(--peach) 30%, var(--card)) 52%, var(--mist) 100%)" }}>
        <div className="relative z-10 mx-auto max-w-3xl">
          <div className="mb-7 flex justify-center">
            <Chip>Mumbai monsoon roads, June to September 2025</Chip>
          </div>
          <Display id="hero-h" accent="next rupee" className="text-5xl sm:text-7xl">
            Where should the next rupee go?
          </Display>
          <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-muted">Pick a ward. The planner ranks every open road issue by risk, then shows what the ward&apos;s remaining budget should fix first, with the arithmetic behind every score.</p>
          <div className="mt-9 flex justify-center">
            <a href="#wards" className={btnPrimary}>
              Choose a ward <span aria-hidden>↗</span>
            </a>
          </div>
        </div>
        <div className="relative mt-12 h-48 sm:h-64">
          <MumbaiSkyline className="absolute inset-x-[-5%] bottom-[-2rem] h-[20rem] w-[110%] sm:h-[26rem]" />
        </div>
        <dl className="relative z-10 mx-auto -mt-16 grid max-w-3xl gap-3 sm:-mt-20 sm:grid-cols-3">
          <Stat value={int(openIssues)} label="Open road issues" note="Complaints with no repair ordered" />
          <Stat value={inrShort(need)} label="Cost to fix them all" note="Typical job costs" />
          <Stat value={inrShort(left)} label="Budget left in total" note={`${over} wards are already over budget`} />
        </dl>
      </section>

      <div id="wards" className="grid scroll-mt-6 gap-x-8 gap-y-10 lg:grid-cols-[minmax(0,1fr)_21rem]">
        <section aria-labelledby="wards-h" className="min-w-0">
          <div className="mb-6">
            <Display as="h2" id="wards-h" accent="ward" className="text-4xl">
              Choose a ward
            </Display>
            <p className="mt-2 text-muted">Most serious open issues first. The bar shows how much of each ward&apos;s open issues its remaining budget pays for.</p>
          </div>
          <Card className="!p-2 sm:!p-4">
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
                      <tr key={p.ward_code} className="hover:bg-mist/60">
                        <th scope="row" className={`${td} text-left font-normal`}>
                          <Link href={`/plan/${wardSlug(p.ward_code)}`} className="-my-4 inline-flex min-h-11 items-center gap-3 py-4 hover:underline hover:decoration-glow hover:decoration-2 hover:underline-offset-4">
                            <span className="num inline-flex min-w-10 justify-center rounded-full bg-mist px-2.5 py-0.5 text-xs font-semibold">{p.ward_code}</span>
                            <span className="font-medium">{name.get(p.ward_code)}</span>
                          </Link>
                        </th>
                        <td className={`${td} num text-right`}>{int(p.open_issues)}</td>
                        <td className={`${td} num text-right`}>{inrShort(p.need_inr)}</td>
                        <td className={`${td} num text-right ${p.over_budget ? "font-semibold text-accent-ink" : ""}`}>{inrShort(p.remaining_budget_inr)}</td>
                        <td className={td}>
                          <span className="num block text-sm">
                            {p.funded_issues >= p.open_issues ? `All ${p.open_issues}` : `${p.funded_issues} of ${p.open_issues}`}
                            {p.over_budget && <span className="text-accent-ink"> · over budget</span>}
                          </span>
                          <span aria-hidden className="mt-1.5 block h-2 w-32 overflow-hidden rounded-full bg-unpaid">
                            <span className="block h-2 rounded-full bg-sea-fill" style={{ width: `${share * 100}%` }} />
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </TableWrap>
          </Card>
        </section>

        <aside aria-label="Map of wards" className="lg:sticky lg:top-6 lg:self-start">
          <Card className="!p-5">
            <WardMap wards={mapWards} width={W} height={H} />
          </Card>
        </aside>
      </div>
    </div>
  );
}
