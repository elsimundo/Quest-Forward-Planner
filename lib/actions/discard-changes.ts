"use server";

import { and, desc, eq, gte, isNull, lte, or, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { bookings, bookingEvents } from "@/lib/db/schema";
import { requireRole } from "@/lib/auth/require-role";
import { undoBatchWithinTx } from "./undo";

// "Discard my changes" is exactly as safe as Undo, since it's the same actor undoing rows
// they currently own — same roles. "Discard everyone's changes" can wipe out a colleague's
// in-progress edits regardless of ownership, so it's gated like unlocking a publish
// (SPEC.md §2b), not like Undo.
const EDITOR_ROLES = ["scheduler", "admin", "super_admin"] as const;
const UNLOCK_ROLES = ["admin", "super_admin"] as const;

// Safety valve, not the expected exit: each row has one linear history and attempted
// batch ids only ever grow, so the loop below terminates on its own (docs/DECISIONS.md).
const MAX_ITERATIONS = 300;

export type DiscardScope = {
  from: string;
  to: string;
  companyId: number;
  modalityId: number;
  /** "mine" only touches bookings this actor currently owns (updatedBy/deletedBy) — not
   *  original authorship. If someone else has since edited a row you touched, it's no
   *  longer "yours" to discard. "everyone" ignores ownership entirely. */
  mode: "mine" | "everyone";
};

export type DiscardResult =
  | { ok: true; rowCount: number; skipped: number; message: string }
  | { ok: false; error: string; code: "PERMISSION" };

// Reverting an unpublished amendment can't just soft-delete the live row — a soft-deleted
// row carrying a tmsBookingId is indistinguishable from a genuine "cleared" ghost
// (lib/db/tms/overlay.ts loadSuppressedTmsBookingIds), so that would turn a reverted edit
// into a stuck cleared ghost instead of a plain TMS booking. Reusing undoBatchWithinTx's
// full snapshot restore avoids that: it already knows how to correctly unwind every action
// kind (create/update/delete/move/swap/overwrite), including which resulting state is
// TMS's own baseline.
export async function discardUnpublishedChanges(scope: DiscardScope): Promise<DiscardResult> {
  const actor = await requireRole(scope.mode === "everyone" ? [...UNLOCK_ROLES] : [...EDITOR_ROLES]);
  if (!actor) {
    return {
      ok: false,
      error:
        scope.mode === "everyone"
          ? "Only an admin can discard everyone's changes."
          : "You don't have permission to discard changes.",
      code: "PERMISSION",
    };
  }

  const { rowCount, skipped } = await db.transaction(async (tx) => {
    const attempted = new Set<string>();
    let rowCount = 0;
    let skipped = 0;

    for (let i = 0; i < MAX_ITERATIONS; i++) {
      const candidateConditions = [
        eq(bookings.companyId, scope.companyId),
        eq(bookings.modalityId, scope.modalityId),
        gte(bookings.date, scope.from),
        lte(bookings.date, scope.to),
        isNull(bookings.publishedAt),
      ];
      if (scope.mode === "mine") {
        candidateConditions.push(or(eq(bookings.updatedBy, actor.id), eq(bookings.deletedBy, actor.id))!);
      }
      const candidates = await tx
        .select({ id: bookings.id })
        .from(bookings)
        .where(and(...candidateConditions));
      if (!candidates.length) break;

      // Newest not-yet-attempted batch touching any candidate row — same jsonb-id pattern
      // as lib/db/admin-queries.ts's audit log queries.
      const idExpr = sql`coalesce((${bookingEvents.bookingAfter}->>'id')::int, (${bookingEvents.bookingBefore}->>'id')::int)`;
      const idList = sql.join(candidates.map((c) => sql`${c.id}`), sql`, `);
      const eventConditions = [sql`${idExpr} IN (${idList})`];
      if (attempted.size) {
        eventConditions.push(
          sql`${bookingEvents.batchId} NOT IN (${sql.join([...attempted].map((b) => sql`${b}::uuid`), sql`, `)})`,
        );
      }
      const [next] = await tx
        .select({ batchId: bookingEvents.batchId })
        .from(bookingEvents)
        .where(and(...eventConditions))
        .orderBy(desc(bookingEvents.id))
        .limit(1);
      if (!next) break;

      attempted.add(next.batchId);
      const undone = await undoBatchWithinTx(tx, next.batchId, actor);
      if (undone.ok) rowCount += undone.count;
      else skipped++;
    }

    return { rowCount, skipped };
  });

  if (rowCount > 0) revalidatePath("/");

  const parts: string[] = [];
  if (rowCount > 0) parts.push(`Discarded ${rowCount} change${rowCount > 1 ? "s" : ""}`);
  if (skipped > 0) parts.push(`${skipped} skipped — changed since, refresh and try again`);
  const message = parts.length ? parts.join(" — ") : "Nothing to discard.";

  return { ok: true, rowCount, skipped, message };
}
