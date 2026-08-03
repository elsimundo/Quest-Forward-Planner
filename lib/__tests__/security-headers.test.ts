import { describe, it, expect, afterEach, vi } from "vitest";
import { NextResponse } from "next/server";
import { applySecurityHeaders } from "@/lib/security/headers";

describe("applySecurityHeaders", () => {
  const originalEnv = process.env.NODE_ENV;

  afterEach(() => {
    vi.stubEnv("NODE_ENV", originalEnv ?? "test");
  });

  it("applies the full ISO 27001 header set", () => {
    const res = applySecurityHeaders(NextResponse.next());

    expect(res.headers.get("X-Frame-Options")).toBe("DENY");
    expect(res.headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect(res.headers.get("X-XSS-Protection")).toBe("1; mode=block");
    expect(res.headers.get("Referrer-Policy")).toBe("strict-origin-when-cross-origin");
    expect(res.headers.get("Content-Security-Policy")).toContain("default-src 'self'");
    expect(res.headers.get("Permissions-Policy")).toContain("camera=()");
  });

  it("only sets Strict-Transport-Security in production", () => {
    vi.stubEnv("NODE_ENV", "development");
    const devRes = applySecurityHeaders(NextResponse.next());
    expect(devRes.headers.get("Strict-Transport-Security")).toBeNull();

    vi.stubEnv("NODE_ENV", "production");
    const prodRes = applySecurityHeaders(NextResponse.next());
    expect(prodRes.headers.get("Strict-Transport-Security")).toContain("max-age=31536000");
  });
});
