import {
  getActiveModalities,
  getActiveUnits,
  getBookingDateRange,
  getBookingsInRange,
  getAllUnitSpecs,
  getAllSiteCapabilityRequirements,
} from "@/lib/db/queries";
import { enumerateDays } from "@/lib/dates";
import { PlannerGrid } from "@/components/planner/planner-grid";
import { auth } from "@/auth";
import { ROLES, type Role } from "@/lib/db/schema";
import { UserMenu } from "@/components/user-menu";

// This page reads live scheduling data straight from Postgres via Drizzle, which Next
// can't detect as a "dynamic" data source the way it does fetch()/cookies()/searchParams
// — without this it would silently prerender the grid once at build time and serve
// stale bookings forever. SPEC.md §11: live updates poll every ~10s; this is what makes
// even the first load correct.
export const dynamic = "force-dynamic";

function fallbackRange(): { from: string; to: string } {
  const now = new Date();
  const from = new Date(Date.UTC(now.getUTCFullYear() - 1, now.getUTCMonth(), 1));
  const to = new Date(Date.UTC(now.getUTCFullYear() + 1, now.getUTCMonth(), 1));
  return { from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) };
}

export default async function PlannerPage() {
  const [modalities, session] = await Promise.all([getActiveModalities(), auth()]);
  const ctModality = modalities.find((m) => m.name === "CT") ?? modalities[0];
  // UI role-gating only — every mutation re-checks role server-side (SPEC.md §11). The
  // session claim can be stale, so we fall back to the least-privileged role if absent.
  const sessionRole = session?.user?.role;
  const role: Role = ROLES.includes(sessionRole as Role) ? (sessionRole as Role) : "viewer";

  return (
    <div className="flex h-full flex-col">
      <header className="flex h-[62px] shrink-0 items-center justify-between bg-[var(--quest-navy)] px-6 shadow-[var(--shadow-header)]">
        <div className="flex items-baseline gap-2.5">
          <span className="text-lg font-bold tracking-[0.14em] text-white">QUEST</span>
          <span className="h-[18px] w-px bg-white/35" />
          <span className="text-sm font-medium tracking-[0.02em]" style={{ color: "#e88f8f" }}>
            Forward Planner
          </span>
        </div>
        <UserMenu name={session?.user?.name ?? "?"} role={role} />
      </header>

      {!ctModality ? (
        <main className="flex flex-1 items-center justify-center bg-[var(--quest-surface-alt)] p-8 text-center text-sm text-[var(--quest-body)]">
          No modalities configured yet — nothing to show.
        </main>
      ) : (
        <PlannerBody modalityId={ctModality.id} modalities={modalities} role={role} />
      )}
    </div>
  );
}

async function PlannerBody({
  modalityId,
  modalities,
  role,
}: {
  modalityId: number;
  modalities: { id: number; name: string }[];
  role: Role;
}) {
  const units = await getActiveUnits(modalityId);
  const range = (await getBookingDateRange(modalityId)) ?? fallbackRange();
  const [bookings, unitSpecs, siteCapabilityRequirements] = await Promise.all([
    getBookingsInRange(modalityId, range.from, range.to),
    getAllUnitSpecs(),
    getAllSiteCapabilityRequirements(),
  ]);
  const days = enumerateDays(range.from, range.to);

  return (
    <div className="min-h-0 flex-1">
      <PlannerGrid
        modalities={modalities}
        activeModalityId={modalityId}
        units={units}
        days={days}
        bookings={bookings}
        unitSpecs={unitSpecs}
        siteCapabilityRequirements={siteCapabilityRequirements}
        role={role}
      />
    </div>
  );
}
