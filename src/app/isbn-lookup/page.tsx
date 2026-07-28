import type { Metadata } from "next";
import { TaskLanding } from "@/components/task-landing";

export const metadata: Metadata = {
  title: "ISBN lookup",
  description: "Look up an ISBN-10 or ISBN-13, confirm the exact book, and find downloadable EPUB, PDF, MOBI, and AZW3 file options.",
  alternates: { canonical: "/isbn-lookup" },
  openGraph: {
    title: "ISBN lookup · Shelfmark",
    description: "Look up an ISBN-10 or ISBN-13, confirm the exact book, and find downloadable EPUB, PDF, MOBI, and AZW3 file options.",
    url: "/isbn-lookup",
    images: [{ url: "/media/og-card.png", width: 1200, height: 630 }],
  },
};

export default function IsbnLookupPage() {
  return <TaskLanding
    eyebrow="ISBN lookup"
    title="Look up a book by ISBN."
    description="Enter an ISBN-10 or ISBN-13 to identify an exact edition and search for downloadable book file options."
    mode="isbn"
    placeholder="9780553418026"
    submitLabel="Look up this ISBN"
    steps={[
      "Shelfmark validates the ISBN and confirms the matching book preview.",
      "Matching downloadable versions are grouped without hiding format differences.",
      "You choose EPUB, PDF, MOBI, or AZW3 and can save the record on this device.",
    ]}
    related={[
      { href: "/find-book-by-title", label: "Find a book by title or author" },
      { href: "/public-domain-book-finder", label: "Search downloadable book files" },
    ]}
    faq={[
      {
        question: "What is the difference between ISBN-10 and ISBN-13?",
        answer: "ISBN-13 is the current standard: thirteen digits, usually starting with 978 or 979. ISBN-10 is the older ten-character form used before 2007. Shelfmark accepts both and treats them as the same edition when they refer to the same book.",
      },
      {
        question: "Why does one book have several ISBNs?",
        answer: "Each edition and format gets its own ISBN — hardcover, paperback, ebook, and translations are all registered separately. If your ISBN finds a different format than you expected, search by title to see the other editions of the same work.",
      },
      {
        question: "Can I search for a downloadable file from an ISBN?",
        answer: "Yes. ISBN lookup is the most precise way to confirm an edition before checking whether Shelfmark can find EPUB, PDF, MOBI, or AZW3 options.",
      },
    ]}
  />;
}
