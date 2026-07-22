"use server";

import { randomUUID } from "node:crypto";
import { and, eq, ilike, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import {
  bookings,
  bookingEvents,
  sites,
  unitSpecs,
  siteCapabilityRequirements,
  type Status,
} from "@/lib/db/schema";
import { requireRole } from "@/lib/auth/require-role";
import { computeCapabilityWarnings, type CapabilityWarning } from "@/lib/capability-matching";
import { EDITABLE_STATUSES } from "@/lib/statuses";

const EDITOR_ROLES = ["scheduler", "admin", "super_admin"] as const;

export type SaveBookingInput = {
  unitId: string;
  date: string;
  site: { id: number } | { name: string };
  status: Status;
  notes: string;
  // ISO string of the booking's updated_at as loaded in the drawer — null when creating
  // a new booking. Used for the optimistic-lock check (SPEC.md §11).
  expectedUpdatedAt: string | null;
};

export type SaveBookingResult =
  | { ok: true; message: string; warnings: CapabilityWarning[]; batchId: string }
  | { ok: false; error: string; code: "PERMISSION" | "CONFLICT" | "LOCKED" | "VALIDATION" };

export async function saveBooking(input: SaveBookingInput): Promise<SaveBookingResult> {
  const actor = await requireRole([...EDITOR_ROLES]);
  if (!actor) return { ok: false, error: "You don't have permission to edit bookings.", code: "PERMISSION" };

  if (!EDITABLE_STATUSES.includes(input.status)) {
    return { ok: false, error: "Invalid status.", code: "VALIDATION" };
  }

  return db.transaction(async (tx) => {
    // Resolve the site — existing by id, or free-text (exact case-insensitive match
    // reused, otherwise a new pending-review site is created — SPEC.md §5).
    let site: { id: number; name: string };
    if ("id" in input.site) {
      const [row] = await tx
        .select({ id: sites.id, name: sites.name })
        .from(sites)
        .where(and(eq(sites.id, input.site.id), isNull(sites.deletedAt)))
        .limit(1);
      if (!row) return { ok: false, error: "Selected site not found.", code: "VALIDATION" };
      site = row;
    } else {
      const trimmed = input.site.name.trim();
      if (!trimmed) return { ok: false, error: "Site is required.", code: "VALIDATION" };
      const [existingSite] = await tx
        .select({ id: sites.id, name: sites.name })
        .from(sites)
        .where(and(isNull(sites.deletedAt), ilike(sites.name, trimmed)))
        .limit(1);
      if (existingSite) {
        site = existingSite;
      } else {
        const [created] = await tx
          .insert(sites)
          .values({ name: trimmed, pendingReview: true })
          .returning({ id: sites.id, name: sites.name });
        site = created;
      }
    }

    const [existingBooking] = await tx
      .select()
      .from(bookings)
      .where(and(eq(bookings.unitId, input.unitId), eq(bookings.date, input.date), isNull(bookings.deletedAt)))
      .limit(1);

    if (existingBooking?.publishedAt) {
      return { ok: false, error: "This booking is published and locked. Unlock it first.", code: "LOCKED" };
    }

    if (existingBooking && input.expectedUpdatedAt !== existingBooking.updatedAt.toISOString()) {
      return {
        ok: false,
        error: "This booking was changed by someone else — refresh to see the latest.",
        code: "CONFLICT",
      };
    }

    // §2a capability check — logged alongside the audit snapshot, never blocking.
    const [specRows, reqRows] = await Promise.all([
      tx
        .select({ key: unitSpecs.key, value: unitSpecs.value })
        .from(unitSpecs)
        .where(eq(unitSpecs.unitId, input.unitId)),
      tx
        .select({
          requirementKey: siteCapabilityRequirements.requirementKey,
          required: siteCapabilityRequirements.required,
        })
        .from(siteCapabilityRequirements)
        .where(eq(siteCapabilityRequirements.siteId, site.id)),
    ]);
    const specMap: Record<string, string> = {};
    for (const r of specRows) specMap[r.key] = r.value ?? "";
    const warnings = computeCapabilityWarnings(reqRows, specMap, input.unitId, site.name);

    const batchId = randomUUID();
    const notes = input.notes.trim() || null;

    if (existingBooking) {
      const [updated] = await tx
        .update(bookings)
        .set({ siteId: site.id, status: input.status, notes, updatedBy: actor.id, updatedAt: new Date() })
        .where(eq(bookings.id, existingBooking.id))
        .returning();
      await tx.insert(bookingEvents).values({
        actorId: actor.id,
        action: "update",
        batchId,
        bookingBefore: existingBooking,
        bookingAfter: { ...updated, capabilityWarnings: warnings },
      });
    } else {
      const [created] = await tx
        .insert(bookings)
        .values({
          unitId: input.unitId,
          date: input.date,
          siteId: site.id,
          status: input.status,
          notes,
          createdBy: actor.id,
          updatedBy: actor.id,
        })
        .returning();
      await tx.insert(bookingEvents).values({
        actorId: actor.id,
        action: "create",
        batchId,
        bookingBefore: null,
        bookingAfter: { ...created, capabilityWarnings: warnings },
      });
    }

    revalidatePath("/");
    return { ok: true, message: `Saved — ${input.unitId} · ${site.name}`, warnings, batchId };
  });
}

export type ClearBookingInput = { unitId: string; date: string; expectedUpdatedAt: string };
export type ClearBookingResult =
  | { ok: true; message: string; batchId: string }
  | { ok: false; error: string; code: "PERMISSION" | "CONFLICT" | "LOCKED" | "NOT_FOUND" };

export async function clearBooking(input: ClearBookingInput): Promise<ClearBookingResult> {
  const actor = await requireRole([...EDITOR_ROLES]);
  if (!actor) return { ok: false, error: "You don't have permission to edit bookings.", code: "PERMISSION" };

  return db.transaction(async (tx) => {
    const [existing] = await tx
      .select()
      .from(bookings)
      .where(and(eq(bookings.unitId, input.unitId), eq(bookings.date, input.date), isNull(bookings.deletedAt)))
      .limit(1);

    if (!existing) return { ok: false, error: "Nothing to clear.", code: "NOT_FOUND" };
    if (existing.publishedAt) {
      return { ok: false, error: "This booking is published and locked. Unlock it first.", code: "LOCKED" };
    }
    if (input.expectedUpdatedAt !== existing.updatedAt.toISOString()) {
      return {
        ok: false,
        error: "This booking was changed by someone else — refresh to see the latest.",
        code: "CONFLICT",
      };
    }

    await tx
      .update(bookings)
      .set({ deletedAt: new Date(), deletedBy: actor.id, updatedAt: new Date(), updatedBy: actor.id })
      .where(eq(bookings.id, existing.id));

    const batchId = randomUUID();
    await tx.insert(bookingEvents).values({
      actorId: actor.id,
      action: "delete",
      batchId,
      bookingBefore: existing,
      bookingAfter: null,
    });

    revalidatePath("/");
    return { ok: true, message: `Cleared — ${input.unitId} on ${input.date}`, batchId };
  });
}
