"use client";

import { useEffect, useState } from "react";
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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { fmtDateLong } from "@/lib/dates";
import { STATUS_CONFIG, EDITABLE_STATUSES } from "@/lib/statuses";
import { computeCapabilityWarnings } from "@/lib/capability-matching";
import type { GridBooking } from "@/lib/db/queries";
import type { Status } from "@/lib/db/schema";
import { saveBooking, clearBooking } from "@/lib/actions/bookings";
import { searchSites } from "@/lib/actions/sites";

export type DrawerTarget = { unitId: string; date: string; unitDescription: string | null };

export function BookingDrawer({
  target,
  booking,
  unitSpecs,
  siteCapabilityRequirements,
  onClose,
  onMutated,
}: {
  target: DrawerTarget | null;
  booking: GridBooking | null;
  unitSpecs: Record<string, Record<string, string>>;
  siteCapabilityRequirements: Record<number, { requirementKey: string; required: boolean }[]>;
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
            target={target}
            booking={booking}
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

function BookingDrawerBody({
  target,
  booking,
  unitSpecs,
  siteCapabilityRequirements,
  onClose,
  onMutated,
}: {
  target: DrawerTarget;
  booking: GridBooking | null;
  unitSpecs: Record<string, Record<string, string>>;
  siteCapabilityRequirements: Record<number, { requirementKey: string; required: boolean }[]>;
  onClose: () => void;
  onMutated: (batchId: string) => void;
}) {
  const [siteQuery, setSiteQuery] = useState(booking?.siteName ?? "");
  const [selectedSite, setSelectedSite] = useState<{ id: number; name: string } | null>(
    booking ? { id: booking.siteId, name: booking.siteName } : null,
  );
  const [matches, setMatches] = useState<{ id: number; name: string }[]>([]);
  const [status, setStatus] = useState<Status>(
    booking && EDITABLE_STATUSES.includes(booking.status) ? booking.status : "confirmed",
  );
  const [notes, setNotes] = useState(booking?.notes ?? "");
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (siteQuery.trim().length < 2 || selectedSite?.name === siteQuery) return;
    const handle = setTimeout(async () => {
      const results = await searchSites(siteQuery);
      setMatches(results);
    }, 200);
    return () => clearTimeout(handle);
  }, [siteQuery, selectedSite]);

  const locked = !!booking?.publishedAt;
  const specs = unitSpecs[target.unitId] ?? {};
  const showMatches = siteQuery.trim().length >= 2 && selectedSite?.name !== siteQuery && matches.length > 0;

  const warnings = selectedSite
    ? computeCapabilityWarnings(
        siteCapabilityRequirements[selectedSite.id] ?? [],
        specs,
        target.unitId,
        selectedSite.name,
      )
    : [];

  async function handleSave() {
    setSaving(true);
    const site = selectedSite && selectedSite.name === siteQuery ? { id: selectedSite.id } : { name: siteQuery };
    const result = await saveBooking({
      unitId: target.unitId,
      date: target.date,
      site,
      status,
      notes,
      expectedUpdatedAt: booking?.updatedAt ? booking.updatedAt.toISOString() : null,
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
    if (!booking) return;
    setSaving(true);
    const result = await clearBooking({
      unitId: target.unitId,
      date: target.date,
      expectedUpdatedAt: booking.updatedAt.toISOString(),
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

  return (
    <>
      <SheetHeader className="border-b px-5.5 py-4.5">
        <SheetDescription
          className="text-[11px] font-medium tracking-wider uppercase"
          style={{ color: locked ? "#9a9a9a" : "#2b7bb9" }}
        >
          {locked ? "🔒 Published & locked" : booking ? "Edit booking" : "New booking"}
        </SheetDescription>
        <SheetTitle className="text-lg font-bold text-[#333333]">{target.unitId}</SheetTitle>
        <p className="text-[13px] text-[#757575]">{fmtDateLong(target.date)}</p>
      </SheetHeader>

      {locked ? (
        <div className="flex-1 px-5.5 py-4.5">
          <div className="rounded-[10px] bg-[#f7f9fc] p-3.5 text-[13px] leading-[19px] text-[#757575]">
            This booking has been forwarded to TMS and is locked for editing. Unlocking will
            make it editable again here, but won&apos;t notify TMS.
          </div>
          <div className="mt-4">
            <div className="text-[13px] font-medium text-[#333333]">{booking?.siteName}</div>
            <div className="mt-0.5 text-xs text-[#757575]">{STATUS_CONFIG[booking!.status].label}</div>
          </div>
        </div>
      ) : (
        <>
          {target.unitDescription && (
            <div className="mx-5.5 mt-3.5 rounded-lg bg-[#f7f9fc] p-3 text-xs leading-[17px] text-[#757575]">
              {target.unitDescription}
            </div>
          )}

          <div className="flex-1 overflow-y-auto px-5.5 py-4.5">
            <label className="mb-1.5 block text-[13px] font-medium text-[#333333]">Site location</label>
            <Input
              value={siteQuery}
              onChange={(e) => {
                setSiteQuery(e.target.value);
                if (selectedSite && e.target.value !== selectedSite.name) setSelectedSite(null);
              }}
              placeholder="Search or enter a site…"
            />
            {showMatches && (
              <div className="mt-1.5 overflow-hidden rounded-xl border">
                {matches.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onMouseDown={() => {
                      setSelectedSite(m);
                      setSiteQuery(m.name);
                      setMatches([]);
                    }}
                    className="block w-full border-b px-3.5 py-2.5 text-left text-[13px] text-[#333333] last:border-b-0 hover:bg-[#f7f9fc]"
                  >
                    {m.name}
                  </button>
                ))}
              </div>
            )}

            {warnings.length > 0 && (
              <div className="mt-3 rounded-lg border border-[#f6ddc8] bg-[#fdf1e7] p-3 text-xs leading-[17px] text-[#9a4d1e]">
                {warnings.map((w) => (
                  <div key={w.requirementKey}>⚠ {w.message}</div>
                ))}
              </div>
            )}

            <label className="mt-5 mb-2 block text-[13px] font-medium text-[#333333]">Status</label>
            <div className="flex flex-col gap-1.5">
              {EDITABLE_STATUSES.map((key) => {
                const st = STATUS_CONFIG[key];
                const on = status === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setStatus(key)}
                    className="flex items-center gap-2.5 rounded-lg border px-3 py-2.5 text-left transition-colors"
                    style={{
                      borderColor: on ? st.bar : "#e6e6e6",
                      background: on ? st.bg : "#fff",
                      boxShadow: on ? `inset 3px 0 0 ${st.bar}` : "none",
                    }}
                  >
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: st.bar }} />
                    <span className="text-[13px]" style={{ color: on ? st.text : "#333333" }}>
                      {st.label}
                    </span>
                  </button>
                );
              })}
            </div>

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

      <SheetFooter className="flex-row border-t p-4">
        {locked ? (
          <Button
            variant="destructive"
            className="flex-1"
            onClick={() => toast.info("Unlock lands with the publish workflow.")}
          >
            Unlock to edit
          </Button>
        ) : (
          <>
            <Button className="flex-1" disabled={!siteQuery.trim() || saving} onClick={handleSave}>
              Save booking
            </Button>
            {booking && (
              <Button variant="destructive" disabled={saving} onClick={handleClear}>
                Clear
              </Button>
            )}
          </>
        )}
      </SheetFooter>
    </>
  );
}
