import { NextRequest, NextResponse } from "next/server";

import { authorizeZLibraryRequest } from "@/services/zlibrary/access";
import { searchZLibrary, ZLibraryError } from "@/services/zlibrary/client";

function listParam(request: NextRequest, name: string) {
  return request.nextUrl.searchParams.get(name)?.split(",").map((value) => value.trim()).filter(Boolean);
}

export async function GET(request: NextRequest) {
  const access = authorizeZLibraryRequest(request);
  if (!access.authorized) return NextResponse.json({ error: access.error }, { status: access.status });

  const query = request.nextUrl.searchParams.get("q")?.trim() || "";
  if (!query || query.length > 160) {
    return NextResponse.json({ error: "Enter a query between 1 and 160 characters." }, { status: 400 });
  }

  try {
    const result = await searchZLibrary({
      query,
      languages: listParam(request, "languages"),
      extensions: listParam(request, "extensions"),
      order: request.nextUrl.searchParams.get("order")?.trim() || undefined,
      page: Math.max(1, Number(request.nextUrl.searchParams.get("page")) || 1),
    });
    return NextResponse.json(result, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    const status = error instanceof ZLibraryError ? error.status : 502;
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Z-Library search failed" },
      { status, headers: { "Cache-Control": "private, no-store" } },
    );
  }
}
