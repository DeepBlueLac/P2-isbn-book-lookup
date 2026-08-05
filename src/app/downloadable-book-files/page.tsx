import type { Metadata } from "next";
import { TaskLanding } from "@/components/task-landing";

export const metadata: Metadata = {
  title: "Search Downloadable Book Files",
  description: "Search by title, author, or ISBN and find downloadable EPUB, PDF, MOBI, and AZW3 book file options.",
  alternates: { canonical: "/downloadable-book-files" },
  openGraph: {
    title: "Search downloadable book files · Shelfmark",
    description: "Search by title, author, or ISBN and find downloadable EPUB, PDF, MOBI, and AZW3 book file options.",
    url: "/downloadable-book-files",
    images: [{ url: "/media/og-card.png", width: 1200, height: 630 }],
  },
};

export default function DownloadableBookFilesPage() {
  return <TaskLanding
    eyebrow="File search"
    title="Search downloadable book files."
    description="Search for a title, author, or ISBN and compare available EPUB, PDF, MOBI, and AZW3 options."
    mode="search"
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
        question: "Where do downloadable versions come from?",
        answer: "Shelfmark uses Z-Library for downloadable versions. Open Library and Google Books are used only to improve the book preview and help confirm that the result matches your search.",
      },
      {
        question: "What if no file is found?",
        answer: "Try the ISBN, add the author surname, or switch formats. Shelfmark keeps the book preview visible so you can quickly see whether the query matched the right work.",
      },
    ]}
  />;
}
