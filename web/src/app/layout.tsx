import type { Metadata } from "next";
import { IBM_Plex_Mono, Public_Sans } from "next/font/google";
import Link from "next/link";
import { Suspense } from "react";
import { Nav, NavFallback } from "@/components/nav";
import "./globals.css";

const publicSans = Public_Sans({ variable: "--font-public-sans", subsets: ["latin"], weight: ["400", "600", "700"] });
const plexMono = IBM_Plex_Mono({ variable: "--font-plex-mono", subsets: ["latin"], weight: ["400", "600"] });

export const metadata: Metadata = {
  title: { default: "Next Rupee Planner", template: "%s · Next Rupee Planner" },
  description: "What should a Mumbai ward fix first with the road repair money it has left? Ranked by risk, with the arithmetic shown. Synthetic data.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${publicSans.variable} ${plexMono.variable} h-full`}>
      <body className="flex min-h-full flex-col">
        <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-sm focus:bg-foreground focus:px-4 focus:py-3 focus:text-background">
          Skip to the main content
        </a>
        <header className="border-t-4 border-foreground border-b border-b-rule bg-background">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-8 gap-y-1 px-4 sm:px-6">
            <Link href="/" className="flex min-h-11 items-center gap-2.5 font-bold tracking-tight">
              <span aria-hidden className="size-3 bg-accent" />
              <span>
                Next Rupee <span className="font-normal text-muted">Planner</span>
              </span>
            </Link>
            <Suspense fallback={<NavFallback />}>
              <Nav />
            </Suspense>
          </div>
        </header>
        <main id="main" className="mx-auto w-full max-w-6xl flex-1 px-4 py-10 sm:px-6 sm:py-14">
          {children}
        </main>
        <footer className="border-t border-rule">
          <div className="mx-auto flex max-w-6xl flex-wrap justify-between gap-x-8 gap-y-2 px-4 py-6 text-sm text-muted sm:px-6">
            <p>Synthetic data: names of wards and roads are real; every amount, date and record is invented.</p>
            <p>A ranking says where to look first. Confirm on site before sending a crew.</p>
          </div>
        </footer>
      </body>
    </html>
  );
}
