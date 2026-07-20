import type { Metadata } from "next";
import { TaskLanding } from "@/components/task-landing";

export const metadata: Metadata = {
  title: "Find a book by title or author",
  description: "Search a book title or author and compare legitimate download, borrow, preview, purchase, and catalog routes.",
  alternates: { canonical: "/find-book-by-title" },
};

export default function FindBookByTitlePage() {
  return <TaskLanding
    eyebrow="Title and author search"
    title="Find a book by title or author."
    description="Search across Open Library, Google Books, and Project Gutenberg, then compare clearly labelled ways to read the book."
    mode="search"
    placeholder="Try The Martian or Octavia Butler"
    submitLabel="Find this book"
    steps={[
      "Shelfmark searches the available catalogs in parallel.",
      "Duplicate works and editions are grouped by ISBN or title and author.",
      "Each result names whether it is downloadable, borrowable, previewable, purchasable, or metadata only.",
    ]}
    related={[
      { href: "/isbn-lookup", label: "Look up an exact ISBN" },
      { href: "/public-domain-book-finder", label: "Find public-domain book downloads" },
    ]}
  />;
}
