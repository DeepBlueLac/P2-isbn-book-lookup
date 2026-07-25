import { z } from "zod";

const INTENT_TTL_MS = 10 * 60 * 1_000;

const payloadSchema = z.object({
  version: z.literal(1),
  id: z.string().min(1).max(80),
  hash: z.string().min(1).max(200),
  title: z.string().min(1).max(300),
  format: z.string().min(1).max(20),
  expiresAt: z.number().int().positive(),
});

export type DownloadIntentPayload = z.infer<typeof payloadSchema>;

function signingKey() {
  const secret = process.env.ZLIBRARY_API_TOKEN?.trim();
  if (!secret) throw new Error("ZLIBRARY_API_TOKEN is required to sign downloads");
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

function toBase64Url(bytes: Uint8Array) {
  let binary = "";
  for (let index = 0; index < bytes.length; index += 1) binary += String.fromCharCode(bytes[index]);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function fromBase64Url(value: string) {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  const binary = atob(base64);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

export async function createDownloadIntent(
  input: Pick<DownloadIntentPayload, "id" | "hash" | "title" | "format">,
  ttlMs = INTENT_TTL_MS,
) {
  const payload = payloadSchema.parse({ ...input, version: 1, expiresAt: Date.now() + ttlMs });
  const encodedPayload = toBase64Url(new TextEncoder().encode(JSON.stringify(payload)));
  const signature = await crypto.subtle.sign("HMAC", await signingKey(), new TextEncoder().encode(encodedPayload));
  return `${encodedPayload}.${toBase64Url(new Uint8Array(signature))}`;
}

export async function verifyDownloadIntent(token: string) {
  const [encodedPayload, encodedSignature, extra] = token.split(".");
  if (!encodedPayload || !encodedSignature || extra) throw new Error("Invalid download token");

  const valid = await crypto.subtle.verify(
    "HMAC",
    await signingKey(),
    fromBase64Url(encodedSignature),
    new TextEncoder().encode(encodedPayload),
  );
  if (!valid) throw new Error("Invalid download token");

  const payload = payloadSchema.parse(JSON.parse(new TextDecoder().decode(fromBase64Url(encodedPayload))));
  if (payload.expiresAt <= Date.now()) throw new Error("Download token expired");
  return payload;
}
