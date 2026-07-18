export type BookSource = "Open Library" | "Google Books" | "Project Gutenberg";

export type AccessKind = "public-domain" | "borrow" | "preview" | "purchase" | "metadata";

export type BookResult = {
  id: string;
  source: BookSource;
  title: string;
  subtitle: string | null;
  authors: string[];
  publisher: string | null;
  publishedDate: string | null;
  description: string | null;
  identifiers: { type: string; identifier: string }[];
  pageCount: number | null;
  categories: string[];
  averageRating: number | null;
  ratingsCount: number | null;
  language: string | null;
  cover: string | null;
  publicDomain: boolean;
  links: {
    epub: string | null;
    pdf: string | null;
    borrow: string | null;
    preview: string | null;
    purchase: string | null;
    info: string | null;
  };
  purchase: { amount: number | null; currency: string | null } | null;
};

export type AccessRoute = {
  kind: AccessKind;
  label: string;
  actionLabel: string;
  href: string | null;
};

export type SourceState = {
  source: BookSource;
  status: "available" | "unavailable" | "skipped";
  detail: string;
};

const ISBN_CLEANUP = /[^0-9Xx]/g;
const TITLE_CLEANUP = /[^a-z0-9\u00c0-\u024f\u4e00-\u9fff]/g;

export function normalizeIsbn(value: string) {
  return value.replace(ISBN_CLEANUP, "").toUpperCase();
}

export function isValidIsbn(value: string) {
  const normalized = normalizeIsbn(value);
  if (/^\d{13}$/.test(normalized)) {
    const sum = normalized
      .slice(0, 12)
      .split("")
      .reduce((total, digit, index) => total + Number(digit) * (index % 2 ? 3 : 1), 0);
    return (10 - (sum % 10)) % 10 === Number(normalized[12]);
  }

  if (/^\d{9}[\dX]$/.test(normalized)) {
    const sum = normalized.split("").reduce((total, digit, index) => {
      const number = digit === "X" ? 10 : Number(digit);
      return total + number * (10 - index);
    }, 0);
    return sum % 11 === 0;
  }

  return false;
}

export function getPrimaryAccess(book: BookResult): AccessRoute {
  if (book.links.epub || book.links.pdf) {
    return {
      kind: "public-domain",
      label: "Public-domain edition",
      actionLabel: book.links.epub ? "Get EPUB" : "Get PDF",
      href: book.links.epub || book.links.pdf,
    };
  }

  if (book.links.borrow) {
    return {
      kind: "borrow",
      label: "Borrow from a library",
      actionLabel: "Check availability",
      href: book.links.borrow,
    };
  }

  if (book.links.preview) {
    return {
      kind: "preview",
      label: "Preview available",
      actionLabel: "Open preview",
      href: book.links.preview,
    };
  }

  if (book.links.purchase) {
    return {
      kind: "purchase",
      label: "Purchase available",
      actionLabel: "View purchase",
      href: book.links.purchase,
    };
  }

  return {
    kind: "metadata",
    label: "Catalog record only",
    actionLabel: "View record",
    href: book.links.info,
  };
}

export function getBookKey(book: Pick<BookResult, "title" | "authors" | "identifiers">) {
  const isbn = book.identifiers.find((item) => item.type.startsWith("ISBN"))?.identifier;
  if (isbn) return `isbn:${normalizeIsbn(isbn)}`;
  const title = book.title.toLowerCase().replace(TITLE_CLEANUP, "");
  const author = (book.authors[0] || "").toLowerCase().replace(TITLE_CLEANUP, "");
  return `work:${title}|${author}`;
}

export function deduplicateBooks(books: BookResult[]) {
  const seen = new Set<string>();
  const output: BookResult[] = [];

  for (const book of books) {
    const key = getBookKey(book);
    if (seen.has(key)) continue;
    seen.add(key);
    output.push(book);
  }

  return output;
}

export function formatBookSummary(book: BookResult) {
  const isbn = book.identifiers.find((item) => item.type.startsWith("ISBN"))?.identifier;
  return [
    book.title,
    book.authors.length ? `By ${book.authors.join(", ")}` : null,
    book.publisher,
    book.publishedDate,
    isbn ? `ISBN ${isbn}` : null,
    `Source: ${book.source}`,
  ]
    .filter(Boolean)
    .join("\n");
}

export function safeExternalUrl(value: string | undefined | null, allowedHosts: string[]) {
  if (!value) return null;
  try {
    const url = new URL(value.replace(/^http:/, "https:"));
    if (url.protocol !== "https:") return null;
    const allowed = allowedHosts.some((host) => url.hostname === host || url.hostname.endsWith(`.${host}`));
    return allowed ? url.toString() : null;
  } catch {
    return null;
  }
}
