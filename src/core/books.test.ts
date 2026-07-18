import { describe, expect, it } from "vitest";

import { deduplicateBooks, getPrimaryAccess, isValidIsbn, normalizeIsbn, safeExternalUrl, type BookResult } from "./books";

function createBook(overrides: Partial<BookResult> = {}): BookResult {
  return {
    id: "book-1",
    source: "Open Library",
    title: "The Martian",
    subtitle: null,
    authors: ["Andy Weir"],
    publisher: null,
    publishedDate: "2011",
    description: null,
    identifiers: [{ type: "ISBN_13", identifier: "9780553418026" }],
    pageCount: null,
    categories: [],
    averageRating: null,
    ratingsCount: null,
    language: "eng",
    cover: null,
    publicDomain: false,
    links: { epub: null, pdf: null, downloadPage: null, borrow: null, preview: null, purchase: null, info: "https://openlibrary.org" },
    purchase: null,
    ...overrides,
  };
}

describe("ISBN helpers", () => {
  it("normalizes and validates ISBN-10 and ISBN-13", () => {
    expect(normalizeIsbn("978-0-14-032872-1")).toBe("9780140328721");
    expect(isValidIsbn("978-0-14-032872-1")).toBe(true);
    expect(isValidIsbn("0-8044-2957-X")).toBe(true);
    expect(isValidIsbn("9780140328722")).toBe(false);
  });
});

describe("access classification", () => {
  it("prioritizes explicit public-domain files", () => {
    const route = getPrimaryAccess(createBook({ links: { epub: "https://www.gutenberg.org/book.epub", pdf: null, downloadPage: "https://archive.org/details/book", borrow: "https://openlibrary.org", preview: null, purchase: null, info: null } }));
    expect(route.kind).toBe("public-domain");
    expect(route.actionLabel).toBe("Get EPUB");
  });

  it("uses an official open-access download page before borrow or preview", () => {
    const route = getPrimaryAccess(createBook({
      links: {
        epub: null,
        pdf: null,
        downloadPage: "https://archive.org/details/prideandprejudice",
        borrow: "https://openlibrary.org/works/OL1W",
        preview: "https://archive.org/details/prideandprejudice",
        purchase: null,
        info: null,
      },
    }));
    expect(route.kind).toBe("public-domain");
    expect(route.label).toBe("Open-access edition");
    expect(route.actionLabel).toBe("View downloads");
  });

  it("falls back through borrow, preview, purchase, and metadata", () => {
    expect(getPrimaryAccess(createBook({ links: { epub: null, pdf: null, downloadPage: null, borrow: "https://openlibrary.org", preview: null, purchase: null, info: null } })).kind).toBe("borrow");
    expect(getPrimaryAccess(createBook({ links: { epub: null, pdf: null, downloadPage: null, borrow: null, preview: "https://books.google.com", purchase: null, info: null } })).kind).toBe("preview");
    expect(getPrimaryAccess(createBook({ links: { epub: null, pdf: null, downloadPage: null, borrow: null, preview: null, purchase: "https://books.google.com", info: null } })).kind).toBe("purchase");
    expect(getPrimaryAccess(createBook()).kind).toBe("metadata");
  });
});

describe("book normalization safety", () => {
  it("deduplicates matching ISBN records", () => {
    expect(deduplicateBooks([createBook(), createBook({ id: "book-2", source: "Google Books" })])).toHaveLength(1);
  });

  it("accepts only HTTPS URLs on allowed hosts", () => {
    expect(safeExternalUrl("http://openlibrary.org/books/1", ["openlibrary.org"])).toBe("https://openlibrary.org/books/1");
    expect(safeExternalUrl("https://archive.org/details/book-1", ["archive.org"])).toBe("https://archive.org/details/book-1");
    expect(safeExternalUrl("https://archive.org.evil.example/details/book-1", ["archive.org"])).toBeNull();
    expect(safeExternalUrl("https://evil.example/books/1", ["openlibrary.org"])).toBeNull();
    expect(safeExternalUrl("javascript:alert(1)", ["openlibrary.org"])).toBeNull();
  });
});
