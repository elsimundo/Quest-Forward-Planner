"use server";

import { randomUUID } from "node:crypto";
import { and, eq, isNull, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { bookings, bookingEvents } from "@/lib/db/schema";
import { requireRole } from "@/lib/auth/require-role";

// Publishing (forwarding to TMS) is day-to-day scheduling work — scheduler and up.
const PUBLISH_ROLES = ["scheduler", "admin", "super_admin"] as const;
// Unlocking a forwarded booking is the admin-only safety valve (SPEC.md §2b).
const UNLOCK_ROLES = ["admin", "super_admin"] as const;

type BookingRow = typeof bookings.$inferSelect;

export type PublishTarget = { unitId: string; date: string };

export type PublishResult =
  | { ok: true; count: number; batchId: string | null; message: string }
  | { ok: false; error: string; code: "PERMISSION" | "VALIDATION" };

// Publish a set of bookings (from a multi-select or a date-range sweep). Already-published
// and empty cells in the target list are silently skipped — publishing is idempotent, you
// can re-sweep a week without disturbing what's already locked (SPEC.md §2b). Returns a
// batchId only when something actually changed, so the client can push it onto the undo
// stack (publish is undoable — its inverse is the unlock).
export async function publishBookings(targets: PublishTarget[]): Promise<PublishResult> {
  const actor = await requireRole([...PUBLISH_ROLES]);
  if (!actor) return { ok: false, error: "You don't have permission to publish bookings.", code: "PERMISSION" };
  if (!targets.length) return { ok: true, count: 0, batchId: null, message: "Nothing to publish." };

  return db.transaction(async (tx) => {
    const rows: BookingRow[] = [];
    for (const t of targets) {
      const [row] = await tx
        .select()
        .from(bookings)
        .where(and(eq(bookings.unitId, t.unitId), eq(bookings.date, t.date), isNull(bookings.deletedAt)))
        .limit(1);
      // Only live, not-already-published bookings are eligible.
      if (row && !row.publishedAt) rows.push(row);
    }

    if (!rows.length) {
      return {
        ok: true,
        count: 0,
        batchId: null,
        message: "Nothing to publish — those bookings are already published.",
      };
    }

    const now = new Date();
    const ids = rows.map((r) => r.id);
    const updated = await tx
      .update(bookings)
      .set({ publishedAt: now, publishedBy: actor.id, updatedAt: now, updatedBy: actor.id })
      .where(sql`${bookings.id} IN (${sql.join(ids.map((id) => sql`${id}`), sql`, `)})`)
      .returning();
    const updatedById = new Map(updated.map((r) => [r.id, r]));

    const batchId = randomUUID();
    await tx.insert(bookingEvents).values(
      rows.map((before) => ({
        actorId: actor.id,
        action: "publish" as const,
        batchId,
        bookingBefore: before,
        bookingAfter: updatedById.get(before.id) ?? null,
      })),
    );

    revalidatePath("/");
    const n = rows.length;
    return { ok: true, count: n, batchId, message: `Published ${n} booking${n > 1 ? "s" : ""} to TMS` };
  });
}

export type UnpublishResult =
  | { ok: true; batchId: string; message: string }
  | { ok: false; error: string; code: "PERMISSION" | "NOT_FOUND" | "VALIDATION" };

// Unlock a single published booking — the admin override for "TMS already has the old
// version, we need to fix a mistake" (SPEC.md §2b). Clears published_at/by and logs an
// `unpublish` event; it does NOT notify TMS (that's the separate write-integration, §13.1).
export async function unpublishBooking(target: PublishTarget): Promise<UnpublishResult> {
  const actor = await requireRole([...UNLOCK_ROLES]);
  if (!actor) return { ok: false, error: "Only an admin can unlock a published booking.", code: "PERMISSION" };

  return db.transaction(async (tx) => {
    const [existing] = await tx
      .select()
      .from(bookings)
      .where(and(eq(bookings.unitId, target.unitId), eq(bookings.date, target.date), isNull(bookings.deletedAt)))
      .limit(1);

    if (!existing) return { ok: false, error: "Booking not found.", code: "NOT_FOUND" };
    if (!existing.publishedAt) return { ok: false, error: "That booking isn't published.", code: "VALIDATION" };

    const now = new Date();
    const [updated] = await tx
      .update(bookings)
      .set({ publishedAt: null, publishedBy: null, updatedAt: now, updatedBy: actor.id })
      .where(eq(bookings.id, existing.id))
      .returning();

    const batchId = randomUUID();
    await tx.insert(bookingEvents).values({
      actorId: actor.id,
      action: "unpublish",
      batchId,
      bookingBefore: existing,
      bookingAfter: updated,
    });

    revalidatePath("/");
    return { ok: true, batchId, message: `Unlocked — ${target.unitId} on ${target.date} is editable again` };
  });
}
