export function downloadEditionRank(title: string, format: string | null, query: string) {
  const normalizedTitle = title.toLocaleLowerCase().replace(/\s+/g, "");
  const normalizedQuery = query.toLocaleLowerCase().replace(/\s+/g, "");
  const titleRank = normalizedTitle === normalizedQuery
    ? 0
    : normalizedTitle.startsWith(normalizedQuery)
      ? 1
      : normalizedTitle.includes(normalizedQuery)
        ? 2
        : 3;
  const formatRank = ["epub", "pdf", "mobi", "azw3"].indexOf((format || "").toLowerCase());
  return titleRank * 10 + (formatRank < 0 ? 9 : formatRank);
}
