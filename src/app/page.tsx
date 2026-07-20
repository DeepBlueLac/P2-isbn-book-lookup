import type { Metadata } from "next";
import { BookLookup } from "@/components/book-lookup";

export const metadata: Metadata = {
  title: "Find a book",
  description: "Search a title, author, or ISBN and choose a legitimate way to read it.",
  alternates: { canonical: "/" },
};

export default function Home() {
  return <BookLookup />;
}
