"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { AdminBookingStatus } from "@/lib/db/admin-queries";
import {
  createBookingStatus,
  updateBookingStatus,
  deleteBookingStatus,
  reorderBookingStatuses,
} from "@/lib/actions/admin/booking-statuses";

type Draft = {
  key: string;
  label: string;
  colorBg: string;
  colorBar: string;
  colorText: string;
  colorBorder: string;
  billable: boolean;
  active: boolean;
};

const NEW_DRAFT: Draft = {
  key: "",
  label: "",
  colorBg: "#eef2f7",
  colorBar: "#2b7bb9",
  colorText: "#1f5a87",
  colorBorder: "#cfe0ee",
  billable: false,
  active: true,
};

// A live chip preview matching the grid's CellChip look, so an admin sees exactly what
// their colours produce before saving.
function ChipPreview({ d, label }: { d: Pick<Draft, "colorBg" | "colorBar" | "colorText" | "colorBorder">; label: string }) {
  return (
    <span
      className="inline-flex h-8 min-w-[120px] max-w-[180px] items-center overflow-hidden rounded-md border text-left"
      style={{ background: d.colorBg, borderColor: d.colorBorder }}
    >
      <span className="h-full w-[3px] shrink-0" style={{ background: d.colorBar }} />
      <span className="truncate px-2 text-xs" style={{ color: d.colorText }}>
        {label || "Preview"}
      </span>
    </span>
  );
}

function ColourField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="flex items-center gap-2 text-xs text-[#333333]">
      <input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-7 w-9 shrink-0 cursor-pointer rounded border border-[#e6e6e6] bg-white p-0.5"
        aria-label={label}
      />
      <span className="w-[46px] text-[#757575]">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-[86px] rounded border border-[#e6e6e6] px-2 py-1 font-mono text-[11px] outline-none focus:border-[#2b7bb9]"
      />
    </label>
  );
}

function StatusForm({
  draft,
  setDraft,
  isNew,
  calendarDerived,
  onSave,
  onCancel,
  saving,
}: {
  draft: Draft;
  setDraft: (d: Draft) => void;
  isNew: boolean;
  calendarDerived: boolean;
  onSave: () => void;
  onCancel: () => void;
  saving: boolean;
}) {
  return (
    <div className="rounded-xl border border-[#e6e6e6] bg-[#fbfcfe] p-4">
      <div className="flex flex-wrap items-end gap-4">
        {isNew && (
          <label className="flex flex-col gap-1 text-xs font-medium text-[#333333]">
            Key
            <input
              value={draft.key}
              onChange={(e) => setDraft({ ...draft, key: e.target.value })}
              placeholder="on-hold"
              className="w-[140px] rounded border border-[#e6e6e6] px-2.5 py-1.5 font-mono text-[12px] outline-none focus:border-[#2b7bb9]"
            />
          </label>
        )}
        <label className="flex flex-1 flex-col gap-1 text-xs font-medium text-[#333333]">
          Label
          <input
            value={draft.label}
            onChange={(e) => setDraft({ ...draft, label: e.target.value })}
            placeholder="On hold — awaiting parts"
            className="min-w-[200px] rounded border border-[#e6e6e6] px-2.5 py-1.5 text-[13px] outline-none focus:border-[#2b7bb9]"
          />
        </label>
        <div className="pb-0.5">
          <ChipPreview d={draft} label={draft.label} />
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2">
        <ColourField label="Fill" value={draft.colorBg} onChange={(v) => setDraft({ ...draft, colorBg: v })} />
        <ColourField label="Bar" value={draft.colorBar} onChange={(v) => setDraft({ ...draft, colorBar: v })} />
        <ColourField label="Text" value={draft.colorText} onChange={(v) => setDraft({ ...draft, colorText: v })} />
        <ColourField label="Border" value={draft.colorBorder} onChange={(v) => setDraft({ ...draft, colorBorder: v })} />
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-5">
        <label className="flex items-center gap-2 text-[13px] text-[#333333]">
          <input
            type="checkbox"
            checked={draft.billable}
            onChange={(e) => setDraft({ ...draft, billable: e.target.checked })}
          />
          Billable
        </label>
        {!isNew && (
          <label className="flex items-center gap-2 text-[13px] text-[#333333]" title={calendarDerived ? "Calendar-derived statuses stay active" : undefined}>
            <input
              type="checkbox"
              checked={draft.active}
              disabled={calendarDerived}
              onChange={(e) => setDraft({ ...draft, active: e.target.checked })}
            />
            Active {calendarDerived && <span className="text-[#9a9a9a]">(always on)</span>}
          </label>
        )}
      </div>

      <div className="mt-4 flex gap-2">
        <button
          onClick={onSave}
          disabled={saving}
          className="rounded-full bg-[#1a3d69] px-4 py-1.5 text-[13px] font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2b7bb9]"
        >
          {isNew ? "Add status" : "Save changes"}
        </button>
        <button
          onClick={onCancel}
          disabled={saving}
          className="rounded-full border border-[#e6e6e6] px-4 py-1.5 text-[13px] text-[#333333] transition-colors hover:bg-[#f7f9fc] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2b7bb9]"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

export function BookingStatusesPanel({ statuses }: { statuses: AdminBookingStatus[] }) {
  const router = useRouter();
  const [editingId, setEditingId] = useState<number | null>(null);
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState<Draft>(NEW_DRAFT);
  const [saving, setSaving] = useState(false);

  function startCreate() {
    setDraft(NEW_DRAFT);
    setEditingId(null);
    setCreating(true);
  }

  function startEdit(s: AdminBookingStatus) {
    setDraft({
      key: s.key,
      label: s.label,
      colorBg: s.colorBg,
      colorBar: s.colorBar,
      colorText: s.colorText,
      colorBorder: s.colorBorder,
      billable: s.billable,
      active: s.active,
    });
    setCreating(false);
    setEditingId(s.id);
  }

  async function run(action: () => Promise<{ ok: boolean; error?: string }>, successMsg: string) {
    setSaving(true);
    const res = await action();
    setSaving(false);
    if (!res.ok) {
      toast.error(res.error ?? "Something went wrong.");
      return false;
    }
    toast.success(successMsg);
    setCreating(false);
    setEditingId(null);
    router.refresh();
    return true;
  }

  async function saveCreate() {
    await run(
      () =>
        createBookingStatus({
          key: draft.key,
          label: draft.label,
          colorBg: draft.colorBg,
          colorBar: draft.colorBar,
          colorText: draft.colorText,
          colorBorder: draft.colorBorder,
          billable: draft.billable,
        }),
      "Status added.",
    );
  }

  async function saveEdit(id: number) {
    await run(
      () =>
        updateBookingStatus({
          id,
          label: draft.label,
          colorBg: draft.colorBg,
          colorBar: draft.colorBar,
          colorText: draft.colorText,
          colorBorder: draft.colorBorder,
          billable: draft.billable,
          active: draft.active,
        }),
      "Status updated.",
    );
  }

  async function remove(s: AdminBookingStatus) {
    if (!confirm(`Remove the "${s.label}" status? Bookings must not be using it.`)) return;
    await run(() => deleteBookingStatus({ id: s.id }), "Status removed.");
  }

  async function move(index: number, dir: -1 | 1) {
    const next = [...statuses];
    const j = index + dir;
    if (j < 0 || j >= next.length) return;
    [next[index], next[j]] = [next[j], next[index]];
    await run(() => reorderBookingStatuses(next.map((s) => s.id)), "Order updated.");
  }

  return (
    <div className="mt-5 max-w-[760px]">
      {!creating && (
        <button
          onClick={startCreate}
          className="mb-4 rounded-full border border-[#1a3d69] bg-[#1a3d69] px-4 py-1.5 text-[13px] font-medium text-white transition-opacity hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e88f8f]"
        >
          + Add status
        </button>
      )}

      {creating && (
        <div className="mb-4">
          <StatusForm
            draft={draft}
            setDraft={setDraft}
            isNew
            calendarDerived={false}
            onSave={() => void saveCreate()}
            onCancel={() => setCreating(false)}
            saving={saving}
          />
        </div>
      )}

      <div className="divide-y divide-[#f0f2f5] overflow-hidden rounded-xl border border-[#e6e6e6]">
        {statuses.map((s, i) => (
          <div key={s.id}>
            <div className="flex items-center gap-3 px-4 py-3" style={{ opacity: s.active ? 1 : 0.6 }}>
              <div className="flex flex-col">
                <button
                  onClick={() => void move(i, -1)}
                  disabled={i === 0 || saving}
                  aria-label="Move up"
                  className="text-[10px] leading-none text-[#9a9a9a] hover:text-[#333333] disabled:opacity-30"
                >
                  ▲
                </button>
                <button
                  onClick={() => void move(i, 1)}
                  disabled={i === statuses.length - 1 || saving}
                  aria-label="Move down"
                  className="text-[10px] leading-none text-[#9a9a9a] hover:text-[#333333] disabled:opacity-30"
                >
                  ▼
                </button>
              </div>

              <ChipPreview d={s} label={s.label} />

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate text-[13px] font-medium text-[#333333]">{s.label}</span>
                  <span className="rounded bg-[#f0f2f5] px-1.5 py-0.5 font-mono text-[10px] text-[#757575]">{s.key}</span>
                </div>
                <div className="mt-0.5 flex flex-wrap gap-2 text-[11px] text-[#9a9a9a]">
                  {s.calendarDerived && <span>calendar-assigned</span>}
                  {!s.editable && !s.calendarDerived && <span>not user-pickable</span>}
                  {s.billable && <span>billable</span>}
                  {!s.active && <span className="text-[#b13a3a]">inactive</span>}
                  <span>{s.usageCount} booking{s.usageCount === 1 ? "" : "s"}</span>
                </div>
              </div>

              <button
                onClick={() => startEdit(s)}
                className="rounded-full border border-[#e6e6e6] px-3 py-1 text-[12px] text-[#333333] transition-colors hover:bg-[#f7f9fc] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2b7bb9]"
              >
                Edit
              </button>
              {!s.calendarDerived && s.key !== "confirmed" && (
                <button
                  onClick={() => void remove(s)}
                  disabled={s.usageCount > 0}
                  title={s.usageCount > 0 ? "In use — deactivate instead" : "Remove status"}
                  className="rounded-full border border-[#efd3d3] px-3 py-1 text-[12px] text-[#b13a3a] transition-colors hover:bg-[#f9ebeb] disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#b13a3a]"
                >
                  Remove
                </button>
              )}
            </div>

            {editingId === s.id && (
              <div className="px-4 pb-4">
                <StatusForm
                  draft={draft}
                  setDraft={setDraft}
                  isNew={false}
                  calendarDerived={s.calendarDerived}
                  onSave={() => void saveEdit(s.id)}
                  onCancel={() => setEditingId(null)}
                  saving={saving}
                />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
