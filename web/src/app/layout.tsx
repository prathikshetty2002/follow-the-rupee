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
  title: { default: "Follow the Rupee", template: "%s · Follow the Rupee" },
  description: "Where each Mumbai ward's monsoon road repair money went, whether the work held up, who is responsible, and where the next rupee should go. Synthetic data.",
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
              Follow the <span className="text-accent">Rupee</span>
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
            <p className="mt-1">Scores compare each result with what is expected for the same kind of work. They are a starting point for questions, not a verdict.</p>
          </div>
        </footer>
      </body>
    </html>
  );
}
