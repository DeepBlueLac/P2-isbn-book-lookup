import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy",
  description: "How Shelfmark handles searches, saved books, local files, and privacy-first analytics.",
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  return (
    <main className="policy-page">
      <Link href="/">← Back to Shelfmark</Link>
      <p className="eyebrow"><span>NOTE</span> Privacy</p>
      <h1>Private by default.</h1>
      <p>You can search and use the guest download allowance without an account. If you sign in, Shelfmark uses a six-digit email code through Supabase Auth and stores the account and quota records needed to provide the service.</p>
      <h2>Search and download data</h2>
      <p>Open Library and Google Books provide catalog metadata used to identify and preview books. Z-Library is the source for downloadable versions. Shelfmark records a normalized search query, result counts, timing, and download quota events on the server so the service can be measured and operated. It does not store your email address with product analytics or record complete download URLs.</p>
      <h2>Your local shelf and files</h2>
      <p>Saved book records live in this browser&apos;s local storage. EPUB and PDF files you import are stored in this browser&apos;s IndexedDB and are not uploaded to Shelfmark. Clearing site data or using a private browsing window may remove them.</p>
      <h2>Authentication and analytics</h2>
      <p>Supabase stores email authentication, account, daily quota, and higher-quota request records. PostHog US Cloud receives anonymous product events used to understand search and download performance. Shelfmark does not send email addresses, verification codes, book file contents, or complete download URLs to PostHog.</p>
      <p className="policy-date">Last updated: August 6, 2026</p>
    </main>
  );
}
