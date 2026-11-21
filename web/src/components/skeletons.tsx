export function PageSkeleton() {
  return (
    <div role="status" aria-live="polite" aria-label="Loading" className="animate-pulse space-y-8">
      <div className="space-y-3">
        <div className="h-4 w-32 rounded bg-surface-2" />
        <div className="h-10 w-3/4 max-w-xl rounded bg-surface-2" />
        <div className="h-4 w-full max-w-2xl rounded bg-surface-2" />
        <div className="h-4 w-2/3 max-w-xl rounded bg-surface-2" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-28 rounded-xl border border-border bg-surface" />
        ))}
      </div>
      <div className="h-64 rounded-xl border border-border bg-surface" />
      <span className="sr-only">Loading</span>
    </div>
  );
}
