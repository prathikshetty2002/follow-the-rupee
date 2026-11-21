import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { PageSkeleton } from "@/components/skeletons";
import { Badge, BudgetBar, Card, FactorBar, PageHeader, SectionTitle, Stat, TableWrap, VsExpected, link, td, th } from "@/components/ui";
import { getContractors, getOpenIssuePoints, getRoadGeo, getWardBundle, getWardGeo, getWards } from "@/lib/data";
import { FLAG_LABEL, SEVERITY_ORDER, gradeTone, inr, inrShort, int, pct, severityTone, slugToWard, verdictTone, wardSlug } from "@/lib/format";
import { projectFeatures } from "@/lib/map";
import type { NextRupeeIssue, WardBundle } from "@/lib/types";

export async function generateStaticParams() {
  return (await getWards()).map((w) => ({ slug: wardSlug(w.ward_code) }));
}

export async function generateMetadata(props: PageProps<"/ward/[slug]">): Promise<Metadata> {
  const { slug } = await props.params;
  const w = (await getWards()).find((x) => wardSlug(x.ward_code) === slug);
  return { title: w ? `Ward ${w.ward_code}: ${w.ward_name}` : "Ward" };
}

async function load(slug: string): Promise<WardBundle> {
  try {
    return await getWardBundle(slugToWard(slug));
  } catch {
    notFound();
  }
}

export default function WardPage(props: PageProps<"/ward/[slug]">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <WardContent params={props.params} />
    </Suspense>
  );
}

async function WardContent({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [b, contractors, wardGeo, roadGeo, points] = await Promise.all([load(slug), getContractors(), getWardGeo(), getRoadGeo(), getOpenIssuePoints()]);
  const { ward: w, plan, audit } = b;
  const names = Object.fromEntries(contractors.map((c) => [c.contractor_id, c.contractor_name.replace(" (synthetic)", "")]));
  const used = w.spend_inr / w.budget_inr;
  const adj = w.adjusted;
  const floodProne = w.low_lying_index >= 0.6;

  const billing = b.flags.filter((f) => f.kind === "billing").sort((a, z) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[z.severity] || z.amount_at_risk_inr - a.amount_at_risk_inr);
  const failed = b.issues.filter((i) => i.status === "fixed_failed" && i.work_order).sort((a, z) => z.work_order!.cost_inr - a.work_order!.cost_inr);
  const byStatus = (s: string) => b.issues.filter((i) => i.status === s);
  const top = plan.issues.slice(0, 10);
  const rest = plan.issues.slice(10);

  return (
    <div className="space-y-12">
      <div className="rise">
        <p className="mb-3 text-sm">
          <Link href="/" className={link}>
            All wards
          </Link>
        </p>
        <PageHeader eyebrow={`Ward ${w.ward_code}`} title={w.ward_name}>
          <p>{w.summary}</p>
        </PageHeader>
        <div className="flex flex-wrap gap-2">
          {w.over_budget && <Badge tone="danger">Over budget</Badge>}
          {floodProne && <Badge tone="info" title={`Flood index ${w.low_lying_index.toFixed(2)} out of 1`}>Flood-prone ward</Badge>}
          <Badge tone="neutral">{int(w.work_orders)} repairs this season</Badge>
          {w.summary_source === "claude" && <Badge tone="neutral" title="Written by Claude from the numbers on this page, then checked automatically">Summary written by Claude</Badge>}
        </div>
      </div>

      <section aria-label="Key numbers" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-border bg-surface p-4 sm:p-5">
          <p className="text-sm text-muted">Budget used</p>
          <p className={`num mt-1 text-2xl font-semibold sm:text-3xl ${w.over_budget ? "text-danger" : ""}`}>{pct(used)}</p>
          <div className="my-2">
            <BudgetBar spent={w.spend_inr} budget={w.budget_inr} />
          </div>
          <p className="text-sm text-muted">
            {inrShort(w.spend_inr)} of {inrShort(w.budget_inr)}
          </p>
        </div>
        <Stat label="Spent on repairs that failed" value={inrShort(w.spend_on_failed_inr)} tone="danger" hint={`${pct(w.reopen_rate)} of repairs were redone within 30 days.`} />
        <Stat label="Listed for billing review" value={int(audit.billing_flagged_work_orders)} tone="accent" hint={`${inrShort(audit.billing_flagged_cost_inr)} billed on those jobs.`} />
        <Stat label="Open complaints" value={int(plan.open_issues)} hint={`About ${inrShort(plan.need_inr)} to fix. ${inrShort(plan.remaining_budget_inr)} of budget left.`} />
      </section>

      {adj && (
        <Card as="section">
          <h2 className="font-serif text-xl font-semibold">How the work held up, for the kind of work done here</h2>
          <p className="mt-1 text-sm text-muted">The marker is what is expected for the same repair methods, road types and weather. A small gap is normal variation.</p>
          <div className="mt-5 grid gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <VsExpected label="Repairs redone within 30 days" actual={w.reopen_rate} expected={adj.reopen_expected_rate} format={(n) => pct(n)} higherIsBetter={false} />
              <Badge tone={verdictTone(adj.reopen_verdict)}>{adj.reopen_verdict}</Badge>
            </div>
            <div className="space-y-2">
              <VsExpected label="Fixed within the target time" actual={w.sla_met_rate} expected={adj.sla_expected_rate} format={(n) => pct(n)} higherIsBetter />
              <Badge tone={verdictTone(adj.sla_verdict)}>{adj.sla_verdict}</Badge>
            </div>
          </div>
        </Card>
      )}

      <section aria-labelledby="next-h">
        <SectionTitle id="next-h" aside={`${plan.funded_issues} of ${plan.open_issues} fit the ${inrShort(plan.remaining_budget_inr)} left`}>
          Where the next rupee should go
        </SectionTitle>
        {plan.banner && (
          <div role="note" className="mb-4 rounded-xl border border-danger/30 bg-danger-soft p-4 text-sm text-danger">
            {plan.banner} Only repairs on roads still under warranty are shown as funded, because the original contractor does them at no cost to BMC.
          </div>
        )}
        <ol className="space-y-3">
          {top.map((i) => (
            <IssueCard key={i.issue_id} i={i} names={names} />
          ))}
        </ol>
        {rest.length > 0 && (
          <details className="group mt-3">
            <summary className="inline-flex min-h-11 items-center rounded-lg border border-border bg-surface px-4 text-sm font-medium hover:bg-surface-2">
              Show the other {rest.length} open issues
            </summary>
            <ol start={11} className="mt-3 space-y-3">
              {rest.map((i) => (
                <IssueCard key={i.issue_id} i={i} names={names} />
              ))}
            </ol>
          </details>
        )}
      </section>

      <section aria-labelledby="map-h">
        <SectionTitle id="map-h" aside="Bigger dots are more serious">
          Open complaints on the map
        </SectionTitle>
        <Card>
          <WardLocalMap code={w.ward_code} wardGeo={wardGeo} roadGeo={roadGeo} points={points} />
        </Card>
      </section>

      <section aria-labelledby="flags-h">
        <SectionTitle id="flags-h" aside={<Link href={`/audit?ward=${encodeURIComponent(w.ward_code)}`} className={link}>All flags for this ward</Link>}>
          Billing items listed for review
        </SectionTitle>
        {billing.length === 0 ? (
          <p className="text-sm text-muted">No billing items are listed for review in this ward.</p>
        ) : (
          <TableWrap label="Billing flags">
            <table className="w-full min-w-[52rem]">
              <thead className="border-b border-border">
                <tr>
                  <th className={th}>Why it is listed</th>
                  <th className={th}>Work order</th>
                  <th className={th}>Contractor</th>
                  <th className={`${th} text-right`}>Billed</th>
                  <th className={th}>Detail</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {billing.slice(0, 12).map((f) => (
                  <tr key={`${f.work_order_id}-${f.flag_type}`} className="hover:bg-surface-2">
                    <td className={td}>
                      <div className="flex flex-col items-start gap-1">
                        <span className="font-medium">{FLAG_LABEL[f.flag_type]}</span>
                        <Badge tone={severityTone(f.severity)}>{f.severity}</Badge>
                      </div>
                    </td>
                    <td className={td}>
                      <Link href={`/work-order/${f.work_order_id}`} className={`${link} num`}>
                        {f.work_order_id}
                      </Link>
                    </td>
                    <td className={td}>{names[f.contractor_id]}</td>
                    <td className={`${td} num text-right`}>{inr(f.cost_inr ?? 0)}</td>
                    <td className={`${td} max-w-md text-muted`}>{f.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableWrap>
        )}
      </section>

      <section aria-labelledby="failed-h">
        <SectionTitle id="failed-h" aside={`${failed.length} repairs failed; the biggest are below`}>
          Fixes that did not last
        </SectionTitle>
        {failed.length === 0 ? (
          <p className="text-sm text-muted">No repairs failed within 30 days in this ward.</p>
        ) : (
          <ul className="space-y-2">
            {failed.slice(0, 5).map((i) => (
              <li key={i.issue_id} className="rounded-xl border border-border bg-surface p-4 text-sm leading-relaxed">
                {i.trail}{" "}
                <Link href={`/work-order/${i.work_order!.work_order_id}`} className={link}>
                  See the work order
                </Link>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-3 text-sm text-muted">
          Of {int(b.issues.length)} complaint groups in this ward: {int(byStatus("fixed").length)} fixed and held, {int(failed.length)} fixed then failed, {int(byStatus("never_fixed").length)} not fixed yet, {int(byStatus("not_bmc_scope").length)} outside BMC&apos;s scope.
        </p>
      </section>

      <section aria-labelledby="who-h">
        <SectionTitle id="who-h">Who did the work here</SectionTitle>
        <TableWrap label="Contractors in this ward">
          <table className="w-full min-w-[34rem]">
            <thead className="border-b border-border">
              <tr>
                <th className={th}>Contractor</th>
                <th className={`${th} text-right`}>Repairs</th>
                <th className={`${th} text-right`}>Billed</th>
                <th className={`${th} text-right`}>Redone</th>
                <th className={th}>Grade citywide</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {b.contractors.map((c) => (
                <tr key={c.contractor_id} className="hover:bg-surface-2">
                  <td className={td}>
                    <Link href={`/contractors/${c.contractor_id}`} className={link}>
                      {names[c.contractor_id]}
                    </Link>
                  </td>
                  <td className={`${td} num text-right`}>{c.jobs}</td>
                  <td className={`${td} num text-right`}>{inrShort(c.spend_inr)}</td>
                  <td className={`${td} num text-right`}>{pct(c.reopen_rate)}</td>
                  <td className={td}>
                    <Badge tone={gradeTone(c.grade)}>Grade {c.grade}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableWrap>
      </section>
    </div>
  );
}

function IssueCard({ i, names }: { i: NextRupeeIssue; names: Record<string, string> }) {
  const contractors = i.recommended_contractors.map((c) => names[c] ?? c).join(", ");
  return (
    <li className="rounded-xl border border-border bg-surface p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="num flex size-9 shrink-0 items-center justify-center rounded-full bg-surface-2 text-sm font-semibold" aria-label={`Rank ${i.rank}`}>
            {i.rank}
          </span>
          <div>
            <h3 className="font-medium leading-snug">
              {i.work_type} on {i.road_name}
            </h3>
            <p className="text-sm text-muted">{i.locality}{i.n_complaints > 1 ? `, ${i.n_complaints} complaints` : ""}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {i.dlp ? <Badge tone="info">Free: road under warranty</Badge> : i.funded ? <Badge tone="success">Fits the budget left</Badge> : <Badge tone="warn">Not covered by budget left</Badge>}
          <span className="num rounded-lg bg-surface-2 px-2.5 py-1 text-sm font-semibold" title="Priority score out of 100">
            {Math.round(i.priority_score)}
            <span className="font-normal text-muted">/100</span>
          </span>
        </div>
      </div>
      <div className="mt-4">
        <FactorBar factors={i.factors} />
      </div>
      <ul className="mt-4 list-disc space-y-1 pl-5 text-sm leading-relaxed">
        {i.reasons.map((r) => (
          <li key={r}>{r}</li>
        ))}
      </ul>
      <dl className="mt-4 grid gap-x-6 gap-y-2 border-t border-border pt-4 text-sm sm:grid-cols-3">
        <div>
          <dt className="text-muted">Best repair method</dt>
          <dd className="font-medium">{i.recommended_method}</dd>
        </div>
        <div>
          <dt className="text-muted">Cost to BMC</dt>
          <dd className="num font-medium">{i.cost_to_bmc_inr === 0 ? "₹0 (original contractor)" : inr(i.cost_to_bmc_inr)}</dd>
        </div>
        <div>
          <dt className="text-muted">Suggested contractors</dt>
          <dd className="font-medium">{contractors}</dd>
          {!i.dlp && <dd className="text-muted">Expected to fail about {pct(i.expected_reopen_rate)} of the time</dd>}
        </div>
      </dl>
      <p className="mt-3 text-xs text-muted">
        Complaint{i.complaint_ids.length > 1 ? "s" : ""}:{" "}
        {i.complaint_ids.slice(0, 3).map((c, k) => (
          <span key={c}>
            {k > 0 && ", "}
            <Link href={`/complaint?id=${c}`} className={`${link} num`}>
              {c}
            </Link>
          </span>
        ))}
        {i.complaint_ids.length > 3 && ` and ${i.complaint_ids.length - 3} more`}
      </p>
    </li>
  );
}

function WardLocalMap({ code, wardGeo, roadGeo, points }: { code: string; wardGeo: Awaited<ReturnType<typeof getWardGeo>>; roadGeo: Awaited<ReturnType<typeof getRoadGeo>>; points: Awaited<ReturnType<typeof getOpenIssuePoints>> }) {
  const ward = wardGeo.features.find((f) => f.properties.ward_code === code);
  if (!ward) return null;
  const roads = roadGeo.features.filter((f) => f.properties.ward_code === code);
  const pts = points.features.filter((f) => f.properties.ward_code === code);
  const Wd = 720;
  const Hd = 420;
  const proj = projectFeatures([ward], Wd, Hd, 14);
  return (
    <div>
      <svg viewBox={`0 0 ${Wd} ${Hd}`} role="img" aria-label={`Map of ward ${code} with ${pts.length} open complaints`} className="h-auto w-full">
        <path d={proj.paths[0]} className="fill-surface-2 stroke-border" strokeWidth={1.5} />
        {roads.map((r) => (
          <path key={r.properties.road_id} d={proj.path(r)} fill="none" className={r.properties.open_issues > 0 ? "stroke-accent/50" : "stroke-border"} strokeWidth={r.properties.open_issues > 0 ? 2 : 1} strokeLinecap="round" />
        ))}
        {pts.map((p) => {
          const [lon, lat] = p.geometry.coordinates as [number, number];
          const [x, y] = proj.point(lon, lat);
          const r = 3 + (p.properties.priority_score / 100) * 9;
          return (
            <circle key={p.properties.plan_issue_id} cx={x} cy={y} r={r} className={p.properties.funded || p.properties.dlp ? "fill-accent/80 stroke-background" : "fill-danger/70 stroke-background"} strokeWidth={1.5}>
              <title>{`#${p.properties.rank} ${p.properties.category} on ${p.properties.road_name}: score ${Math.round(p.properties.priority_score)}`}</title>
            </circle>
          );
        })}
      </svg>
      <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted">
        <li className="flex items-center gap-1.5">
          <span className="inline-block size-2.5 rounded-full bg-accent/80" aria-hidden /> Fits the budget left, or free under warranty
        </li>
        <li className="flex items-center gap-1.5">
          <span className="inline-block size-2.5 rounded-full bg-danger/70" aria-hidden /> Not covered by the budget left
        </li>
        <li className="flex items-center gap-1.5">
          <span className="inline-block h-0.5 w-4 bg-accent/50" aria-hidden /> Road with open complaints
        </li>
      </ul>
    </div>
  );
}
