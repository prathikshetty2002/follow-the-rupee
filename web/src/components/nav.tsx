"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export const LINKS = [
  { href: "/", label: "Planner" },
  { href: "/method", label: "How it works" },
];

const base = "inline-flex min-h-11 items-center border-b-2 px-1 text-sm font-semibold";

export function Nav() {
  const path = usePathname();
  return (
    <nav aria-label="Main" className="flex gap-5">
      {LINKS.map((l) => {
        const active = l.href === "/" ? path === "/" || path.startsWith("/plan") : path.startsWith(l.href);
        return (
          <Link key={l.href} href={l.href} aria-current={active ? "page" : undefined} className={`${base} ${active ? "border-accent text-foreground" : "border-transparent text-muted hover:text-foreground"}`}>
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}

/** Same links without the active mark: shown while the current path is still loading. */
export function NavFallback() {
  return (
    <nav aria-label="Main" className="flex gap-5">
      {LINKS.map((l) => (
        <Link key={l.href} href={l.href} className={`${base} border-transparent text-muted hover:text-foreground`}>
          {l.label}
        </Link>
      ))}
    </nav>
  );
}
