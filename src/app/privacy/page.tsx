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
      <p>Shelfmark does not require an account. Searches are sent to the catalog adapters needed to answer them, and the app does not store your query history as a user profile.</p>
      <h2>Your shelf and files</h2>
      <p>Saved book records live in this browser&apos;s local storage. EPUB and PDF files are stored in this browser&apos;s IndexedDB and are not uploaded to Shelfmark. Clearing site data or using a private browsing window may remove them.</p>
      <h2>Third-party sources</h2>
      <p>Search results and links come from Open Library, Google Books, and Project Gutenberg. When you follow a preview, borrow, purchase, or download link, that destination&apos;s terms and privacy policy apply.</p>
      <h2>Access analytics</h2>
      <p>Shelfmark uses Cloudflare Web Analytics to count page visits and measure page performance. It does not use cookies or collect query text, file names, book descriptions, file contents, or a personal reading profile.</p>
      <p className="policy-date">Last updated: July 18, 2026</p>
    </main>
  );
}
