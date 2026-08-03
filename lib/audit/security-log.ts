import { db } from "@/lib/db";
import { securityEvents, type SecurityEventAction, type SecurityEventStatus } from "@/lib/db/schema";

export type SecurityEventInput = {
  userId?: number | null;
  identifier?: string | null;
  action: SecurityEventAction;
  status: SecurityEventStatus;
  reason?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  details?: Record<string, unknown> | null;
};

// Best-effort, per docs/ISO-27001-TESTING-AUDITING-GUIDE.md §5.4 — a failure to write an
// audit row must never block or fail the caller's actual request (login, access check).
// The only cost of a dropped audit row is a compliance gap, not an outage; the reverse
// (an outage caused by the audit log) would be worse.
export async function logSecurityEvent(event: SecurityEventInput): Promise<void> {
  try {
    await db.insert(securityEvents).values({
      userId: event.userId ?? null,
      identifier: event.identifier ?? null,
      action: event.action,
      status: event.status,
      reason: event.reason ?? null,
      ipAddress: event.ipAddress ?? null,
      userAgent: event.userAgent ?? null,
      details: event.details ?? null,
    });
  } catch (error) {
    console.error("[SECURITY_LOG] Failed to write security event:", error);
  }
}

export function logLoginSuccess(params: { userId: number; identifier: string; ipAddress: string; userAgent?: string | null }): Promise<void> {
  return logSecurityEvent({
    userId: params.userId,
    identifier: params.identifier,
    action: "login",
    status: "success",
    ipAddress: params.ipAddress,
    userAgent: params.userAgent,
  });
}

export function logLoginFailure(params: {
  identifier: string;
  reason: string;
  ipAddress: string;
  userAgent?: string | null;
  userId?: number | null;
}): Promise<void> {
  return logSecurityEvent({
    userId: params.userId ?? null,
    identifier: params.identifier,
    action: "login",
    status: "failure",
    reason: params.reason,
    ipAddress: params.ipAddress,
    userAgent: params.userAgent,
  });
}

// Fire-and-forget (deliberately not awaited/async) so it can be dropped into a
// `companyAllowed` denial branch — including inside `.some()` predicates — without
// changing the calling code's control flow or making it async. Best-effort logging must
// never slow down or restructure the actual authorization check (see logSecurityEvent).
export function logCompanyAccessDenied(params: { userId: number; requestedCompanyId: number; resource: string }): void {
  void logUnauthorizedAccess({
    userId: params.userId,
    reason: "cross_company_access",
    details: { resource: params.resource, requestedCompanyId: params.requestedCompanyId },
  });
}

export function logUnauthorizedAccess(params: {
  userId?: number | null;
  identifier?: string | null;
  reason: string;
  ipAddress?: string | null;
  userAgent?: string | null;
  details?: Record<string, unknown> | null;
}): Promise<void> {
  return logSecurityEvent({
    userId: params.userId ?? null,
    identifier: params.identifier ?? null,
    action: "unauthorized_access",
    status: "failure",
    reason: params.reason,
    ipAddress: params.ipAddress ?? null,
    userAgent: params.userAgent ?? null,
    details: params.details ?? null,
  });
}
