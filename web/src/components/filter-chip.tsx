import Link from "next/link";
import type { ReactNode } from "react";

/** A filter chip that is a plain link, so filters work without JavaScript. */
export function FilterChip({ href, active, children }: { href: string; active: boolean; children: ReactNode }) {
  return (
    <Link
      href={href}
      aria-current={active ? "true" : undefined}
      className={`inline-flex min-h-11 items-center rounded-full border-2 px-4 text-sm ${
        active ? "border-sea bg-sea-soft font-bold" : "border-line bg-card hover:bg-mist"
      }`}
    >
      {children}
    </Link>
  );
}
