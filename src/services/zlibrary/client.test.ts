import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { downloadZLibraryBook, resetZLibraryCachesForTests, searchZLibrary } from "./client";

const originalEnv = { ...process.env };

function jsonResponse(data: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: { "Content-Type": "application/json" },
    ...init,
  });
}

beforeEach(() => {
  process.env.ZLIBRARY_BASE_URL = "https://library.example";
  process.env.ZLIBRARY_EMAIL = "reader@example.com";
  process.env.ZLIBRARY_PASSWORD = "secret";
  process.env.ZLIBRARY_TIMEOUT_MS = "30000";
  resetZLibraryCachesForTests();
});

afterEach(() => {
  vi.unstubAllGlobals();
  process.env = { ...originalEnv };
});

describe("Z-Library client", () => {
  it("searches anonymously when account credentials are not configured", async () => {
    delete process.env.ZLIBRARY_EMAIL;
    delete process.env.ZLIBRARY_PASSWORD;
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValueOnce(jsonResponse({
      books: [{
        id: 7,
        hash: "book-hash",
        title: "火星救援",
        author: "Andy Weir",
        extension: "epub",
        publisher: null,
        description: `<p>${"Mars ".repeat(400)}</p>`,
      }],
      pagination: { total_items: 1 },
    }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await searchZLibrary({ query: "火星救援" });

    expect(result.books[0]).toMatchObject({ title: "火星救援", publisher: null, downloadable: true });
    expect(result.books[0].description).toHaveLength(1_200);
    expect(result.books[0].description).not.toContain("<p>");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://library.example/eapi/book/search",
      expect.objectContaining({ headers: expect.not.objectContaining({ Cookie: expect.anything() }) }),
    );
  });

  it("logs in and searches using the returned session", async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(jsonResponse({ success: 1, user: { id: 42, remix_userkey: "session-key" } }))
      .mockResolvedValueOnce(jsonResponse({
        books: [{ id: 7, hash: "book-hash", title: "火星救援", author: "Andy Weir", extension: "epub" }],
        pagination: { total_items: 1 },
      }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await searchZLibrary({ query: "火星救援" });

    expect(result).toMatchObject({ total: 1, books: [{ id: "7", hash: "book-hash", title: "火星救援", downloadable: true }] });
    expect(fetchMock).toHaveBeenNthCalledWith(1, "https://library.example/eapi/user/login", expect.objectContaining({ method: "POST", redirect: "manual" }));
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "https://library.example/eapi/book/search",
      expect.objectContaining({ headers: expect.objectContaining({ Cookie: "remix_userid=42; remix_userkey=session-key" }) }),
    );
  });

  it("gets a download link and returns the upstream file stream", async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(jsonResponse({ success: 1, user: { id: "42", remix_userkey: "session-key" } }))
      .mockResolvedValueOnce(jsonResponse({
        success: 1,
        file: {
          downloadLink: "https://cdn.example/the-martian.epub",
          description: "火星救援",
          author: "Andy Weir",
          extension: "epub",
          allowDownload: true,
        },
      }))
      .mockResolvedValueOnce(new Response("epub-content", { status: 200, headers: { "Content-Type": "application/epub+zip" } }));
    vi.stubGlobal("fetch", fetchMock);

    const download = await downloadZLibraryBook("7", "book-hash");

    expect(download.fileName).toBe("火星救援 - Andy Weir.epub");
    expect(await download.response.text()).toBe("epub-content");
    expect(fetchMock).toHaveBeenNthCalledWith(
      3,
      "https://cdn.example/the-martian.epub",
      expect.objectContaining({ method: "GET", redirect: "follow" }),
    );
  });
});
