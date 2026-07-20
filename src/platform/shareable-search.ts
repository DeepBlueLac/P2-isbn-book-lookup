import type { AccessKind } from "@/core/books";

export type SearchMode = "search" | "isbn";
export type SearchFilter = AccessKind | "all";

export type ShareableSearch = {
  query: string;
  mode: SearchMode;
  access: SearchFilter;
};

const accessFilters = new Set<SearchFilter>([
  "all",
  "public-domain",
  "borrow",
  "preview",
  "purchase",
  "metadata",
]);

export function parseShareableSearch(search: string): ShareableSearch | null {
  const params = new URLSearchParams(search);
  const query = (params.get("q") || "").trim();
  if (!query) return null;

  const mode: SearchMode = params.get("mode") === "isbn" ? "isbn" : "search";
  const requestedAccess = params.get("access") as SearchFilter | null;
  const access = requestedAccess && accessFilters.has(requestedAccess) ? requestedAccess : "all";

  return { query, mode, access };
}

export function buildShareableSearchUrl(
  search: ShareableSearch,
  pathname = "/",
) {
  const params = new URLSearchParams({ q: search.query, mode: search.mode });
  if (search.access !== "all") params.set("access", search.access);
  return `${pathname}?${params.toString()}`;
}
