import Link from "next/link";
import { ButtonLink } from "@/components/ui";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-xl py-12 text-center">
      <p className="text-sm font-medium uppercase tracking-wide text-accent">Not found</p>
      <h1 className="mt-2 font-serif text-3xl font-semibold">We could not find that page</h1>
      <p className="mt-3 text-muted">The ward, contractor or work order may not exist in this dataset. Ward pages use codes like F-S or L; work orders look like WO25-01626.</p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <ButtonLink href="/">Back to the overview</ButtonLink>
        <ButtonLink href="/complaint" variant="ghost">
          Look up a complaint
        </ButtonLink>
      </div>
      <p className="mt-6 text-sm">
        <Link href="/audit" className="text-accent underline underline-offset-2">
          Browse the audit
        </Link>
      </p>
    </div>
  );
}
