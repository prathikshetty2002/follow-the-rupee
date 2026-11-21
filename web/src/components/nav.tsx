"use client";

import { Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

export const LINKS = [
  { href: "/", label: "Planner" },
  { href: "/contractors", label: "Contractors" },
  { href: "/audit", label: "Audit" },
  { href: "/complaints", label: "Complaints" },
  { href: "/method", label: "How it works" },
];

const base = "inline-flex min-h-11 shrink-0 items-center rounded-full px-5 text-sm font-semibold transition-colors duration-150 ease";
const isActive = (href: string, path: string | null) => path !== null && (href === "/" ? path === "/" || path.startsWith("/plan") : path.startsWith(href));

/** A pill row of links on wider screens; a Menu button with a drop-down list on phones. */
function Links({ path }: { path: string | null }) {
  const [open, setOpen] = useState(false);
  const current = LINKS.find((l) => isActive(l.href, path));
  return (
    <>
      <nav aria-label="Main" className="soft hidden gap-1 rounded-full p-1 md:flex">
        {LINKS.map((l) => {
          const on = isActive(l.href, path);
          return (
            <Link key={l.href} href={l.href} aria-current={on ? "page" : undefined} className={`${base} ${on ? "bg-foreground text-background" : "text-muted hover:text-foreground"}`}>
              {l.label}
            </Link>
          );
        })}
      </nav>

      <div
        className="relative md:hidden"
        onKeyDown={(e) => e.key === "Escape" && setOpen(false)}
        onBlur={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget)) setOpen(false);
        }}
      >
        <button type="button" aria-expanded={open} aria-controls="main-menu" onClick={() => setOpen(!open)} className="soft inline-flex min-h-12 items-center gap-2 rounded-full px-5 text-sm font-semibold">
          {open ? <X aria-hidden className="size-5" /> : <Menu aria-hidden className="size-5" />}
          {current && !open ? current.label : "Menu"}
        </button>
        {open && (
          <nav id="main-menu" aria-label="Main" className="soft absolute right-0 top-full z-50 mt-2 w-[min(17rem,calc(100vw-2rem))] rounded-3xl p-2">
            <ul>
              {LINKS.map((l) => {
                const on = isActive(l.href, path);
                return (
                  <li key={l.href}>
                    <Link href={l.href} aria-current={on ? "page" : undefined} onClick={() => setOpen(false)} className={`flex min-h-12 items-center rounded-2xl px-4 font-semibold ${on ? "bg-foreground text-background" : "hover:bg-mist"}`}>
                      {l.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        )}
      </div>
    </>
  );
}

export function Nav() {
  return <Links path={usePathname()} />;
}

/** Same links without the active mark: shown while the current path is still loading. */
export function NavFallback() {
  return <Links path={null} />;
}
