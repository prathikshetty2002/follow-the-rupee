import Link from "next/link";
import { PageTitle, btnPrimary } from "@/components/ui";

export default function NotFound() {
  return (
    <div className="space-y-8">
      <PageTitle kicker="Not found" title="That page does not exist" accent="does not exist">
        <p>Ward pages use codes such as F-N or L. Check the address, or pick a ward from the list.</p>
      </PageTitle>
      <Link href="/" className={btnPrimary}>
        Back to all wards <span aria-hidden>↗</span>
      </Link>
    </div>
  );
}
