import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="flex min-h-full flex-col">
      <header className="flex h-[62px] shrink-0 items-center justify-between bg-[var(--quest-navy)] px-6 shadow-[var(--shadow-header)]">
        <div className="flex items-baseline gap-2.5">
          <span className="text-lg font-bold tracking-[0.14em] text-white">
            QUEST
          </span>
          <span className="h-[18px] w-px bg-white/35" />
          <span
            className="text-sm font-medium tracking-[0.02em]"
            style={{ color: "#e88f8f" }}
          >
            Forward Planner
          </span>
        </div>
      </header>

      <main className="flex flex-1 flex-col items-center justify-center gap-4 bg-[var(--quest-surface-alt)] p-8 text-center">
        <h1 className="text-2xl font-bold text-[var(--quest-heading)]">
          Scaffold running
        </h1>
        <p className="max-w-md text-sm font-light text-[var(--quest-body)]">
          Next.js, Auth.js, Drizzle and the Quest Medical design system are
          wired up. The planner grid lands in a later slice.
        </p>
        <Button>Save booking</Button>
      </main>
    </div>
  );
}
