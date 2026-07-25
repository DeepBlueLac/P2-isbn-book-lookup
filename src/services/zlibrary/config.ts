export type ZLibraryConfig = {
  baseUrl: string;
  email: string | null;
  password: string | null;
  timeoutMs: number;
};

function requiredEnv(name: "ZLIBRARY_BASE_URL") {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing server environment variable: ${name}`);
  return value;
}

export function normalizeZLibraryBaseUrl(value: string) {
  const url = new URL(value);
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new Error("ZLIBRARY_BASE_URL must use HTTP or HTTPS");
  }
  return url.origin;
}

export function getZLibraryConfig(): ZLibraryConfig {
  const configuredTimeout = Number(process.env.ZLIBRARY_TIMEOUT_MS);
  const email = process.env.ZLIBRARY_EMAIL?.trim() || null;
  const password = process.env.ZLIBRARY_PASSWORD?.trim() || null;
  if (Boolean(email) !== Boolean(password)) {
    throw new Error("ZLIBRARY_EMAIL and ZLIBRARY_PASSWORD must be configured together");
  }
  return {
    baseUrl: normalizeZLibraryBaseUrl(requiredEnv("ZLIBRARY_BASE_URL")),
    email,
    password,
    timeoutMs: Number.isFinite(configuredTimeout) && configuredTimeout >= 1_000
      ? Math.min(configuredTimeout, 120_000)
      : 30_000,
  };
}
