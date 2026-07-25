export function authorizeZLibraryRequest(request: Request) {
  const expected = process.env.ZLIBRARY_API_TOKEN?.trim();
  if (!expected) return { authorized: false as const, status: 503, error: "Z-Library API access token is not configured" };

  const authorization = request.headers.get("authorization") || "";
  const provided = authorization.startsWith("Bearer ") ? authorization.slice(7).trim() : "";
  if (provided !== expected) return { authorized: false as const, status: 401, error: "Unauthorized" };

  return { authorized: true as const };
}
