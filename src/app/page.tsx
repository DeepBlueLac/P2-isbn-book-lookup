import type { Metadata } from "next";
import { BookLookup } from "@/components/book-lookup";

export const metadata: Metadata = {
  title: "Search Book Files by ISBN, Title or Author",
  description: "Search by ISBN, title, or author, confirm the right book, and find downloadable EPUB, PDF, MOBI, and AZW3 file options faster.",
  alternates: { canonical: "/" },
};

export default function Home() {
  return <BookLookup />;
}
