import { NextResponse } from "next/server";
import { z } from "zod";

import { authorizeZLibraryRequest } from "@/services/zlibrary/access";
import { downloadZLibraryBook, ZLibraryError } from "@/services/zlibrary/client";

const requestSchema = z.object({
  id: z.union([z.string(), z.number()]).transform(String),
  hash: z.string().min(1).max(200),
  fileName: z.string().min(1).max(160).optional(),
});

export async function POST(request: Request) {
  const access = authorizeZLibraryRequest(request);
  if (!access.authorized) return NextResponse.json({ error: access.error }, { status: access.status });

  const body = await request.json().catch(() => null);
  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Provide a valid book id and hash." }, { status: 400 });
  }

  try {
    const download = await downloadZLibraryBook(parsed.data.id, parsed.data.hash, parsed.data.fileName);
    const headers = new Headers();
    headers.set("Cache-Control", "private, no-store");
    headers.set("Content-Type", download.response.headers.get("content-type") || "application/octet-stream");
    headers.set("Content-Disposition", `attachment; filename*=UTF-8''${encodeURIComponent(download.fileName)}`);
    const length = download.response.headers.get("content-length");
    if (length) headers.set("Content-Length", length);
    return new Response(download.response.body, { status: 200, headers });
  } catch (error) {
    const status = error instanceof ZLibraryError ? error.status : 502;
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Book download failed" },
      { status, headers: { "Cache-Control": "private, no-store" } },
    );
  }
}
