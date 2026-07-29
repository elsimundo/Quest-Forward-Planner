// Shared between the client (planner-grid.tsx, using already-loaded OverlayBooking data for
// the pre-flight preview) and the server (lib/actions/publish.ts, the real gate at commit
// time). One function, one set of reasons — the same guarantee A1 established for
// `publishable`: the preview and the gate read the same logic, so what the dialog promises
// is what the server actually does. No DB or server-only imports here, so the client can
// import this file directly.

export type PublishExclusionReason =
  | "already-published"
  | "not-a-planner-change"
  | "not-publishable-status"
  | "tms-conflict"
  | "tms-supersedes";

export const PUBLISH_EXCLUSION_LABEL: Record<PublishExclusionReason, string> = {
  "already-published": "Already published",
  // Reached only from an explicit multi-select (docs/DECISIONS.md #29) — the range sweep in
  // planner-grid.tsx filters these out before they ever reach classification, so this label
  // is never seen there. Deliberately calm wording: nothing is wrong, there's just nothing
  // for this dialog to do with a booking the planner never touched.
  "not-a-planner-change": "Already matches TMS — nothing to send",
  "not-publishable-status": "Not yet Confirmed",
  "tms-conflict": "Unresolved TMS conflict — edit and save to resolve",
  "tms-supersedes": "TMS has updated this since — open it to resolve",
};

export type PublishClassifiable = {
  status: string;
  publishedAt: Date | null;
  tmsConflictAt: Date | null;
  tmsSupersedes: boolean;
};

export type PublishClassification =
  | { eligible: true }
  | { eligible: false; reason: PublishExclusionReason };

// Order matters for a booking that's excluded for more than one reason at once — the FIRST
// reason found is the one shown. tmsSupersedes is checked ahead of status: a booking sitting
// in Confirmed that TMS has since changed is a supersede problem, not a status problem, and
// telling the scheduler the wrong thing sends them to fix the wrong field.
export function classifyForPublish(b: PublishClassifiable, publishableKeys: Set<string>): PublishClassification {
  if (b.publishedAt) return { eligible: false, reason: "already-published" };
  if (b.tmsConflictAt) return { eligible: false, reason: "tms-conflict" };
  if (b.tmsSupersedes) return { eligible: false, reason: "tms-supersedes" };
  if (!publishableKeys.has(b.status)) return { eligible: false, reason: "not-publishable-status" };
  return { eligible: true };
}
