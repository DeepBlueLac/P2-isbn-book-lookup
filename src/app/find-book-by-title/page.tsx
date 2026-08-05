import type { Metadata } from "next";
import { TaskLanding } from "@/components/task-landing";

export const metadata: Metadata = {
  title: "Find downloadable book files by title or author",
  description: "Search a book title or author, confirm the right edition, and find downloadable EPUB, PDF, MOBI, and AZW3 file options.",
  alternates: { canonical: "/find-book-by-title" },
  openGraph: {
    title: "Find downloadable book files by title or author · Shelfmark",
    description: "Search a book title or author, confirm the right edition, and find downloadable EPUB, PDF, MOBI, and AZW3 file options.",
    url: "/find-book-by-title",
    images: [{ url: "/media/og-card.png", width: 1200, height: 630 }],
  },
};

export default function FindBookByTitlePage() {
  return <TaskLanding
    eyebrow="Title and author search"
    title="Find downloadable files by title or author."
    description="Search a book title or author, confirm the right edition, then compare available EPUB, PDF, MOBI, and AZW3 options."
    mode="search"
    placeholder="Try The Martian or Octavia Butler"
    submitLabel="Find this book"
    steps={[
      "Shelfmark finds the most likely book preview first.",
      "Downloadable versions are grouped by title, author, publisher, year, and language.",
      "Each row keeps EPUB, PDF, MOBI, and AZW3 actions close together.",
    ]}
    related={[
      { href: "/isbn-lookup", label: "Look up an exact ISBN" },
      { href: "/downloadable-book-files", label: "Search downloadable book files" },
    ]}
    faq={[
      {
        question: "What does Shelfmark search?",
        answer: "Shelfmark uses public catalog metadata to confirm the book preview, then focuses the result list on downloadable file options.",
      },
      {
        question: "What if I only remember part of the title?",
        answer: "Type the words you remember, optionally with the author's surname — for example 'martian weir'. The catalogs match partial titles, and grouping by work keeps near-duplicate editions from flooding the results.",
      },
      {
        question: "Does every result have a file?",
        answer: "No. If no downloadable version is found, Shelfmark keeps the book preview visible and asks you to adjust the title, author, ISBN, or format.",
      },
    ]}
  />;
}
