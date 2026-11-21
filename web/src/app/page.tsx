import { getMeta, getWards } from "@/lib/data";

const inr = (n: number) => `₹${n.toLocaleString("en-IN")}`;

// Placeholder: proves the pipeline → web wiring. Replace with the real dashboard.
export default async function Home() {
  const [meta, wards] = await Promise.all([getMeta(), getWards()]);
  return (
    <main className="mx-auto max-w-4xl p-6 font-sans">
      <h1 className="text-2xl font-semibold">Follow the Rupee</h1>
      <p className="mb-4 text-sm text-zinc-500">
        {meta.season} · data generated {meta.generated_at}
        {meta.stub && " · STUB DATA"}
      </p>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left">
            <th>Ward</th>
            <th className="text-right">Budget</th>
            <th className="text-right">Spend</th>
            <th className="text-right">Re-open rate</th>
          </tr>
        </thead>
        <tbody>
          {wards.map((w) => (
            <tr key={w.ward_code} className="border-t border-zinc-200 dark:border-zinc-800">
              <td>{w.ward_code} · {w.ward_name}</td>
              <td className="text-right">{inr(w.budget_inr)}</td>
              <td className="text-right">{inr(w.spend_inr)}</td>
              <td className="text-right">{Math.round(w.reopen_rate * 100)}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}
