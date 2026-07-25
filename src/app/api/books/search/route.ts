import { NextRequest, NextResponse } from "next/server";

import { isValidIsbn, normalizeIsbn } from "@/core/books";
import { searchBookSources } from "@/services/book-sources";
import { searchZLibrary } from "@/services/zlibrary/client";
import { createDownloadIntent } from "@/services/zlibrary/download-intent";
import { downloadEditionRank } from "@/services/zlibrary/ranking";

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
    const catalogPromise = searchBookSources({ query: normalizedQuery, mode, googleKey: process.env.GOOGLE_BOOKS_API_KEY });
    const zLibraryEnabled = Boolean(process.env.ZLIBRARY_BASE_URL?.trim() && process.env.ZLIBRARY_API_TOKEN?.trim());
    const zLibraryPromise = zLibraryEnabled
      ? searchZLibrary({ query: normalizedQuery })
      : Promise.resolve(null);
    const [catalogResult, zLibraryResult] = await Promise.allSettled([catalogPromise, zLibraryPromise]);

    const books = catalogResult.status === "fulfilled" ? catalogResult.value.books : [];
    const sources = catalogResult.status === "fulfilled" ? catalogResult.value.sources : [];
    if (catalogResult.status === "rejected") {
      sources.push({ source: "Open Library", status: "unavailable", detail: "Catalog search failed" });
    }

    const downloadEditions = zLibraryResult.status === "fulfilled" && zLibraryResult.value
      ? await Promise.all([...zLibraryResult.value.books]
        .filter((book) => book.downloadable && book.hash && book.format)
        .sort((left, right) => downloadEditionRank(left.title, left.format, normalizedQuery) - downloadEditionRank(right.title, right.format, normalizedQuery))
        .slice(0, 30)
        .map(async (book) => ({
          id: book.id,
          title: book.title,
          author: book.author,
          year: book.year,
          format: book.format!.toLowerCase(),
          size: book.size,
          language: book.language,
          cover: book.cover,
          publisher: book.publisher,
          identifier: book.identifier,
          downloadIntent: await createDownloadIntent({
            id: book.id,
            hash: book.hash!,
            title: book.title,
            format: book.format!,
          }),
        })))
      : [];

    sources.push({
      source: "Z-Library",
      status: !zLibraryEnabled ? "skipped" : zLibraryResult.status === "fulfilled" ? "available" : "unavailable",
      detail: !zLibraryEnabled
        ? "Not configured"
        : zLibraryResult.status === "fulfilled"
          ? `${downloadEditions.length} downloadable editions`
          : "Download catalog unavailable",
    });
    const availableSources = sources.filter((source) => source.status === "available");
    if (availableSources.length === 0) {
      return NextResponse.json({ error: "Book sources are temporarily unavailable.", sources }, { status: 503 });
    }
    return NextResponse.json(
      {
        total: books.length,
        books,
        downloadEditions,
        downloadTotal: zLibraryResult.status === "fulfilled" ? zLibraryResult.value?.total || downloadEditions.length : 0,
        sources,
        partial: sources.some((source) => source.status === "unavailable"),
      },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch {
    return NextResponse.json({ error: "The catalog took too long to respond. Try again shortly." }, { status: 504 });
  }
}
