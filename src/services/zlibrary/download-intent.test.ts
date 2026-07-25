import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { createDownloadIntent, verifyDownloadIntent } from "./download-intent";

const originalToken = process.env.ZLIBRARY_API_TOKEN;

beforeEach(() => {
  process.env.ZLIBRARY_API_TOKEN = "test-download-signing-secret";
});

afterEach(() => {
  if (originalToken === undefined) delete process.env.ZLIBRARY_API_TOKEN;
  else process.env.ZLIBRARY_API_TOKEN = originalToken;
});

describe("Z-Library download intents", () => {
  it("round-trips a signed download payload", async () => {
    const token = await createDownloadIntent({ id: "11954921", hash: "4faa8c", title: "火星救援", format: "epub" });
    await expect(verifyDownloadIntent(token)).resolves.toMatchObject({
      id: "11954921",
      hash: "4faa8c",
      title: "火星救援",
      format: "epub",
    });
  });

  it("rejects tampered and expired tokens", async () => {
    const token = await createDownloadIntent({ id: "1", hash: "hash", title: "Book", format: "epub" });
    await expect(verifyDownloadIntent(`${token}x`)).rejects.toThrow("Invalid download token");

    const expired = await createDownloadIntent({ id: "1", hash: "hash", title: "Book", format: "epub" }, -1);
    await expect(verifyDownloadIntent(expired)).rejects.toThrow("Download token expired");
  });
});
