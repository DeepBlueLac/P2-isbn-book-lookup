import { NextRequest, NextResponse } from "next/server";

import { quotaCookieFor, resolveQuota, toQuotaSnapshot } from "@/services/quota";

export async function GET(request: NextRequest) {
  const resolved = await resolveQuota(request);
  const response = NextResponse.json(
    { quota: toQuotaSnapshot(resolved.subject, resolved.quota) },
    { headers: { "Cache-Control": "private, no-store" } },
  );
  if (resolved.guestSetCookie) response.headers.append("Set-Cookie", resolved.guestSetCookie);
  response.headers.append("Set-Cookie", await quotaCookieFor(resolved.subject, resolved.quota));
  return response;
}
