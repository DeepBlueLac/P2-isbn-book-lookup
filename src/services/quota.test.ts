import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

import {
  canStartDownload,
  commitDownloadQuota,
  downloadRetryKey,
  resolveQuota,
  toQuotaSnapshot,
} from "./quota";

const originalEnv = { ...process.env };

function request(cookie?: string) {
  return new NextRequest("https://books.bulidoge.site/api/quota", {
    headers: cookie ? { cookie } : undefined,
  });
}

beforeEach(() => {
  process.env.SHELFMARK_QUOTA_SECRET = "test-quota-secret";
});

afterEach(() => {
  vi.unstubAllGlobals();
  process.env = { ...originalEnv };
});

describe("download quota", () => {
  it("creates a guest quota subject with three daily downloads", async () => {
    const resolved = await resolveQuota(request());
    expect(resolved.subject.kind).toBe("guest");
    expect(resolved.subject.dailyDownloads).toBe(3);
    expect(resolved.guestSetCookie).toContain("shelfmark_guest=");
    expect(toQuotaSnapshot(resolved.subject, resolved.quota).remainingDownloads).toBe(3);
  });

  it("deduplicates a short retry for the same download", async () => {
    const resolved = await resolveQuota(request());
    const key = downloadRetryKey({ version: 1, id: "7", hash: "hash", title: "Book", format: "EPUB", expiresAt: Date.now() + 1000 });
    const first = await commitDownloadQuota(resolved.subject, resolved.quota, key);
    const second = await commitDownloadQuota(resolved.subject, first.quota, key);
    expect(first.snapshot.remainingDownloads).toBe(2);
    expect(second.retry).toBe(true);
    expect(second.snapshot.remainingDownloads).toBe(2);
  });

  it("blocks guests after three non-retry downloads", async () => {
    const resolved = await resolveQuota(request());
    let quota = resolved.quota;
    for (const key of ["a:epub", "b:epub", "c:epub"]) {
      quota = (await commitDownloadQuota(resolved.subject, quota, key)).quota;
    }
    expect(canStartDownload(resolved.subject, quota, "d:epub")).toEqual({ allowed: false, retry: false });
  });
});
