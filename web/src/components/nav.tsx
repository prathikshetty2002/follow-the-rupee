"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export const LINKS = [
  { href: "/", label: "Overview" },
  { href: "/audit", label: "Audit" },
  { href: "/contractors", label: "Contractors" },
  { href: "/complaint", label: "My complaint" },
  { href: "/method", label: "Method" },
];

export function Nav() {
  const path = usePathname();
  return (
    <nav aria-label="Main" className="-mx-1 flex flex-wrap items-center gap-1 text-sm">
      {LINKS.map((l) => {
        const active = l.href === "/" ? path === "/" || path.startsWith("/ward") : path.startsWith(l.href);
        return (
          <Link
            key={l.href}
            href={l.href}
            aria-current={active ? "page" : undefined}
            className={`inline-flex min-h-10 items-center rounded-lg px-3 font-medium transition-colors ${active ? "bg-surface-2 text-foreground" : "text-muted hover:bg-surface-2 hover:text-foreground"}`}
          >
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}

/** Same links without the active highlight: shown while the current path is still loading. */
export function NavFallback() {
  return (
    <nav aria-label="Main" className="-mx-1 flex flex-wrap items-center gap-1 text-sm">
      {LINKS.map((l) => (
        <Link key={l.href} href={l.href} className="inline-flex min-h-10 items-center rounded-lg px-3 font-medium text-muted hover:bg-surface-2 hover:text-foreground">
          {l.label}
        </Link>
      ))}
    </nav>
  );
}
