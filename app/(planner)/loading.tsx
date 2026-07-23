// Next.js shows this automatically while PlannerPage's async data fetch is in flight
// (SPEC.md §11: "skeleton grid on first load"). Shape mirrors the real header/toolbar/grid
// so there's no layout jump when the real content swaps in.
export default function PlannerLoading() {
  return (
    <div className="flex h-full flex-col">
      <header className="flex h-[62px] shrink-0 items-center bg-[var(--quest-navy)] px-6 shadow-[var(--shadow-header)]">
        <div className="flex items-baseline gap-2.5">
          <span className="text-lg font-bold tracking-[0.14em] text-white">QUEST</span>
          <span className="h-[18px] w-px bg-white/35" />
          <span className="text-sm font-medium tracking-[0.02em]" style={{ color: "#e88f8f" }}>
            Forward Planner
          </span>
        </div>
      </header>

      <div className="flex flex-shrink-0 flex-wrap items-center gap-2.5 border-b bg-white px-6 py-3">
        {[70, 100, 90, 130, 110].map((w, i) => (
          <span key={i} className="h-8 animate-pulse rounded-full bg-[#f0f2f5]" style={{ width: w }} />
        ))}
      </div>

      <div className="min-h-0 flex-1 overflow-hidden bg-white">
        <div className="grid border-b-2 border-[#e4e9f0]" style={{ gridTemplateColumns: "190px repeat(6, 132px)" }}>
          <div className="border-r bg-[var(--quest-surface-alt)] px-3.5 py-2.5">
            <span className="block h-3 w-16 animate-pulse rounded bg-[#e4e9f0]" />
          </div>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="px-2 py-2.5">
              <span className="block h-3 w-14 animate-pulse rounded bg-[#f0f2f5]" />
            </div>
          ))}
        </div>

        {Array.from({ length: 10 }).map((_, row) => (
          <div
            key={row}
            className="grid border-b border-[#f7f9fc]"
            style={{ gridTemplateColumns: "190px repeat(6, 132px)", height: 54 }}
          >
            <div className="flex items-center border-r bg-[var(--quest-surface-alt)] px-3.5">
              <span className="h-3 w-20 animate-pulse rounded bg-[#e4e9f0]" />
            </div>
            {Array.from({ length: 6 }).map((_, col) => (
              <div key={col} className="flex items-center px-[3px]">
                <span
                  className="h-10 w-full animate-pulse rounded-md bg-[#f0f2f5]"
                  style={{ animationDelay: `${(row * 6 + col) * 20}ms` }}
                />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
