import { describe, expect, it } from "vitest";

import { downloadEditionRank } from "./ranking";

describe("download edition ranking", () => {
  it("puts an exact EPUB title before other formats and promotional matches", () => {
    const query = "火星救援";
    expect(downloadEditionRank("火星救援", "epub", query)).toBeLessThan(downloadEditionRank("火星救援", "pdf", query));
    expect(downloadEditionRank("火星救援", "pdf", query)).toBeLessThan(downloadEditionRank("火星救援（译林幻系列）", "epub", query));
    expect(downloadEditionRank("火星救援（译林幻系列）", "epub", query)).toBeLessThan(downloadEditionRank("挽救计划：《火星救援》作者新作", "epub", query));
  });
});
