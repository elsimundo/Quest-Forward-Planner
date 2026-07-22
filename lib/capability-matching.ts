// SPEC.md §2a. requirement_key vocabulary isn't fixed anywhere yet — the admin page that
// creates site_capability_requirements rows (slice 7) doesn't exist, so this has never
// been exercised against real data. Matching is case-insensitive/whitespace-normalised
// against unit_specs keys (which are raw text from the source spreadsheet, e.g. "Cardiac",
// "Mako approved") — whoever sets requirement keys via the admin page needs to use text
// that matches a unit_specs key this way for the check to actually fire.
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
  unitId: string,
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
        message: `${siteName} requires ${req.requirementKey} — ${unitId} is not.`,
      });
    }
  }
  return warnings;
}
