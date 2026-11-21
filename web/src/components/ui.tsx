import Link from "next/link";
import type { ReactNode } from "react";

// Shared page frame for the audit and complaint pages. Server components, no client JavaScript.
// The frame sets its own light background so the pages read the same in any colour scheme.

type NavKey = "home" | "contractors" | "audit" | "complaints";

const NAV: { key: NavKey; href: string; label: string }[] = [
  { key: "home", href: "/", label: "Wards" },
  { key: "contractors", href: "/contractors", label: "Contractors" },
  { key: "audit", href: "/audit", label: "Audit" },
  { key: "complaints", href: "/complaints", label: "Track a complaint" },
];

export const focusRing = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1F4E9C]";

export function PageShell({ current, children }: { current: NavKey; children: ReactNode }) {
  return (
    <div className="min-h-screen bg-white text-[#14213D]">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-10 focus:rounded focus:bg-white focus:px-3 focus:py-2"
      >
        Skip to content
      </a>
      <div className="bg-[#FFF4DB] px-4 py-2 text-center text-[13px] text-[#5C3B00]">
        Demo uses synthetic data. Not BMC records. All contractors are fictional.
      </div>
      <header className="border-b border-[#C5CCD6]">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-x-6 gap-y-1 px-4 sm:px-8">
          <Link href="/" className={`py-3 text-lg font-bold ${focusRing}`}>
            Follow the Rupee
          </Link>
          <nav aria-label="Main">
            <ul className="flex flex-wrap gap-1">
              {NAV.map((n) => (
                <li key={n.key}>
                  <Link
                    href={n.href}
                    aria-current={n.key === current ? "page" : undefined}
                    className={`inline-flex min-h-11 items-center border-b-4 px-3 text-[15px] ${focusRing} ${
                      n.key === current ? "border-[#1F4E9C] font-bold" : "border-transparent hover:border-[#C5CCD6]"
                    }`}
                  >
                    {n.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </header>
      <main id="main" className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-8 sm:py-8">
        {children}
      </main>
      <footer className="border-t border-[#C5CCD6] px-4 py-6 text-center text-[13px] text-[#4A5568]">
        Every figure links back to the repair jobs behind it. Context such as heavy rain and low-lying wards is checked before anything is flagged.
      </footer>
    </div>
  );
}

/** A filter chip that is a plain link, so filters work without JavaScript. */
export function Chip({ href, active, children }: { href: string; active: boolean; children: ReactNode }) {
  return (
    <Link
      href={href}
      aria-current={active ? "true" : undefined}
      className={`inline-flex min-h-11 items-center rounded-full border-2 px-4 text-[14px] ${focusRing} ${
        active ? "border-[#1F4E9C] bg-[#E8EFFA] font-bold" : "border-[#8A94A6] bg-white hover:bg-[#F4F6F9]"
      }`}
    >
      {children}
    </Link>
  );
}
