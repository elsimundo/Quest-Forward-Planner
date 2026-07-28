// SPEC.md §2a. Matching is case-insensitive/whitespace-normalised between a site's
// requirement_key and a unit_specs key, so whoever sets requirement keys via
// /admin/site-requirements has to use text that lines up with a unit_specs key for the
// check to fire at all.
//
// ⚠️ This currently never fires, because BOTH inputs are empty. `unit_specs` was only ever
// populated from the Excel workbook's "CT inventory checklist" tab, which was purged on
// 2026-07-28 (docs/DECISIONS.md #27), and nothing can refill it: TMS holds no capability
// data (requires_special_access is 0, special_access_details empty, and
// customer_unit_type_id null on all 147 live InHealth units), and no admin UI writes
// unit_specs. `site_capability_requirements` has an admin UI but zero rows.
//
// Keep this code — the feature is client-approved and modality-generic — but don't assume
// it's exercised, and don't seed fake specs to make it light up. Where capability data
// should come from is an open client question (docs/DATABASE.md, `unit_specs`).
export type CapabilityWarning = { requirementKey: string; message: string };

function normaliseKey(key: string): string {
  return key.trim().toLowerCase();
}

function specSatisfies(value: string | undefined): boolean {
  if (!value) return false;
  const v = value.trim().toLowerCase();
  if (!v || v === "n" || v === "no" || v === "n/a") return false;
  return true;
}

export function computeCapabilityWarnings(
  requirements: { requirementKey: string; required: boolean }[],
  unitSpecs: Record<string, string>,
  // Display label only (the unit's registration, e.g. "CT17") — units are keyed by a
  // numeric surrogate id now (docs/TMS_INTEGRATION_PLAN.md §4.1), and unitSpecs is already
  // resolved by the caller, so this is purely for the warning message text.
  unitLabel: string,
  siteName: string,
): CapabilityWarning[] {
  const normalisedSpecs = new Map<string, string>();
  for (const [key, value] of Object.entries(unitSpecs)) normalisedSpecs.set(normaliseKey(key), value);

  const warnings: CapabilityWarning[] = [];
  for (const req of requirements) {
    if (!req.required) continue;
    const value = normalisedSpecs.get(normaliseKey(req.requirementKey));
    if (!specSatisfies(value)) {
      warnings.push({
        requirementKey: req.requirementKey,
        message: `${siteName} requires ${req.requirementKey} — ${unitLabel} is not.`,
      });
    }
  }
  return warnings;
}
