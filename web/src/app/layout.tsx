import type { Metadata } from "next";
import { Instrument_Sans, Instrument_Serif } from "next/font/google";
import Link from "next/link";
import { Suspense } from "react";
import { Guide } from "@/components/guide";
import { Nav, NavFallback } from "@/components/nav";
import "./globals.css";

const sans = Instrument_Sans({ variable: "--font-instrument-sans", subsets: ["latin"], weight: ["400", "500", "600", "700"] });
const serif = Instrument_Serif({ variable: "--font-instrument-serif", subsets: ["latin"], weight: "400", style: ["normal", "italic"] });

export const metadata: Metadata = {
  title: { default: "Next Rupee Planner", template: "%s · Next Rupee Planner" },
  description: "What should a Mumbai ward fix first with the road repair money it has left? Ranked by risk, with the arithmetic shown. Synthetic data.",
};

/** The Gateway of India's arch on a marigold tile. */
function Mark() {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" focusable="false" className="size-9">
      <rect width="32" height="32" rx="10" fill="var(--glow)" />
      <path d="M16 6.2a4.4 4.4 0 0 1 4.4 4.4H11.6A4.4 4.4 0 0 1 16 6.2z" fill="#1e1d1b" />
      <rect x="7.5" y="10.6" width="17" height="3.4" rx="0.6" fill="#1e1d1b" />
      <path d="M8.6 14h14.8v11.4h-4.1v-5.6a3.3 3.3 0 0 0-6.6 0v5.6H8.6z" fill="#1e1d1b" />
    </svg>
  );
}

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${sans.variable} ${serif.variable} h-full`}>
      <body className="flex min-h-full flex-col">
        <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-foreground focus:px-5 focus:py-3 focus:text-background">
          Skip to the main content
        </a>
        <header>
          <div className="mx-auto flex max-w-[90rem] flex-wrap items-center justify-between gap-x-8 gap-y-2 px-4 py-4 sm:px-8">
            <Link href="/" className="flex min-h-11 items-center gap-3">
              <Mark />
              <span className="font-serif text-2xl leading-none tracking-tight">
                Next Rupee <span className="text-muted">Planner</span>
              </span>
            </Link>
            <div className="flex items-center gap-2">
              <Suspense fallback={<NavFallback />}>
                <Nav />
              </Suspense>
            </div>
          </div>
        </header>
        <main id="main" className="mx-auto w-full max-w-[90rem] flex-1 px-4 pb-24 pt-4 sm:px-8 sm:pt-6">
          {children}
        </main>
        <footer>
          <div className="mx-auto flex max-w-[90rem] flex-wrap justify-between gap-x-8 gap-y-2 border-t border-rule px-4 py-8 text-sm text-muted sm:px-8">
            <p>Synthetic data: names of wards and roads are real; every amount, date and record is invented.</p>
            <p>A ranking says where to look first. Confirm on site before sending a crew.</p>
          </div>
        </footer>
        <Suspense fallback={null}>
          <Guide />
        </Suspense>
      </body>
    </html>
  );
}
