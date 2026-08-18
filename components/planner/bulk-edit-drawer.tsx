"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { LockIcon } from "lucide-react";
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
import { useTagCatalog } from "./tag-context";
import { SiteField, StatusPicker, TagPicker, useSiteField } from "./booking-fields";
import { updateBookings, type BulkEditTarget } from "@/lib/actions/bookings";

export type BulkEditRow = BulkEditTarget & { unitLabel: string };

/**
 * Change one field — or several — across a multi-select of already-booked cells in one go.
 *
 * Deliberately NOT "same three fields, all forced" like BulkBookingDrawer: that drawer is
 * booking blank cells, where every field genuinely needs a value. Here every booking already
 * HAS a site/status/notes, usually not all the same, so forcing every field would overwrite
 * things nobody asked to change. Each field carries its own "apply to all" toggle instead —
 * off (the default) means every booking keeps whatever it already had; on means this one
 * value replaces it everywhere in the set. Opening the drawer and confirming without
 * flipping anything is a no-op, same reasoning as MoveSelectedDialog's "Keep where it is".
 */
export function BulkEditDrawer({
  open,
  companyId,
  targets,
  lockedCount,
  pastCount,
  onClose,
  onMutated,
}: {
  open: boolean;
  companyId: number;
  /** The unpublished, unlocked, non-past bookings the drawer will act on. Never empty when `open`. */
  targets: BulkEditRow[];
  /** Selected bookings excluded because they're already published — reported, not silently dropped. */
  lockedCount: number;
  /** Selected bookings excluded because their date has passed — a separate reason from
   * `lockedCount`, reported separately so the banner can say which applies. */
  pastCount: number;
  onClose: () => void;
  onMutated: (batchId: string) => void;
}) {
  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="flex w-full flex-col gap-0 p-0 sm:max-w-[380px]">
        {open && (
          // Keyed by the selection so re-opening on a different set mounts fresh fields.
          <BulkEditBody
            key={targets.map((t) => `${t.unitId}|${t.date}`).join(",")}
            companyId={companyId}
            targets={targets}
            lockedCount={lockedCount}
            pastCount={pastCount}
            onClose={onClose}
            onMutated={onMutated}
          />
        )}
      </SheetContent>
    </Sheet>
  );
}

function BulkField({
  checked,
  onToggle,
  title,
  children,
}: {
  checked: boolean;
  onToggle: (v: boolean) => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-[#e6e6e6] p-3">
      <label className="flex cursor-pointer items-center justify-between gap-2">
        <span className="flex items-center gap-2 text-[13px] font-medium text-[#333333]">
          <input
            type="checkbox"
            checked={checked}
            onChange={(e) => onToggle(e.target.checked)}
          />
          {title}
        </span>
        <span className="text-[11px] text-[#9a9a9a]">{checked ? "Applying to all" : "No change"}</span>
      </label>
      <div className={checked ? "mt-3" : "mt-3 pointer-events-none opacity-40"}>{children}</div>
    </div>
  );
}

function BulkEditBody({
  companyId,
  targets,
  lockedCount,
  pastCount,
  onClose,
  onMutated,
}: {
  companyId: number;
  targets: BulkEditRow[];
  lockedCount: number;
  pastCount: number;
  onClose: () => void;
  onMutated: (batchId: string) => void;
}) {
  const catalog = useStatusCatalog();
  const editableStatuses = catalog.all.filter((s) => s.editable && s.active);
  const tagCatalog = useTagCatalog();

  const [editSite, setEditSite] = useState(false);
  const [editStatus, setEditStatus] = useState(false);
  const [editNotes, setEditNotes] = useState(false);
  const [editTags, setEditTags] = useState(false);

  const siteField = useSiteField(companyId, null);
  const [status, setStatus] = useState<string>(DEFAULT_STATUS_KEY);
  const [notes, setNotes] = useState("");
  const [tagIds, setTagIds] = useState<number[]>([]);
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  const unitSummary = [...new Set(targets.map((t) => t.unitLabel))].join(", ");
  const dates = [...targets.map((t) => t.date)].sort();
  const dateSummary =
    dates[0] === dates[dates.length - 1]
      ? fmtDate(dates[0])
      : `${fmtDate(dates[0])} – ${fmtDate(dates[dates.length - 1])}`;

  const anyFieldChosen = editSite || editStatus || editNotes || editTags;
  const canSave = anyFieldChosen && !(editSite && !siteField.query.trim());

  async function handleSave() {
    setSaving(true);
    const result = await updateBookings({
      targets: targets.map(({ unitId, date, expectedUpdatedAt }) => ({ unitId, date, expectedUpdatedAt })),
      site: editSite ? siteField.siteInput : undefined,
      status: editStatus ? status : undefined,
      notes: editNotes ? notes : undefined,
      tagIds: editTags ? tagIds : undefined,
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
          Bulk edit {targets.length} booking{targets.length === 1 ? "" : "s"}
        </SheetDescription>
        <SheetTitle className="text-lg font-bold text-[#333333]">{unitSummary}</SheetTitle>
        <p className="text-[13px] text-[#757575]">{dateSummary}</p>
      </SheetHeader>

      {lockedCount > 0 && (
        <div className="mx-5.5 mt-3.5 rounded-lg border border-[#dcdcdc] bg-[#f7f9fc] p-3 text-xs leading-[17px] text-[#757575]">
          <LockIcon className="mr-1 inline size-3 -translate-y-px" aria-hidden />
          {lockedCount} published booking{lockedCount === 1 ? "" : "s"} in the selection{" "}
          {lockedCount === 1 ? "is" : "are"} locked and won&apos;t be changed — unlock{" "}
          {lockedCount === 1 ? "it" : "them"} first to edit.
        </div>
      )}

      {pastCount > 0 && (
        <div className="mx-5.5 mt-3.5 rounded-lg border border-[#dcdcdc] bg-[#f7f9fc] p-3 text-xs leading-[17px] text-[#757575]">
          {pastCount} booking{pastCount === 1 ? "" : "s"} in the selection{" "}
          {pastCount === 1 ? "is" : "are"} on a date that&apos;s passed and won&apos;t be changed.
        </div>
      )}

      <div className="mx-5.5 mt-3.5 rounded-lg bg-[#f7f9fc] p-3 text-xs leading-[17px] text-[#757575]">
        Turn a field on to apply one value to all {targets.length} booking{targets.length === 1 ? "" : "s"}.
        Fields left off keep whatever each booking already has. One undo step reverses the lot.
      </div>

      <div className="flex-1 overflow-y-auto px-5.5 py-4.5">
        <div className="flex flex-col gap-3">
          <BulkField checked={editSite} onToggle={setEditSite} title="Change site">
            <SiteField field={siteField} />
          </BulkField>

          <BulkField checked={editStatus} onToggle={setEditStatus} title="Change status">
            <StatusPicker statuses={editableStatuses} value={status} onChange={setStatus} />
          </BulkField>

          <BulkField checked={editNotes} onToggle={setEditNotes} title="Replace notes">
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Replaces existing notes on every selected booking"
            />
          </BulkField>

          <BulkField checked={editTags} onToggle={setEditTags} title="Replace tags">
            <TagPicker tags={tagCatalog.all} value={tagIds} onChange={setTagIds} />
          </BulkField>
        </div>
      </div>

      <SheetFooter className="flex-col items-stretch border-t p-4">
        <Button className="w-full" disabled={!canSave || saving} onClick={handleSave}>
          {saving ? "Updating…" : `Update ${targets.length} booking${targets.length === 1 ? "" : "s"}`}
        </Button>
      </SheetFooter>
    </>
  );
}
