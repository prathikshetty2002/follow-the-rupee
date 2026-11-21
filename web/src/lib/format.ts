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

/** F/S <-> F-S: the URL form of a ward code. */
export const wardSlug = (code: string) => code.replace("/", "-");
export const slugToWard = (slug: string) => slug.replace("-", "/");

/** Tailwind classes for a badge tone. */
export const TONE = {
  success: "bg-success-soft text-success border-success/30",
  danger: "bg-danger-soft text-danger border-danger/30",
  warn: "bg-warn-soft text-warn border-warn/30",
  info: "bg-info-soft text-info border-info/30",
  accent: "bg-accent-soft text-accent border-accent/30",
  neutral: "bg-surface-2 text-muted border-border",
} as const;
export type Tone = keyof typeof TONE;
