"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export const LINKS = [
  { href: "/", label: "Planner" },
  { href: "/method", label: "How it works" },
];

const base = "inline-flex min-h-11 items-center rounded-full px-5 text-sm font-semibold transition-colors duration-150 ease";

export function Nav() {
  const path = usePathname();
  return (
    <nav aria-label="Main" className="soft flex gap-1 rounded-full p-1">
      {LINKS.map((l) => {
        const active = l.href === "/" ? path === "/" || path.startsWith("/plan") : path.startsWith(l.href);
        return (
          <Link key={l.href} href={l.href} aria-current={active ? "page" : undefined} className={`${base} ${active ? "bg-foreground text-background" : "text-muted hover:text-foreground"}`}>
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
    <nav aria-label="Main" className="soft flex gap-1 rounded-full p-1">
      {LINKS.map((l) => (
        <Link key={l.href} href={l.href} className={`${base} text-muted hover:text-foreground`}>
          {l.label}
        </Link>
      ))}
    </nav>
  );
}
