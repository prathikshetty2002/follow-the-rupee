import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { PageShell, focusRing } from "@/components/ui";
import { getContractors, getWorkOrdersById } from "@/lib/data";
import { fmtDate, inr, inrShort, num, pct, plural } from "@/lib/format";
import type { Contractor, Verdict, WorkOrder } from "@/lib/types";

export const metadata: Metadata = {
  title: "Contractor scorecards | Follow the Rupee",
  description: "Each contractor judged against what is expected for the same work, wards and weather.",
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;
const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

const VERDICT: Record<Verdict, { word: string; glyph: string; cls: string }> = {
  "better than expected": { word: "Better than expected", glyph: "▲", cls: "border-[#1F4E9C] bg-[#E8EFFA]" },
  "in line with expectations": { word: "In line with expectations", glyph: "●", cls: "border-[#4A5568] bg-[#F4F6F9]" },
  "worse than expected": { word: "Worse than expected", glyph: "▼", cls: "border-[#8A5A00] bg-[#FFF4DB]" },
};

const GROUPS = [
  { key: "over_billed", title: "Billed above the rate card", note: "More than 1.4 times what the rate card allows." },
  { key: "double_billed", title: "Looks billed twice", note: "Same road and work type billed again within 7 days." },
  { key: "reopened", title: "Repair failed within 30 days", note: "Compared with what is expected for similar work." },
  { key: "sla_missed", title: "Fixed well after the promised time", note: "More than twice the target time." },
] as const;

const shortName = (n: string) => n.replace(" (synthetic)", "");

export default function ContractorsPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <PageShell current="contractors">
      <Suspense fallback={<p aria-busy="true" className="text-[15px] text-[#4A5568]">Loading…</p>}>
        <Body searchParams={searchParams} />
      </Suspense>
    </PageShell>
  );
}

async function Body({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const id = (first(sp.c) ?? "").toUpperCase();
  const all = (await getContractors()).slice().sort((a, b) => (a.rank ?? 99) - (b.rank ?? 99));
  const one = all.find((c) => c.contractor_id === id);
  return one ? <Detail c={one} /> : <List all={all} unknown={id} />;
}

function Verd({ v }: { v: Verdict }) {
  const x = VERDICT[v];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border-2 px-3 py-1 text-[13px] font-bold ${x.cls}`}>
      <span aria-hidden="true">{x.glyph}</span>
      {x.word}
    </span>
  );
}

function List({ all, unknown }: { all: Contractor[]; unknown: string }) {
  return (
    <>
      <div className="mb-6 max-w-3xl">
        <h1 className="text-3xl font-bold leading-tight sm:text-4xl">Contractor scorecards</h1>
        <p className="mt-2 text-[17px] leading-relaxed text-[#4A5568]">
          Each contractor is judged against what is expected for the same kind of work, in the same wards, in the same weather. Grade C means about as expected. A
          contractor given the hard jobs is not marked down for them.
        </p>
        {unknown && <p className="mt-2 rounded-md bg-[#FFF4DB] p-3 text-[15px]">No contractor with ID {unknown}. Pick one below.</p>}
      </div>
      <ol className="space-y-3">
        {all.map((c) => (
          <li key={c.contractor_id}>
            <Link
              href={`/contractors?c=${c.contractor_id}`}
              className={`grid gap-3 rounded-lg border border-[#8A94A6] p-4 hover:bg-[#F4F6F9] sm:grid-cols-[3rem_1fr_auto] sm:items-center ${focusRing}`}
            >
              <span className="text-2xl font-bold text-[#4A5568]" aria-label={`Rank ${c.rank}`}>
                #{c.rank}
              </span>
              <span>
                <span className="block text-lg font-bold">{shortName(c.contractor_name)}</span>
                <span className="block text-[14px] text-[#4A5568]">
                  {plural(c.work_orders, "job")} · {inrShort(c.spend_inr)} · wards {c.wards.slice(0, 3).join(", ")}
                </span>
                {c.adjusted && (
                  <span className="mt-2 flex flex-wrap gap-2">
                    <span className="text-[13px] font-semibold">Speed:</span>
                    <Verd v={c.adjusted.speed_verdict} />
                    <span className="text-[13px] font-semibold">Repairs held:</span>
                    <Verd v={c.adjusted.durability_verdict} />
                  </span>
                )}
              </span>
              <span className="text-left sm:text-right">
                <span className="block text-[13px] text-[#4A5568]">Grade</span>
                <span className="block text-3xl font-bold">{c.grade}</span>
                <span className="block text-[13px] text-[#4A5568]">{c.context_adjusted_score} out of 100</span>
              </span>
            </Link>
          </li>
        ))}
      </ol>
      <p className="mt-6 max-w-3xl text-[14px] text-[#4A5568]">
        Score weights: repairs holding 40%, billing 30%, speed 30%. A job on a road under warranty is shown, not scored, because BMC chose to pay for it.
      </p>
    </>
  );
}

function Row({ label, mine, expected, city }: { label: string; mine: string; expected?: string; city: string }) {
  return (
    <tr className="border-t border-[#C5CCD6]">
      <th scope="row" className="py-2 pr-3 text-left font-semibold">
        {label}
      </th>
      <td className="py-2 pr-3 font-bold">{mine}</td>
      <td className="py-2 pr-3">{expected ?? "–"}</td>
      <td className="py-2">{city}</td>
    </tr>
  );
}

async function Detail({ c }: { c: Contractor }) {
  const ids = [...new Set(Object.values(c.evidence ?? {}).flat())];
  const wos = await getWorkOrdersById(ids);
  const byId = new Map(wos.map((w) => [w.work_order_id, w]));
  const a = c.adjusted;
  const b = c.billing;
  const city = c.city;
  const barLabel: Record<string, string> = { durability: "Repairs holding (40%)", billing: "Billing (30%)", speed: "Speed (30%)" };

  return (
    <article>
      <p className="mb-2 text-[14px]">
        <Link href="/contractors" className={`font-semibold text-[#1F4E9C] underline ${focusRing}`}>
          All contractors
        </Link>
      </p>
      <div className="rounded-lg border-2 border-[#14213D] p-4 sm:p-5">
        <p className="text-[13px] font-bold tracking-wide">RANK {c.rank} OF 8</p>
        <h1 className="text-3xl font-bold leading-tight">{shortName(c.contractor_name)}</h1>
        <p className="mt-1 text-[15px] text-[#4A5568]">
          {plural(c.work_orders, "job")} · {inr(c.spend_inr)} · wards {c.wards.join(", ")}
        </p>
        <p className="mt-3 flex items-baseline gap-3">
          <span className="text-5xl font-bold">{c.grade}</span>
          <span className="text-lg">{c.context_adjusted_score} out of 100</span>
        </p>
        <p className="mt-3 max-w-3xl text-[17px] leading-relaxed">{c.scorecard_text}</p>
        <p className="mt-3 max-w-3xl rounded-md bg-[#F4F6F9] p-3 text-[15px]">
          <b>One thing to improve:</b> {c.improve}
        </p>
      </div>

      {c.scores && (
        <section aria-labelledby="sc" className="mt-6">
          <h2 id="sc" className="mb-2 text-xl font-bold">
            Score breakdown
          </h2>
          <ul className="space-y-3">
            {Object.entries(c.scores).map(([k, v]) => (
              <li key={k}>
                <div className="flex justify-between text-[15px]">
                  <span className="font-semibold">{barLabel[k] ?? k}</span>
                  <span className="font-bold">{v} out of 100</span>
                </div>
                <div className="mt-1 h-3 w-full rounded bg-[#E3E7ED]" role="img" aria-label={`${v} out of 100`}>
                  <div className="h-3 rounded bg-[#1F4E9C]" style={{ width: `${v}%` }} />
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {a && city && (
        <section aria-labelledby="cmp" className="mt-6">
          <h2 id="cmp" className="mb-1 text-xl font-bold">
            Against what is expected
          </h2>
          <p className="mb-2 text-[14px] text-[#4A5568]">
            Expected figures account for this contractor&apos;s mix of wards, weather and kinds of work, so a hard patch is not counted against it.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full min-w-120 text-[15px]">
              <thead>
                <tr className="text-left text-[13px] text-[#4A5568]">
                  <th scope="col" className="pb-1 pr-3">
                    Measure
                  </th>
                  <th scope="col" className="pb-1 pr-3">
                    This contractor
                  </th>
                  <th scope="col" className="pb-1 pr-3">
                    Expected for its work
                  </th>
                  <th scope="col" className="pb-1">
                    City average
                  </th>
                </tr>
              </thead>
              <tbody>
                <Row label="Jobs finished within the promised time" mine={pct(c.sla_met_rate)} expected={pct(a.sla_expected_rate)} city={pct(city.sla_met_rate)} />
                <Row
                  label="Repairs redone within 30 days"
                  mine={`${pct(c.reopen_rate, 1)} (range ${pct(a.reopen_rate_ci95[0], 1)} to ${pct(a.reopen_rate_ci95[1], 1)})`}
                  expected={pct(a.reopen_expected_rate)}
                  city={pct(city.reopen_rate)}
                />
                <Row label="Average bill vs rate card" mine={`${c.cost_vs_rate_pct > 0 ? "+" : ""}${c.cost_vs_rate_pct.toFixed(1)}%`} city={`${city.cost_vs_rate_pct > 0 ? "+" : ""}${city.cost_vs_rate_pct.toFixed(1)}%`} />
              </tbody>
            </table>
          </div>
          <p className="mt-3 flex flex-wrap items-center gap-2">
            <span className="text-[14px] font-semibold">Speed:</span>
            <Verd v={a.speed_verdict} />
            <span className="text-[14px] font-semibold">Repairs held:</span>
            <Verd v={a.durability_verdict} />
          </p>
        </section>
      )}

      {b && (
        <section aria-labelledby="bill" className="mt-6">
          <h2 id="bill" className="mb-2 text-xl font-bold">
            Billing facts
          </h2>
          <dl className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg bg-[#F4F6F9] p-4">
              <dt className="text-[13px] text-[#4A5568]">Billed above the rate card</dt>
              <dd className="text-xl font-bold">{plural(b.over_billed_jobs, "job")}</dd>
              <dd className="text-[14px]">{inr(b.over_billed_excess_inr)} above the normal range</dd>
            </div>
            <div className="rounded-lg bg-[#F4F6F9] p-4">
              <dt className="text-[13px] text-[#4A5568]">Looks billed twice</dt>
              <dd className="text-xl font-bold">{plural(b.double_billed_jobs, "job")}</dd>
              <dd className="text-[14px]">{inr(b.double_billed_inr)}</dd>
            </div>
            <div className="rounded-lg bg-[#F4F6F9] p-4">
              <dt className="text-[13px] text-[#4A5568]">Paid on warranty roads</dt>
              <dd className="text-xl font-bold">{plural(b.paid_on_dlp_roads_jobs, "job")}</dd>
              <dd className="text-[14px]">{inr(b.paid_on_dlp_roads_inr)}. Shown, not scored: BMC chose to pay.</dd>
            </div>
          </dl>
        </section>
      )}

      <section aria-labelledby="ev" className="mt-6">
        <h2 id="ev" className="mb-1 text-xl font-bold">
          Repair jobs behind these numbers
        </h2>
        <p className="mb-3 text-[14px] text-[#4A5568]">Worst examples first. Each is a job record, not a verdict.</p>
        <div className="space-y-3">
          {GROUPS.map((g) => {
            const list = (c.evidence?.[g.key] ?? []).map((id) => byId.get(id)).filter((w): w is WorkOrder => !!w);
            if (list.length === 0) return null;
            return (
              <details key={g.key} className="rounded-lg border border-[#8A94A6] p-3">
                <summary className={`min-h-11 cursor-pointer py-2 font-bold ${focusRing}`}>
                  {g.title} ({list.length} shown)
                </summary>
                <p className="mb-2 text-[14px] text-[#4A5568]">{g.note}</p>
                <ul className="space-y-2">
                  {list.map((w) => (
                    <li key={w.work_order_id} className="rounded-md bg-[#F4F6F9] p-3 text-[14px]">
                      <span className="font-bold">{w.work_order_id}</span> · ward {w.ward_code} · {w.road_name ?? "road not named"} · {fmtDate(w.completed_at)}
                      <br />
                      {w.repair_method}. Billed {inr(w.cost_inr)} against {inr(w.expected_cost_inr)} on the rate card ({w.cost_ratio.toFixed(2)} times).
                      {w.under_dlp ? " Road was under warranty." : ""}
                      {w.issue_id ? (
                        <>
                          {" "}
                          <Link href={`/complaints?issue=${w.issue_id}`} className={`font-semibold text-[#1F4E9C] underline ${focusRing}`}>
                            See the complaint trail
                          </Link>
                        </>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </details>
            );
          })}
        </div>
        <p className="mt-4 text-[14px]">
          <Link href="/audit" className={`font-semibold text-[#1F4E9C] underline ${focusRing}`}>
            See all flagged jobs in the audit
          </Link>{" "}
          · {num(c.work_orders)} jobs reviewed for this contractor.
        </p>
      </section>
    </article>
  );
}
