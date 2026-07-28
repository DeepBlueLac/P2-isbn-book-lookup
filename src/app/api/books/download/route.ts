import { NextRequest, NextResponse } from "next/server";

import {
  canStartDownload,
  commitDownloadQuota,
  downloadRetryKey,
  quotaCookieFor,
  resolveQuota,
  toQuotaSnapshot,
} from "@/services/quota";
import { recordUsageEvent } from "@/services/usage-events";
import { downloadZLibraryBook, ZLibraryError } from "@/services/zlibrary/client";
import { verifyDownloadIntent } from "@/services/zlibrary/download-intent";

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token") || "";
  if (!token || token.length > 2_000) {
    return NextResponse.json({ error: "A valid download token is required." }, { status: 400 });
  }

  try {
    const intent = await verifyDownloadIntent(token);
    const resolvedQuota = await resolveQuota(request);
    const retryKey = downloadRetryKey(intent);
    const allowance = canStartDownload(resolvedQuota.subject, resolvedQuota.quota, retryKey);
    if (!allowance.allowed) {
      const response = NextResponse.json(
        {
          error: "Sign in to continue downloading.",
          code: "quota_exhausted",
          quota: toQuotaSnapshot(resolvedQuota.subject, resolvedQuota.quota),
        },
        { status: 429, headers: { "Cache-Control": "private, no-store" } },
      );
      if (resolvedQuota.guestSetCookie) response.headers.append("Set-Cookie", resolvedQuota.guestSetCookie);
      response.headers.append("Set-Cookie", await quotaCookieFor(resolvedQuota.subject, resolvedQuota.quota));
      return response;
    }

    const download = await downloadZLibraryBook(intent.id, intent.hash, intent.title);
    const quotaCommit = await commitDownloadQuota(resolvedQuota.subject, resolvedQuota.quota, retryKey);
    await recordUsageEvent({
      type: "download",
      subject: resolvedQuota.subject,
      bookId: intent.id,
      format: intent.format,
      retry: quotaCommit.retry,
      downloadsUsed: quotaCommit.snapshot.usedDownloads,
      remainingDownloads: quotaCommit.snapshot.remainingDownloads,
    });
    const headers = new Headers();
    headers.set("Cache-Control", "private, no-store");
    headers.set("Content-Type", download.response.headers.get("content-type") || "application/octet-stream");
    headers.set("Content-Disposition", `attachment; filename*=UTF-8''${encodeURIComponent(download.fileName)}`);
    headers.set("X-Content-Type-Options", "nosniff");
    headers.set("X-Shelfmark-Downloads-Remaining", String(quotaCommit.snapshot.remainingDownloads));
    if (resolvedQuota.guestSetCookie) headers.append("Set-Cookie", resolvedQuota.guestSetCookie);
    headers.append("Set-Cookie", quotaCommit.cookie);
    const length = download.response.headers.get("content-length");
    if (length) headers.set("Content-Length", length);
    return new Response(download.response.body, { status: 200, headers });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Book download failed";
    const status = error instanceof ZLibraryError ? error.status : message.includes("expired") ? 410 : 400;
    return NextResponse.json({ error: message }, { status, headers: { "Cache-Control": "private, no-store" } });
  }
}
