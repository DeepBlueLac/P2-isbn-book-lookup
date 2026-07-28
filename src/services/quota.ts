import type { NextRequest } from "next/server";

import { getUserFromRequest } from "./supabase/server";
import type { DownloadIntentPayload } from "./zlibrary/download-intent";

const GUEST_COOKIE = "shelfmark_guest";
const QUOTA_COOKIE = "shelfmark_quota";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 400;
const RETRY_WINDOW_MS = 10 * 60 * 1_000;

export type QuotaSubject = {
  kind: "guest" | "user";
  id: string;
  email: string | null;
  dailyDownloads: number;
};

export type QuotaSnapshot = {
  subject: QuotaSubject;
  usedDownloads: number;
  remainingDownloads: number;
  resetAt: string;
};

type GuestCookie = {
  version: 1;
  id: string;
};

type QuotaCookie = {
  version: 1;
  subjectKey: string;
  date: string;
  downloads: number;
  retries: Record<string, number>;
};

function todayKey(now = new Date()) {
  return now.toISOString().slice(0, 10);
}

function nextResetIso(now = new Date()) {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1)).toISOString();
}

function subjectKey(subject: Pick<QuotaSubject, "kind" | "id">) {
  return `${subject.kind}:${subject.id}`;
}

function quotaSecret() {
  const configured = process.env.SHELFMARK_QUOTA_SECRET?.trim() || process.env.ZLIBRARY_API_TOKEN?.trim();
  if (configured) return configured;
  if (process.env.NODE_ENV === "production") throw new Error("SHELFMARK_QUOTA_SECRET is required in production");
  return "shelfmark-dev-quota-secret";
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

async function signingKey() {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(quotaSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

async function signJson(value: unknown) {
  const encodedPayload = toBase64Url(new TextEncoder().encode(JSON.stringify(value)));
  const signature = await crypto.subtle.sign("HMAC", await signingKey(), new TextEncoder().encode(encodedPayload));
  return `${encodedPayload}.${toBase64Url(new Uint8Array(signature))}`;
}

async function verifyJson<T>(token: string | undefined): Promise<T | null> {
  if (!token) return null;
  const [encodedPayload, encodedSignature, extra] = token.split(".");
  if (!encodedPayload || !encodedSignature || extra) return null;
  const valid = await crypto.subtle.verify(
    "HMAC",
    await signingKey(),
    fromBase64Url(encodedSignature),
    new TextEncoder().encode(encodedPayload),
  );
  if (!valid) return null;
  return JSON.parse(new TextDecoder().decode(fromBase64Url(encodedPayload))) as T;
}

function cookieHeader(name: string, value: string) {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${name}=${value}; Path=/; HttpOnly; SameSite=Lax${secure}; Max-Age=${COOKIE_MAX_AGE}`;
}

function createGuestCookie(): GuestCookie {
  return { version: 1, id: crypto.randomUUID() };
}

function createQuotaCookie(subject: QuotaSubject, now = new Date()): QuotaCookie {
  return {
    version: 1,
    subjectKey: subjectKey(subject),
    date: todayKey(now),
    downloads: 0,
    retries: {},
  };
}

function pruneRetries(retries: Record<string, number>, nowMs = Date.now()) {
  return Object.fromEntries(
    Object.entries(retries).filter(([, value]) => nowMs - value <= RETRY_WINDOW_MS),
  );
}

async function resolveGuest(request: NextRequest) {
  const parsed = await verifyJson<GuestCookie>(request.cookies.get(GUEST_COOKIE)?.value);
  if (parsed?.version === 1 && parsed.id) return { guest: parsed, setCookie: null };
  const guest = createGuestCookie();
  return { guest, setCookie: cookieHeader(GUEST_COOKIE, await signJson(guest)) };
}

export async function resolveQuota(request: NextRequest) {
  const user = await getUserFromRequest(request);
  const guestResult = user ? null : await resolveGuest(request);
  const subject: QuotaSubject = user
    ? { kind: "user", id: user.id, email: user.email, dailyDownloads: 10 }
    : { kind: "guest", id: guestResult!.guest.id, email: null, dailyDownloads: 3 };

  const now = new Date();
  const parsedQuota = await verifyJson<QuotaCookie>(request.cookies.get(QUOTA_COOKIE)?.value);
  const freshQuota = parsedQuota?.version === 1
    && parsedQuota.subjectKey === subjectKey(subject)
    && parsedQuota.date === todayKey(now)
    ? { ...parsedQuota, retries: pruneRetries(parsedQuota.retries) }
    : createQuotaCookie(subject, now);

  return {
    subject,
    quota: freshQuota,
    guestSetCookie: guestResult?.setCookie || null,
  };
}

export function toQuotaSnapshot(subject: QuotaSubject, quota: QuotaCookie, now = new Date()): QuotaSnapshot {
  const usedDownloads = Math.max(0, quota.downloads);
  return {
    subject,
    usedDownloads,
    remainingDownloads: Math.max(0, subject.dailyDownloads - usedDownloads),
    resetAt: nextResetIso(now),
  };
}

export function downloadRetryKey(intent: DownloadIntentPayload) {
  return `${intent.id}:${intent.format.toLowerCase()}`;
}

export function canStartDownload(subject: QuotaSubject, quota: QuotaCookie, retryKey: string) {
  const retryAt = quota.retries[retryKey];
  if (retryAt && Date.now() - retryAt <= RETRY_WINDOW_MS) return { allowed: true, retry: true };
  return { allowed: quota.downloads < subject.dailyDownloads, retry: false };
}

export async function commitDownloadQuota(subject: QuotaSubject, quota: QuotaCookie, retryKey: string) {
  const retry = canStartDownload(subject, quota, retryKey).retry;
  const nextQuota: QuotaCookie = {
    ...quota,
    downloads: retry ? quota.downloads : quota.downloads + 1,
    retries: { ...pruneRetries(quota.retries), [retryKey]: Date.now() },
  };
  return {
    quota: nextQuota,
    cookie: cookieHeader(QUOTA_COOKIE, await signJson(nextQuota)),
    snapshot: toQuotaSnapshot(subject, nextQuota),
    retry,
  };
}

export async function quotaCookieFor(subject: QuotaSubject, quota: QuotaCookie) {
  return cookieHeader(QUOTA_COOKIE, await signJson(quota));
}
