import { STATUS_CONFIG, STATUS_ORDER, tintBorder } from "@/lib/statuses";

export function StatusLegend() {
  return (
    <div className="flex flex-wrap gap-4.5 border-b bg-white px-6 py-2.5">
      {STATUS_ORDER.map((key) => {
        const st = STATUS_CONFIG[key];
        return (
          <span key={key} className="inline-flex items-center gap-1.5 text-xs text-[#333333]">
            <span
              className="h-3.5 w-3.5 rounded"
              style={{
                background: st.bg,
                border: `1.5px solid ${tintBorder(st.bar, key === "confirmed" ? 0.35 : 0.55)}`,
              }}
            />
            {st.label}
          </span>
        );
      })}
      <span className="inline-flex items-center gap-1.5 text-xs text-[#333333]">
        <span className="h-3.5 w-3.5 rounded border border-dashed border-[#e6e6e6]" />
        Available day
      </span>
    </div>
  );
}
