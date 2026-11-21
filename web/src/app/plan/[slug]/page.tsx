import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Planner } from "@/components/planner/planner";
import type { PlannerData, PlannerIssue } from "@/components/planner/types";
import { PageSkeleton } from "@/components/skeletons";
import { PageHeader, link } from "@/components/ui";
import { getContractors, getNextRupee, getOpenIssuePoints, getRoadGeo, getWardGeo, getWards } from "@/lib/data";
import { inrShort, slugToWard, wardSlug } from "@/lib/format";
import { projectFeatures } from "@/lib/map";

export async function generateStaticParams() {
  return (await getWards()).map((w) => ({ slug: wardSlug(w.ward_code) }));
}

export async function generateMetadata(props: PageProps<"/plan/[slug]">): Promise<Metadata> {
  const { slug } = await props.params;
  const w = (await getWards()).find((x) => wardSlug(x.ward_code) === slug);
  return { title: w ? `Ward ${w.ward_code}: ${w.ward_name}` : "Plan" };
}

export default function PlanPage(props: PageProps<"/plan/[slug]">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Content params={props.params} />
    </Suspense>
  );
}

async function Content({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const code = slugToWard(slug);
  const [file, wards, contractors, wardGeo, roadGeo, points] = await Promise.all([getNextRupee(), getWards(), getContractors(), getWardGeo(), getRoadGeo(), getOpenIssuePoints()]);
  const plan = file.wards.find((w) => w.ward_code === code);
  const ward = wards.find((w) => w.ward_code === code);
  const feature = wardGeo.features.find((f) => f.properties.ward_code === code);
  if (!plan || !ward || !feature) notFound();

  const names = Object.fromEntries(contractors.map((c) => [c.contractor_id, c.contractor_name.replace(" (synthetic)", "")]));
  const roads = roadGeo.features.filter((f) => f.properties.ward_code === code && f.properties.open_issues > 0);
  const W = 720;
  const H = 460;
  const proj = projectFeatures([feature], W, H, 16);
  const where = new Map(points.features.filter((f) => f.properties.ward_code === code).map((f) => [f.properties.plan_issue_id, f.geometry.coordinates as [number, number]]));

  const issues: PlannerIssue[] = plan.issues.map((i) => {
    const at = where.get(i.issue_id);
    const [x, y] = at ? proj.point(at[0], at[1]) : [null, null];
    return {
      id: i.issue_id,
      baseRank: i.rank,
      values: i.factor_values,
      tiebreak: i.tiebreak,
      cost: i.cost_to_bmc_inr,
      costLow: i.cost_range_inr[0],
      costHigh: i.cost_range_inr[1],
      dlp: i.dlp,
      road: i.road_name,
      locality: i.locality,
      workType: i.work_type,
      method: i.recommended_method,
      reasons: i.reasons,
      contractors: i.recommended_contractors.map((c) => names[c] ?? c),
      expectedFail: i.expected_reopen_rate,
      nComplaints: i.n_complaints,
      complaintIds: i.complaint_ids,
      confidence: i.confidence,
      notes: i.confidence_notes,
      rankRange: i.rank_range,
      roadMatch: i.road_match,
      x,
      y,
    };
  });

  const data: PlannerData = {
    ward: { code, name: ward.ward_name },
    defaultBudget: plan.remaining_budget_inr,
    need: plan.need_inr,
    issues,
    weights: file.weights as PlannerData["weights"],
    presets: file.weight_presets,
    map: { width: W, height: H, ward: proj.paths[0], roads: roads.map((r) => ({ id: r.properties.road_id, d: proj.path(r) })) },
  };

  return (
    <div className="space-y-8">
      <div className="rise">
        <p className="mb-3 text-sm">
          <Link href="/" className={link}>
            All wards
          </Link>
        </p>
        <PageHeader eyebrow={`Ward ${code}`} title={`What should ${ward.ward_name} fix first?`}>
          <p>
            This season the ward had {inrShort(ward.budget_inr)} for monsoon road repairs and has spent {inrShort(ward.spend_inr)}. {plan.over_budget ? "It is already over budget, so only repairs that cost BMC nothing are covered until you change the budget below." : `${inrShort(plan.remaining_budget_inr)} is left.`} Change the budget to see what it buys.
          </p>
        </PageHeader>
      </div>
      <Planner data={data} />
    </div>
  );
}
