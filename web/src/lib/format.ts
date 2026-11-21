import type { FlagType, IssueStatus } from "./types";

const grouped = new Intl.NumberFormat("en-IN");

/** ₹1,16,079 with Indian digit grouping. */
export const inr = (n: number) => `₹${grouped.format(Math.round(n))}`;

/** ₹1.41 cr / ₹14.1 L / ₹3,112: short money for tiles and tables. */
export function inrShort(n: number): string {
  if (n <= 0) return "₹0";
  if (n >= 1e7) return `₹${(n / 1e7).toFixed(2)} cr`;
  if (n >= 1e5) return `₹${(n / 1e5).toFixed(1)} L`;
  return inr(n);
}

export const pct = (x: number, digits = 0) => `${(x * 100).toFixed(digits)}%`;
export const int = (n: number) => grouped.format(Math.round(n));

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "2025-07-05T11:44" -> "5 Jul 2025". Read from the text so the server's timezone cannot shift the day. */
export function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "-";
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  return `${d} ${MONTHS[m - 1]} ${y}`;
}

export const wardSlug = (code: string) => code.replace("/", "-");
export const slugToWard = (slug: string) => slug.replace("-", "/");

export const FLAG_LABEL: Record<FlagType, string> = {
  over_billed: "Billed far above rate card",
  double_billed: "Possible repeat bill",
  dlp_paid: "Paid on a road under warranty",
  sla_missed: "Late fix",
  reopened: "Repair failed within 30 days",
};

export const FLAG_HELP: Record<FlagType, string> = {
  over_billed: "The bill is more than 1.4 times what the rate card says the work should cost. Normal jobs stay within 1.3 times.",
  double_billed: "No complaint is linked, and the same work was billed on the same road in the days before.",
  dlp_paid: "The road is still under its defect liability period, so the original contractor should repair it free.",
  sla_missed: "The fix took at least twice the target time. Rated lower when heavy rain fell in that window.",
  reopened: "The repair failed within 30 days of finishing.",
};

export const STATUS_LABEL: Record<IssueStatus, string> = {
  fixed: "Fixed and held",
  fixed_failed: "Fixed, then failed",
  never_fixed: "Not fixed yet",
  not_bmc_scope: "Outside BMC's scope",
};

export const SEVERITY_ORDER = { high: 0, medium: 1, low: 2 } as const;

/** Tailwind classes for a status or severity tone. */
export const TONE = {
  success: "bg-success-soft text-success border-success/30",
  danger: "bg-danger-soft text-danger border-danger/30",
  warn: "bg-warn-soft text-warn border-warn/30",
  info: "bg-info-soft text-info border-info/30",
  accent: "bg-accent-soft text-accent border-accent/30",
  neutral: "bg-surface-2 text-muted border-border",
} as const;
export type Tone = keyof typeof TONE;

export const severityTone = (s: string): Tone => (s === "high" ? "danger" : s === "medium" ? "warn" : "neutral");
export const gradeTone = (g: string): Tone => (g === "A" || g === "B" ? "success" : g === "C" ? "warn" : "danger");
export const statusTone = (s: IssueStatus): Tone => (s === "fixed" ? "success" : s === "fixed_failed" ? "danger" : s === "never_fixed" ? "warn" : "neutral");
export const verdictTone = (v: string): Tone => (v.startsWith("better") ? "success" : v.startsWith("worse") ? "danger" : "neutral");

export const FACTOR_LABEL: Record<string, string> = {
  severity: "How serious",
  flood: "Flood risk",
  history: "Past trouble",
  traffic: "Traffic",
  accidents: "Accidents",
  facilities: "Hospitals and schools",
};
