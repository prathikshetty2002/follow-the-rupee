/** Shown while a ward's plan loads. Soft bars where the content will be, so the page does not jump. */
export function PlanSkeleton() {
  return (
    <div role="status" aria-label="Loading the plan" className="space-y-10 motion-safe:animate-pulse">
      <div className="space-y-4">
        <div className="h-8 w-56 rounded-full bg-unpaid" />
        <div className="h-16 w-3/4 max-w-xl rounded-2xl bg-unpaid" />
        <div className="h-5 w-full max-w-2xl rounded-full bg-unpaid" />
      </div>
      <div className="h-64 rounded-3xl bg-unpaid/60" />
      <div className="h-48 rounded-3xl bg-unpaid/40" />
      <span className="sr-only">Loading</span>
    </div>
  );
}
