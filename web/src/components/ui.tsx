import type { ReactNode } from "react";

export function cx(...parts: (string | false | null | undefined)[]) {
  return parts.filter(Boolean).join(" ");
}

/** Page title block: a small label, then the title, then one plain sentence. */
export function PageTitle({ kicker, title, children }: { kicker?: string; title: string; children?: ReactNode }) {
  return (
    <header className="max-w-3xl">
      {kicker && <p className="label mb-3">{kicker}</p>}
      <h1 className="text-4xl font-bold leading-[1.05] sm:text-5xl">{title}</h1>
      {children && <div className="mt-5 max-w-2xl text-lg leading-relaxed text-muted">{children}</div>}
    </header>
  );
}

/** Section heading with a heavy rule above it, like a ledger section. */
export function Section({ id, title, aside, children }: { id: string; title: string; aside?: ReactNode; children: ReactNode }) {
  return (
    <section aria-labelledby={id} className="border-t-2 border-foreground pt-4">
      <div className="mb-6 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
        <h2 id={id} className="text-2xl font-bold">
          {title}
        </h2>
        {aside && <div className="text-sm text-muted">{aside}</div>}
      </div>
      {children}
    </section>
  );
}

/** A horizontally scrollable region for wide tables; focusable so keyboard users can scroll it. */
export function TableWrap({ children, label }: { children: ReactNode; label: string }) {
  return (
    <div className="overflow-x-auto" role="region" aria-label={label} tabIndex={0}>
      {children}
    </div>
  );
}

export const th = "border-b-2 border-foreground px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-[0.06em] text-muted";
export const td = "border-b border-rule px-3 py-3 align-top text-sm";
export const link = "font-semibold text-foreground underline decoration-accent decoration-2 underline-offset-4 hover:bg-foreground/5";

export const field = "min-h-11 w-full rounded-sm border border-line bg-panel px-3";
export const btn = "inline-flex min-h-11 items-center justify-center gap-2 rounded-sm border px-4 text-sm font-semibold transition-colors duration-150 ease";
export const btnPrimary = `${btn} border-foreground bg-foreground text-background hover:opacity-90`;
export const btnQuiet = `${btn} border-line bg-panel text-foreground hover:bg-foreground/5`;
