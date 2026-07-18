import { NextRequest, NextResponse } from "next/server";

import { isValidIsbn, normalizeIsbn } from "@/core/books";
import { searchBookSources } from "@/services/book-sources";

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q")?.trim() || "";
  const mode = request.nextUrl.searchParams.get("mode") === "isbn" ? "isbn" : "search";

  if (!query || query.length > 160) {
    return NextResponse.json({ error: "Enter a query between 1 and 160 characters." }, { status: 400 });
  }

  const normalizedQuery = mode === "isbn" ? normalizeIsbn(query) : query;
  if (mode === "isbn" && !isValidIsbn(normalizedQuery)) {
    return NextResponse.json({ error: "Enter a valid ISBN-10 or ISBN-13." }, { status: 400 });
  }

  try {
    const { books, sources } = await searchBookSources({
      query: normalizedQuery,
      mode,
      googleKey: process.env.GOOGLE_BOOKS_API_KEY,
    });
    const availableSources = sources.filter((source) => source.status === "available");
    if (availableSources.length === 0) {
      return NextResponse.json({ error: "Book sources are temporarily unavailable.", sources }, { status: 503 });
    }
    return NextResponse.json(
      { total: books.length, books, sources, partial: sources.some((source) => source.status === "unavailable") },
      { headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400" } },
    );
  } catch {
    return NextResponse.json({ error: "The catalog took too long to respond. Try again shortly." }, { status: 504 });
  }
}
