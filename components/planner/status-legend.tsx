"use client";

import { mixHex, tintBorder } from "@/lib/statuses";
import { useStatusCatalog } from "./status-context";

// Same colour and ratio as the grid's chips (components/planner/cell-chip.tsx) — kept
// alongside mixHex rather than re-derived, so the legend swatch can't drift from what the
// cells actually look like.
const CHANGE_COLOR = "#2b7bb9";
const CHANGE_WASH_RATIO = 0.14;

// Two rows, because a cell says two independent things and the legend used to cover only one.
// A booking's STATUS is what kind of work it is; its TMS STATE is whether TMS has it yet.
// Conflating them is what led the client to ask for a "Confirmed in Forward Planner" status
// alongside "Confirmed" — see docs/DECISIONS.md #29. Showing the two axes separately is part
// of the answer, not decoration.
function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-x-4.5 gap-y-1.5">
      <span className="w-[74px] shrink-0 text-[10px] font-bold tracking-wider text-[#9a9a9a] uppercase">
        {label}
      </span>
      {children}
    </div>
  );
}

function Item({ swatch, children }: { swatch: React.ReactNode; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-[#333333]">
      {swatch}
      {children}
    </span>
  );
}

export function StatusLegend() {
  const catalog = useStatusCatalog();
  return (
    <div className="flex flex-col gap-2 border-b bg-white px-6 py-2.5">
      <Row label="Status">
        {catalog.all.map((st) => (
          <Item
            key={st.key}
            swatch={
              <span
                className="h-3.5 w-3.5 rounded"
                style={{
                  background: st.bg,
                  border: `1.5px solid ${tintBorder(st.bar, st.key === "confirmed" ? 0.35 : 0.55)}`,
                }}
              />
            }
          >
            {st.label}
          </Item>
        ))}
        <Item swatch={<span className="h-3.5 w-3.5 rounded border border-dashed border-[#e6e6e6]" />}>
          Available day
        </Item>
      </Row>

      <Row label="In TMS?">
        <Item swatch={<span className="h-3.5 w-3.5 rounded border-[1.5px] border-[#e6e6e6] bg-white" />}>
          TMS has this as shown
        </Item>
        <Item
          swatch={
            <span
              className="relative h-3.5 w-3.5 rounded border-[1.5px] border-[#e6e6e6]"
              style={{ background: mixHex("#ffffff", CHANGE_COLOR, CHANGE_WASH_RATIO) }}
            >
              <span
                className="absolute right-[1px] bottom-[1px] h-[5px] w-[5px] rounded-full"
                style={{ background: CHANGE_COLOR }}
              />
            </span>
          }
        >
          Changed here — not sent to TMS yet
        </Item>
        <Item
          swatch={
            <span className="flex h-3.5 w-3.5 items-center justify-center rounded border-[1.5px] border-[#e6e6e6] bg-white text-[8px] leading-none opacity-70 saturate-50">
              🔒
            </span>
          }
        >
          Published &amp; locked
        </Item>
        <Item
          swatch={
            <span className="h-3.5 w-3.5 rounded border border-dashed border-[#b9c1cc] bg-white opacity-45" />
          }
        >
          Moved away — TMS still has the original
        </Item>
        <Item
          swatch={
            <span className="relative h-3.5 w-3.5 rounded border border-dashed border-[#d8c5b4]">
              <span className="absolute bottom-[0px] left-[1px] text-[7px] leading-none text-[#b8865c]">⌫</span>
            </span>
          }
        >
          Cleared — TMS still has it until you publish
        </Item>
      </Row>
    </div>
  );
}
