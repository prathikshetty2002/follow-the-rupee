/** Shown while a ward's plan loads. Flat bars where the content will be, so the page does not jump. */
export function PlanSkeleton() {
  return (
    <div role="status" aria-label="Loading the plan" className="space-y-10 motion-safe:animate-pulse">
      <div className="space-y-3">
        <div className="h-3 w-24 bg-rule" />
        <div className="h-12 w-3/4 max-w-xl bg-rule" />
        <div className="h-4 w-full max-w-2xl bg-rule" />
      </div>
      <div className="h-24 bg-rule/60" />
      <div className="h-9 bg-rule/60" />
      <div className="space-y-px">
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="h-16 bg-rule/40" />
        ))}
      </div>
      <span className="sr-only">Loading</span>
    </div>
  );
}
