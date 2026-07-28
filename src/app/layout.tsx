import type { Metadata } from "next";
import { Cormorant_Garamond, Manrope } from "next/font/google";
import "./globals.css";

const displayFont = Cormorant_Garamond({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
  display: "swap",
});

const uiFont = Manrope({
  subsets: ["latin"],
  variable: "--font-ui",
  display: "swap",
});

const SITE_URL = "https://books.bulidoge.site";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  applicationName: "Shelfmark",
  title: {
    default: "Shelfmark — Download book files faster",
    template: "%s · Shelfmark",
  },
  description: "Search by ISBN, title, or author. Get a clean book preview and find downloadable EPUB, PDF, MOBI, and AZW3 file options faster.",
  keywords: ["ISBN lookup", "book file search", "ebook download search", "EPUB book search", "PDF book search"],
  openGraph: {
    siteName: "Shelfmark",
    title: "Shelfmark — Download book files faster",
    description: "Search by ISBN, title, or author, then compare downloadable EPUB, PDF, MOBI, and AZW3 file options.",
    type: "website",
    url: SITE_URL,
    images: [{ url: "/media/og-card.png", width: 1200, height: 630, alt: "Shelfmark — download book files faster" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Shelfmark — Download book files faster",
    description: "Search by ISBN, title, or author and compare downloadable book file options.",
    images: ["/media/og-card.png"],
  },
};

const siteJsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website`,
      url: SITE_URL,
      name: "Shelfmark",
      description: "Download-focused book search: title, author, or ISBN in, clean preview and file options out.",
      potentialAction: {
        "@type": "SearchAction",
        target: { "@type": "EntryPoint", urlTemplate: `${SITE_URL}/?q={search_term_string}` },
        "query-input": "required name=search_term_string",
      },
    },
    {
      "@type": "WebApplication",
      "@id": `${SITE_URL}/#app`,
      name: "Shelfmark",
      url: SITE_URL,
      applicationCategory: "ReferenceApplication",
      operatingSystem: "Any",
      offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
      description: "Search books by title, author, or ISBN, confirm the edition, and find downloadable EPUB, PDF, MOBI, and AZW3 file options.",
    },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${uiFont.variable} ${displayFont.variable}`}>
      <body>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(siteJsonLd) }}
        />
        {children}
      </body>
    </html>
  );
}
