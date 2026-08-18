// Shared between the client (planner-grid.tsx, using already-loaded OverlayBooking data for
// the pre-flight preview) and the server (lib/actions/publish.ts, the real gate at commit
// time). One function, one set of reasons — the same guarantee A1 established for
// `publishable`: the preview and the gate read the same logic, so what the dialog promises
// is what the server actually does. No DB or server-only imports here, so the client can
// import this file directly.

export type PublishExclusionReason =
  | "already-published"
  | "changed-since-preflight"
  | "not-a-planner-change"
  | "not-publishable-status"
  | "tms-conflict"
  | "tms-collision"
  | "tms-supersedes";

export const PUBLISH_EXCLUSION_LABEL: Record<PublishExclusionReason, string> = {
  "already-published": "Already published",
  // The server re-read this row and found its updated_at no longer matches what the client
  // last preflighted against (lib/actions/publish.ts) — someone else edited it in the gap
  // between opening the publish sheet and hitting Publish. Every other reason below is
  // re-derived fresh from the DB at publish time and is still CORRECT even for a stale row —
  // this one exists so the scheduler knows to re-read the row rather than trust what they
  // reviewed a moment ago.
  "changed-since-preflight": "Changed since you opened this — review before publishing",
  // Reached only from an explicit multi-select (docs/DECISIONS.md #29) — the range sweep in
  // planner-grid.tsx filters these out before they ever reach classification, so this label
  // is never seen there. Deliberately calm wording: nothing is wrong, there's just nothing
  // for this dialog to do with a booking the planner never touched.
  "not-a-planner-change": "Already matches TMS — nothing to send",
  "not-publishable-status": "Not yet Confirmed",
  "tms-conflict": "Unresolved TMS conflict — edit and save to resolve",
  "tms-collision": "TMS has a different booking here — move or clear one first",
  "tms-supersedes": "TMS has updated this since — open it to resolve",
};

export type PublishClassifiable = {
  status: string;
  publishedAt: Date | null;
  tmsConflictAt: Date | null;
  tmsSupersedes: boolean;
  // Only truthiness matters here — the label/detail live on OverlayBooking.tmsCollision,
  // this file stays decoupled from that type (see the note above).
  tmsCollision: boolean;
  // Only ever true server-side (lib/actions/publish.ts, comparing the target's captured
  // expectedUpdatedAt against a fresh DB read). The client-side preview has no "expected vs.
  // actual" gap to detect — it always passes false.
  staleSincePreflight: boolean;
};

export type PublishClassification =
  | { eligible: true }
  | { eligible: false; reason: PublishExclusionReason };

// Order matters for a booking that's excluded for more than one reason at once — the FIRST
// reason found is the one shown. changedSincePreflight is checked right after already-published
// (the one "routine, don't alarm anyone" case) and BEFORE every other reason, because those
// other reasons are all facts re-derived fresh from the DB/TMS cache at publish time — correct,
// but potentially describing a version of the row the scheduler never reviewed. tmsCollision is
// checked ahead of tmsSupersedes: a collision means two DIFFERENT bookings want this slot (no
// shared lineage to reconcile), which is a more fundamental problem than "TMS updated a booking
// we already amended" — and ahead of status, for the same reason tmsSupersedes already was:
// telling the scheduler the wrong thing sends them to fix the wrong field.
export function classifyForPublish(b: PublishClassifiable, publishableKeys: Set<string>): PublishClassification {
  if (b.publishedAt) return { eligible: false, reason: "already-published" };
  if (b.staleSincePreflight) return { eligible: false, reason: "changed-since-preflight" };
  if (b.tmsConflictAt) return { eligible: false, reason: "tms-conflict" };
  if (b.tmsCollision) return { eligible: false, reason: "tms-collision" };
  if (b.tmsSupersedes) return { eligible: false, reason: "tms-supersedes" };
  if (!publishableKeys.has(b.status)) return { eligible: false, reason: "not-publishable-status" };
  return { eligible: true };
}
