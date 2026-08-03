import { describe, it, expect, vi, beforeEach } from "vitest";
import { makeChain } from "@/lib/test-utils/drizzle-chain-mock";

const authMock = vi.fn();
vi.mock("@/auth", () => ({
  auth: (...args: unknown[]) => authMock(...args),
}));

const selectMock = vi.fn();
vi.mock("@/lib/db", () => ({
  db: {
    select: (...args: unknown[]) => selectMock(...args),
  },
}));

const getCompanyAccess = vi.fn();
vi.mock("@/lib/auth/company-access", () => ({
  getCompanyAccess: (...args: unknown[]) => getCompanyAccess(...args),
}));

const logUnauthorizedAccess = vi.fn();
vi.mock("@/lib/audit/security-log", () => ({
  logUnauthorizedAccess: (...args: unknown[]) => logUnauthorizedAccess(...args),
}));

import { requireRole } from "@/lib/auth/require-role";

describe("requireRole", () => {
  beforeEach(() => {
    authMock.mockReset();
    selectMock.mockReset();
    getCompanyAccess.mockReset();
    logUnauthorizedAccess.mockReset();
  });

  it("returns null with no session", async () => {
    authMock.mockResolvedValue(null);
    const result = await requireRole(["admin"]);
    expect(result).toBeNull();
    expect(logUnauthorizedAccess).not.toHaveBeenCalled();
  });

  it("returns null when the session user no longer exists (or is deactivated)", async () => {
    authMock.mockResolvedValue({ user: { id: "1" } });
    selectMock.mockReturnValueOnce(makeChain([]));
    const result = await requireRole(["admin"]);
    expect(result).toBeNull();
  });

  it("returns null and logs unauthorized_access when the user's role is not allowed", async () => {
    authMock.mockResolvedValue({ user: { id: "1" } });
    selectMock.mockReturnValueOnce(makeChain([{ id: 1, name: "Viewer", role: "viewer" }]));
    const result = await requireRole(["admin", "super_admin"]);
    expect(result).toBeNull();
    expect(logUnauthorizedAccess).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 1, reason: "wrong_role" }),
    );
    expect(getCompanyAccess).not.toHaveBeenCalled();
  });

  it("returns null and logs unauthorized_access when company access cannot be resolved", async () => {
    authMock.mockResolvedValue({ user: { id: "1" } });
    selectMock.mockReturnValueOnce(makeChain([{ id: 1, name: "Admin", role: "admin" }]));
    getCompanyAccess.mockResolvedValue(null);
    const result = await requireRole(["admin"]);
    expect(result).toBeNull();
    expect(logUnauthorizedAccess).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 1, reason: "no_company_access" }),
    );
  });

  it("returns the authed user when role and company access both check out", async () => {
    authMock.mockResolvedValue({ user: { id: "1" } });
    selectMock.mockReturnValueOnce(makeChain([{ id: 1, name: "Admin", role: "admin" }]));
    getCompanyAccess.mockResolvedValue({ kind: "any" });
    const result = await requireRole(["admin"]);
    expect(result).toEqual({ id: 1, name: "Admin", role: "admin", companyAccess: { kind: "any" } });
    expect(logUnauthorizedAccess).not.toHaveBeenCalled();
  });
});
