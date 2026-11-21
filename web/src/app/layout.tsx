import type { Metadata } from "next";
import { Fraunces, Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import { Suspense } from "react";
import { Nav, NavFallback } from "@/components/nav";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });
const fraunces = Fraunces({ variable: "--font-fraunces", subsets: ["latin"] });

export const metadata: Metadata = {
  title: { default: "Next Rupee Planner", template: "%s · Next Rupee Planner" },
  description: "What should a Mumbai ward fix first with the road repair money it has left? Ranked by risk, with every reason shown. Synthetic data.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} ${fraunces.variable} h-full`}>
      <body className="flex min-h-full flex-col">
        <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-surface focus:px-4 focus:py-2">
          Skip to content
        </a>
        <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-6 gap-y-1 px-4 py-2 sm:px-6">
            <Link href="/" className="font-serif text-xl font-semibold tracking-tight">
              Next <span className="text-accent">Rupee</span> Planner
            </Link>
            <Suspense fallback={<NavFallback />}>
              <Nav />
            </Suspense>
          </div>
        </header>
        <main id="main" className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 sm:py-12">
          {children}
        </main>
        <footer className="border-t border-border">
          <div className="mx-auto max-w-6xl px-4 py-6 text-sm text-muted sm:px-6">
            <p>
              All data is synthetic: it looks like Mumbai civic data but is not BMC data, and the contractors are fictional. Built for Claude Impact Lab Mumbai.
            </p>
            <p className="mt-1">A ranking is a starting point for a site visit, not a work order. Check the confidence note on each issue.</p>
          </div>
        </footer>
      </body>
    </html>
  );
}
