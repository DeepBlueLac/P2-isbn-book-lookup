import type { Metadata } from "next";
import { TaskLanding } from "@/components/task-landing";

export const metadata: Metadata = {
  title: "ISBN lookup",
  description: "Look up an ISBN-10 or ISBN-13 and find the matching book edition, metadata, and legitimate reading options.",
  alternates: { canonical: "/isbn-lookup" },
};

export default function IsbnLookupPage() {
  return <TaskLanding
    eyebrow="ISBN lookup"
    title="Look up a book by ISBN."
    description="Enter an ISBN-10 or ISBN-13 to identify an exact edition and see its available download, borrow, preview, purchase, or catalog routes."
    mode="isbn"
    placeholder="9780553418026"
    submitLabel="Look up this ISBN"
    steps={[
      "Shelfmark validates the ISBN and checks its configured book catalogs.",
      "Matching editions are merged without hiding their original sources.",
      "You choose a legitimate next step and can save the record on this device.",
    ]}
    related={[
      { href: "/find-book-by-title", label: "Find a book by title or author" },
      { href: "/public-domain-book-finder", label: "Find public-domain book downloads" },
    ]}
  />;
}
