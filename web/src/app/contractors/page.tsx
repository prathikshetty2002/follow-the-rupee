import type { Metadata } from "next";
import Link from "next/link";
import { Badge, Card, PageHeader, link } from "@/components/ui";
import { getContractors } from "@/lib/data";
import { gradeTone, inrShort, int, pct, verdictTone } from "@/lib/format";

export const metadata: Metadata = { title: "Contractors" };

function MiniScore({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="mb-1 flex justify-between text-xs">
        <span className="text-muted">{label}</span>
        <span className="num">{value}/100</span>
      </div>
      <div className="h-2 rounded-full bg-surface-2" role="img" aria-label={`${label} score ${value} out of 100`}>
        <div className={`h-2 rounded-full ${value >= 65 ? "bg-success" : value >= 40 ? "bg-warn" : "bg-danger"}`} style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

export default async function ContractorsPage() {
  const contractors = await getContractors();
  return (
    <div className="space-y-8">
      <PageHeader eyebrow="Scorecards" title="How each contractor did, judged fairly">
        Each result is compared with what is expected for the same kind of work: the repair methods used, the roads and wards, and the weather. Grade C means about as expected. Volume of work is never counted against anyone.
      </PageHeader>
      <ul className="grid gap-4 md:grid-cols-2">
        {contractors.map((c) => (
          <li key={c.contractor_id}>
            <Card as="article" className="flex h-full flex-col">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm text-muted">Rank {c.rank} of {contractors.length}</p>
                  <h2 className="font-serif text-2xl font-semibold leading-tight">{c.contractor_name.replace(" (synthetic)", "")}</h2>
                </div>
                <div className="text-right">
                  <Badge tone={gradeTone(c.grade)}>Grade {c.grade}</Badge>
                  <p className="num mt-1 text-sm text-muted">{c.context_adjusted_score}/100</p>
                </div>
              </div>
              <p className="mt-4 flex-1 text-sm leading-relaxed">{c.scorecard_text}</p>
              <div className="mt-5 grid grid-cols-3 gap-4">
                <MiniScore label="Lasting" value={c.scores?.durability ?? 0} />
                <MiniScore label="Billing" value={c.scores?.billing ?? 0} />
                <MiniScore label="Speed" value={c.scores?.speed ?? 0} />
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-border pt-4 text-sm">
                <span className="num text-muted">{int(c.work_orders)} repairs, {inrShort(c.spend_inr)}</span>
                {c.adjusted && <Badge tone={verdictTone(c.adjusted.durability_verdict)}>Lasting: {c.adjusted.durability_verdict}</Badge>}
                <span className="num text-muted">{pct(c.reopen_rate)} redone</span>
                <Link href={`/contractors/${c.contractor_id}`} className={`${link} ml-auto font-medium`}>
                  See the evidence
                </Link>
              </div>
            </Card>
          </li>
        ))}
      </ul>
    </div>
  );
}
