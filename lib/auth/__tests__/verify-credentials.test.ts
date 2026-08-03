import { describe, it, expect, vi, beforeEach } from "vitest";
import { makeChain } from "@/lib/test-utils/drizzle-chain-mock";

// lib/auth/errors.ts extends next-auth's CredentialsSignin, which transitively imports
// next/server via next-auth/lib/env.js — a module Vitest's Node environment can't resolve
// (it's meant for Next's own bundler). Stub next-auth with a minimal, extendable Error
// subclass so the real error classes in lib/auth/errors.ts still work with `instanceof`.
vi.mock("next-auth", () => ({
  CredentialsSignin: class CredentialsSignin extends Error {
    code = "credentials";
  },
}));

const selectMock = vi.fn();
const insertMock = vi.fn();
const updateMock = vi.fn();

vi.mock("@/lib/db", () => ({
  db: {
    select: (...args: unknown[]) => selectMock(...args),
    insert: (...args: unknown[]) => insertMock(...args),
    update: (...args: unknown[]) => updateMock(...args),
  },
}));

const getTmsUserByUsername = vi.fn();
vi.mock("@/lib/db/mysql-auth", () => ({
  getTmsUserByUsername: (...args: unknown[]) => getTmsUserByUsername(...args),
}));

const bcryptCompare = vi.fn();
vi.mock("bcryptjs", () => ({
  default: { compare: (...args: unknown[]) => bcryptCompare(...args) },
}));

const logLoginSuccess = vi.fn();
const logLoginFailure = vi.fn();
vi.mock("@/lib/audit/security-log", () => ({
  logLoginSuccess: (...args: unknown[]) => logLoginSuccess(...args),
  logLoginFailure: (...args: unknown[]) => logLoginFailure(...args),
}));

import { verifyCredentials } from "@/lib/auth/verify-credentials";
import { RateLimitedError, NoSchedulingAccessError, AccountDeactivatedError, NoCompanyAccessError } from "@/lib/auth/errors";

const baseTmsUser = {
  id: 1,
  username: "bob",
  emailAddress: "bob@example.com",
  passwordDigest: "hashed",
  companyId: 5,
  companyName: "Acme",
  forename: "Bob",
  surname: "Smith",
  permissionGroup: "user",
  schedulingPermissionGroup: null,
  enableSchedulingAccess: true,
};

describe("verifyCredentials", () => {
  beforeEach(() => {
    selectMock.mockReset();
    insertMock.mockReset();
    updateMock.mockReset().mockReturnValue(makeChain(undefined));
    getTmsUserByUsername.mockReset();
    bcryptCompare.mockReset();
    logLoginSuccess.mockReset();
    logLoginFailure.mockReset();
  });

  it("throws RateLimitedError and logs it after too many attempts from the same key", async () => {
    const ip = "1.2.3.4";
    const identifier = `rate-limit-user-${Date.now()}`;
    getTmsUserByUsername.mockResolvedValue(null);
    for (let i = 0; i < 5; i++) {
      await verifyCredentials(identifier, "wrong", ip);
    }
    await expect(verifyCredentials(identifier, "wrong", ip)).rejects.toBeInstanceOf(RateLimitedError);
    expect(logLoginFailure).toHaveBeenCalledWith(expect.objectContaining({ reason: "rate_limited" }));
  });

  it("returns null and logs unknown_identity for a non-existent TMS user", async () => {
    getTmsUserByUsername.mockResolvedValue(null);
    const result = await verifyCredentials("nobody", "pw", "5.5.5.5");
    expect(result).toBeNull();
    expect(logLoginFailure).toHaveBeenCalledWith(expect.objectContaining({ reason: "unknown_identity" }));
  });

  it("returns null and logs invalid_password for an incorrect password", async () => {
    getTmsUserByUsername.mockResolvedValue(baseTmsUser);
    bcryptCompare.mockResolvedValue(false);
    const result = await verifyCredentials("bob", "wrong", "5.5.5.6");
    expect(result).toBeNull();
    expect(logLoginFailure).toHaveBeenCalledWith(expect.objectContaining({ reason: "invalid_password" }));
  });

  it("throws NoSchedulingAccessError for an ordinary user without the scheduling flag", async () => {
    getTmsUserByUsername.mockResolvedValue({ ...baseTmsUser, enableSchedulingAccess: false, permissionGroup: "user" });
    bcryptCompare.mockResolvedValue(true);
    await expect(verifyCredentials("bob", "correct", "5.5.5.7")).rejects.toBeInstanceOf(NoSchedulingAccessError);
    expect(logLoginFailure).toHaveBeenCalledWith(expect.objectContaining({ reason: "no_scheduling_access" }));
  });

  it("throws AccountDeactivatedError for a soft-deleted local user", async () => {
    getTmsUserByUsername.mockResolvedValue(baseTmsUser);
    bcryptCompare.mockResolvedValue(true);
    selectMock.mockReturnValueOnce(
      makeChain([{ id: 10, name: "Bob Smith", email: "bob@example.com", role: "viewer", deletedAt: new Date() }]),
    );
    await expect(verifyCredentials("bob", "correct", "5.5.5.8")).rejects.toBeInstanceOf(AccountDeactivatedError);
    expect(logLoginFailure).toHaveBeenCalledWith(expect.objectContaining({ reason: "account_deactivated", userId: 10 }));
  });

  it("throws NoCompanyAccessError when the user's TMS company has no local match", async () => {
    getTmsUserByUsername.mockResolvedValue(baseTmsUser);
    bcryptCompare.mockResolvedValue(true);
    selectMock
      .mockReturnValueOnce(makeChain([{ id: 11, name: "Bob Smith", email: "bob@example.com", role: "viewer", deletedAt: null }]))
      .mockReturnValueOnce(makeChain([])); // no matching local company

    await expect(verifyCredentials("bob", "correct", "5.5.5.9")).rejects.toBeInstanceOf(NoCompanyAccessError);
    expect(logLoginFailure).toHaveBeenCalledWith(expect.objectContaining({ reason: "no_company_access", userId: 11 }));
  });

  it("logs in an existing user successfully and records logLoginSuccess", async () => {
    getTmsUserByUsername.mockResolvedValue(baseTmsUser);
    bcryptCompare.mockResolvedValue(true);
    selectMock
      .mockReturnValueOnce(makeChain([{ id: 12, name: "Bob Smith", email: "bob@example.com", role: "viewer", deletedAt: null }]))
      .mockReturnValueOnce(makeChain([{ id: 5 }])); // matching local company

    const result = await verifyCredentials("bob", "correct", "5.5.5.10", "Mozilla/5.0");

    expect(result).toEqual({ id: "12", name: "Bob Smith", email: "bob@example.com", role: "viewer" });
    expect(logLoginSuccess).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 12, ipAddress: "5.5.5.10", userAgent: "Mozilla/5.0" }),
    );
  });

  it("logs in a TMS superuser as super_admin without requiring the scheduling flag or company match", async () => {
    getTmsUserByUsername.mockResolvedValue({
      ...baseTmsUser,
      permissionGroup: "superuser",
      enableSchedulingAccess: false,
      companyId: null,
    });
    bcryptCompare.mockResolvedValue(true);
    selectMock.mockReturnValueOnce(makeChain([])); // no existing local user -> provisions one
    insertMock.mockReturnValueOnce(
      makeChain([{ id: 13, name: "Bob Smith", email: "bob@example.com", role: "super_admin" }]),
    );

    const result = await verifyCredentials("bob", "correct", "5.5.5.11");

    expect(result).toEqual({ id: "13", name: "Bob Smith", email: "bob@example.com", role: "super_admin" });
    expect(logLoginSuccess).toHaveBeenCalled();
  });
});
