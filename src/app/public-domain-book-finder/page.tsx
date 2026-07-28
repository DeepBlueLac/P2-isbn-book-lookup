import type { Metadata } from "next";
import { TaskLanding } from "@/components/task-landing";

export const metadata: Metadata = {
  title: "Search downloadable book files",
  description: "Search by title, author, or ISBN and find downloadable EPUB, PDF, MOBI, and AZW3 book file options.",
  alternates: { canonical: "/public-domain-book-finder" },
  openGraph: {
    title: "Search downloadable book files · Shelfmark",
    description: "Search by title, author, or ISBN and find downloadable EPUB, PDF, MOBI, and AZW3 book file options.",
    url: "/public-domain-book-finder",
    images: [{ url: "/media/og-card.png", width: 1200, height: 630 }],
  },
};

export default function PublicDomainBookFinderPage() {
  return <TaskLanding
    eyebrow="File search"
    title="Search downloadable book files."
    description="Search for a title, author, or ISBN and compare available EPUB, PDF, MOBI, and AZW3 options."
    mode="search"
    access="public-domain"
    placeholder="Try The Martian or Pride and Prejudice"
    submitLabel="Find downloadable editions"
    steps={[
      "Shelfmark confirms the likely book first.",
      "Downloadable versions are grouped into compact rows.",
      "Format buttons stay visible so you can choose the file your reader supports.",
    ]}
    related={[
      { href: "/isbn-lookup", label: "Look up an exact ISBN" },
      { href: "/find-book-by-title", label: "Find a book by title or author" },
    ]}
    faq={[
      {
        question: "What file formats can I search for?",
        answer: "Shelfmark focuses on EPUB, PDF, MOBI, and AZW3 because those are the formats readers most often need for phones, tablets, e-readers, and desktop apps.",
      },
      {
        question: "Why keep this URL?",
        answer: "This page keeps the original search entry live while its task changes to downloadable book file search for the first public launch.",
      },
      {
        question: "What if no file is found?",
        answer: "Try the ISBN, add the author surname, or switch formats. Shelfmark keeps the book preview visible so you can quickly see whether the query matched the right work.",
      },
    ]}
  />;
}
