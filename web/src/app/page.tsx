import Link from "next/link";
import { Suspense } from "react";
import { Churchgate } from "@/components/churchgate";
import { Card, Chip, Display, TableWrap, btnPrimary, btnQuiet, td, th } from "@/components/ui";
import type { StageData } from "@/components/stage/types";
import { WardStage } from "@/components/stage/ward-stage";
import { getNextRupee, getOpenIssuePoints, getRoadGeo, getWardGeo, getWards } from "@/lib/data";
import { inrShort, int, wardSlug } from "@/lib/format";
import { projectFeatures } from "@/lib/map";

const W = 900;
const H = 1200;

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
  const [plan, wards, geo, roadGeo, points] = await Promise.all([getNextRupee(), getWards(), getWardGeo(), getRoadGeo(), getOpenIssuePoints()]);
  const byCode = new Map(plan.wards.map((w) => [w.ward_code, w]));
  const name = new Map(wards.map((w) => [w.ward_code, w.ward_name]));

  const openIssues = plan.wards.reduce((s, w) => s + w.open_issues, 0);
  const need = plan.wards.reduce((s, w) => s + w.need_inr, 0);
  const left = plan.wards.reduce((s, w) => s + Math.max(w.remaining_budget_inr, 0), 0);
  const over = plan.wards.filter((w) => w.over_budget).length;

  const proj = projectFeatures(geo.features, W, H, 0);
  const stage: StageData = {
    width: W,
    height: H,
    wards: geo.features.map((f, i) => {
      const p = byCode.get(f.properties.ward_code)!;
      return {
        code: f.properties.ward_code,
        slug: f.properties.slug,
        name: f.properties.ward_name,
        zone: f.properties.zone,
        d: proj.paths[i],
        box: proj.bounds[i],
        cx: proj.centroids[i][0],
        cy: proj.centroids[i][1],
        risk: p.risk_score,
        open: p.open_issues,
        funded: p.funded_issues,
        needInr: p.need_inr,
        leftInr: Math.max(p.remaining_budget_inr, 0),
        over: p.over_budget,
        top: p.issues.slice(0, 3).map((i) => ({ rank: i.rank, road: i.road_name, type: i.work_type, costInr: i.cost_to_bmc_inr, funded: i.funded })),
      };
    }),
    roads: roadGeo.features.map((f) => ({ d: proj.path(f), ward: f.properties.ward_code, hot: f.properties.open_issues > 0 })),
    dots: points.features.map((f) => {
      const [x, y] = proj.point(...(f.geometry.coordinates as [number, number]));
      return { x, y, ward: f.properties.ward_code, rank: f.properties.rank, funded: f.properties.funded };
    }),
  };
  const rows = [...plan.wards].sort((a, b) => b.risk_score - a.risk_score);

  return (
    <div className="space-y-16">
      <section aria-labelledby="hero-h" className="soft relative isolate h-[42rem] overflow-hidden rounded-[2rem] sm:h-[47rem]" style={{ background: "linear-gradient(180deg, var(--peach) 0%, color-mix(in oklab, var(--peach) 35%, var(--card)) 45%, var(--mist) 100%)" }}>
        <Churchgate className="absolute inset-0 -z-10 size-full" />
        <div className="relative mx-auto max-w-3xl px-5 pt-12 text-center sm:px-12 sm:pt-16">
          <div className="mb-6 flex justify-center">
            <Chip>Mumbai monsoon roads, June to September 2025</Chip>
          </div>
          <Display id="hero-h" accent="next rupee" className="text-5xl sm:text-7xl">
            Where should the next rupee go?
          </Display>
          <p className="mx-auto mt-5 max-w-xl text-lg leading-relaxed text-muted">Pick a ward on the map. The planner ranks every open road issue by risk, then shows what the ward&apos;s remaining budget should fix first, with the arithmetic behind every score.</p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <a href="#map" className={btnPrimary}>
              Explore the map <span aria-hidden>↓</span>
            </a>
            <Link href="/method" className={btnQuiet}>
              How it works
            </Link>
          </div>
        </div>
      </section>

      <div id="map" className="scroll-mt-4">
        <Suspense fallback={<div aria-hidden className="stage h-[min(50rem,calc(100dvh-5.5rem))] min-h-[44rem] rounded-[2rem] sm:min-h-[40rem]" />}>
          <WardStage data={stage} />
        </Suspense>
      </div>

      <dl className="grid gap-3 sm:grid-cols-3">
        <Stat value={int(openIssues)} label="Open road issues" note="Complaints with no repair ordered" />
        <Stat value={inrShort(need)} label="Cost to fix them all" note="Typical job costs" />
        <Stat value={inrShort(left)} label="Budget left in total" note={`${over} wards are already over budget`} />
      </dl>

      <div id="wards" className="scroll-mt-6">
        <section aria-labelledby="wards-h" className="min-w-0">
          <div className="mb-6">
            <Display as="h2" id="wards-h" accent="table" className="text-4xl">
              Every ward, in a table
            </Display>
            <p className="mt-2 text-muted">The same wards as the map, most serious open issues first. The bar shows how much of each ward&apos;s open issues its remaining budget pays for.</p>
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

      </div>
    </div>
  );
}
