import { NextRequest, NextResponse } from "next/server";

type GoogleVolume = {
  id?: string;
  volumeInfo?: {
    title?: string;
    subtitle?: string;
    authors?: string[];
    publisher?: string;
    publishedDate?: string;
    description?: string;
    industryIdentifiers?: { type?: string; identifier?: string }[];
    pageCount?: number;
    categories?: string[];
    averageRating?: number;
    ratingsCount?: number;
    imageLinks?: Record<string, string>;
    language?: string;
    previewLink?: string;
    infoLink?: string;
  };
  saleInfo?: {
    saleability?: string;
    isEbook?: boolean;
    buyLink?: string;
    retailPrice?: { amount?: number; currencyCode?: string };
  };
  accessInfo?: {
    viewability?: string;
    embeddable?: boolean;
    publicDomain?: boolean;
    webReaderLink?: string;
    epub?: { isAvailable?: boolean; downloadLink?: string; acsTokenLink?: string };
    pdf?: { isAvailable?: boolean; downloadLink?: string; acsTokenLink?: string };
  };
};

type GutenbergBook = {
  id: number;
  title?: string;
  authors?: { name?: string }[];
  subjects?: string[];
  languages?: string[];
  download_count?: number;
  formats?: Record<string, string>;
};

function safeUrl(value?: string) {
  if (!value) return null;
  try {
    const url = new URL(value.replace(/^http:/, "https:"));
    return url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

function normalize(volume: GoogleVolume) {
  const info = volume.volumeInfo || {};
  const access = volume.accessInfo || {};
  const sale = volume.saleInfo || {};
  const publicDomain = access.publicDomain === true;
  const image = info.imageLinks?.extraLarge || info.imageLinks?.large || info.imageLinks?.medium || info.imageLinks?.thumbnail;

  return {
    id: volume.id || crypto.randomUUID(),
    source: "Google Books",
    title: info.title || "未命名图书",
    subtitle: info.subtitle || null,
    authors: info.authors || [],
    publisher: info.publisher || null,
    publishedDate: info.publishedDate || null,
    description: info.description?.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim() || null,
    identifiers: info.industryIdentifiers || [],
    pageCount: info.pageCount || null,
    categories: info.categories || [],
    averageRating: info.averageRating || null,
    ratingsCount: info.ratingsCount || null,
    language: info.language || null,
    cover: safeUrl(image),
    previewLink: safeUrl(access.webReaderLink || info.previewLink),
    infoLink: safeUrl(info.infoLink),
    publicDomain,
    viewability: access.viewability || "NO_PAGES",
    downloads: {
      epub: publicDomain ? safeUrl(access.epub?.downloadLink) : null,
      pdf: publicDomain ? safeUrl(access.pdf?.downloadLink) : null,
    },
    purchase: sale.buyLink
      ? {
          link: safeUrl(sale.buyLink),
          amount: sale.retailPrice?.amount || null,
          currency: sale.retailPrice?.currencyCode || null,
        }
      : null,
  };
}

function normalizeGutenberg(book: GutenbergBook) {
  const formats = book.formats || {};
  const epub = safeUrl(formats["application/epub+zip"]);
  const pdf = safeUrl(formats["application/pdf"]);
  const preview = safeUrl(
    formats["text/html; charset=utf-8"] || formats["text/html; charset=iso-8859-1"] || formats["text/html"],
  );
  return {
    id: `gutenberg-${book.id}`,
    source: "Project Gutenberg" as const,
    title: book.title || "未命名图书",
    subtitle: null,
    authors: (book.authors || []).map((author) => author.name).filter((name): name is string => Boolean(name)),
    publisher: "Project Gutenberg",
    publishedDate: null,
    description: book.download_count ? `Project Gutenberg 公版电子书，累计下载 ${book.download_count.toLocaleString()} 次。` : null,
    identifiers: [{ type: "GUTENBERG_ID", identifier: String(book.id) }],
    pageCount: null,
    categories: book.subjects || [],
    averageRating: null,
    ratingsCount: null,
    language: book.languages?.[0] || null,
    cover: safeUrl(formats["image/jpeg"]),
    previewLink: preview || `https://www.gutenberg.org/ebooks/${book.id}`,
    infoLink: `https://www.gutenberg.org/ebooks/${book.id}`,
    publicDomain: true,
    viewability: "ALL_PAGES",
    downloads: { epub, pdf },
    purchase: null,
  };
}

function deduplicate<T extends { title: string; authors: string[] }>(books: T[]) {
  const seen = new Set<string>();
  return books.filter((book) => {
    const key = `${book.title.toLowerCase().replace(/[^a-z0-9\u4e00-\u9fff]/g, "")}|${(book.authors[0] || "").toLowerCase().replace(/[^a-z0-9\u4e00-\u9fff]/g, "")}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export async function GET(request: NextRequest) {
  const key = process.env.GOOGLE_BOOKS_API_KEY;
  if (!key) {
    return NextResponse.json({ error: "Google Books API 尚未配置" }, { status: 503 });
  }

  const query = request.nextUrl.searchParams.get("q")?.trim() || "";
  const mode = request.nextUrl.searchParams.get("mode") === "isbn" ? "isbn" : "search";
  const freeOnly = request.nextUrl.searchParams.get("freeOnly") === "true";

  if (!query || query.length > 160) {
    return NextResponse.json({ error: "请输入 1 至 160 个字符的查询内容" }, { status: 400 });
  }

  const normalizedIsbn = query.replace(/[^0-9Xx]/g, "").toUpperCase();
  if (mode === "isbn" && !/^(\d{13}|\d{9}[\dX])$/.test(normalizedIsbn)) {
    return NextResponse.json({ error: "ISBN 格式无效" }, { status: 400 });
  }

  const searchQuery = mode === "isbn" ? `isbn:${normalizedIsbn}` : query;
  const params = new URLSearchParams({
    q: searchQuery,
    maxResults: mode === "isbn" ? "10" : "20",
    orderBy: "relevance",
    printType: "books",
    projection: "full",
    key,
  });
  if (freeOnly) params.set("filter", "free-ebooks");

  try {
    const hosts = ["www.googleapis.com", "books.googleapis.com", "www.googleapis.com"];
    let response: Response | null = null;
    for (let attempt = 0; attempt < hosts.length; attempt += 1) {
      response = await fetch(`https://${hosts[attempt]}/books/v1/volumes?${params}`, {
        signal: AbortSignal.timeout(10_000),
        cache: "no-store",
      });
      if (response.ok || (response.status < 500 && response.status !== 429)) break;
      await new Promise((resolve) => setTimeout(resolve, 350 * (attempt + 1)));
    }

    if (!response) throw new Error("No response from Google Books API");

    if (!response.ok) {
      const upstream = (await response.json().catch(() => null)) as { error?: { message?: string; status?: string } } | null;
      const status = response.status === 429 ? 429 : 502;
      console.error("Google Books API request failed", {
        status: response.status,
        reason: upstream?.error?.status || "unknown",
        message: upstream?.error?.message || "No error message returned",
      });
      return NextResponse.json(
        {
          error: response.status === 429 ? "查询次数过多，请稍后再试" : "Google Books 查询失败",
          upstreamStatus: response.status,
          upstreamReason: upstream?.error?.status || null,
        },
        { status },
      );
    }

    const data = (await response.json()) as { totalItems?: number; items?: GoogleVolume[] };
    const googleBooks = (data.items || []).map(normalize);
    let gutenbergBooks: ReturnType<typeof normalizeGutenberg>[] = [];

    if (mode === "search") {
      try {
        const gutenbergResponse = await fetch(
          `https://gutendex.com/books?search=${encodeURIComponent(query)}`,
          { signal: AbortSignal.timeout(10_000), cache: "no-store" },
        );
        if (gutenbergResponse.ok) {
          const gutenbergData = (await gutenbergResponse.json()) as { results?: GutenbergBook[] };
          gutenbergBooks = (gutenbergData.results || []).slice(0, 10).map(normalizeGutenberg);
        }
      } catch (error) {
        console.warn("Gutendex request failed; continuing with Google Books", error instanceof Error ? error.message : error);
      }
    }

    const books = deduplicate([...gutenbergBooks, ...googleBooks]).slice(0, 30);
    return NextResponse.json(
      { total: books.length, books },
      { headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400" } },
    );
  } catch {
    return NextResponse.json({ error: "图书服务响应超时，请稍后再试" }, { status: 504 });
  }
}
