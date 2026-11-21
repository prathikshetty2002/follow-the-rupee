import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { PageSkeleton } from "@/components/skeletons";
import { Badge, Card, PageHeader, SectionTitle, cx, link } from "@/components/ui";
import { getFlags, getWardBundle, getWorkOrders } from "@/lib/data";
import { FLAG_LABEL, fmtDate, inr, severityTone, wardSlug } from "@/lib/format";

export const metadata: Metadata = { title: "Work order" };

export default function WorkOrderPage(props: PageProps<"/work-order/[id]">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Content params={props.params} />
    </Suspense>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 border-b border-border py-3 last:border-0 sm:flex-row sm:gap-4">
      <dt className="w-44 shrink-0 text-sm text-muted">{label}</dt>
      <dd className="text-sm">{children}</dd>
    </div>
  );
}

async function Content({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const wos = await getWorkOrders();
  const w = wos.find((x) => x.work_order_id === id.toUpperCase());
  if (!w) notFound();
  const [flags, bundle] = await Promise.all([getFlags(), getWardBundle(w.ward_code)]);
  const mine = flags.filter((f) => f.evidence_work_order_ids.includes(w.work_order_id));
  const issue = bundle.issues.find((i) => i.issue_id === w.issue_id);
  const ratio = w.cost_ratio;
  const scale = 3.2;

  return (
    <div className="space-y-10">
      <div className="rise">
        <p className="mb-3 text-sm">
          <Link href={`/ward/${wardSlug(w.ward_code)}`} className={link}>
            Ward {w.ward_code}
          </Link>
        </p>
        <PageHeader eyebrow="Work order" title={`${w.work_type} on ${w.road_name ?? w.road_id}`}>
          <p className="num">{w.work_order_id}</p>
        </PageHeader>
        <div className="flex flex-wrap gap-2">
          {w.reopened_within_30d ? <Badge tone="danger">Failed within 30 days</Badge> : <Badge tone="success">Repair held</Badge>}
          {w.sla_met ? <Badge tone="success">Within target time</Badge> : <Badge tone="warn">After target time</Badge>}
          {w.under_dlp && <Badge tone="info">Road under warranty</Badge>}
        </div>
      </div>

      {mine.length > 0 && (
        <section aria-labelledby="fl-h">
          <SectionTitle id="fl-h">Why this job is listed</SectionTitle>
          <ul className="space-y-3">
            {mine.map((f) => (
              <li key={f.flag_type} className="rounded-xl border border-border bg-surface p-4">
                <div className="mb-1 flex flex-wrap items-center gap-2">
                  <span className="font-medium">{FLAG_LABEL[f.flag_type]}</span>
                  <Badge tone={severityTone(f.severity)}>{f.severity}</Badge>
                </div>
                <p className="text-sm leading-relaxed text-muted">{f.reason}</p>
                {f.evidence_work_order_ids.length > 1 && (
                  <p className="mt-2 text-sm">
                    Evidence:{" "}
                    {f.evidence_work_order_ids.map((e, k) => (
                      <span key={e}>
                        {k > 0 && ", "}
                        {e === w.work_order_id ? <span className="num">{e}</span> : <Link href={`/work-order/${e}`} className={`${link} num`}>{e}</Link>}
                      </span>
                    ))}
                  </p>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="font-serif text-xl font-semibold">The bill against the rate card</h2>
          <p className="num mt-3 text-3xl font-semibold">{inr(w.cost_inr)}</p>
          <p className="text-sm text-muted">
            The rate card prices this work at about <span className="num text-foreground">{inr(w.expected_cost_inr)}</span>. The bill is <span className="num text-foreground">{ratio.toFixed(2)}x</span> that.
          </p>
          <div className="mt-5">
            <div className="relative h-3 rounded-full bg-surface-2" role="img" aria-label={`Billed ${ratio.toFixed(2)} times the rate card. Normal jobs are between 0.75 and 1.3 times.`}>
              <div className="absolute inset-y-0 rounded-full bg-success/25" style={{ left: `${(0.75 / scale) * 100}%`, width: `${((1.3 - 0.75) / scale) * 100}%` }} />
              <div className={cx("absolute top-1/2 size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-background", ratio > 1.4 ? "bg-danger" : "bg-foreground")} style={{ left: `${(Math.min(ratio, scale) / scale) * 100}%` }} />
            </div>
            <div className="num mt-1 flex justify-between text-xs text-muted">
              <span>0x</span>
              <span>Normal: 0.75x to 1.3x</span>
              <span>{scale}x</span>
            </div>
          </div>
        </Card>

        <Card>
          <h2 className="font-serif text-xl font-semibold">Details</h2>
          <dl className="mt-2">
            <Row label="Contractor">
              <Link href={`/contractors/${w.contractor_id}`} className={link}>
                {w.contractor_name.replace(" (synthetic)", "")}
              </Link>
            </Row>
            <Row label="Repair method">{w.repair_method}{w.area_sqm ? `, ${w.area_sqm} sq m` : ""}</Row>
            <Row label="Road">
              {w.road_name} <span className="num text-muted">({w.road_id})</span>
            </Row>
            <Row label="Assigned">{fmtDate(w.assigned_at)}</Row>
            <Row label="Finished">{fmtDate(w.completed_at)} (target {w.sla_hours} hours from the first complaint)</Row>
            <Row label="Engineer's note">{w.engineer_remark ?? "None recorded"}</Row>
          </dl>
        </Card>
      </div>

      <section aria-labelledby="tr-h">
        <SectionTitle id="tr-h">The complaint behind it</SectionTitle>
        {issue ? (
          <Card>
            <p className="leading-relaxed">{issue.trail}</p>
            <p className="mt-3 text-sm text-muted">
              Complaint{w.complaint_ids.length > 1 ? "s" : ""}:{" "}
              {w.complaint_ids.map((c, k) => (
                <span key={c}>
                  {k > 0 && ", "}
                  <Link href={`/complaint?id=${c}`} className={`${link} num`}>
                    {c}
                  </Link>
                </span>
              ))}
            </p>
          </Card>
        ) : (
          <p className="text-sm text-muted">No complaint is linked to this work order. That is one reason a repeat job can be listed for review.</p>
        )}
      </section>
    </div>
  );
}
