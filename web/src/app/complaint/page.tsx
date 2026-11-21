import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Badge, Card, EmptyState, PageHeader, cx, link } from "@/components/ui";
import { getComplaintLookup, getIssues, getNextRupee } from "@/lib/data";
import { STATUS_LABEL, fmtDate, inr, inrShort, statusTone, wardSlug } from "@/lib/format";
import type { Issue } from "@/lib/types";

export const metadata: Metadata = { title: "What happened to my complaint?" };

export default function ComplaintPage(props: PageProps<"/complaint">) {
  return (
    <div className="space-y-8">
      <PageHeader eyebrow="Citizens" title="What happened to my complaint?">
        Enter a complaint number to see the repair it led to, who did the work, what it cost, and whether it held. Complaints about the same problem are grouped together.
      </PageHeader>
      <form action="/complaint" method="get" className="flex max-w-xl flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex-1">
          <label htmlFor="id" className="mb-1.5 block text-sm font-medium">
            Complaint number
          </label>
          <input
            id="id"
            name="id"
            type="text"
            inputMode="text"
            autoComplete="off"
            spellCheck={false}
            placeholder="BMC25-000012"
            className="num min-h-11 w-full rounded-lg border border-border bg-surface px-3.5 text-base placeholder:text-muted/70"
          />
        </div>
        <button type="submit" className="min-h-11 rounded-lg bg-foreground px-6 text-sm font-medium text-background hover:opacity-90">
          Look up
        </button>
      </form>
      <Suspense fallback={<p role="status" className="text-sm text-muted">Looking up...</p>}>
        <Result searchParams={props.searchParams} />
      </Suspense>
    </div>
  );
}

/** "12", "bmc25-12" and "BMC25-000012" all mean the same complaint. */
function normalise(raw: string): string {
  const s = raw.trim().toUpperCase().replace(/\s+/g, "");
  const m = s.match(/^(?:BMC25-?)?(\d{1,6})$/);
  return m ? `BMC25-${m[1].padStart(6, "0")}` : s;
}

async function Examples() {
  const issues = await getIssues();
  const picks = (["fixed", "fixed_failed", "never_fixed", "not_bmc_scope"] as const).map((s) => issues.find((i) => i.status === s)).filter((i): i is Issue => !!i);
  return (
    <div>
      <p className="mb-2 text-sm text-muted">No number handy? Try one of these:</p>
      <ul className="flex flex-wrap gap-2">
        {picks.map((i) => (
          <li key={i.issue_id}>
            <Link href={`/complaint?id=${i.complaint_ids[0]}`} className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-border bg-surface px-3 text-sm hover:bg-surface-2">
              <span className="num">{i.complaint_ids[0]}</span>
              <span className="text-muted">{STATUS_LABEL[i.status]}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

async function Result({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const raw = (await searchParams).id;
  const id = Array.isArray(raw) ? raw[0] : raw;
  if (!id) return <Examples />;

  const key = normalise(id);
  const [lookup, issues] = await Promise.all([getComplaintLookup(), getIssues()]);
  const issueId = lookup[key];
  const issue = issueId ? issues.find((i) => i.issue_id === issueId) : undefined;
  if (!issue) {
    return (
      <div className="space-y-6">
        <EmptyState title={`No complaint found for "${id}"`}>Complaint numbers look like BMC25-000012. Check the number and try again.</EmptyState>
        <Examples />
      </div>
    );
  }

  const plan = issue.plan_issue_id ? (await getNextRupee()).wards.flatMap((w) => w.issues.map((i) => ({ ward: w, item: i }))).find((x) => x.item.issue_id === issue.plan_issue_id) : undefined;
  const wo = issue.work_order;
  const others = issue.complaint_ids.filter((c) => c !== key);

  const steps: { title: string; tone: "info" | "success" | "danger" | "warn"; body: React.ReactNode }[] = [
    {
      title: "You complained",
      tone: "info",
      body: (
        <>
          <p>
            {fmtDate(issue.first_reported_at)}, about {issue.category.toLowerCase()} near {issue.locality}, ward {issue.ward_code}.
          </p>
          {others.length > 0 && (
            <p className="text-muted">
              {others.length} other complaint{others.length > 1 ? "s" : ""} about the same problem {others.length > 1 ? "were" : "was"} combined with yours: {others.slice(0, 4).join(", ")}
              {others.length > 4 ? " and more" : ""}.
            </p>
          )}
        </>
      ),
    },
  ];
  if (wo) {
    steps.push({
      title: "BMC sent a repair",
      tone: "info",
      body: (
        <>
          <p>
            <Link href={`/work-order/${wo.work_order_id}`} className={`${link} num`}>
              {wo.work_order_id}
            </Link>{" "}
            by{" "}
            <Link href={`/contractors/${wo.contractor_id}`} className={link}>
              {wo.contractor_name.replace(" (synthetic)", "")}
            </Link>
            : {wo.repair_method.toLowerCase()}, billed <span className="num">{inr(wo.cost_inr)}</span>.
          </p>
          <p className="text-muted">
            Finished {fmtDate(wo.completed_at)}
            {wo.days_to_fix !== null && wo.days_to_fix >= 0 ? `, ${wo.days_to_fix.toFixed(1)} days after the first complaint` : ""}. The target was {wo.sla_hours} hours, and it was {wo.sla_met ? "met" : "missed"}.
          </p>
          {wo.flags.some((f) => ["over_billed", "double_billed", "dlp_paid"].includes(f)) && (
            <p className="mt-1">
              <Badge tone="warn">Listed for billing review</Badge>
            </p>
          )}
        </>
      ),
    });
  }
  if (issue.status === "fixed" || issue.status === "fixed_failed") {
    steps.push({
      title: issue.status === "fixed" ? "The repair held" : "The repair failed",
      tone: issue.status === "fixed" ? "success" : "danger",
      body: <p>{issue.status === "fixed" ? "It did not need to be redone within 30 days." : "It had to be redone within 30 days of finishing, so the money spent did not buy a lasting fix."}</p>,
    });
  } else if (issue.status === "never_fixed") {
    steps.push({
      title: "Not fixed yet",
      tone: "warn",
      body: (
        <>
          <p>BMC status: {issue.disposition}. No repair has been ordered.</p>
          {plan && (
            <p className="mt-1">
              In our ranking it is number <span className="num">{plan.item.rank}</span> of {plan.ward.open_issues} open issues in ward {plan.ward.ward_code}, with a priority score of <span className="num">{Math.round(plan.item.priority_score)}</span>/100.{" "}
              {plan.item.dlp ? "The road is under warranty, so the original contractor should fix it at no cost." : plan.item.funded ? `The ward's remaining budget covers it (about ${inrShort(plan.item.est_cost_inr)}).` : `The ward's remaining budget does not cover it yet (about ${inrShort(plan.item.est_cost_inr)}).`}{" "}
              <Link href={`/ward/${wardSlug(plan.ward.ward_code)}`} className={link}>
                See the ward plan
              </Link>
            </p>
          )}
        </>
      ),
    });
  } else {
    steps.push({ title: "Outside BMC's scope", tone: "warn", body: <p>BMC status: {issue.disposition}. This type of problem is handled by another agency, or was not a road repair.</p> });
  }

  return (
    <article aria-labelledby="res-h" className="space-y-6">
      <Card>
        <div className="flex flex-wrap items-center gap-3">
          <h2 id="res-h" className="font-serif text-2xl font-semibold">
            <span className="num">{key}</span>
          </h2>
          <Badge tone={statusTone(issue.status)}>{STATUS_LABEL[issue.status]}</Badge>
        </div>
        <p className="mt-3 text-base leading-relaxed">{issue.trail}</p>
      </Card>
      <ol className="relative space-y-5 border-l border-border pl-6">
        {steps.map((s) => (
          <li key={s.title} className="relative">
            <span className={cx("absolute -left-[1.95rem] top-1.5 size-3 rounded-full ring-4 ring-background", s.tone === "success" ? "bg-success" : s.tone === "danger" ? "bg-danger" : s.tone === "warn" ? "bg-warn" : "bg-info")} aria-hidden />
            <h3 className="font-medium">{s.title}</h3>
            <div className="mt-1 space-y-1 text-sm leading-relaxed">{s.body}</div>
          </li>
        ))}
      </ol>
      {issue.social_post_ids.length > 0 && (
        <p className="text-sm text-muted">{issue.social_post_ids.length} social media post{issue.social_post_ids.length > 1 ? "s" : ""} in the same area and time mention this kind of problem.</p>
      )}
      <Examples />
    </article>
  );
}
