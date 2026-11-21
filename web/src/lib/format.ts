// Display helpers shared by the audit and complaint pages. Indian digit grouping, dates shown in UTC so
// server and browser always agree (the pipeline's timestamps carry no time zone).

const NF = new Intl.NumberFormat("en-IN");

/** ₹3,15,328 */
export const inr = (n: number): string => `₹${NF.format(Math.round(n))}`;

/** ₹3.77 crore, ₹26.2 lakh, or the full figure below a lakh. */
export function inrShort(n: number): string {
  const v = Math.abs(n);
  if (v >= 1e7) return `₹${(n / 1e7).toFixed(2)} crore`;
  if (v >= 1e5) return `₹${(n / 1e5).toFixed(1)} lakh`;
  return inr(n);
}

export const pct = (x: number, digits = 0): string => `${(x * 100).toFixed(digits)}%`;

export const num = (n: number): string => NF.format(n);

export const plural = (n: number, one: string, many = `${one}s`): string => `${NF.format(n)} ${n === 1 ? one : many}`;

/** 1 Jun 2025 */
export function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "date not recorded";
  let s = iso;
  if (s.length === 10) s = `${s}T00:00:00Z`;
  else if (/T\d\d:\d\d$/.test(s)) s = `${s}:00Z`;
  else if (!/([zZ]|[+-]\d\d:?\d\d)$/.test(s)) s = `${s}Z`;
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
}

/** "5.6 days" or "30 hours" */
export function fmtDays(days: number | null | undefined): string {
  if (days == null) return "not recorded";
  return days < 1 ? `${Math.round(days * 24)} hours` : `${days.toFixed(1)} days`;
}
