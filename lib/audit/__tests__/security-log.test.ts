import { describe, it, expect, vi, beforeEach } from "vitest";

const insertMock = vi.fn();
const valuesMock = vi.fn();

vi.mock("@/lib/db", () => ({
  db: {
    insert: (...args: unknown[]) => {
      insertMock(...args);
      return { values: (...valuesArgs: unknown[]) => valuesMock(...valuesArgs) };
    },
  },
}));

import { logSecurityEvent, logLoginSuccess, logLoginFailure, logUnauthorizedAccess, logCompanyAccessDenied } from "@/lib/audit/security-log";
import { securityEvents } from "@/lib/db/schema";

describe("logSecurityEvent", () => {
  beforeEach(() => {
    insertMock.mockReset();
    valuesMock.mockReset().mockResolvedValue(undefined);
  });

  it("inserts a row into securityEvents with defaults for optional fields", async () => {
    await logSecurityEvent({ action: "login", status: "success", identifier: "alice" });

    expect(insertMock).toHaveBeenCalledWith(securityEvents);
    expect(valuesMock).toHaveBeenCalledWith({
      userId: null,
      identifier: "alice",
      action: "login",
      status: "success",
      reason: null,
      ipAddress: null,
      userAgent: null,
      details: null,
    });
  });

  it("does not throw when the insert fails (best-effort logging)", async () => {
    valuesMock.mockRejectedValueOnce(new Error("db down"));
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    await expect(logSecurityEvent({ action: "login", status: "failure" })).resolves.toBeUndefined();
    expect(consoleSpy).toHaveBeenCalled();

    consoleSpy.mockRestore();
  });
});

describe("logLoginSuccess", () => {
  beforeEach(() => {
    insertMock.mockReset();
    valuesMock.mockReset().mockResolvedValue(undefined);
  });

  it("records a successful login with action=login, status=success", async () => {
    await logLoginSuccess({ userId: 7, identifier: "bob@example.com", ipAddress: "10.0.0.1" });
    expect(valuesMock).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 7, action: "login", status: "success", ipAddress: "10.0.0.1" }),
    );
  });
});

describe("logLoginFailure", () => {
  beforeEach(() => {
    insertMock.mockReset();
    valuesMock.mockReset().mockResolvedValue(undefined);
  });

  it("records a failed login with the given reason", async () => {
    await logLoginFailure({ identifier: "bob@example.com", reason: "invalid_password", ipAddress: "10.0.0.1" });
    expect(valuesMock).toHaveBeenCalledWith(
      expect.objectContaining({ action: "login", status: "failure", reason: "invalid_password" }),
    );
  });
});

describe("logUnauthorizedAccess", () => {
  beforeEach(() => {
    insertMock.mockReset();
    valuesMock.mockReset().mockResolvedValue(undefined);
  });

  it("records action=unauthorized_access, status=failure", async () => {
    await logUnauthorizedAccess({ userId: 3, reason: "wrong_role", details: { requiredOneOf: ["admin"] } });
    expect(valuesMock).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 3,
        action: "unauthorized_access",
        status: "failure",
        reason: "wrong_role",
        details: { requiredOneOf: ["admin"] },
      }),
    );
  });
});

describe("logCompanyAccessDenied", () => {
  beforeEach(() => {
    insertMock.mockReset();
    valuesMock.mockReset().mockResolvedValue(undefined);
  });

  it("fires off an unauthorized_access event with the requested company and resource, without being awaited", () => {
    logCompanyAccessDenied({ userId: 9, requestedCompanyId: 42, resource: "booking" });
    // Deliberately not awaited by the caller — but the underlying insert should still fire.
    expect(valuesMock).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 9,
        action: "unauthorized_access",
        status: "failure",
        reason: "cross_company_access",
        details: { resource: "booking", requestedCompanyId: 42 },
      }),
    );
  });
});
