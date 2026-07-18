import { z } from "zod";

import {
  deduplicateBooks,
  safeExternalUrl,
  type BookResult,
  type BookSource,
  type SourceState,
} from "../core/books";

const OPEN_LIBRARY_HOSTS = ["openlibrary.org", "archive.org"];
const GOOGLE_HOSTS = ["google.com", "googleapis.com", "googleusercontent.com"];
const GUTENBERG_HOSTS = ["gutenberg.org"];

const openLibraryDocumentSchema = z
  .object({
    key: z.string().optional(),
    title: z.string().optional(),
    subtitle: z.string().optional(),
    author_name: z.array(z.string()).optional(),
    first_publish_year: z.number().optional(),
    cover_i: z.number().optional(),
    isbn: z.array(z.string()).optional(),
    language: z.array(z.string()).optional(),
    publisher: z.array(z.string()).optional(),
    edition_count: z.number().optional(),
    ebook_access: z.string().optional(),
    has_fulltext: z.boolean().optional(),
    ia: z.array(z.string()).optional(),
    availability: z
      .object({
        status: z.string().optional(),
        is_readable: z.boolean().optional(),
        is_lendable: z.boolean().optional(),
        is_previewable: z.boolean().optional(),
        is_restricted: z.boolean().optional(),
        identifier: z.string().nullable().optional(),
        openlibrary_work: z.string().nullable().optional(),
        openlibrary_edition: z.string().nullable().optional(),
      })
      .nullable()
      .optional(),
    ratings_average: z.number().optional(),
    ratings_count: z.number().optional(),
    subject: z.array(z.string()).optional(),
  })
  .passthrough();

const openLibraryResponseSchema = z.object({ docs: z.array(openLibraryDocumentSchema).default([]) }).passthrough();

const googleVolumeSchema = z
  .object({
    id: z.string().optional(),
    volumeInfo: z
      .object({
        title: z.string().optional(),
        subtitle: z.string().optional(),
        authors: z.array(z.string()).optional(),
        publisher: z.string().optional(),
        publishedDate: z.string().optional(),
        description: z.string().optional(),
        industryIdentifiers: z.array(z.object({ type: z.string().optional(), identifier: z.string().optional() })).optional(),
        pageCount: z.number().optional(),
        categories: z.array(z.string()).optional(),
        averageRating: z.number().optional(),
        ratingsCount: z.number().optional(),
        imageLinks: z.record(z.string(), z.string()).optional(),
        language: z.string().optional(),
        previewLink: z.string().optional(),
        infoLink: z.string().optional(),
      })
      .optional(),
    saleInfo: z
      .object({
        buyLink: z.string().optional(),
        retailPrice: z.object({ amount: z.number().optional(), currencyCode: z.string().optional() }).optional(),
      })
      .optional(),
    accessInfo: z
      .object({
        publicDomain: z.boolean().optional(),
        webReaderLink: z.string().optional(),
        epub: z.object({ downloadLink: z.string().optional() }).optional(),
        pdf: z.object({ downloadLink: z.string().optional() }).optional(),
      })
      .optional(),
  })
  .passthrough();

const googleResponseSchema = z.object({ items: z.array(googleVolumeSchema).default([]) }).passthrough();

const gutenbergBookSchema = z
  .object({
    id: z.number(),
    title: z.string().optional(),
    authors: z.array(z.object({ name: z.string().optional() }).passthrough()).optional(),
    subjects: z.array(z.string()).optional(),
    languages: z.array(z.string()).optional(),
    download_count: z.number().optional(),
    formats: z.record(z.string(), z.string()).optional(),
  })
  .passthrough();

const gutenbergResponseSchema = z.object({ results: z.array(gutenbergBookSchema).default([]) }).passthrough();

type SearchInput = { query: string; mode: "search" | "isbn"; googleKey?: string };

function cleanText(value?: string) {
  return value?.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim() || null;
}

async function fetchJson(url: string, timeoutMs = 4_500) {
  const configuredContact = process.env.OPEN_LIBRARY_CONTACT_EMAIL?.trim();
  const contactEmail = configuredContact && configuredContact.length <= 254 && !/[\r\n]/.test(configuredContact)
    ? configuredContact
    : null;
  const isOpenLibrary = new URL(url).hostname === "openlibrary.org";
  const userAgent = isOpenLibrary && contactEmail
    ? `Shelfmark/0.1 (${contactEmail})`
    : "Shelfmark/0.1 (+https://github.com/DeepBlueLac/isbn-book-lookup)";
  const headers: Record<string, string> = { Accept: "application/json", "User-Agent": userAgent };
  if (isOpenLibrary && contactEmail) headers.email = contactEmail;

  const response = await fetch(url, {
    signal: AbortSignal.timeout(timeoutMs),
    cache: "no-store",
    headers,
  });
  if (!response.ok) throw new Error(`upstream status ${response.status}`);
  return response.json() as Promise<unknown>;
}

export function normalizeOpenLibrary(document: z.infer<typeof openLibraryDocumentSchema>): BookResult {
  const workKey = document.key?.startsWith("/") ? document.key : document.key ? `/works/${document.key}` : null;
  const info = workKey ? safeExternalUrl(`https://openlibrary.org${workKey}`, OPEN_LIBRARY_HOSTS) : null;
  const availability = document.availability || null;
  const archiveIdentifier = availability?.identifier || document.ia?.[0] || null;
  const archive = archiveIdentifier
    ? safeExternalUrl(`https://archive.org/details/${encodeURIComponent(archiveIdentifier)}`, OPEN_LIBRARY_HOSTS)
    : null;
  const access = document.ebook_access || "no_ebook";
  const edition = availability?.openlibrary_edition
    ? safeExternalUrl(`https://openlibrary.org/books/${encodeURIComponent(availability.openlibrary_edition)}`, OPEN_LIBRARY_HOSTS)
    : null;
  const isOpenAccess = availability?.is_restricted !== true
    && (access === "public" || availability?.status === "open" || availability?.is_readable === true);
  const downloadPage = isOpenAccess ? archive : null;
  const borrow = availability?.is_lendable === true || access === "borrowable" ? edition || info : null;
  const preview = availability?.is_previewable === true || document.has_fulltext || access === "public"
    ? archive || edition || info
    : null;
  const identifiers = (document.isbn || []).slice(0, 6).map((identifier) => ({
    type: identifier.length === 13 ? "ISBN_13" : "ISBN_10",
    identifier,
  }));

  return {
    id: `openlibrary-${(document.key || crypto.randomUUID()).replace(/\//g, "-")}`,
    source: "Open Library",
    title: document.title || "Untitled book",
    subtitle: document.subtitle || null,
    authors: document.author_name || [],
    publisher: document.publisher?.[0] || null,
    publishedDate: document.first_publish_year ? String(document.first_publish_year) : null,
    description: document.edition_count ? `${document.edition_count.toLocaleString()} editions indexed by Open Library.` : null,
    identifiers,
    pageCount: null,
    categories: (document.subject || []).slice(0, 8),
    averageRating: document.ratings_average || null,
    ratingsCount: document.ratings_count || null,
    language: document.language?.[0] || null,
    cover: document.cover_i
      ? safeExternalUrl(`https://covers.openlibrary.org/b/id/${document.cover_i}-L.jpg`, ["openlibrary.org"])
      : null,
    publicDomain: false,
    links: { epub: null, pdf: null, downloadPage, borrow, preview, purchase: null, info },
    purchase: null,
  };
}

function normalizeGoogle(volume: z.infer<typeof googleVolumeSchema>): BookResult {
  const info = volume.volumeInfo || {};
  const access = volume.accessInfo || {};
  const sale = volume.saleInfo || {};
  const publicDomain = access.publicDomain === true;
  const image = info.imageLinks?.extraLarge || info.imageLinks?.large || info.imageLinks?.medium || info.imageLinks?.thumbnail;
  const purchaseLink = safeExternalUrl(sale.buyLink, GOOGLE_HOSTS);

  return {
    id: `google-${volume.id || crypto.randomUUID()}`,
    source: "Google Books",
    title: info.title || "Untitled book",
    subtitle: info.subtitle || null,
    authors: info.authors || [],
    publisher: info.publisher || null,
    publishedDate: info.publishedDate || null,
    description: cleanText(info.description),
    identifiers: (info.industryIdentifiers || [])
      .filter((item): item is { type: string; identifier: string } => Boolean(item.type && item.identifier))
      .map((item) => ({ type: item.type, identifier: item.identifier })),
    pageCount: info.pageCount || null,
    categories: info.categories || [],
    averageRating: info.averageRating || null,
    ratingsCount: info.ratingsCount || null,
    language: info.language || null,
    cover: safeExternalUrl(image, GOOGLE_HOSTS),
    publicDomain,
    links: {
      epub: publicDomain ? safeExternalUrl(access.epub?.downloadLink, GOOGLE_HOSTS) : null,
      pdf: publicDomain ? safeExternalUrl(access.pdf?.downloadLink, GOOGLE_HOSTS) : null,
      downloadPage: null,
      borrow: null,
      preview: safeExternalUrl(access.webReaderLink || info.previewLink, GOOGLE_HOSTS),
      purchase: purchaseLink,
      info: safeExternalUrl(info.infoLink, GOOGLE_HOSTS),
    },
    purchase: purchaseLink
      ? { amount: sale.retailPrice?.amount || null, currency: sale.retailPrice?.currencyCode || null }
      : null,
  };
}

function normalizeGutenberg(book: z.infer<typeof gutenbergBookSchema>): BookResult {
  const formats = book.formats || {};
  const epub = safeExternalUrl(formats["application/epub+zip"], GUTENBERG_HOSTS);
  const pdf = safeExternalUrl(formats["application/pdf"], GUTENBERG_HOSTS);
  const preview = safeExternalUrl(
    formats["text/html; charset=utf-8"] || formats["text/html; charset=iso-8859-1"] || formats["text/html"],
    GUTENBERG_HOSTS,
  );
  const info = safeExternalUrl(`https://www.gutenberg.org/ebooks/${book.id}`, GUTENBERG_HOSTS);

  return {
    id: `gutenberg-${book.id}`,
    source: "Project Gutenberg",
    title: book.title || "Untitled book",
    subtitle: null,
    authors: (book.authors || []).map((author) => author.name).filter((name): name is string => Boolean(name)),
    publisher: "Project Gutenberg",
    publishedDate: null,
    description: book.download_count
      ? `A Project Gutenberg public-domain edition with ${book.download_count.toLocaleString()} catalog downloads.`
      : "A Project Gutenberg public-domain edition.",
    identifiers: [{ type: "GUTENBERG_ID", identifier: String(book.id) }],
    pageCount: null,
    categories: (book.subjects || []).slice(0, 8),
    averageRating: null,
    ratingsCount: null,
    language: book.languages?.[0] || null,
    cover: safeExternalUrl(formats["image/jpeg"], GUTENBERG_HOSTS),
    publicDomain: true,
    links: { epub, pdf, downloadPage: null, borrow: null, preview: preview || info, purchase: null, info },
    purchase: null,
  };
}

async function searchOpenLibrary({ query, mode }: SearchInput) {
  const params = new URLSearchParams({
    q: mode === "isbn" ? `isbn:${query}` : query,
    limit: mode === "isbn" ? "8" : "12",
    fields:
      "key,title,subtitle,author_name,first_publish_year,cover_i,isbn,language,publisher,edition_count,ebook_access,has_fulltext,ia,availability,ratings_average,ratings_count,subject",
  });
  const parsed = openLibraryResponseSchema.parse(await fetchJson(`https://openlibrary.org/search.json?${params}`, 9_000));
  return parsed.docs.map(normalizeOpenLibrary);
}

async function searchGoogle({ query, mode, googleKey }: SearchInput) {
  if (!googleKey) return [];
  const params = new URLSearchParams({
    q: mode === "isbn" ? `isbn:${query}` : query,
    maxResults: mode === "isbn" ? "8" : "20",
    orderBy: "relevance",
    printType: "books",
    projection: "full",
    key: googleKey,
  });
  const parsed = googleResponseSchema.parse(await fetchJson(`https://www.googleapis.com/books/v1/volumes?${params}`));
  return parsed.items.map(normalizeGoogle);
}

async function searchGutenberg({ query, mode }: SearchInput) {
  if (mode === "isbn") return [];
  const parsed = gutenbergResponseSchema.parse(
    await fetchJson(`https://gutendex.com/books?search=${encodeURIComponent(query)}`),
  );
  return parsed.results.slice(0, 12).map(normalizeGutenberg);
}

export async function searchBookSources(input: SearchInput) {
  const requests: { source: BookSource; enabled: boolean; run: () => Promise<BookResult[]> }[] = [
    { source: "Open Library", enabled: true, run: () => searchOpenLibrary(input) },
    { source: "Project Gutenberg", enabled: input.mode === "search", run: () => searchGutenberg(input) },
    { source: "Google Books", enabled: Boolean(input.googleKey), run: () => searchGoogle(input) },
  ];

  const settled = await Promise.all(
    requests.map(async (request) => {
      if (!request.enabled) {
        return { source: request.source, books: [] as BookResult[], state: "skipped" as const, detail: "Not required or not configured" };
      }
      try {
        const books = await request.run();
        return { source: request.source, books, state: "available" as const, detail: `${books.length} results` };
      } catch (error) {
        return {
          source: request.source,
          books: [] as BookResult[],
          state: "unavailable" as const,
          detail: error instanceof Error ? error.message : "Unknown source error",
        };
      }
    }),
  );

  const sources: SourceState[] = settled.map((item) => ({
    source: item.source,
    status: item.state,
    detail: item.detail,
  }));
  const books = deduplicateBooks(settled.flatMap((item) => item.books)).slice(0, 30);
  return { books, sources };
}
