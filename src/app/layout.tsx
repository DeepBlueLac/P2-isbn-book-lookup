import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Shelfmark — Find the book. Choose how to read it.",
    template: "%s · Shelfmark",
  },
  description: "Search a title, author, or ISBN and find a legitimate download, borrow, preview, purchase, or local-shelf path.",
  keywords: ["ISBN lookup", "where to read a book", "public domain epub", "book preview", "personal ebook library"],
  openGraph: {
    title: "Shelfmark — Find the book. Choose how to read it.",
    description: "Access-first book search with transparent sources and a private device-only shelf.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
