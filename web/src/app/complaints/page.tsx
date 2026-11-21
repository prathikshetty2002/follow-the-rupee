import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { PageShell, focusRing } from "@/components/ui";
import { getComplaintLookup, getIssues, getIssuesSummary, getNextRupee } from "@/lib/data";
import { fmtDate, fmtDays, inr, num, pct, plural } from "@/lib/format";
import type { FlagType, Issue, IssueStatus } from "@/lib/types";

export const metadata: Metadata = {
  title: "What happened to my complaint? | Follow the Rupee",
  description: "Search by complaint ID or locality to see the repair job, the contractor, the cost and whether the fix held.",
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;
const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

const LANGUAGE: Record<string, string> = { en: "English", "hi-en": "Hinglish", mr: "Marathi", hi: "Hindi" };

const STATUS: Record<IssueStatus, { title: string; tone: "ok" | "warn" | "neutral"; glyph: string; short: string }> = {
  fixed: { title: "Repaired, and it held", tone: "ok", glyph: "✓", short: "Repaired and held" },
  fixed_failed: { title: "Repaired, but it failed within 30 days", tone: "warn", glyph: "!", short: "Repaired, then failed" },
  never_fixed: { title: "Not fixed yet", tone: "warn", glyph: "…", short: "Not fixed yet" },
  not_bmc_scope: { title: "Not a BMC repair job", tone: "neutral", glyph: "→", short: "Forwarded outside BMC" },
};

const TONE = {
  ok: "border-[#1F4E9C] bg-[#E8EFFA]",
  warn: "border-[#8A5A00] bg-[#FFF4DB]",
  neutral: "border-[#4A5568] bg-[#F4F6F9]",
} as const;

const FLAG_LABEL: Record<FlagType, string> = {
  dlp_paid: "paid while the road was under warranty",
  over_billed: "billed above the rate card",
  double_billed: "looks billed twice",
  reopened: "repair failed within 30 days",
  sla_missed: "fixed well after the promised time",
};

const MAX_RESULTS = 15;

export default function ComplaintsPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <PageShell current="complaints">
      <div className="mb-6 max-w-3xl">
        <h1 className="text-3xl font-bold leading-tight sm:text-4xl">What happened to my complaint?</h1>
        <p className="mt-2 text-[17px] leading-relaxed text-[#4A5568]">
          Search by complaint ID, locality or road. You will see the repair job, who did it, what it cost and whether it held.
        </p>
      </div>
      <Suspense fallback={<Skeleton />}>
        <Body searchParams={searchParams} />
      </Suspense>
    </PageShell>
  );
}

function Skeleton() {
  return (
    <div aria-busy="true" aria-live="polite" className="space-y-3">
      <div className="h-24 animate-pulse rounded-lg bg-[#F4F6F9]" />
      <p className="text-[15px] text-[#4A5568]">Loading…</p>
    </div>
  );
}

function SearchForm({ q }: { q: string }) {
  return (
    <form action="/complaints" method="get" role="search" className="mb-6 flex flex-wrap items-end gap-3">
      <div className="flex min-w-72 flex-1 flex-col gap-1">
        <label htmlFor="q" className="text-[14px] font-semibold">
          Complaint ID, locality or road
        </label>
        <input
          id="q"
          name="q"
          type="search"
          defaultValue={q}
          autoComplete="off"
          placeholder="For example BMC25-000005 or Hindmata"
          className={`min-h-13 rounded-md border-2 border-[#14213D] px-4 text-[16px] ${focusRing}`}
        />
      </div>
      <button type="submit" className={`min-h-13 rounded-md bg-[#1F4E9C] px-7 text-[16px] font-bold text-white ${focusRing}`}>
        Check status
      </button>
    </form>
  );
}

async function Body({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const q = (first(sp.q) ?? "").trim().slice(0, 80);
  const issueParam = (first(sp.issue) ?? "").trim().toUpperCase();
  const issues = await getIssues();

  const byId = new Map(issues.map((i) => [i.issue_id, i]));
  let detail: Issue | undefined;
  let searched: string | undefined;
  let results: Issue[] = [];
  let total = 0;

  if (issueParam) {
    detail = byId.get(issueParam);
  } else if (q) {
    const upper = q.toUpperCase();
    if (/^ISS-\d+$/.test(upper)) {
      detail = byId.get(upper);
    } else if (/^BMC\d{2}-\d+$/.test(upper)) {
      const lookup = await getComplaintLookup();
      const id = lookup[upper];
      detail = id ? byId.get(id) : undefined;
      searched = upper;
    } else {
      const needle = q.toLowerCase();
      const hits = issues.filter((i) => i.locality.toLowerCase().includes(needle) || (i.road_name ?? "").toLowerCase().includes(needle));
      total = hits.length;
      results = hits.sort((a, b) => (b.n_complaints ?? 0) - (a.n_complaints ?? 0) || a.issue_id.localeCompare(b.issue_id)).slice(0, MAX_RESULTS);
    }
  }

  const notFound = (q || issueParam) && !detail && results.length === 0;

  return (
    <>
      <SearchForm q={q} />
      {detail ? (
        <IssueDetail issue={detail} searched={searched} />
      ) : results.length > 0 ? (
        <ResultList results={results} total={total} q={q} />
      ) : notFound ? (
        <NotFound q={q || issueParam} />
      ) : (
        <Landing issues={issues} />
      )}
    </>
  );
}

function NotFound({ q }: { q: string }) {
  return (
    <section aria-live="polite" className="rounded-lg border-2 border-[#4A5568] bg-[#F4F6F9] p-5">
      <h2 className="text-xl font-bold">Nothing found for {q}</h2>
      <p className="mt-1 text-[15px] leading-relaxed">
        Check the complaint ID for typos. It looks like BMC25-000005. You can also try the name of a locality or a road, such as Bandra or Hindmata.
      </p>
    </section>
  );
}

async function CityTiles() {
  const s = await getIssuesSummary();
  const failed = s.by_status.fixed_failed?.issues ?? 0;
  return (
    <dl className="grid gap-3 sm:grid-cols-3">
      <div className="rounded-lg bg-[#F4F6F9] p-4">
        <dt className="text-[13px] text-[#4A5568]">Complaints became</dt>
        <dd className="text-2xl font-bold">
          {num(s.complaints)} → {num(s.issues)} issues
        </dd>
        <dd className="text-[14px] text-[#4A5568]">Repeat reports on the same problem are merged into one.</dd>
      </div>
      <div className="rounded-lg bg-[#F4F6F9] p-4">
        <dt className="text-[13px] text-[#4A5568]">Repairs that failed within 30 days</dt>
        <dd className="text-2xl font-bold">{pct(s.fixed_issues_that_failed_pct, 1)}</dd>
        <dd className="text-[14px] text-[#4A5568]">{plural(failed, "issue")} among repaired ones.</dd>
      </div>
      <div className="rounded-lg bg-[#F4F6F9] p-4">
        <dt className="text-[13px] text-[#4A5568]">Typical time to fix</dt>
        <dd className="text-2xl font-bold">{s.median_days_to_fix.toFixed(1)} days</dd>
        <dd className="text-[14px] text-[#4A5568]">{pct(s.met_target_pct, 1)} met the promised time.</dd>
      </div>
    </dl>
  );
}

function Landing({ issues }: { issues: Issue[] }) {
  const pick = (status: IssueStatus) => issues.find((i) => i.status === status && (i.n_complaints ?? 0) >= 2) ?? issues.find((i) => i.status === status);
  const examples = (["fixed", "fixed_failed", "never_fixed", "not_bmc_scope"] as IssueStatus[]).map((s) => ({ s, issue: pick(s) })).filter((e) => e.issue);
  const sample = pick("fixed")?.complaint_ids[0];
  return (
    <>
      <section aria-labelledby="try" className="mb-8">
        <h2 id="try" className="mb-2 text-xl font-bold">
          Try an example
        </h2>
        {sample && (
          <p className="mb-3 text-[15px] text-[#4A5568]">
            Paste a complaint ID such as <span className="font-semibold text-[#14213D]">{sample}</span>, or pick one of these:
          </p>
        )}
        <ul className="grid gap-2 sm:grid-cols-2">
          {examples.map(({ s, issue }) => (
            <li key={s}>
              <Link
                href={`/complaints?issue=${issue!.issue_id}`}
                className={`flex min-h-14 flex-col justify-center rounded-lg border border-[#8A94A6] px-4 py-2 hover:bg-[#F4F6F9] ${focusRing}`}
              >
                <span className="font-bold">{STATUS[s].short}</span>
                <span className="text-[14px] text-[#4A5568]">
                  {issue!.category} near {issue!.locality}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
      <section aria-labelledby="city">
        <h2 id="city" className="mb-2 text-xl font-bold">
          Across the city this season
        </h2>
        <Suspense fallback={<Skeleton />}>
          <CityTiles />
        </Suspense>
      </section>
    </>
  );
}

function ResultList({ results, total, q }: { results: Issue[]; total: number; q: string }) {
  return (
    <section aria-labelledby="res">
      <h2 id="res" className="mb-1 text-xl font-bold">
        {plural(total, "issue")} matching {q}
      </h2>
      {total > results.length && <p className="mb-3 text-[14px] text-[#4A5568]">Showing the {results.length} with the most complaints. Add a road name to narrow it down.</p>}
      <ul className="space-y-2">
        {results.map((i) => (
          <li key={i.issue_id}>
            <Link
              href={`/complaints?issue=${i.issue_id}`}
              className={`flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[#8A94A6] p-4 hover:bg-[#F4F6F9] ${focusRing}`}
            >
              <span className="min-w-0 flex-1 basis-64">
                <span className="block font-bold">
                  {i.category} near {i.locality}
                </span>
                <span className="block text-[14px] text-[#4A5568]">
                  {i.road_name ? `${i.road_name} · ` : ""}
                  {plural(i.n_complaints ?? i.complaint_ids.length, "complaint")} · first reported {fmtDate(i.first_reported_at)}
                </span>
              </span>
              <StatusPill status={i.status} />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

function StatusPill({ status }: { status: IssueStatus }) {
  const s = STATUS[status];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border-2 px-3 py-1 text-[13px] font-bold ${TONE[s.tone]}`}>
      <span aria-hidden="true">{s.glyph}</span>
      {s.short}
    </span>
  );
}

async function IssueDetail({ issue, searched }: { issue: Issue; searched?: string }) {
  const s = STATUS[issue.status];
  const wo = issue.work_order;
  const plan = issue.status === "never_fixed" && issue.plan_issue_id ? await findPlan(issue.ward_code, issue.plan_issue_id) : null;
  const flags = wo?.flags ?? [];
  const billing = flags.some((f) => f === "dlp_paid" || f === "over_billed" || f === "double_billed");
  const auditHref = `/audit?${new URLSearchParams({ ...(billing ? {} : { view: "context" }), ward: issue.ward_code }).toString()}`;

  return (
    <article aria-labelledby="detail">
      <p className="mb-2 text-[14px]">
        <Link href="/complaints" className={`font-semibold text-[#1F4E9C] underline ${focusRing}`}>
          New search
        </Link>
      </p>

      <div className={`rounded-lg border-2 p-4 sm:p-5 ${TONE[s.tone]}`}>
        <p className="text-[13px] font-bold tracking-wide">STATUS</p>
        <h2 id="detail" className="flex items-center gap-2 text-2xl font-bold">
          <span aria-hidden="true" className="inline-flex h-8 w-8 items-center justify-center rounded-full border-2 border-[#14213D] text-lg">
            {s.glyph}
          </span>
          {s.title}
        </h2>
        <p className="mt-2 text-[17px] leading-relaxed">{issue.trail}</p>
        {issue.status === "not_bmc_scope" && issue.disposition && (
          <p className="mt-2 text-[15px]">BMC&apos;s own status for this complaint: {issue.disposition}.</p>
        )}
        {issue.status === "never_fixed" && issue.disposition && <p className="mt-2 text-[15px]">BMC status: {issue.disposition}.</p>}
      </div>

      <h3 className="mb-2 mt-6 text-xl font-bold">What was done</h3>
      <ol className="border-l-4 border-[#C5CCD6] pl-5">
        <Step title="Reported" when={fmtDate(issue.first_reported_at)}>
          {issue.category} near {issue.locality}
          {issue.road_name ? `, ${issue.road_name}` : ""}, ward {issue.ward_code}. {plural(issue.n_complaints ?? issue.complaint_ids.length, "complaint")} merged into this issue
          {issue.upvotes ? `, with ${num(issue.upvotes)} upvotes` : ""}.
        </Step>

        {wo ? (
          <>
            <Step title="Repair job" when={wo.work_order_id}>
              {wo.contractor_name} used {wo.repair_method.toLowerCase()}. Billed {inr(wo.cost_inr)}.
            </Step>
            <Step title="Completed" when={fmtDate(wo.completed_at)}>
              {fmtDays(wo.days_to_fix)} after the first complaint. The promised time was {wo.sla_hours} hours, and it was {wo.sla_met ? "met" : "missed"}.
            </Step>
            <Step title="Did it hold?" last>
              {wo.reopened_within_30d ? "No. The same problem was reported again within 30 days." : "Yes. No new complaint within 30 days."}
            </Step>
          </>
        ) : issue.status === "never_fixed" ? (
          <Step title="No repair job yet" last>
            {plan ? (
              <>
                This issue is number <b>{plan.rank}</b> of {num(plan.total)} open issues in ward {issue.ward_code} on the repair priority list, with a priority of {Math.round(plan.score)} out of 100.{" "}
                {plan.dlp
                  ? "The road is under warranty, so the original contractor should repair it at no cost to BMC."
                  : plan.funded
                    ? `It fits the ward's remaining budget. Suggested repair: ${plan.method.toLowerCase()}, about ${inr(plan.cost)}.`
                    : `It does not fit the ward's remaining budget yet. Suggested repair: ${plan.method.toLowerCase()}, about ${inr(plan.cost)}.`}
                {plan.reasons.length > 0 && <span className="mt-1 block text-[14px] text-[#4A5568]">Why it ranks here: {plan.reasons.join("; ")}.</span>}
              </>
            ) : (
              "BMC has not assigned a repair job to this issue."
            )}
          </Step>
        ) : (
          <Step title="Outside BMC road repair" last>
            This complaint was not handled as a BMC repair job{issue.disposition ? ` (${issue.disposition})` : ""}.
          </Step>
        )}
      </ol>

      {flags.length > 0 && (
        <p className="mt-4 rounded-md bg-[#FFF4DB] p-3 text-[15px]">
          This repair job is also on the audit list: {flags.map((f) => FLAG_LABEL[f]).join("; ")}.{" "}
          <Link href={auditHref} className={`font-semibold text-[#1F4E9C] underline ${focusRing}`}>
            See flagged jobs in ward {issue.ward_code}
          </Link>
        </p>
      )}

      <h3 className="mb-2 mt-6 text-xl font-bold">How it was reported</h3>
      <dl className="grid gap-x-8 gap-y-2 text-[15px] sm:grid-cols-2">
        <Meta k="Channels" v={(issue.channels ?? []).join(", ") || "not recorded"} />
        <Meta k="Languages" v={(issue.languages ?? []).map((l) => LANGUAGE[l] ?? l).join(", ") || "not recorded"} />
        <Meta k="Issue" v={issue.issue_id} />
        {issue.social_post_ids.length > 0 && <Meta k="Social posts matched" v={num(issue.social_post_ids.length)} />}
      </dl>
      <p className="mt-3 text-[14px] text-[#4A5568]">Complaint IDs in this issue:</p>
      <ul className="mt-1 flex flex-wrap gap-2">
        {issue.complaint_ids.map((c) => (
          <li
            key={c}
            className={`rounded-md border px-2 py-1 text-[13px] ${c === searched ? "border-2 border-[#1F4E9C] bg-[#E8EFFA] font-bold" : "border-[#C5CCD6] bg-[#F4F6F9]"}`}
          >
            {c}
            {c === searched ? " (your search)" : ""}
          </li>
        ))}
      </ul>
    </article>
  );
}

async function findPlan(ward: string, planId: string) {
  const file = await getNextRupee();
  const w = file.wards.find((x) => x.ward_code === ward);
  const p = w?.issues.find((x) => x.issue_id === planId);
  if (!w || !p) return null;
  return { rank: p.rank, total: w.open_issues, score: p.priority_score, funded: p.funded, dlp: p.dlp, method: p.recommended_method, cost: p.est_cost_inr, reasons: p.reasons };
}

function Step({ title, when, children, last }: { title: string; when?: string; children: React.ReactNode; last?: boolean }) {
  return (
    <li className={`relative ${last ? "" : "pb-5"}`}>
      <span aria-hidden="true" className="absolute -left-[30px] top-1.5 h-3.5 w-3.5 rounded-full border-2 border-[#14213D] bg-white" />
      <p className="font-bold">
        {title}
        {when ? <span className="ml-2 text-[14px] font-normal text-[#4A5568]">{when}</span> : null}
      </p>
      <p className="text-[15px] leading-relaxed">{children}</p>
    </li>
  );
}

function Meta({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex gap-2">
      <dt className="shrink-0 text-[#4A5568]">{k}:</dt>
      <dd className="font-semibold">{v}</dd>
    </div>
  );
}
