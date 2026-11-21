import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { PageSkeleton } from "@/components/skeletons";
import { Badge, EmptyState, PageHeader, TableWrap, cx, link, td, th } from "@/components/ui";
import { getAuditSummary, getContractors, getFlags } from "@/lib/data";
import { FLAG_HELP, FLAG_LABEL, SEVERITY_ORDER, inr, inrShort, int, severityTone, wardSlug } from "@/lib/format";
import type { FlagType } from "@/lib/types";

export const metadata: Metadata = { title: "Audit" };

const PAGE_SIZE = 30;
const BILLING: FlagType[] = ["over_billed", "double_billed", "dlp_paid"];
const PERFORMANCE: FlagType[] = ["sla_missed", "reopened"];
const ALL_TYPES: FlagType[] = [...BILLING, ...PERFORMANCE];

type Search = { type?: string; severity?: string; contractor?: string; ward?: string; page?: string };

export default function AuditPage(props: PageProps<"/audit">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Content searchParams={props.searchParams} />
    </Suspense>
  );
}

function one(v: string | string[] | undefined) {
  return Array.isArray(v) ? v[0] : v;
}

async function Content({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const raw = await searchParams;
  const q: Search = { type: one(raw.type), severity: one(raw.severity), contractor: one(raw.contractor), ward: one(raw.ward), page: one(raw.page) };
  const [flags, summary, contractors] = await Promise.all([getFlags(), getAuditSummary(), getContractors()]);
  const names = Object.fromEntries(contractors.map((c) => [c.contractor_id, c.contractor_name.replace(" (synthetic)", "")]));

  const type = q.type ?? "billing";
  const types: FlagType[] = type === "billing" ? BILLING : type === "performance" ? PERFORMANCE : ALL_TYPES.includes(type as FlagType) ? [type as FlagType] : BILLING;
  const filtered = flags
    .filter((f) => types.includes(f.flag_type))
    .filter((f) => !q.severity || f.severity === q.severity)
    .filter((f) => !q.contractor || f.contractor_id === q.contractor)
    .filter((f) => !q.ward || f.ward_code === q.ward)
    .sort((a, z) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[z.severity] || z.amount_at_risk_inr - a.amount_at_risk_inr);
  const page = Math.max(1, Number(q.page) || 1);
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const rows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const href = (u: Partial<Search>) => {
    const next = { ...q, page: undefined, ...u };
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries(next)) if (v && !(k === "type" && v === "billing")) p.set(k, v);
    const s = p.toString();
    return s ? `/audit?${s}` : "/audit";
  };
  const chip = (active: boolean) => cx("inline-flex min-h-10 items-center rounded-lg border px-3.5 text-sm font-medium transition-colors", active ? "border-foreground bg-foreground text-background" : "border-border bg-surface hover:bg-surface-2");
  const by = summary.city.by_type;

  return (
    <div className="space-y-8">
      <PageHeader eyebrow="Audit" title="Repairs that need a second look">
        <p>
          {int(summary.city.billing_flagged_work_orders)} jobs worth {inrShort(summary.city.billing_flagged_cost_inr)} are listed for billing review. Being listed is a reason to check the paperwork, not a finding of wrongdoing. Every row links to the work order behind it.
        </p>
      </PageHeader>

      <section aria-label="Flag types" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {ALL_TYPES.map((t) => (
          <Link key={t} href={href({ type: t })} aria-current={type === t ? "true" : undefined} className={cx("rounded-xl border p-4 transition-colors", type === t ? "border-foreground bg-surface-2" : "border-border bg-surface hover:bg-surface-2")}>
            <p className="text-sm font-medium">{FLAG_LABEL[t]}</p>
            <p className="num mt-1 text-2xl font-semibold">{int(by[t]?.count ?? 0)}</p>
            <p className="mt-1 text-xs leading-snug text-muted">{t === "sla_missed" ? "no money attached" : `${inrShort(by[t]?.amount_at_risk_inr ?? 0)} at stake`}</p>
          </Link>
        ))}
      </section>
      {type !== "billing" && type !== "performance" && ALL_TYPES.includes(type as FlagType) && <p className="-mt-4 max-w-3xl text-sm text-muted">{FLAG_HELP[type as FlagType]}</p>}

      <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Filters">
        <Link href={href({ type: "billing" })} className={chip(type === "billing")}>Billing items</Link>
        <Link href={href({ type: "performance" })} className={chip(type === "performance")}>Speed and durability</Link>
        <span className="mx-1 hidden h-6 w-px bg-border sm:block" aria-hidden />
        {(["high", "medium", "low"] as const).map((s) => (
          <Link key={s} href={href({ severity: q.severity === s ? undefined : s })} aria-current={q.severity === s ? "true" : undefined} className={chip(q.severity === s)}>
            {s[0].toUpperCase() + s.slice(1)} severity
          </Link>
        ))}
        {(q.contractor || q.ward) && (
          <Link href={href({ contractor: undefined, ward: undefined })} className={chip(false)}>
            Clear {q.contractor ? names[q.contractor] : `ward ${q.ward}`}
          </Link>
        )}
      </div>

      <p aria-live="polite" className="text-sm text-muted">
        {int(filtered.length)} flags{q.ward ? ` in ward ${q.ward}` : ""}{q.contractor ? ` for ${names[q.contractor]}` : ""}. Showing {rows.length ? (page - 1) * PAGE_SIZE + 1 : 0} to {(page - 1) * PAGE_SIZE + rows.length}.
      </p>

      {rows.length === 0 ? (
        <EmptyState title="No flags match these filters" action={{ href: "/audit", label: "Reset filters" }}>
          Try a different severity, or clear the contractor and ward filters.
        </EmptyState>
      ) : (
        <TableWrap label="Audit flags">
          <table className="w-full min-w-[56rem]">
            <thead className="border-b border-border">
              <tr>
                <th className={th}>Flag</th>
                <th className={th}>Work order</th>
                <th className={th}>Ward</th>
                <th className={th}>Contractor</th>
                <th className={`${th} text-right`}>Billed</th>
                <th className={th}>Detail</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((f) => (
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
                    {f.evidence_work_order_ids.length > 1 && <p className="mt-1 text-xs text-muted">with {f.evidence_work_order_ids.filter((i) => i !== f.work_order_id).join(", ")}</p>}
                  </td>
                  <td className={td}>
                    <Link href={`/ward/${wardSlug(f.ward_code)}`} className={link}>
                      {f.ward_code}
                    </Link>
                  </td>
                  <td className={td}>
                    <Link href={href({ contractor: f.contractor_id })} className={link}>
                      {names[f.contractor_id]}
                    </Link>
                  </td>
                  <td className={`${td} num text-right`}>{inr(f.cost_inr ?? 0)}</td>
                  <td className={`${td} max-w-md text-muted`}>{f.reason}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableWrap>
      )}

      {pages > 1 && (
        <nav aria-label="Pages" className="flex items-center justify-between gap-3">
          {page > 1 ? <Link href={href({ page: String(page - 1) })} className={chip(false)}>Previous</Link> : <span />}
          <span className="num text-sm text-muted">
            Page {page} of {pages}
          </span>
          {page < pages ? <Link href={href({ page: String(page + 1) })} className={chip(false)}>Next</Link> : <span />}
        </nav>
      )}
    </div>
  );
}
