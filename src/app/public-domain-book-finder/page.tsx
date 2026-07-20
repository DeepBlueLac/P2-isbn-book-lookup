import type { Metadata } from "next";
import { TaskLanding } from "@/components/task-landing";

export const metadata: Metadata = {
  title: "Public-domain book finder",
  description: "Find clearly labelled public-domain EPUB, PDF, and official download pages without confusing previews with free ebooks.",
  alternates: { canonical: "/public-domain-book-finder" },
};

export default function PublicDomainBookFinderPage() {
  return <TaskLanding
    eyebrow="Public-domain access"
    title="Find a legitimate public-domain edition."
    description="Search for a title or author and filter the results to editions with an official public-domain or open-access download route."
    mode="search"
    access="public-domain"
    placeholder="Try Pride and Prejudice"
    submitLabel="Find downloadable editions"
    steps={[
      "Shelfmark checks Project Gutenberg and the open-access signals returned by its other sources.",
      "Results open with the public-domain filter selected.",
      "Restricted previews and lendable editions stay labelled as previews or borrowing, never as free downloads.",
    ]}
    related={[
      { href: "/isbn-lookup", label: "Look up an exact ISBN" },
      { href: "/find-book-by-title", label: "Find a book by title or author" },
    ]}
  />;
}
