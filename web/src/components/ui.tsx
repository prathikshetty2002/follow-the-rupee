import Link from "next/link";
import type { ReactNode } from "react";
import { FACTOR_LABEL, TONE, type Tone } from "@/lib/format";

export function cx(...parts: (string | false | null | undefined)[]) {
  return parts.filter(Boolean).join(" ");
}

export function Badge({ tone = "neutral", children, title }: { tone?: Tone; children: ReactNode; title?: string }) {
  return (
    <span title={title} className={cx("inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium leading-5 whitespace-nowrap", TONE[tone])}>
      {children}
    </span>
  );
}

export function Card({ children, className, as: Tag = "section" }: { children: ReactNode; className?: string; as?: "section" | "div" | "article" }) {
  return <Tag className={cx("rounded-xl border border-border bg-surface p-5 sm:p-6", className)}>{children}</Tag>;
}

export function PageHeader({ eyebrow, title, children }: { eyebrow?: string; title: string; children?: ReactNode }) {
  return (
    <header className="mb-8 max-w-3xl">
      {eyebrow && <p className="mb-2 text-sm font-medium uppercase tracking-wide text-accent">{eyebrow}</p>}
      <h1 className="font-serif text-3xl font-semibold leading-tight text-balance sm:text-4xl">{title}</h1>
      {children && <div className="mt-3 text-base leading-relaxed text-muted sm:text-lg">{children}</div>}
    </header>
  );
}

export function SectionTitle({ children, id, aside }: { children: ReactNode; id?: string; aside?: ReactNode }) {
  return (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
      <h2 id={id} className="font-serif text-2xl font-semibold">
        {children}
      </h2>
      {aside && <div className="text-sm text-muted">{aside}</div>}
    </div>
  );
}

export function Stat({ label, value, hint, tone }: { label: string; value: ReactNode; hint?: ReactNode; tone?: "danger" | "accent" | "success" }) {
  const color = tone === "danger" ? "text-danger" : tone === "success" ? "text-success" : tone === "accent" ? "text-accent" : "text-foreground";
  return (
    <div className="rounded-xl border border-border bg-surface p-4 sm:p-5">
      <p className="text-sm text-muted">{label}</p>
      <p className={cx("num mt-1 text-2xl font-semibold sm:text-3xl", color)}>{value}</p>
      {hint && <p className="mt-1 text-sm leading-snug text-muted">{hint}</p>}
    </div>
  );
}

/** Spent against budget on a 0-125% scale, with the budget line marked. */
export function BudgetBar({ spent, budget }: { spent: number; budget: number }) {
  const ratio = spent / budget;
  const over = ratio > 1;
  const width = Math.min(ratio, 1.25) / 1.25;
  return (
    <div role="img" aria-label={`${Math.round(ratio * 100)}% of budget spent${over ? ", over budget" : ""}`}>
      <div className="relative h-3 rounded-full bg-surface-2">
        <div className={cx("h-3 rounded-full", over ? "bg-danger" : "bg-accent")} style={{ width: `${width * 100}%` }} />
        <div className="absolute inset-y-[-3px] w-0.5 bg-foreground/70" style={{ left: `${(1 / 1.25) * 100}%` }} aria-hidden />
      </div>
    </div>
  );
}

const FACTOR_COLOR: Record<string, string> = {
  severity: "bg-danger",
  flood: "bg-info",
  history: "bg-warn",
  traffic: "bg-accent",
  accidents: "bg-muted",
  facilities: "bg-success",
};

/** How the priority score is made up: one segment per factor, sized by its points. */
export function FactorBar({ factors }: { factors: Record<string, number> }) {
  const entries = Object.entries(factors).filter(([, v]) => v > 0);
  const total = entries.reduce((s, [, v]) => s + v, 0) || 1;
  const label = entries.map(([k, v]) => `${FACTOR_LABEL[k]} ${v.toFixed(0)}`).join(", ");
  return (
    <div>
      <div role="img" aria-label={`Score made of: ${label}`} className="flex h-2.5 overflow-hidden rounded-full bg-surface-2">
        {entries.map(([k, v]) => (
          <div key={k} className={FACTOR_COLOR[k]} style={{ width: `${(v / total) * 100}%` }} />
        ))}
      </div>
      <ul className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted">
        {entries.map(([k, v]) => (
          <li key={k} className="flex items-center gap-1.5">
            <span className={cx("inline-block size-2 rounded-full", FACTOR_COLOR[k])} aria-hidden />
            {FACTOR_LABEL[k]} <span className="num text-foreground">{v.toFixed(0)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** A horizontal bar comparing a result with what was expected for the same work. */
export function VsExpected({ label, actual, expected, format, higherIsBetter }: { label: string; actual: number; expected: number; format: (n: number) => string; higherIsBetter: boolean }) {
  const max = Math.max(actual, expected, 0.01) * 1.15;
  const good = higherIsBetter ? actual >= expected : actual <= expected;
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between text-sm">
        <span className="text-muted">{label}</span>
        <span className="num">
          <span className={good ? "text-success" : "text-danger"}>{format(actual)}</span>
          <span className="text-muted"> vs {format(expected)} expected</span>
        </span>
      </div>
      <div className="relative h-2.5 rounded-full bg-surface-2" role="img" aria-label={`${label}: ${format(actual)} against ${format(expected)} expected`}>
        <div className={cx("h-2.5 rounded-full", good ? "bg-success" : "bg-danger")} style={{ width: `${(actual / max) * 100}%` }} />
        <div className="absolute inset-y-[-3px] w-0.5 bg-foreground/70" style={{ left: `${(expected / max) * 100}%` }} aria-hidden />
      </div>
    </div>
  );
}

export function EmptyState({ title, children, action }: { title: string; children?: ReactNode; action?: { href: string; label: string } }) {
  return (
    <div className="rounded-xl border border-dashed border-border bg-surface p-8 text-center">
      <p className="font-medium">{title}</p>
      {children && <p className="mx-auto mt-1 max-w-prose text-sm text-muted">{children}</p>}
      {action && (
        <Link href={action.href} className="mt-4 inline-flex min-h-10 items-center rounded-lg border border-border px-4 text-sm font-medium hover:bg-surface-2">
          {action.label}
        </Link>
      )}
    </div>
  );
}

export function TableWrap({ children, label }: { children: ReactNode; label: string }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-surface" role="region" aria-label={label} tabIndex={0}>
      {children}
    </div>
  );
}

export const th = "px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted whitespace-nowrap";
export const td = "px-4 py-3 align-top text-sm";
export const link = "text-accent underline decoration-accent/40 underline-offset-2 hover:decoration-accent";

export function ButtonLink({ href, children, variant = "solid" }: { href: string; children: ReactNode; variant?: "solid" | "ghost" }) {
  return (
    <Link
      href={href}
      className={cx(
        "inline-flex min-h-11 items-center justify-center rounded-lg px-5 text-sm font-medium transition-colors",
        variant === "solid" ? "bg-foreground text-background hover:opacity-90" : "border border-border hover:bg-surface-2",
      )}
    >
      {children}
    </Link>
  );
}
