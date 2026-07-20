import { describe, expect, it } from "vitest";
import { buildShareableSearchUrl, parseShareableSearch } from "./shareable-search";

describe("Shelfmark shareable searches", () => {
  it("round-trips a filtered title search", () => {
    const url = buildShareableSearchUrl({
      query: "Pride and Prejudice",
      mode: "search",
      access: "public-domain",
    });

    expect(url).toBe("/?q=Pride+and+Prejudice&mode=search&access=public-domain");
    expect(parseShareableSearch(url.split("?")[1])).toEqual({
      query: "Pride and Prejudice",
      mode: "search",
      access: "public-domain",
    });
  });

  it("defaults unknown values safely", () => {
    expect(parseShareableSearch("?q=9780553418026&mode=unknown&access=unknown")).toEqual({
      query: "9780553418026",
      mode: "search",
      access: "all",
    });
    expect(parseShareableSearch("?mode=isbn")).toBeNull();
  });
});
