import { NextRequest, NextResponse } from "next/server";

import { resolveQuota } from "@/services/quota";
import { quotaRequestSchema, recordQuotaRequest } from "@/services/quota-requests";

export async function POST(request: NextRequest) {
  const resolved = await resolveQuota(request);
  const parsed = quotaRequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Choose a daily download need and use case." }, { status: 400 });
  }

  const quotaRequest = await recordQuotaRequest(resolved.subject, parsed.data);
  const response = NextResponse.json(
    { request: { id: quotaRequest.id, status: quotaRequest.status, createdAt: quotaRequest.createdAt } },
    { status: 201, headers: { "Cache-Control": "private, no-store" } },
  );
  if (resolved.guestSetCookie) response.headers.append("Set-Cookie", resolved.guestSetCookie);
  return response;
}
