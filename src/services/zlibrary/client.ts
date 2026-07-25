import { z } from "zod";

import { getZLibraryConfig, type ZLibraryConfig } from "./config";

const USER_AGENT = "Shelfmark/0.1 (+https://books.bulidoge.site)";
const SEARCH_LIMIT = 30;
const SESSION_TTL_MS = 30 * 60 * 1_000;
const SEARCH_CACHE_TTL_MS = 60 * 1_000;
const MAX_REDIRECTS = 5;

const sessionSchema = z
  .object({
    id: z.union([z.string(), z.number()]).optional(),
    user_id: z.union([z.string(), z.number()]).optional(),
    remix_userkey: z.string().optional(),
    user_key: z.string().optional(),
    message: z.string().optional(),
  })
  .passthrough();

const loginSchema = z
  .object({
    success: z.union([z.string(), z.number()]).optional(),
    user: sessionSchema.optional(),
    response: sessionSchema.optional(),
    error: z.unknown().optional(),
    message: z.string().optional(),
  })
  .passthrough();

const apiBookSchema = z
  .object({
    id: z.union([z.string(), z.number()]),
    hash: z.string().nullish(),
    title: z.string().nullish(),
    author: z.string().nullish(),
    year: z.union([z.string(), z.number()]).nullish(),
    extension: z.string().nullish(),
    filesizeString: z.string().nullish(),
    filesize: z.union([z.string(), z.number()]).nullish(),
    language: z.string().nullish(),
    interestScore: z.union([z.string(), z.number()]).nullish(),
    href: z.string().nullish(),
    dl: z.string().nullish(),
    cover: z.string().nullish(),
    description: z.string().nullish(),
    publisher: z.string().nullish(),
    identifier: z.string().nullish(),
  })
  .passthrough();

const searchSchema = z
  .object({
    books: z.array(apiBookSchema).optional(),
    exactMatch: z.object({ books: z.array(apiBookSchema).optional() }).passthrough().optional(),
    pagination: z.object({ total_items: z.union([z.string(), z.number()]).optional() }).passthrough().optional(),
    exactBooksCount: z.union([z.string(), z.number()]).optional(),
    error: z.unknown().optional(),
  })
  .passthrough();

const downloadLinkSchema = z
  .object({
    success: z.union([z.string(), z.number()]).optional(),
    message: z.string().optional(),
    file: z
      .object({
        downloadLink: z.string().url().optional(),
        description: z.string().optional(),
        author: z.string().optional(),
        extension: z.string().optional(),
        allowDownload: z.boolean().optional(),
      })
      .passthrough()
      .optional(),
  })
  .passthrough();

export type ZLibraryBook = {
  id: string;
  hash: string | null;
  title: string;
  author: string;
  year: string | null;
  format: string | null;
  size: string | null;
  language: string | null;
  cover: string | null;
  description: string | null;
  publisher: string | null;
  identifier: string | null;
  downloadable: boolean;
};

export type ZLibrarySearchResult = {
  books: ZLibraryBook[];
  total: number | null;
};

type Session = {
  baseUrl: string;
  userId: string;
  userKey: string;
  expiresAt: number;
};

export type ZLibraryDownload = {
  response: Response;
  fileName: string;
};

let sessionCache: Session | null = null;
const searchCache = new Map<string, { expiresAt: number; result: ZLibrarySearchResult }>();

export class ZLibraryError extends Error {
  constructor(message: string, readonly status = 502) {
    super(message);
    this.name = "ZLibraryError";
  }
}

function asMessage(value: unknown, fallback: string) {
  if (typeof value === "string" && value.trim()) return value;
  if (value && typeof value === "object" && "message" in value) {
    const message = (value as { message?: unknown }).message;
    if (typeof message === "string" && message.trim()) return message;
  }
  return fallback;
}

function cleanDescription(value: string | null | undefined) {
  const cleaned = value?.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  if (!cleaned) return null;
  return cleaned.slice(0, 1_200);
}

function joinUrl(baseUrl: string, path: string) {
  return new URL(path, `${baseUrl}/`).toString();
}

function redirectedBase(response: Response, requestUrl: string) {
  const location = response.headers.get("location");
  if (!location) throw new ZLibraryError("Z-Library returned a redirect without a destination");
  const target = new URL(location, requestUrl);
  if (target.protocol !== "https:" && target.protocol !== "http:") {
    throw new ZLibraryError("Z-Library returned an unsupported redirect");
  }
  return target.origin;
}

async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs: number) {
  try {
    return await fetch(url, {
      ...init,
      cache: "no-store",
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (error) {
    throw new ZLibraryError(error instanceof Error ? error.message : "Z-Library request failed", 504);
  }
}

async function parseJson(response: Response) {
  const text = await response.text();
  if (!text) throw new ZLibraryError("Z-Library returned an empty response");
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new ZLibraryError("Z-Library returned a non-JSON response");
  }
}

function apiHeaders(session?: Session | null) {
  const headers: Record<string, string> = {
    Accept: "application/json, text/javascript, */*; q=0.01",
    "User-Agent": USER_AGENT,
  };
  if (session) headers.Cookie = `remix_userid=${session.userId}; remix_userkey=${session.userKey}`;
  return headers;
}

async function login(config: ZLibraryConfig, baseUrl = config.baseUrl, redirectCount = 0): Promise<Session> {
  if (!config.email || !config.password) {
    throw new ZLibraryError("Z-Library account credentials are required for downloads", 503);
  }
  const body = new URLSearchParams({ email: config.email, password: config.password });
  const url = joinUrl(baseUrl, "/eapi/user/login");
  const response = await fetchWithTimeout(
    url,
    {
      method: "POST",
      redirect: "manual",
      headers: {
        Accept: "application/json, text/javascript, */*; q=0.01",
        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
        "User-Agent": USER_AGENT,
        "X-Requested-With": "XMLHttpRequest",
      },
      body,
    },
    config.timeoutMs,
  );

  if (response.status >= 300 && response.status < 400) {
    if (redirectCount >= MAX_REDIRECTS) throw new ZLibraryError("Too many Z-Library redirects");
    return login(config, redirectedBase(response, url), redirectCount + 1);
  }

  const parsed = loginSchema.parse(await parseJson(response));
  if (!response.ok || Number(parsed.success) !== 1) {
    throw new ZLibraryError(asMessage(parsed.error, parsed.message || "Z-Library login failed"), response.status || 502);
  }

  const user = parsed.user || parsed.response;
  const userId = String(user?.id ?? user?.user_id ?? "");
  const userKey = user?.remix_userkey || user?.user_key || "";
  if (!userId || !userKey) throw new ZLibraryError(user?.message || "Z-Library login returned no session");

  return { baseUrl, userId, userKey, expiresAt: Date.now() + SESSION_TTL_MS };
}

async function getSession(forceRefresh = false) {
  const config = getZLibraryConfig();
  if (!forceRefresh && sessionCache && sessionCache.expiresAt > Date.now()) return sessionCache;
  sessionCache = await login(config);
  return sessionCache;
}

async function apiJson(
  path: string,
  init: RequestInit,
  requireAuthentication: boolean,
  retryAuthentication = true,
  redirectCount = 0,
  baseUrlOverride?: string,
): Promise<unknown> {
  const config = getZLibraryConfig();
  const credentialsConfigured = Boolean(config.email && config.password);
  const session = requireAuthentication || credentialsConfigured ? await getSession() : null;
  const baseUrl = baseUrlOverride || session?.baseUrl || config.baseUrl;
  const response = await fetchWithTimeout(
    joinUrl(baseUrl, path),
    { ...init, redirect: "manual", headers: { ...apiHeaders(session), ...init.headers } },
    config.timeoutMs,
  );
  if (response.status >= 300 && response.status < 400) {
    if (redirectCount >= MAX_REDIRECTS) throw new ZLibraryError("Too many Z-Library redirects");
    const redirected = redirectedBase(response, joinUrl(baseUrl, path));
    if (session) sessionCache = { ...session, baseUrl: redirected };
    return apiJson(path, init, requireAuthentication, retryAuthentication, redirectCount + 1, redirected);
  }
  if (session && (response.status === 401 || response.status === 403) && retryAuthentication) {
    await getSession(true);
    return apiJson(path, init, requireAuthentication, false, redirectCount);
  }
  const data = await parseJson(response);
  if (!response.ok) throw new ZLibraryError(asMessage(data, `Z-Library returned HTTP ${response.status}`), response.status);
  return data;
}

function normalizeBook(book: z.infer<typeof apiBookSchema>): ZLibraryBook {
  const size = book.filesizeString ?? book.filesize;
  return {
    id: String(book.id),
    hash: book.hash || null,
    title: book.title?.trim() || "Unknown title",
    author: book.author?.trim() || "Unknown author",
    year: book.year == null ? null : String(book.year),
    format: book.extension || null,
    size: size == null ? null : String(size),
    language: book.language || null,
    cover: book.cover && /^https?:\/\//i.test(book.cover) ? book.cover : null,
    description: cleanDescription(book.description),
    publisher: book.publisher || null,
    identifier: book.identifier || null,
    downloadable: Boolean(book.hash),
  };
}

export async function searchZLibrary(input: {
  query: string;
  languages?: string[];
  extensions?: string[];
  order?: string;
  page?: number;
}): Promise<ZLibrarySearchResult> {
  const cacheKey = JSON.stringify(input);
  const cached = searchCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.result;

  const body = new URLSearchParams({
    message: input.query,
    page: String(input.page || 1),
    limit: String(SEARCH_LIMIT),
  });
  input.languages?.forEach((language, index) => body.append(`languages[${index}]`, language));
  input.extensions?.forEach((extension, index) => body.append(`extensions[${index}]`, extension));
  if (input.order) body.set("order", input.order);

  const parsed = searchSchema.parse(
    await apiJson("/eapi/book/search", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8" },
      body,
    }, false),
  );
  if (parsed.error) throw new ZLibraryError(asMessage(parsed.error, "Z-Library search failed"));

  const rawBooks = parsed.books || parsed.exactMatch?.books || [];
  const totalValue = parsed.pagination?.total_items ?? parsed.exactBooksCount;
  const result = {
    books: rawBooks.map(normalizeBook),
    total: totalValue == null ? null : Number(totalValue),
  };
  searchCache.set(cacheKey, { expiresAt: Date.now() + SEARCH_CACHE_TTL_MS, result });
  return result;
}

async function getDownloadLink(bookId: string, bookHash: string) {
  const parsed = downloadLinkSchema.parse(
    await apiJson(`/eapi/book/${encodeURIComponent(bookId)}/${encodeURIComponent(bookHash)}/file`, {
      method: "GET",
    }, true),
  );
  if (Number(parsed.success) !== 1 || !parsed.file) {
    throw new ZLibraryError(parsed.message || "Z-Library did not provide a download record");
  }
  if (!parsed.file.downloadLink) {
    throw new ZLibraryError(parsed.file.allowDownload === false
      ? "The account download limit has been reached"
      : "Z-Library did not provide a download link");
  }
  return parsed.file as z.infer<typeof downloadLinkSchema>["file"] & { downloadLink: string };
}

function safeFileName(value: string) {
  return value.replace(/[<>:"/\\|?*\u0000-\u001f]/g, "_").replace(/\s+/g, " ").trim().slice(0, 160) || "book";
}

export async function downloadZLibraryBook(bookId: string, bookHash: string, requestedName?: string): Promise<ZLibraryDownload> {
  const file = await getDownloadLink(bookId, bookHash);
  const session = await getSession();
  const config = getZLibraryConfig();
  const response = await fetchWithTimeout(
    file.downloadLink,
    {
      method: "GET",
      redirect: "follow",
      headers: {
        ...apiHeaders(session),
        Referer: joinUrl(session.baseUrl, `/book/${encodeURIComponent(bookId)}/${encodeURIComponent(bookHash)}`),
      },
    },
    Math.max(config.timeoutMs, 120_000),
  );

  const contentType = response.headers.get("content-type") || "application/octet-stream";
  if (!response.ok || contentType.toLowerCase().includes("text/html") || !response.body) {
    throw new ZLibraryError(`Book download failed with HTTP ${response.status}`, response.status || 502);
  }

  const extension = file.extension?.replace(/[^a-z0-9]/gi, "").toLowerCase() || "bin";
  const baseName = requestedName || [file.description, file.author].filter(Boolean).join(" - ") || `book-${bookId}`;
  return { response, fileName: `${safeFileName(baseName)}.${extension}` };
}

export function resetZLibraryCachesForTests() {
  sessionCache = null;
  searchCache.clear();
}
