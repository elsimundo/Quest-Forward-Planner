"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { fmtDate } from "@/lib/dates";
import { DEFAULT_STATUS_KEY } from "@/lib/statuses";
import { useStatusCatalog } from "./status-context";
import { SiteField, StatusPicker, useSiteField } from "./booking-fields";
import { computeCapabilityWarnings } from "@/lib/capability-matching";
import { createBookings, type BookingSlot } from "@/lib/actions/bookings";

/**
 * Book a multi-cell selection of free days in one go — the client's "select multiple empty
 * bookings and manage all of them in one go".
 *
 * Deliberately NOT a mode inside BookingDrawer. Almost everything that drawer does is about
 * one specific booking — the optimistic lock frozen at mount, Clear, Unlock, the TMS
 * supersede and collision banners, the "TMS still shows X here" ghost notice — and none of it
 * has a meaning across a set. What the two genuinely share is the two form fields, and those
 * are shared properly, as components (./booking-fields).
 *
 * Notes are left blank on the created bookings rather than copied from anywhere: notes here
 * are per-day operational detail ("arrive 7am", "engineer visit") and repeating one across a
 * fortnight would be wrong more often than right. The field is offered, it just starts empty
 * and applies to all of them if used.
 */
export function BulkBookingDrawer({
  open,
  companyId,
  modalityId,
  slots,
  unitLabels,
  unitSpecs,
  siteCapabilityRequirements,
  onClose,
  onMutated,
}: {
  open: boolean;
  companyId: number;
  modalityId: number;
  /** The free cells to book. Never empty when `open` — the button that opens this is gated on it. */
  slots: BookingSlot[];
  unitLabels: Map<number, { registration: string }>;
  unitSpecs: Record<number, Record<string, string>>;
  siteCapabilityRequirements: Record<number, { requirementKey: string; required: boolean }[]>;
  onClose: () => void;
  onMutated: (batchId: string) => void;
}) {
  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="flex w-full flex-col gap-0 p-0 sm:max-w-[360px]">
        {open && (
          // Keyed by the selection so re-opening on a different set mounts fresh fields,
          // rather than carrying the last set's site over — same reasoning as BookingDrawer.
          <BulkBookingBody
            key={slots.map((s) => `${s.unitId}|${s.date}`).join(",")}
            companyId={companyId}
            modalityId={modalityId}
            slots={slots}
            unitLabels={unitLabels}
            unitSpecs={unitSpecs}
            siteCapabilityRequirements={siteCapabilityRequirements}
            onClose={onClose}
            onMutated={onMutated}
          />
        )}
      </SheetContent>
    </Sheet>
  );
}

function BulkBookingBody({
  companyId,
  modalityId,
  slots,
  unitLabels,
  unitSpecs,
  siteCapabilityRequirements,
  onClose,
  onMutated,
}: {
  companyId: number;
  modalityId: number;
  slots: BookingSlot[];
  unitLabels: Map<number, { registration: string }>;
  unitSpecs: Record<number, Record<string, string>>;
  siteCapabilityRequirements: Record<number, { requirementKey: string; required: boolean }[]>;
  onClose: () => void;
  onMutated: (batchId: string) => void;
}) {
  const catalog = useStatusCatalog();
  const editableStatuses = catalog.all.filter((s) => s.editable && s.active);

  const siteField = useSiteField(companyId, null);
  const [status, setStatus] = useState<string>(DEFAULT_STATUS_KEY);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  const dates = [...slots.map((s) => s.date)].sort();
  const unitIds = [...new Set(slots.map((s) => s.unitId))];
  const unitSummary = unitIds.map((id) => unitLabels.get(id)?.registration ?? "?").join(", ");
  const dateSummary =
    dates[0] === dates[dates.length - 1]
      ? fmtDate(dates[0])
      : `${fmtDate(dates[0])} – ${fmtDate(dates[dates.length - 1])}`;

  // One warning list for the whole set. A capability mismatch is a property of unit × site,
  // so a selection spanning three units can raise it for one of them and not the others —
  // which is exactly why each is named rather than being reported as a bare count.
  const warnings = siteField.selected
    ? unitIds.flatMap((unitId) =>
        computeCapabilityWarnings(
          siteCapabilityRequirements[siteField.selected!.id] ?? [],
          unitSpecs[unitId] ?? {},
          unitLabels.get(unitId)?.registration ?? "?",
          siteField.selected!.name,
        ),
      )
    : [];

  async function handleSave() {
    setSaving(true);
    const result = await createBookings({
      slots,
      site: siteField.siteInput,
      status,
      notes,
      modalityId,
    });
    setSaving(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success(result.message);
    for (const w of result.warnings) toast.warning(w.message);
    onMutated(result.batchId);
    router.refresh();
    onClose();
  }

  return (
    <>
      <SheetHeader className="border-b px-5.5 py-4.5">
        <SheetDescription className="text-[11px] font-medium tracking-wider uppercase text-[#2b7bb9]">
          Book {slots.length} day{slots.length === 1 ? "" : "s"}
        </SheetDescription>
        <SheetTitle className="text-lg font-bold text-[#333333]">{unitSummary}</SheetTitle>
        <p className="text-[13px] text-[#757575]">{dateSummary}</p>
      </SheetHeader>

      <div className="mx-5.5 mt-3.5 rounded-lg bg-[#f7f9fc] p-3 text-xs leading-[17px] text-[#757575]">
        All {slots.length} day{slots.length === 1 ? "" : "s"} will be booked with the same site
        and status. One undo step reverses the lot.
      </div>

      <div className="flex-1 overflow-y-auto px-5.5 py-4.5">
        <SiteField field={siteField} />

        {warnings.length > 0 && (
          <div className="mt-3 rounded-lg border border-[#f6ddc8] bg-[#fdf1e7] p-3 text-xs leading-[17px] text-[#9a4d1e]">
            {warnings.map((w, i) => (
              <div key={`${w.requirementKey}-${i}`}>⚠ {w.message}</div>
            ))}
          </div>
        )}

        <StatusPicker statuses={editableStatuses} value={status} onChange={setStatus} />

        <label className="mt-5 mb-1.5 block text-[13px] font-medium text-[#333333]">Notes</label>
        <Textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          placeholder="Optional — applied to every day in this set"
        />
      </div>

      <SheetFooter className="flex-col items-stretch border-t p-4">
        <Button className="w-full" disabled={!siteField.query.trim() || saving} onClick={handleSave}>
          {saving ? "Booking…" : `Book ${slots.length} day${slots.length === 1 ? "" : "s"}`}
        </Button>
      </SheetFooter>
    </>
  );
}
