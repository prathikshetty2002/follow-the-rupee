import type { ReactNode } from "react";

export function cx(...parts: (string | false | null | undefined)[]) {
  return parts.filter(Boolean).join(" ");
}

/** A small pill label with a sparkle, as in the reference. The sparkle is decoration. */
export function Chip({ children }: { children: ReactNode }) {
  return (
    <span className="soft inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-sm font-medium text-muted">
      <span aria-hidden className="text-glow">
        ✦
      </span>
      {children}
    </span>
  );
}

/** Display title in the serif, with one phrase set in the italic accent. */
export function Display({ children, accent, as: Tag = "h1", className, id }: { children: string; accent?: string; as?: "h1" | "h2"; className?: string; id?: string }) {
  const at = accent ? children.indexOf(accent) : -1;
  return (
    <Tag id={id} className={cx("display", className)}>
      {at < 0 ? (
        children
      ) : (
        <>
          {children.slice(0, at)}
          <em>{accent}</em>
          {children.slice(at + accent!.length)}
        </>
      )}
    </Tag>
  );
}

/** Page title block: chip, serif title with an italic accent phrase, then one plain sentence. */
export function PageTitle({ kicker, title, accent, children, center }: { kicker?: string; title: string; accent?: string; children?: ReactNode; center?: boolean }) {
  return (
    <header className={cx("max-w-3xl", center && "mx-auto text-center")}>
      {kicker && (
        <div className="mb-6">
          <Chip>{kicker}</Chip>
        </div>
      )}
      <Display accent={accent} className="text-5xl sm:text-6xl">
        {title}
      </Display>
      {children && <div className={cx("mt-6 max-w-2xl text-lg leading-relaxed text-muted", center && "mx-auto")}>{children}</div>}
    </header>
  );
}

/** Section heading in the serif. */
export function Section({ id, title, accent, aside, children }: { id: string; title: string; accent?: string; aside?: ReactNode; children: ReactNode }) {
  return (
    <section aria-labelledby={id}>
      <div className="mb-6 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
        <Display as="h2" id={id} accent={accent} className="text-3xl sm:text-4xl">
          {title}
        </Display>
        {aside && <div className="text-sm text-muted">{aside}</div>}
      </div>
      {children}
    </section>
  );
}

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cx("soft rounded-3xl p-6 sm:p-8", className)}>{children}</div>;
}

/** A horizontally scrollable region for wide tables; focusable so keyboard users can scroll it. On phones it says it scrolls. */
export function TableWrap({ children, label, hint = true }: { children: ReactNode; label: string; hint?: boolean }) {
  return (
    <div>
      {hint && (
        <p aria-hidden className="mb-2 px-1 text-xs text-muted sm:hidden">
          Swipe the table sideways to see every column →
        </p>
      )}
      <div className="overflow-x-auto" role="region" aria-label={label} tabIndex={0}>
        {children}
      </div>
    </div>
  );
}

export const th = "border-b border-rule px-3 py-3 text-left text-xs font-semibold uppercase tracking-[0.06em] text-muted";
export const td = "border-b border-rule px-3 py-4 align-top text-sm";
export const link = "font-semibold text-sea underline decoration-glow decoration-2 underline-offset-4 hover:decoration-4";

export const field = "min-h-12 w-full rounded-xl border border-line bg-card px-4";
export const btn = "inline-flex min-h-12 items-center justify-center gap-2 rounded-full border px-6 text-sm font-semibold transition-colors duration-150 ease";
export const btnPrimary = `${btn} border-foreground bg-foreground text-background hover:bg-foreground/85`;
export const btnQuiet = `${btn} border-line bg-card text-foreground hover:bg-mist`;
