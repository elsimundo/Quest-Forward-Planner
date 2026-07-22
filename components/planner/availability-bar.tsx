export function AvailabilityBar({ free, total }: { free: number; total: number }) {
  const pct = total ? free / total : 0;
  const colour = pct > 0.4 ? "#3d7f53" : pct > 0.15 ? "#e0a826" : "#b13a3a";
  return (
    <div className="flex items-center gap-2">
      <div className="h-[5px] flex-1 overflow-hidden rounded-full bg-[#e9edf3]">
        <div
          className="h-full rounded-full transition-[width] duration-300"
          style={{ width: `${Math.round(pct * 100)}%`, background: colour }}
        />
      </div>
      <span
        className="min-w-[18px] text-right text-xs font-bold tabular-nums"
        style={{ color: colour }}
      >
        {free}
      </span>
    </div>
  );
}
