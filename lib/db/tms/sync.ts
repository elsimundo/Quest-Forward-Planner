import { and, eq, inArray, isNotNull, isNull, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { companies, units, unitModalities, modalities, sites, tmsSyncRuns } from "@/lib/db/schema";
import { listSchedulingEnabledTmsCompanies, listTmsLocations, listTmsUnits, type TmsCompany } from "./queries";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

type EntityCounts = { added: number; updated: number; removed: number };

export type TmsSyncSummary = {
  companies: EntityCounts;
  units: EntityCounts;
  sites: EntityCounts;
  // Additive-only, deliberately — see the comment in syncUnits on why a tag TMS doesn't
  // have is never auto-removed.
  unitModalities: { added: number };
};

function emptyCounts(): EntityCounts {
  return { added: 0, updated: 0, removed: 0 };
}

// A pull that's suspiciously smaller than what we already have almost certainly means a
// transient TMS query problem, not "InHealth deleted most of its fleet/site list" — abort
// rather than mass soft-delete. Only guards once there's a meaningful baseline (a handful
// of rows), so the very first sync (starting from zero) is never blocked by it.
function assertNotSuspiciousShrink(entity: string, previousActiveCount: number, freshCount: number) {
  if (previousActiveCount > 5 && freshCount < previousActiveCount * 0.5) {
    throw new Error(
      `TMS returned ${freshCount} ${entity}, down from ${previousActiveCount} previously synced — ` +
        `aborting rather than mass soft-deleting. Check the TMS connection before retrying.`,
    );
  }
}

async function syncCompany(tx: Tx, tmsCompany: TmsCompany, now: Date, result: TmsSyncSummary): Promise<number> {
  const [byTmsId] = await tx.select().from(companies).where(eq(companies.tmsCompanyId, tmsCompany.id)).limit(1);
  if (byTmsId) {
    if (byTmsId.name !== tmsCompany.name) {
      await tx.update(companies).set({ name: tmsCompany.name, tmsSyncedAt: now }).where(eq(companies.id, byTmsId.id));
      result.companies.updated++;
    } else {
      await tx.update(companies).set({ tmsSyncedAt: now }).where(eq(companies.id, byTmsId.id));
    }
    return byTmsId.id;
  }

  // First sync run for a company migration 0006 pre-seeded a placeholder row for (InHealth,
  // at launch): link by "the one row with no tms_company_id yet" rather than matching on
  // name — TMS's own company_name ("Inhealth") and our seed ("InHealth") don't agree on
  // casing, so a name match is exactly the kind of fragile heuristic that creates a
  // duplicate company the moment they drift even slightly. Any genuinely NEW company (one
  // Quest switches on scheduling for later) has no local placeholder at all and falls
  // straight through to the insert below — this branch only ever matters once, for the
  // original seed. If more than one unlinked row exists, that's a real anomaly worth
  // failing loudly on rather than guessing which company it belongs to.
  const unlinked = await tx.select().from(companies).where(isNull(companies.tmsCompanyId));
  if (unlinked.length > 1) {
    throw new Error(
      `${unlinked.length} local companies have no tms_company_id — can't tell which TMS company each belongs to. Link them manually before syncing.`,
    );
  }
  if (unlinked.length === 1) {
    await tx.update(companies).set({ name: tmsCompany.name, tmsCompanyId: tmsCompany.id, tmsSyncedAt: now }).where(eq(companies.id, unlinked[0].id));
    result.companies.updated++;
    return unlinked[0].id;
  }

  const [created] = await tx
    .insert(companies)
    .values({ name: tmsCompany.name, tmsCompanyId: tmsCompany.id, tmsSyncedAt: now })
    .returning({ id: companies.id });
  result.companies.added++;
  return created.id;
}

async function syncSites(tx: Tx, companyId: number, tmsCompanyId: number, now: Date, result: TmsSyncSummary) {
  const tmsLocations = await listTmsLocations(tmsCompanyId);

  const localSynced = await tx
    .select({ id: sites.id, tmsLocationId: sites.tmsLocationId, deletedAt: sites.deletedAt })
    .from(sites)
    .where(and(eq(sites.companyId, companyId), isNotNull(sites.tmsLocationId)));
  const previousActiveCount = localSynced.filter((s) => !s.deletedAt).length;
  assertNotSuspiciousShrink("locations", previousActiveCount, tmsLocations.length);

  const tmsIds = new Set(tmsLocations.map((l) => l.id));

  for (const loc of tmsLocations) {
    const [existing] = await tx.select().from(sites).where(eq(sites.tmsLocationId, loc.id)).limit(1);
    if (existing) {
      const changed =
        existing.name !== loc.name ||
        existing.town !== loc.town ||
        existing.postcode !== loc.postcode ||
        existing.nominalCode !== loc.nominalCode ||
        existing.deletedAt !== null;
      if (changed) {
        await tx
          .update(sites)
          .set({ name: loc.name, town: loc.town, postcode: loc.postcode, nominalCode: loc.nominalCode, deletedAt: null, tmsSyncedAt: now })
          .where(eq(sites.id, existing.id));
        result.sites.updated++;
      } else {
        await tx.update(sites).set({ tmsSyncedAt: now }).where(eq(sites.id, existing.id));
      }
      continue;
    }

    // `sites.name` is unique within a company (docs/DECISIONS.md #11), and an exact name
    // match against an unlinked local site IN THE SAME COMPANY (e.g. from the pre-TMS Excel
    // migration) is almost certainly the same real place entered twice — link it rather
    // than crashing on the unique constraint or, worse, silently skipping a real TMS
    // location. Deliberately exact/case-sensitive: this is NOT the fuzzy LHC/LCS-style
    // matching the client waived (docs/TMS_INTEGRATION_PLAN.md §5) — that needs a human; an
    // exact match here doesn't.
    const [unlinkedMatch] = await tx
      .select()
      .from(sites)
      .where(and(eq(sites.name, loc.name), eq(sites.companyId, companyId), isNull(sites.tmsLocationId)))
      .limit(1);
    if (unlinkedMatch) {
      await tx
        .update(sites)
        .set({ tmsLocationId: loc.id, town: loc.town, postcode: loc.postcode, nominalCode: loc.nominalCode, deletedAt: null, tmsSyncedAt: now })
        .where(eq(sites.id, unlinkedMatch.id));
      result.sites.updated++;
      continue;
    }

    await tx.insert(sites).values({
      name: loc.name,
      companyId,
      tmsLocationId: loc.id,
      town: loc.town,
      postcode: loc.postcode,
      nominalCode: loc.nominalCode,
      tmsSyncedAt: now,
    });
    result.sites.added++;
  }

  const toSoftDelete = localSynced.filter((s) => !s.deletedAt && s.tmsLocationId !== null && !tmsIds.has(s.tmsLocationId));
  if (toSoftDelete.length) {
    await tx
      .update(sites)
      .set({ deletedAt: now })
      .where(inArray(sites.id, toSoftDelete.map((s) => s.id)));
    result.sites.removed += toSoftDelete.length;
  }
}

async function ensureModality(tx: Tx, cache: Map<string, number>, name: string): Promise<number> {
  const cached = cache.get(name);
  if (cached) return cached;

  const [existing] = await tx.select({ id: modalities.id }).from(modalities).where(eq(modalities.name, name)).limit(1);
  if (existing) {
    cache.set(name, existing.id);
    return existing.id;
  }

  const [{ max }] = await tx.select({ max: sql<number>`coalesce(max(${modalities.displayOrder}), -1)` }).from(modalities);
  const [created] = await tx.insert(modalities).values({ name, displayOrder: Number(max) + 1 }).returning({ id: modalities.id });
  cache.set(name, created.id);
  return created.id;
}

async function syncUnits(tx: Tx, companyId: number, tmsCompanyId: number, now: Date, result: TmsSyncSummary) {
  const tmsUnits = await listTmsUnits(tmsCompanyId);

  const localSynced = await tx
    .select({ id: units.id, tmsUnitId: units.tmsUnitId, deletedAt: units.deletedAt })
    .from(units)
    .where(and(eq(units.companyId, companyId), isNotNull(units.tmsUnitId)));
  const previousActiveCount = localSynced.filter((u) => !u.deletedAt).length;
  assertNotSuspiciousShrink("units", previousActiveCount, tmsUnits.length);

  const tmsIds = new Set(tmsUnits.map((u) => u.id));
  const modalityIdCache = new Map<string, number>();

  const [{ max }] = await tx
    .select({ max: sql<number>`coalesce(max(${units.displayOrder}), -1)` })
    .from(units)
    .where(eq(units.companyId, companyId));
  let nextDisplayOrder = Number(max) + 1;

  for (const tu of tmsUnits) {
    let localUnitId: number;
    const [existing] = await tx.select().from(units).where(eq(units.tmsUnitId, tu.id)).limit(1);
    if (existing) {
      localUnitId = existing.id;
      const changed = existing.registration !== tu.registration || existing.deletedAt !== null;
      if (changed) {
        await tx.update(units).set({ registration: tu.registration, deletedAt: null, tmsSyncedAt: now }).where(eq(units.id, existing.id));
        result.units.updated++;
      } else {
        await tx.update(units).set({ tmsSyncedAt: now }).where(eq(units.id, existing.id));
      }
    } else {
      // A registration match against an unlinked local unit (same company, no tmsUnitId
      // yet) is almost certainly the same physical scanner entered twice — once via the
      // pre-TMS Excel migration, once in TMS — not a coincidence. Link it rather than
      // colliding with `units_company_registration_live_unique` or duplicating the unit.
      const [unlinkedMatch] = await tx
        .select()
        .from(units)
        .where(and(eq(units.registration, tu.registration), eq(units.companyId, companyId), isNull(units.tmsUnitId)))
        .limit(1);
      if (unlinkedMatch) {
        await tx
          .update(units)
          .set({ tmsUnitId: tu.id, deletedAt: null, tmsSyncedAt: now })
          .where(eq(units.id, unlinkedMatch.id));
        localUnitId = unlinkedMatch.id;
        result.units.updated++;
      } else {
        const [created] = await tx
          .insert(units)
          .values({
            companyId,
            registration: tu.registration,
            tmsUnitId: tu.id,
            displayOrder: nextDisplayOrder++,
            active: true,
            tmsSyncedAt: now,
          })
          .returning({ id: units.id });
        localUnitId = created.id;
        result.units.added++;
      }
    }

    // Add any modality tag TMS has that we don't — never remove one TMS doesn't have.
    // Deliberately additive-only: a real first run of this sync removed InHealth's
    // unit_modalities tag for RCT27 (which TMS doesn't currently have tagged at all) and
    // would have dropped it off the CT sheet entirely despite 730 live bookings on it —
    // TMS's tagging is confirmed incomplete/in-progress ("Quest is fixing the tagging in
    // TMS now"), so treating an absence there as authoritative is actively dangerous.
    // Removing a stale tag, if ever needed, is a job for a human on an admin screen, not
    // an unattended nightly sync.
    const wantedModalityIds = new Set<number>();
    for (const name of tu.modalityNames) wantedModalityIds.add(await ensureModality(tx, modalityIdCache, name));

    const currentTags = await tx
      .select({ id: unitModalities.id, modalityId: unitModalities.modalityId })
      .from(unitModalities)
      .where(eq(unitModalities.unitId, localUnitId));
    const currentModalityIds = new Set(currentTags.map((t) => t.modalityId));

    const toAdd = [...wantedModalityIds].filter((id) => !currentModalityIds.has(id));
    if (toAdd.length) {
      await tx.insert(unitModalities).values(toAdd.map((modalityId) => ({ unitId: localUnitId, modalityId })));
      result.unitModalities.added += toAdd.length;
    }
  }

  const toSoftDelete = localSynced.filter((u) => !u.deletedAt && u.tmsUnitId !== null && !tmsIds.has(u.tmsUnitId));
  if (toSoftDelete.length) {
    await tx
      .update(units)
      .set({ deletedAt: now })
      .where(inArray(units.id, toSoftDelete.map((u) => u.id)));
    result.units.removed += toSoftDelete.length;
  }
}

// The read-only reference sync (docs/TMS_INTEGRATION_PLAN.md §6A, §11) — companies, sites
// (TMS locations), units, and unit_modalities, for every TMS company with scheduling
// switched on (not just InHealth — Quest can enable more over time with no app change).
// Each company is synced independently within the same transaction; nothing here ever
// blends two companies' rows together (docs/DECISIONS.md #22). Never touches bookings
// (§6B, a separate step) and never writes to TMS (lib/db/tms/queries.ts is SELECT-only).
// Runs the diff-and-apply in one transaction so a failure partway through can't leave the
// mirror half-updated; the run's outcome is always recorded in `tms_sync_runs`, including
// on failure, so a bad run is visible rather than silent.
export async function runTmsSync(triggeredBy: number | null): Promise<{ runId: number; summary: TmsSyncSummary }> {
  const [run] = await db.insert(tmsSyncRuns).values({ status: "running", triggeredBy }).returning({ id: tmsSyncRuns.id });

  try {
    const summary: TmsSyncSummary = {
      companies: emptyCounts(),
      units: emptyCounts(),
      sites: emptyCounts(),
      unitModalities: { added: 0 },
    };

    const tmsCompanies = await listSchedulingEnabledTmsCompanies();

    await db.transaction(async (tx) => {
      const now = new Date();
      for (const tmsCompany of tmsCompanies) {
        const companyId = await syncCompany(tx, tmsCompany, now, summary);
        await syncSites(tx, companyId, tmsCompany.id, now, summary);
        await syncUnits(tx, companyId, tmsCompany.id, now, summary);
      }
    });

    await db
      .update(tmsSyncRuns)
      .set({ status: "success", finishedAt: new Date(), summary })
      .where(eq(tmsSyncRuns.id, run.id));

    return { runId: run.id, summary };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await db.update(tmsSyncRuns).set({ status: "error", finishedAt: new Date(), error: message }).where(eq(tmsSyncRuns.id, run.id));
    throw err;
  }
}
