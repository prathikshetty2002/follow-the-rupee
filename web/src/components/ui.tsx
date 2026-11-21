import Link from "next/link";
import type { ReactNode } from "react";
import { TONE, type Tone } from "@/lib/format";

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
