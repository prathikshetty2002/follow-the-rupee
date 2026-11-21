import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { FilterChip } from "@/components/filter-chip";
import { getAuditSummary, getFlags, getWards, getWorkOrders } from "@/lib/data";
import { fmtDate, inr, inrShort, num, plural } from "@/lib/format";
import type { Flag, FlagType, WorkOrder } from "@/lib/types";

export const metadata: Metadata = {
  title: "Audit: repairs worth a second look | Follow the Rupee",
  description: "Repair jobs where the bill, the timing or the warranty status did not add up. Normal variation is not flagged.",
};

const PAGE_SIZE = 20;
const BILLING: FlagType[] = ["dlp_paid", "over_billed", "double_billed"];
const CONTEXT: FlagType[] = ["reopened", "sla_missed"];

const LABEL: Record<FlagType, string> = {
  dlp_paid: "Paid while the road was under warranty",
  over_billed: "Billed above the rate card",
  double_billed: "Looks billed twice",
  reopened: "Repair failed within 30 days",
  sla_missed: "Fixed well after the promised time",
};

const SHORT: Record<FlagType, string> = {
  dlp_paid: "Paid on warranty roads",
  over_billed: "Billed above the rate card",
  double_billed: "Looks billed twice",
  reopened: "Repairs that failed within 30 days",
  sla_missed: "Fixed well after the promised time",
};

// What the money figure means for each flag type (verified against flags.json).
const AMOUNT_LABEL: Record<FlagType, string | null> = {
  dlp_paid: "Paid by BMC",
  over_billed: "Above the normal range",
  double_billed: "Billed a second time",
  reopened: "Spent on a repair that failed",
  sla_missed: null,
};

const NEXT_STEP: Record<FlagType, string> = {
  dlp_paid: "Ask the original contractor to repair it under warranty, and review why BMC paid.",
  over_billed: "Ask the site engineer to confirm the area measured and the rate applied.",
  double_billed: "Ask for site photos and dates of both jobs.",
  reopened: "Watch this road and consider a longer-lasting repair method.",
  sla_missed: "Check whether weather or access delayed the work.",
};

const SEVERITY_RANK = { high: 0, medium: 1, low: 2 } as const;

type SearchParams = Promise<Record<string, string | string[] | undefined>>;
const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

function href(p: { view?: string; type?: string; ward?: string; page?: number }) {
  const q = new URLSearchParams();
  if (p.view && p.view !== "billing") q.set("view", p.view);
  if (p.type) q.set("type", p.type);
  if (p.ward) q.set("ward", p.ward);
  if (p.page && p.page > 1) q.set("page", String(p.page));
  const s = q.toString();
  return s ? `/audit?${s}` : "/audit";
}

export default function AuditPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-6 max-w-3xl">
        <h1 className="text-3xl font-bold leading-tight sm:text-4xl">Repairs worth a second look</h1>
        <p className="mt-2 text-[17px] leading-relaxed text-muted">
          Repair jobs where the bill, the timing or the warranty status did not add up. Normal variation is not flagged.
        </p>
      </div>
      <Headline />
      <HowWeDecide />
      <Suspense fallback={<ListSkeleton />}>
        <FlagList searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function Headline() {
  const { city } = await getAuditSummary();
  return (
    <section aria-labelledby="headline" className="mb-6">
      <h2 id="headline" className="sr-only">
        City totals
      </h2>
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-lg bg-peach p-4 sm:col-span-3">
          <p className="text-[13px] text-foreground">Billed on repair jobs worth a second look</p>
          <p className="text-3xl font-bold sm:text-4xl">
            {inrShort(city.billing_flagged_cost_inr)}{" "}
            <span className="text-base font-normal">across {plural(city.billing_flagged_work_orders, "job")}</span>
          </p>
          <p className="mt-1 text-[14px] text-[#3D2800]">
            Out of {num(city.work_orders)} jobs reviewed. This is what those jobs billed in total, not money proven lost. Each job is counted once.
          </p>
        </div>
        {BILLING.map((t) => {
          const b = city.by_type[t];
          if (!b) return null;
          return (
            <Link
              key={t}
              href={href({ type: t })}
              className={`rounded-lg border border-rule bg-mist p-4 hover:bg-sea-soft`}
            >
              <span className="block text-[13px] text-muted">{SHORT[t]}</span>
              <span className="block text-2xl font-bold">{num(b.count)} jobs</span>
              <span className="block text-[14px]">
                {inrShort(b.amount_at_risk_inr)} <span className="text-muted">{AMOUNT_LABEL[t]?.toLowerCase()}</span>
              </span>
            </Link>
          );
        })}
      </div>
      <p className="mt-3 text-[14px] text-muted">
        Also on file as context:{" "}
        <Link href={href({ view: "context", type: "reopened" })} className={`font-semibold text-sea underline`}>
          {num(city.by_type.reopened?.count ?? 0)} repairs that failed within 30 days
        </Link>{" "}
        and{" "}
        <Link href={href({ view: "context", type: "sla_missed" })} className={`font-semibold text-sea underline`}>
          {num(city.by_type.sla_missed?.count ?? 0)} fixed well after the promised time
        </Link>
        . These are shown beside the city average, so a normal failure rate is not read as blame.
      </p>
    </section>
  );
}

async function HowWeDecide() {
  const { thresholds: t } = await getAuditSummary();
  const [lo, hi] = t.normal_cost_range_vs_rate_card;
  return (
    <section aria-labelledby="how" className="mb-8 rounded-lg bg-sea-soft p-4 text-[15px] leading-relaxed">
      <h2 id="how" className="text-base font-bold">
        How we decide
      </h2>
      <ul className="mt-1 list-disc space-y-1 pl-5">
        <li>
          Bills from {Math.round(lo * 100)}% to {Math.round(hi * 100)}% of the rate card are normal and never flagged. Over-billing is flagged only above{" "}
          {Math.round(t.over_billed_ratio * 100)}%.
        </li>
        <li>Double billing needs the same road and work type within {t.double_bill_window_days} days, with no complaint linked to the second job.</li>
        <li>
          Late repairs are flagged only at {t.sla_flag_ratio}× the promised time or more, and are rated one level lower if heavy rain fell in between.
        </li>
        <li>Every flag lists the jobs behind it, so each one can be checked.</li>
      </ul>
    </section>
  );
}

function ListSkeleton() {
  return (
    <div aria-busy="true" aria-live="polite" className="space-y-3">
      <p className="text-[15px] text-muted">Loading flagged jobs…</p>
      {[0, 1, 2].map((i) => (
        <div key={i} className="h-32 animate-pulse rounded-lg bg-mist" />
      ))}
    </div>
  );
}

async function FlagList({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const view = first(sp.view) === "context" ? "context" : "billing";
  const types = view === "billing" ? BILLING : CONTEXT;
  const typeParam = first(sp.type) as FlagType | undefined;
  const type = typeParam && types.includes(typeParam) ? typeParam : undefined;

  const [flags, wards, workOrders] = await Promise.all([getFlags(), getWards(), getWorkOrders()]);
  const ward = wards.find((w) => w.ward_code === first(sp.ward))?.ward_code;

  const filtered = flags
    .filter((f) => types.includes(f.flag_type) && (!type || f.flag_type === type) && (!ward || f.ward_code === ward))
    .sort((a, b) =>
      view === "billing"
        ? b.amount_at_risk_inr - a.amount_at_risk_inr || SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity]
        : SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity] || b.amount_at_risk_inr - a.amount_at_risk_inr || a.work_order_id.localeCompare(b.work_order_id),
    );

  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const page = Math.min(pages, Math.max(1, Number.parseInt(first(sp.page) ?? "1", 10) || 1));
  const slice = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const woById = new Map<string, WorkOrder>(workOrders.map((w) => [w.work_order_id, w]));
  const wardName = new Map(wards.map((w) => [w.ward_code, w.ward_name]));

  const base = { view, type, ward };
  return (
    <section aria-labelledby="list">
      <h2 id="list" className="mb-3 text-2xl font-bold">
        {view === "billing" ? "Billing flags" : "Context: repair performance"}
      </h2>

      <div className="mb-4 flex flex-wrap items-center gap-2" role="group" aria-label="Choose what to show">
        <FilterChip href={href({ view: "billing", ward })} active={view === "billing"}>
          Billing
        </FilterChip>
        <FilterChip href={href({ view: "context", ward })} active={view === "context"}>
          Context
        </FilterChip>
        <span className="mx-1 hidden h-6 w-px bg-[#C5CCD6] sm:block" aria-hidden="true" />
        <FilterChip href={href({ view, ward })} active={!type}>
          All types
        </FilterChip>
        {types.map((t) => (
          <FilterChip key={t} href={href({ view, type: t, ward })} active={type === t}>
            {SHORT[t]}
          </FilterChip>
        ))}
      </div>

      <form action="/audit" method="get" className="mb-5 flex flex-wrap items-end gap-3">
        {view !== "billing" && <input type="hidden" name="view" value={view} />}
        {type && <input type="hidden" name="type" value={type} />}
        <div className="flex flex-col gap-1">
          <label htmlFor="ward" className="text-[14px] font-semibold">
            Ward
          </label>
          <select
            id="ward"
            name="ward"
            defaultValue={ward ?? ""}
            className={`min-h-11 rounded-md border-2 border-foreground bg-card px-3 text-[15px]`}
          >
            <option value="">All wards</option>
            {wards.map((w) => (
              <option key={w.ward_code} value={w.ward_code}>
                {w.ward_code} · {w.ward_name}
              </option>
            ))}
          </select>
        </div>
        <button type="submit" className={`min-h-11 rounded-md bg-sea-fill px-5 text-[15px] font-bold text-background`}>
          Show
        </button>
        {ward && (
          <Link href={href({ view, type })} className={`inline-flex min-h-11 items-center text-[15px] font-semibold text-sea underline`}>
            Clear ward
          </Link>
        )}
      </form>

      <p className="mb-3 text-[14px] text-muted" aria-live="polite">
        {filtered.length === 0
          ? "No flags match this filter."
          : `Showing ${num((page - 1) * PAGE_SIZE + 1)} to ${num((page - 1) * PAGE_SIZE + slice.length)} of ${plural(filtered.length, "flag")}${
              ward ? ` in ward ${ward}` : ""
            }. ${view === "billing" ? "Largest amounts first." : "Most serious first."}`}
      </p>

      <ul className="space-y-3">
        {slice.map((f) => (
          <FlagCard key={`${f.work_order_id}-${f.flag_type}`} flag={f} woById={woById} wardName={wardName.get(f.ward_code)} />
        ))}
      </ul>

      {pages > 1 && (
        <nav aria-label="Pages" className="mt-6 flex items-center justify-between gap-3">
          {page > 1 ? (
            <Link href={href({ ...base, page: page - 1 })} className={`inline-flex min-h-11 items-center rounded-md border-2 border-sea px-4 font-semibold`}>
              Previous
            </Link>
          ) : (
            <span />
          )}
          <span className="text-[14px] text-muted">
            Page {page} of {pages}
          </span>
          {page < pages ? (
            <Link href={href({ ...base, page: page + 1 })} className={`inline-flex min-h-11 items-center rounded-md border-2 border-sea px-4 font-semibold`}>
              Next
            </Link>
          ) : (
            <span />
          )}
        </nav>
      )}
    </section>
  );
}

function Severity({ level }: { level: Flag["severity"] }) {
  const word = level === "high" ? "High" : level === "medium" ? "Medium" : "Low";
  return (
    <span className="inline-flex items-center gap-1.5 text-[13px] font-bold">
      <span
        aria-hidden="true"
        className={`inline-block h-3 w-3 border-2 border-foreground ${
          level === "high" ? "bg-foreground" : level === "medium" ? "bg-[linear-gradient(90deg,#14213D_50%,#fff_50%)]" : "bg-card"
        }`}
      />
      {word} priority
    </span>
  );
}

function FlagCard({ flag: f, woById, wardName }: { flag: Flag; woById: Map<string, WorkOrder>; wardName?: string }) {
  const evidence = f.evidence_work_order_ids.map((id) => woById.get(id)).filter((w): w is WorkOrder => Boolean(w));
  const amountLabel = AMOUNT_LABEL[f.flag_type];
  return (
    <li className={`rounded-lg border p-4 ${f.severity === "high" ? "border-2 border-foreground" : "border-line"}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1 basis-72">
          <Severity level={f.severity} />
          <h3 className="mt-1 text-lg font-bold">{LABEL[f.flag_type]}</h3>
          <p className="text-[13px] text-muted">
            <span className="font-semibold text-foreground">{f.work_order_id}</span> · Ward {f.ward_code}
            {wardName ? ` (${wardName})` : ""} · {f.contractor_name ?? f.contractor_id}
            {f.work_type ? ` · ${f.work_type}` : ""}
          </p>
          <p className="mt-1 text-[14px]">
            <Link href={`/contractors?c=${f.contractor_id}`} className="font-semibold text-sea underline">
              Contractor scorecard
            </Link>
            {" · "}
            <Link href={`/plan/${f.ward_code.replace("/", "-")}`} className="font-semibold text-sea underline">
              Plan the next rupee for ward {f.ward_code}
            </Link>
          </p>
        </div>
        <div className="text-right">
          {amountLabel ? (
            <>
              <p className="text-[13px] text-muted">{amountLabel}</p>
              <p className="text-2xl font-bold">{inr(f.amount_at_risk_inr)}</p>
            </>
          ) : (
            <p className="text-[13px] text-muted">No money flagged. Shown for context.</p>
          )}
        </div>
      </div>

      <p className="mt-3 text-[16px] leading-relaxed">{f.reason}</p>

      <p className="mt-3 rounded-md bg-sea-soft px-3 py-2 text-[14px]">
        <span className="font-bold">Suggested next step:</span> {NEXT_STEP[f.flag_type]}
      </p>

      {evidence.length > 0 && (
        <details className="mt-3">
          <summary className={`inline-flex min-h-11 cursor-pointer items-center text-[15px] font-semibold text-sea`}>
            Show the {evidence.length === 1 ? "job" : `${evidence.length} jobs`} behind this flag
          </summary>
          <ul className="mt-2 space-y-2">
            {evidence.map((w) => (
              <li key={w.work_order_id} className="rounded-md bg-mist p-3 text-[14px]">
                <p className="font-bold">
                  {w.work_order_id} · {w.road_name ?? w.road_id}
                </p>
                <dl className="mt-1 grid gap-x-6 gap-y-1 sm:grid-cols-2">
                  <Row k="Work" v={`${w.work_type}, ${w.repair_method}`} />
                  <Row k="Completed" v={fmtDate(w.completed_at)} />
                  <Row k="Billed" v={`${inr(w.cost_inr)} (rate card about ${inr(w.expected_cost_inr)}, ${w.cost_ratio.toFixed(1)}× the rate)`} />
                  <Row k="Promised time" v={`${w.sla_hours} hours, ${w.sla_met ? "met" : "missed"}`} />
                  <Row k="Held for 30 days" v={w.reopened_within_30d ? "No, it reopened" : "Yes"} />
                  <Row k="Road under warranty" v={w.under_dlp ? "Yes" : "No"} />
                  {w.engineer_remark && <Row k="Engineer remark" v={w.engineer_remark} />}
                </dl>
              </li>
            ))}
          </ul>
        </details>
      )}
    </li>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex gap-2">
      <dt className="shrink-0 text-muted">{k}:</dt>
      <dd>{v}</dd>
    </div>
  );
}
