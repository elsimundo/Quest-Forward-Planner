"use server";

import { and, eq, isNull, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { bookingStatuses, bookings } from "@/lib/db/schema";
import { requireRole } from "@/lib/auth/require-role";

// Managing the status catalogue is a scheduling-admin job (docs/DECISIONS.md #18). Gated to
// the local admin tiers today; once the TMS-derived permission model lands
// (docs/TMS_INTEGRATION_PLAN.md §7) this maps to enable_scheduling_access + admin.
const ADMIN_ROLES = ["admin", "super_admin"] as const;

export type StatusActionResult = { ok: true } | { ok: false; error: string };

const HEX = /^#[0-9a-fA-F]{6}$/;
const KEY = /^[a-z0-9](?:[a-z0-9_-]*[a-z0-9])?$/;

type ColourInput = { colorBg: string; colorBar: string; colorText: string; colorBorder: string };

function validateColours(c: ColourInput): string | null {
  for (const [name, v] of Object.entries(c)) {
    if (!HEX.test(v)) return `${name} must be a 6-digit hex colour like #2b7bb9.`;
  }
  return null;
}

function revalidate() {
  revalidatePath("/admin/booking-statuses");
  // The grid, drawer, legend and toolbar all render from this catalogue.
  revalidatePath("/");
}

export async function createBookingStatus(input: {
  key: string;
  label: string;
  billable: boolean;
} & ColourInput): Promise<StatusActionResult> {
  const actor = await requireRole([...ADMIN_ROLES]);
  if (!actor) return { ok: false, error: "You don't have permission to manage statuses." };

  const key = input.key.trim().toLowerCase();
  const label = input.label.trim();
  if (!KEY.test(key)) return { ok: false, error: "Key must be lowercase letters, numbers, - or _ (e.g. on-hold)." };
  if (!label) return { ok: false, error: "Label is required." };
  const colourErr = validateColours(input);
  if (colourErr) return { ok: false, error: colourErr };

  // Reuse a soft-deleted row with the same key rather than colliding on the unique index.
  const [existing] = await db
    .select({ id: bookingStatuses.id, deletedAt: bookingStatuses.deletedAt })
    .from(bookingStatuses)
    .where(eq(bookingStatuses.key, key))
    .limit(1);
  if (existing && !existing.deletedAt) return { ok: false, error: `A status with key "${key}" already exists.` };

  const [{ max }] = await db
    .select({ max: sql<number>`coalesce(max(${bookingStatuses.displayOrder}), -1)` })
    .from(bookingStatuses)
    .where(isNull(bookingStatuses.deletedAt));

  const values = {
    key,
    label,
    colorBg: input.colorBg,
    colorBar: input.colorBar,
    colorText: input.colorText,
    colorBorder: input.colorBorder,
    displayOrder: Number(max) + 1,
    editable: true,
    calendarDerived: false,
    billable: input.billable,
    // A newly created status is never publishable until an admin says so — forwarding to
    // TMS is the consequential direction, so it's opted into, not defaulted into. Also
    // covers the un-retire path below: reviving a deleted status doesn't silently restore
    // whatever publishability it had before.
    publishable: false,
    active: true,
    deletedAt: null,
  };

  if (existing) {
    await db.update(bookingStatuses).set(values).where(eq(bookingStatuses.id, existing.id));
  } else {
    await db.insert(bookingStatuses).values(values);
  }
  revalidate();
  return { ok: true };
}

export async function updateBookingStatus(input: {
  id: number;
  label: string;
  billable: boolean;
  publishable: boolean;
  active: boolean;
} & ColourInput): Promise<StatusActionResult> {
  const actor = await requireRole([...ADMIN_ROLES]);
  if (!actor) return { ok: false, error: "You don't have permission to manage statuses." };

  const label = input.label.trim();
  if (!label) return { ok: false, error: "Label is required." };
  const colourErr = validateColours(input);
  if (colourErr) return { ok: false, error: colourErr };

  const [row] = await db
    .select({ key: bookingStatuses.key, calendarDerived: bookingStatuses.calendarDerived })
    .from(bookingStatuses)
    .where(and(eq(bookingStatuses.id, input.id), isNull(bookingStatuses.deletedAt)))
    .limit(1);
  if (!row) return { ok: false, error: "Status not found." };
  // Calendar-derived statuses (weekend/bank holiday) are assigned by the app from the date,
  // so they must stay active — the grid relies on them existing. Colours/label are fine.
  if (row.calendarDerived && !input.active) {
    return { ok: false, error: "Weekend and bank-holiday statuses can't be deactivated — the planner assigns them automatically." };
  }
  // `confirmed` is the default status every new booking takes, and the client's rule is that
  // confirmed work is exactly what gets forwarded (docs/DECISIONS.md #24). Making it
  // unpublishable would leave nothing publishable at all — the Publish button would just
  // report "nothing to publish" forever, with no hint why. Same protection `confirmed`
  // already has against deletion below.
  if (row.key === "confirmed" && !input.publishable) {
    return { ok: false, error: "Confirmed can't be made unpublishable — it's the status the planner forwards to TMS." };
  }

  await db
    .update(bookingStatuses)
    .set({
      label,
      colorBg: input.colorBg,
      colorBar: input.colorBar,
      colorText: input.colorText,
      colorBorder: input.colorBorder,
      billable: input.billable,
      publishable: input.publishable,
      active: input.active,
    })
    .where(eq(bookingStatuses.id, input.id));
  revalidate();
  return { ok: true };
}

export async function reorderBookingStatuses(orderedIds: number[]): Promise<StatusActionResult> {
  const actor = await requireRole([...ADMIN_ROLES]);
  if (!actor) return { ok: false, error: "You don't have permission to manage statuses." };

  await db.transaction(async (tx) => {
    for (let i = 0; i < orderedIds.length; i++) {
      await tx.update(bookingStatuses).set({ displayOrder: i }).where(eq(bookingStatuses.id, orderedIds[i]));
    }
  });
  revalidate();
  return { ok: true };
}

export async function deleteBookingStatus(input: { id: number }): Promise<StatusActionResult> {
  const actor = await requireRole([...ADMIN_ROLES]);
  if (!actor) return { ok: false, error: "You don't have permission to manage statuses." };

  const [row] = await db
    .select({ key: bookingStatuses.key, calendarDerived: bookingStatuses.calendarDerived })
    .from(bookingStatuses)
    .where(and(eq(bookingStatuses.id, input.id), isNull(bookingStatuses.deletedAt)))
    .limit(1);
  if (!row) return { ok: false, error: "Status not found." };
  if (row.calendarDerived || row.key === "confirmed") {
    return { ok: false, error: "This status is built in and can't be removed. Deactivate it instead if you don't want it offered." };
  }

  // Block removal while bookings still use it — deactivate to hide it from the picker while
  // keeping it on historical bookings (soft delete, per CLAUDE.md).
  const [usage] = await db
    .select({ n: sql<number>`count(*)` })
    .from(bookings)
    .where(and(eq(bookings.status, row.key), isNull(bookings.deletedAt)));
  if (Number(usage.n) > 0) {
    return { ok: false, error: "Some bookings still use this status — deactivate it instead of deleting." };
  }

  await db.update(bookingStatuses).set({ deletedAt: new Date(), active: false }).where(eq(bookingStatuses.id, input.id));
  revalidate();
  return { ok: true };
}
