import { redirect } from "next/navigation";
import {
  getActiveUnits,
  getBookingStatuses,
  getAllUnitSpecs,
  getAllSiteCapabilityRequirements,
  getModalitiesForCompany,
  listCompaniesForPicker,
} from "@/lib/db/queries";
import { getOverlayBookings, getOverlayDateRange } from "@/lib/db/tms/overlay";
import { TmsUnavailableError } from "@/lib/db/tms/booking-cache";
import { enumerateDays } from "@/lib/dates";
import { PlannerGrid } from "@/components/planner/planner-grid";
import { TmsUnavailable } from "@/components/planner/tms-unavailable";
import { requireRole } from "@/lib/auth/require-role";
import { ROLES } from "@/lib/db/schema";
import { UserMenu } from "@/components/user-menu";
import { CompanyPicker } from "@/components/planner/company-picker";

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

export default async function PlannerPage({
  searchParams,
}: {
  searchParams: Promise<{ company?: string; modality?: string }>;
}) {
  // Re-derived from the DB every load, never trusted from the session (SPEC.md §11,
  // docs/DECISIONS.md #22) — role AND company access both matter here, since company is
  // what decides which units/sites/bookings this request is even allowed to read.
  const actor = await requireRole([...ROLES]);
  if (!actor) redirect("/login");

  const { company: companyParam, modality: modalityParam } = await searchParams;

  // Hard company scoping: a non-super_admin's companyId is fixed server-side and the
  // `?company=` param is never consulted for them — only super_admin's picker reads it,
  // and even then only to select among companies that actually exist.
  let companyId: number;
  let pickableCompanies: { id: number; name: string }[] = [];
  if (actor.companyAccess.kind === "any") {
    pickableCompanies = await listCompaniesForPicker();
    const requestedId = companyParam ? Number(companyParam) : NaN;
    const requested = pickableCompanies.find((c) => c.id === requestedId);
    companyId = requested?.id ?? pickableCompanies[0]?.id ?? 0;
  } else {
    companyId = actor.companyAccess.companyId;
  }

  const modalities = companyId ? await getModalitiesForCompany(companyId) : [];
  const requestedModality = modalityParam ? modalities.find((m) => m.name.toLowerCase() === modalityParam.toLowerCase()) : undefined;
  const activeModality = requestedModality ?? modalities.find((m) => m.name === "CT") ?? modalities[0];

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
        <div className="flex items-center gap-3">
          {pickableCompanies.length > 0 && (
            <CompanyPicker companies={pickableCompanies} activeCompanyId={companyId} />
          )}
          <UserMenu name={actor.name} role={actor.role} />
        </div>
      </header>

      {!companyId ? (
        <main className="flex flex-1 items-center justify-center bg-[var(--quest-surface-alt)] p-8 text-center text-sm text-[var(--quest-body)]">
          No company configured yet — nothing to show.
        </main>
      ) : !activeModality ? (
        <main className="flex flex-1 items-center justify-center bg-[var(--quest-surface-alt)] p-8 text-center text-sm text-[var(--quest-body)]">
          No modalities configured for this company yet — nothing to show.
        </main>
      ) : (
        <PlannerBody
          companyId={companyId}
          modalityId={activeModality.id}
          modalities={modalities}
          role={actor.role}
        />
      )}
    </div>
  );
}

async function PlannerBody({
  companyId,
  modalityId,
  modalities,
  role,
}: {
  companyId: number;
  modalityId: number;
  modalities: { id: number; name: string }[];
  role: (typeof ROLES)[number];
}) {
  const units = await getActiveUnits(companyId, modalityId);

  // Both the range and the bookings come from the overlay — live TMS bookings merged with our
  // amendments (lib/db/tms/overlay.ts). If TMS is unreachable this throws, and the agreed
  // behaviour is a connection error rather than a stale grid (docs/TMS_WRITE_BACK.md §8).
  //
  // ONLY TmsUnavailableError is caught. Catching everything would turn a bug in our own merge
  // into a "TMS is down" screen — sending people to check the wrong system while the real
  // defect stays hidden. Anything else propagates to error.tsx, as it should.
  let range: { from: string; to: string };
  let overlay: Awaited<ReturnType<typeof getOverlayBookings>>;
  try {
    range = (await getOverlayDateRange(companyId, modalityId)) ?? fallbackRange();
    overlay = await getOverlayBookings(companyId, modalityId, range.from, range.to);
  } catch (err) {
    if (err instanceof TmsUnavailableError) {
      return <TmsUnavailable detail={err.message} />;
    }
    throw err;
  }

  const [statuses, unitSpecs, siteCapabilityRequirements] = await Promise.all([
    getBookingStatuses(),
    getAllUnitSpecs(companyId),
    getAllSiteCapabilityRequirements(companyId),
  ]);
  const days = enumerateDays(range.from, range.to);

  return (
    <div className="min-h-0 flex-1">
      <PlannerGrid
        companyId={companyId}
        modalities={modalities}
        activeModalityId={modalityId}
        units={units}
        days={days}
        bookings={overlay.bookings}
        tmsFetchedAtIso={overlay.fetchedAt.toISOString()}
        statuses={statuses}
        unitSpecs={unitSpecs}
        siteCapabilityRequirements={siteCapabilityRequirements}
        role={role}
      />
    </div>
  );
}
