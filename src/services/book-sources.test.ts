import { describe, expect, it } from "vitest";

import { getPrimaryAccess } from "../core/books";

import { normalizeOpenLibrary } from "./book-sources";

describe("Open Library access normalization", () => {
  it("exposes the official Archive.org formats page for an unrestricted open edition", () => {
    const book = normalizeOpenLibrary({
      key: "/works/OL66554W",
      title: "Pride and Prejudice",
      author_name: ["Jane Austen"],
      ebook_access: "public",
      has_fulltext: true,
      ia: ["prideprejudice00aust"],
      availability: {
        status: "open",
        is_readable: true,
        is_previewable: true,
        is_restricted: false,
        identifier: "prideprejudice00aust",
      },
    });

    expect(book.links.downloadPage).toBe("https://archive.org/details/prideprejudice00aust");
    expect(getPrimaryAccess(book)).toMatchObject({
      kind: "public-domain",
      label: "Open-access edition",
      actionLabel: "View downloads",
    });
  });

  it("keeps a restricted lendable edition on borrow and preview paths", () => {
    const book = normalizeOpenLibrary({
      key: "/works/OL17091839W",
      title: "The Martian",
      author_name: ["Andy Weir"],
      ebook_access: "borrowable",
      has_fulltext: true,
      ia: ["marsjanin0000andy"],
      availability: {
        status: "borrow_available",
        is_readable: false,
        is_lendable: true,
        is_previewable: true,
        is_restricted: true,
        identifier: "marsjanin0000andy",
        openlibrary_edition: "OL47698466M",
      },
    });

    expect(book.links.downloadPage).toBeNull();
    expect(book.links.borrow).toBe("https://openlibrary.org/books/OL47698466M");
    expect(book.links.preview).toBe("https://archive.org/details/marsjanin0000andy");
    expect(getPrimaryAccess(book).kind).toBe("borrow");
  });

  it("does not expose downloads when a nominally public result is marked restricted", () => {
    const book = normalizeOpenLibrary({
      key: "/works/OL1W",
      title: "Restricted scan",
      ebook_access: "public",
      has_fulltext: true,
      ia: ["restricted-scan"],
      availability: {
        status: "restricted",
        is_readable: false,
        is_previewable: true,
        is_restricted: true,
        identifier: "restricted-scan",
      },
    });

    expect(book.links.downloadPage).toBeNull();
    expect(getPrimaryAccess(book).kind).toBe("preview");
  });
});
