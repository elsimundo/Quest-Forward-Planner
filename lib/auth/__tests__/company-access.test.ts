import { describe, it, expect, vi, beforeEach } from "vitest";
import { makeChain } from "@/lib/test-utils/drizzle-chain-mock";

const selectMock = vi.fn();

vi.mock("@/lib/db", () => ({
  db: {
    select: (...args: unknown[]) => selectMock(...args),
  },
}));

import { getCompanyAccess, companyAllowed } from "@/lib/auth/company-access";

describe("getCompanyAccess", () => {
  beforeEach(() => {
    selectMock.mockReset();
  });

  it("grants {kind: 'any'} to a super_admin without querying company scoping", async () => {
    const result = await getCompanyAccess(1, "super_admin");
    expect(result).toEqual({ kind: "any" });
    expect(selectMock).not.toHaveBeenCalled();
  });

  it("returns null when the user row cannot be found", async () => {
    selectMock.mockReturnValueOnce(makeChain([]));
    const result = await getCompanyAccess(999, "viewer");
    expect(result).toBeNull();
  });

  it("grants {kind: 'any'} to a user with no TMS company (Quest internal staff)", async () => {
    selectMock.mockReturnValueOnce(makeChain([{ tmsCompanyId: null }]));
    const result = await getCompanyAccess(2, "viewer");
    expect(result).toEqual({ kind: "any" });
  });

  it("grants {kind: 'fixed', companyId} when a matching local company exists", async () => {
    selectMock.mockReturnValueOnce(makeChain([{ tmsCompanyId: 7 }])).mockReturnValueOnce(makeChain([{ id: 42 }]));
    const result = await getCompanyAccess(3, "scheduler");
    expect(result).toEqual({ kind: "fixed", companyId: 42 });
  });

  it("returns null when the user's TMS company has no local match", async () => {
    selectMock.mockReturnValueOnce(makeChain([{ tmsCompanyId: 7 }])).mockReturnValueOnce(makeChain([]));
    const result = await getCompanyAccess(3, "scheduler");
    expect(result).toBeNull();
  });
});

describe("companyAllowed", () => {
  it("allows any company when access is {kind: 'any'}", () => {
    expect(companyAllowed({ kind: "any" }, 1)).toBe(true);
    expect(companyAllowed({ kind: "any" }, 999)).toBe(true);
  });

  it("allows only the matching company when access is {kind: 'fixed'}", () => {
    expect(companyAllowed({ kind: "fixed", companyId: 5 }, 5)).toBe(true);
    expect(companyAllowed({ kind: "fixed", companyId: 5 }, 6)).toBe(false);
  });
});
