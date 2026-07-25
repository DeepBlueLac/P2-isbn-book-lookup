import { NextRequest, NextResponse } from "next/server";

import { downloadZLibraryBook, ZLibraryError } from "@/services/zlibrary/client";
import { verifyDownloadIntent } from "@/services/zlibrary/download-intent";

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token") || "";
  if (!token || token.length > 2_000) {
    return NextResponse.json({ error: "A valid download token is required." }, { status: 400 });
  }

  try {
    const intent = await verifyDownloadIntent(token);
    const download = await downloadZLibraryBook(intent.id, intent.hash, intent.title);
    const headers = new Headers();
    headers.set("Cache-Control", "private, no-store");
    headers.set("Content-Type", download.response.headers.get("content-type") || "application/octet-stream");
    headers.set("Content-Disposition", `attachment; filename*=UTF-8''${encodeURIComponent(download.fileName)}`);
    headers.set("X-Content-Type-Options", "nosniff");
    const length = download.response.headers.get("content-length");
    if (length) headers.set("Content-Length", length);
    return new Response(download.response.body, { status: 200, headers });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Book download failed";
    const status = error instanceof ZLibraryError ? error.status : message.includes("expired") ? 410 : 400;
    return NextResponse.json({ error: message }, { status, headers: { "Cache-Control": "private, no-store" } });
  }
}
