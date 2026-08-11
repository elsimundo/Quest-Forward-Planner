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
import { SiteField, StatusPicker, useSiteField } from "./booking-fields";
import { fmtDateLong } from "@/lib/dates";
import { DEFAULT_STATUS_KEY } from "@/lib/statuses";
import { useStatusCatalog } from "./status-context";
import { computeCapabilityWarnings } from "@/lib/capability-matching";
import { CHANGE_KIND_LABEL, changeKindFor } from "@/lib/planner-changes";
import { PUBLISH_EXCLUSION_LABEL } from "@/lib/publish-eligibility";
import type { OverlayBooking } from "@/lib/db/tms/overlay";
import { saveBooking, clearBooking } from "@/lib/actions/bookings";
import { resolveTmsSupersede } from "@/lib/actions/tms-resolve";
import { unpublishBooking } from "@/lib/actions/publish";

export type DrawerTarget = {
  unitId: number;
  // Display label (the unit's registration, e.g. "CT17") — units are keyed by a numeric
  // surrogate id now (docs/TMS_INTEGRATION_PLAN.md §4.1).
  unitRegistration: string;
  date: string;
  unitDescription: string | null;
  // The active sheet's modality — threaded through to saveBooking so a newly-created
  // booking gets stamped with the right modality_id (§4.3); re-validated server-side.
  modalityId: number;
};

export function BookingDrawer({
  companyId,
  target,
  booking,
  ghost,
  ghostMovedToLabel,
  onGoToGhost,
  unitSpecs,
  siteCapabilityRequirements,
  canUnlock,
  bookedSiteIds,
  onClose,
  onMutated,
}: {
  companyId: number;
  target: DrawerTarget | null;
  booking: OverlayBooking | null;
  ghost: OverlayBooking | null;
  ghostMovedToLabel: string | null;
  onGoToGhost?: () => void;
  unitSpecs: Record<number, Record<string, string>>;
  siteCapabilityRequirements: Record<number, { requirementKey: string; required: boolean }[]>;
  canUnlock: boolean;
  bookedSiteIds: Set<number>;
  onClose: () => void;
  onMutated: (batchId: string) => void;
}) {
  return (
    <Sheet open={!!target} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="flex w-full flex-col gap-0 p-0 sm:max-w-[360px]">
        {target && (
          // Keyed by the cell so each new target mounts fresh with correctly-initialised
          // state, rather than an effect resetting fields on every prop change.
          <BookingDrawerBody
            key={`${target.unitId}|${target.date}`}
            companyId={companyId}
            target={target}
            booking={booking}
            ghost={ghost}
            ghostMovedToLabel={ghostMovedToLabel}
            onGoToGhost={onGoToGhost}
            unitSpecs={unitSpecs}
            siteCapabilityRequirements={siteCapabilityRequirements}
            canUnlock={canUnlock}
            bookedSiteIds={bookedSiteIds}
            onClose={onClose}
            onMutated={onMutated}
          />
        )}
      </SheetContent>
    </Sheet>
  );
}

function BookingDrawerBody({
  companyId,
  target,
  booking,
  ghost,
  ghostMovedToLabel,
  onGoToGhost,
  unitSpecs,
  siteCapabilityRequirements,
  canUnlock,
  bookedSiteIds,
  onClose,
  onMutated,
}: {
  companyId: number;
  target: DrawerTarget;
  booking: OverlayBooking | null;
  ghost: OverlayBooking | null;
  ghostMovedToLabel: string | null;
  onGoToGhost?: () => void;
  unitSpecs: Record<number, Record<string, string>>;
  siteCapabilityRequirements: Record<number, { requirementKey: string; required: boolean }[]>;
  canUnlock: boolean;
  bookedSiteIds: Set<number>;
  onClose: () => void;
  onMutated: (batchId: string) => void;
}) {
  const catalog = useStatusCatalog();
  // The user-pickable statuses (active, not calendar-derived), in display order.
  const editableStatuses = catalog.all.filter((s) => s.editable && s.active);

  const siteField = useSiteField(companyId, booking ? { id: booking.siteId, name: booking.siteName } : null, bookedSiteIds);
  const [status, setStatus] = useState<string>(
    booking && editableStatuses.some((s) => s.key === booking.status) ? booking.status : DEFAULT_STATUS_KEY,
  );
  const [notes, setNotes] = useState(booking?.notes ?? "");
  const [saving, setSaving] = useState(false);
  const [confirmingUnlock, setConfirmingUnlock] = useState(false);
  const router = useRouter();

  // Frozen at mount, NOT read live from the `booking` prop on save/clear. The grid polls
  // for live updates (SPEC.md §11) and refreshes `bookings` every ~10s, which would
  // otherwise silently slide this drawer's optimistic-lock reference forward to whatever
  // the server currently holds — defeating the entire point of the check (proving "I
  // started editing from state X") and letting a save silently clobber a concurrent edit
  // instead of being rejected. This is the one field that must reflect only what the user
  // actually saw when they opened the drawer.
  const [initialUpdatedAt] = useState(() => booking?.updatedAt ?? null);

  const locked = !!booking?.publishedAt;
  // Says in words what the dot on the chip says as a mark — "Confirmed" on its own doesn't
  // tell you whether TMS has it (docs/DECISIONS.md #29). Only for an existing booking: the
  // moved/cleared cases have their own banner below, which explains far more than a line.
  const changeKind = booking ? changeKindFor(booking) : null;
  const specs = unitSpecs[target.unitId] ?? {};

  const warnings = siteField.selected
    ? computeCapabilityWarnings(
        siteCapabilityRequirements[siteField.selected.id] ?? [],
        specs,
        target.unitRegistration,
        siteField.selected.name,
      )
    : [];

  async function handleSave() {
    setSaving(true);
    const result = await saveBooking({
      unitId: target.unitId,
      date: target.date,
      site: siteField.siteInput,
      status,
      notes,
      modalityId: target.modalityId,
      expectedUpdatedAt: initialUpdatedAt ? initialUpdatedAt.toISOString() : null,
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

  async function handleClear() {
    if (!booking || !initialUpdatedAt) return;
    setSaving(true);
    const result = await clearBooking({
      unitId: target.unitId,
      date: target.date,
      expectedUpdatedAt: initialUpdatedAt.toISOString(),
    });
    setSaving(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success(result.message);
    onMutated(result.batchId);
    router.refresh();
    onClose();
  }

  // Stage C3: TMS changed this booking since it was amended (booking.tmsSupersedes, computed
  // in lib/db/tms/overlay.ts). Neither side should win silently, so the scheduler chooses.
  const [resolving, setResolving] = useState<"keep" | "accept-tms" | null>(null);
  async function handleResolveSupersede(resolution: "keep" | "accept-tms") {
    if (!initialUpdatedAt) return;
    setResolving(resolution);
    const result = await resolveTmsSupersede({
      unitId: target.unitId,
      date: target.date,
      resolution,
      expectedUpdatedAt: initialUpdatedAt.toISOString(),
    });
    setResolving(null);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success(result.message);
    onMutated(result.batchId);
    router.refresh();
    onClose();
  }

  async function handleUnlock() {
    // Two-step confirm (SPEC.md §2b: unlocking is destructive and must be confirmed) —
    // the first click arms it, the second actually unlocks.
    if (!confirmingUnlock) {
      setConfirmingUnlock(true);
      return;
    }
    setSaving(true);
    const result = await unpublishBooking({ unitId: target.unitId, date: target.date });
    setSaving(false);
    if (!result.ok) {
      toast.error(result.error);
      setConfirmingUnlock(false);
      return;
    }
    toast.success(result.message);
    onMutated(result.batchId);
    router.refresh();
    onClose();
  }

  return (
    <>
      <SheetHeader className="border-b px-5.5 py-4.5">
        <SheetDescription
          className="text-[11px] font-medium tracking-wider uppercase"
          style={{ color: locked ? "#9a9a9a" : "#2b7bb9" }}
        >
          {locked ? "🔒 Published & locked" : booking ? "Edit booking" : "New booking"}
        </SheetDescription>
        <SheetTitle className="text-lg font-bold text-[#333333]">{target.unitRegistration}</SheetTitle>
        <p className="text-[13px] text-[#757575]">{fmtDateLong(target.date)}</p>
        {/* Always says which side has this, not just when they disagree — a silent drawer on
            an untouched TMS booking read as "no answer" (docs/DECISIONS.md #33), the same
            gap #29/#31 already closed on the chip itself. Skipped once locked: the
            "Published & locked" line above already says it. */}
        {booking && !locked && (
          changeKind ? (
            <p className="mt-1 inline-flex items-center gap-1.5 text-[11px] text-[#2b7bb9]">
              <span className="h-[6px] w-[6px] shrink-0 rounded-full bg-[#2b7bb9]" aria-hidden />
              {CHANGE_KIND_LABEL[changeKind]}
            </p>
          ) : (
            <p className="mt-1 inline-flex items-center gap-1.5 text-[11px] text-[#757575]">
              <span className="h-[6px] w-[6px] shrink-0 rounded-full bg-[#9a9a9a]" aria-hidden />
              {PUBLISH_EXCLUSION_LABEL["not-a-planner-change"]}
            </p>
          )
        )}
      </SheetHeader>

      {locked ? (
        <div className="flex-1 px-5.5 py-4.5">
          <div className="rounded-[10px] bg-[#f7f9fc] p-3.5 text-[13px] leading-[19px] text-[#757575]">
            This booking has been forwarded to TMS and is locked for editing. Unlocking will
            make it editable again here, but won&apos;t notify TMS.
          </div>
          <div className="mt-4">
            <div className="text-[13px] font-medium text-[#333333]">{booking?.siteName}</div>
            <div className="mt-0.5 text-xs text-[#757575]">{catalog.get(booking!.status).label}</div>
          </div>
        </div>
      ) : (
        <>
          {target.unitDescription && (
            <div className="mx-5.5 mt-3.5 rounded-lg bg-[#f7f9fc] p-3 text-xs leading-[17px] text-[#757575]">
              {target.unitDescription}
            </div>
          )}

          {/* Opened on a cell whose TMS booking we've moved or cleared away. The slot is free
              — that's why the drawer is showing a booking form at all — but TMS still has
              something here until publish, and the form alone wouldn't say so. */}
          {!booking && ghost && (
            <div className="mx-5.5 mt-3.5 rounded-lg border border-[#e4dcd2] bg-[#faf6f2] p-3 text-xs leading-[17px] text-[#7a5c3e]">
              <p>
                TMS still shows <span className="font-medium">{ghost.siteName}</span> here.
                {ghost.ghostReason === "cleared"
                  ? " You've cleared it — that takes effect in TMS when you publish."
                  : ghostMovedToLabel
                    ? ` You've moved it to ${ghostMovedToLabel}.`
                    : " You've moved it elsewhere."}
              </p>
              <p className="mt-1 text-[#a58a6f]">
                This slot is free — anything you book here is in addition to that change.
              </p>
              {onGoToGhost && (
                <button
                  type="button"
                  onClick={onGoToGhost}
                  className="mt-1.5 cursor-pointer text-[#8a6642] underline underline-offset-2 hover:text-[#6b4e33]"
                >
                  Jump to where it went ↷
                </button>
              )}
            </div>
          )}

          {/* Stage B4: TMS holds a different, unlinked booking on this exact unit+date —
              usually because it was added straight into TMS rather than through the planner,
              so there was never a moment for the app to catch it at write time. No shared
              lineage with this amendment, so there's nothing to "resolve" the way a supersede
              is — the two sides just can't both be forwarded to the same slot. Move or clear
              this booking (both already available below); the flag clears once they no
              longer share a slot. */}
          {booking?.tmsCollision && (
            <div className="mx-5.5 mt-3.5 rounded-lg border border-[#f0c4bb] bg-[#fdedea] p-3 text-xs leading-[17px] text-[#8a2f20]">
              <p className="font-medium">
                ⨯ TMS also has <span className="font-semibold">{booking.tmsCollision.siteName}</span> booked here
                {booking.tmsCollision.status ? ` (${catalog.get(booking.tmsCollision.status).label})` : ""}.
              </p>
              <p className="mt-1 text-[#a8503d]">
                Added independently of this booking — the two can&apos;t both be forwarded to
                the same unit and day. Move or clear this one, or resolve it directly in TMS.
              </p>
            </div>
          )}

          {booking?.tmsSupersedes && (
            <div className="mx-5.5 mt-3.5 rounded-lg border border-[#dccbf7] bg-[#f4edfd] p-3 text-xs leading-[17px] text-[#5a2d9c]">
              <p className="font-medium">↻ TMS has updated this booking since it was last changed here.</p>
              <p className="mt-1 text-[#7c5aa8]">
                Someone needs to decide which version to keep — TMS won&apos;t be overridden
                silently.
              </p>
              <div className="mt-2.5 flex gap-1.5">
                <Button
                  variant="outline"
                  className="h-7 flex-1 border-[#c9adf0] px-2 text-[11px] text-[#5a2d9c] hover:bg-[#ece0fa]"
                  disabled={resolving !== null}
                  onClick={() => void handleResolveSupersede("keep")}
                >
                  {resolving === "keep" ? "Keeping…" : "Keep my version"}
                </Button>
                <Button
                  variant="outline"
                  className="h-7 flex-1 border-[#c9adf0] px-2 text-[11px] text-[#5a2d9c] hover:bg-[#ece0fa]"
                  disabled={resolving !== null}
                  onClick={() => void handleResolveSupersede("accept-tms")}
                >
                  {resolving === "accept-tms" ? "Updating…" : "Use TMS's version"}
                </Button>
              </div>
            </div>
          )}

          <div className="flex-1 overflow-y-auto px-5.5 py-4.5">
            <SiteField field={siteField} />

            {warnings.length > 0 && (
              <div className="mt-3 rounded-lg border border-[#f6ddc8] bg-[#fdf1e7] p-3 text-xs leading-[17px] text-[#9a4d1e]">
                {warnings.map((w) => (
                  <div key={w.requirementKey}>⚠ {w.message}</div>
                ))}
              </div>
            )}

            <StatusPicker statuses={editableStatuses} value={status} onChange={setStatus} />

            <label className="mt-5 mb-1.5 block text-[13px] font-medium text-[#333333]">Notes</label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Optional — staffing, access, engineer visit…"
            />
          </div>
        </>
      )}

      <SheetFooter className="flex-col items-stretch border-t p-4">
        {locked ? (
          canUnlock ? (
            <>
              {confirmingUnlock && (
                <p className="mb-2 text-center text-xs text-[#9a4d1e]">
                  This unlocks the booking for editing here. It won&apos;t un-forward it from TMS.
                </p>
              )}
              <Button
                variant="destructive"
                className="w-full"
                disabled={saving}
                onClick={handleUnlock}
              >
                {confirmingUnlock ? "Confirm unlock" : "Unlock to edit"}
              </Button>
            </>
          ) : (
            <p className="text-center text-[13px] text-[#757575]">
              Only an admin can unlock a published booking.
            </p>
          )
        ) : (
          <div className="flex flex-row gap-2">
            <Button className="flex-1" disabled={!siteField.query.trim() || saving} onClick={handleSave}>
              Save booking
            </Button>
            {booking && (
              <Button variant="destructive" disabled={saving} onClick={handleClear}>
                Clear
              </Button>
            )}
          </div>
        )}
      </SheetFooter>
    </>
  );
}
