import { describe, it, expect, vi, afterEach } from "vitest";
import { checkLoginRateLimit } from "@/lib/auth/rate-limit";

describe("checkLoginRateLimit", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("allows the first request in a window", () => {
    const result = checkLoginRateLimit("test:first-request");
    expect(result.allowed).toBe(true);
  });

  it("allows requests up to the limit (5 attempts)", () => {
    const key = "test:up-to-limit";
    for (let i = 0; i < 5; i++) {
      expect(checkLoginRateLimit(key).allowed).toBe(true);
    }
  });

  it("denies the 6th request within the window", () => {
    const key = "test:sixth-request";
    for (let i = 0; i < 5; i++) checkLoginRateLimit(key);
    const result = checkLoginRateLimit(key);
    expect(result.allowed).toBe(false);
    expect(result.retryAfterSeconds).toBeGreaterThan(0);
  });

  it("gives independent buckets to different keys", () => {
    const keyA = "test:bucket-a";
    const keyB = "test:bucket-b";
    for (let i = 0; i < 5; i++) checkLoginRateLimit(keyA);
    expect(checkLoginRateLimit(keyA).allowed).toBe(false);
    expect(checkLoginRateLimit(keyB).allowed).toBe(true);
  });

  it("resets the counter after the window expires", () => {
    vi.useFakeTimers();
    const key = "test:window-reset";
    for (let i = 0; i < 5; i++) checkLoginRateLimit(key);
    expect(checkLoginRateLimit(key).allowed).toBe(false);

    vi.advanceTimersByTime(15 * 60 * 1000 + 1000);

    expect(checkLoginRateLimit(key).allowed).toBe(true);
  });
});
