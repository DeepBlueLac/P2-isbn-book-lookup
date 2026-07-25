import { afterEach, describe, expect, it } from "vitest";

import { getZLibraryConfig, normalizeZLibraryBaseUrl } from "./config";

const originalEnv = { ...process.env };

afterEach(() => {
  process.env = { ...originalEnv };
});

describe("Z-Library configuration", () => {
  it("normalizes the configured base URL to an origin", () => {
    expect(normalizeZLibraryBaseUrl("https://example.com/path/" )).toBe("https://example.com");
  });

  it("loads credentials only from server environment variables", () => {
    process.env.ZLIBRARY_BASE_URL = "https://example.com";
    process.env.ZLIBRARY_EMAIL = "reader@example.com";
    process.env.ZLIBRARY_PASSWORD = "secret";
    process.env.ZLIBRARY_TIMEOUT_MS = "45000";

    expect(getZLibraryConfig()).toEqual({
      baseUrl: "https://example.com",
      email: "reader@example.com",
      password: "secret",
      timeoutMs: 45_000,
    });
  });

  it("allows anonymous search configuration without account credentials", () => {
    process.env.ZLIBRARY_BASE_URL = "https://example.com";
    delete process.env.ZLIBRARY_EMAIL;
    delete process.env.ZLIBRARY_PASSWORD;

    expect(getZLibraryConfig()).toMatchObject({ email: null, password: null });
  });
});
