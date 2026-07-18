# Shelfmark

Find the book. Choose how to read it.

Shelfmark is an access-first book search tool for readers who want a clear, legitimate next step: a public-domain download, a library borrow link, a publisher preview, a purchase route, or a device-only shelf record.

## Features

- Search by title, author, or ISBN-10/ISBN-13
- Merge Open Library, Project Gutenberg, and optional Google Books results
- Label public-domain download, borrow, preview, purchase, and catalog-only states explicitly
- Save records to a private browser shelf without an account
- Import user-owned EPUB/PDF files into browser IndexedDB and reopen them locally
- Copy a clean book summary for notes or catalog work
- Barcode scanning on supported Capacitor Android builds

The product never treats an access-limited preview as a free download. A download action is shown only when the upstream source explicitly supplies a public-domain file link.

## 本地运行

```bash
npm install
cp .env.example .env.local
npm run dev
```

Configure `.env.local` when needed:

```text
GOOGLE_BOOKS_API_KEY=optional_server_side_key
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

The Google key is read only by the Next.js Route Handler and is never sent to the browser. Open Library and Gutendex can work without it.

## 验证

```bash
npm run check
npm test
npm run build
```

## Data and privacy

- Metadata and legitimate destination links come from [Open Library](https://openlibrary.org/developers/api), [Google Books](https://developers.google.com/books/docs/v1/using), and [Gutendex](https://gutendex.com/).
- Saved records use browser local storage. User EPUB/PDF files use browser IndexedDB and are not uploaded.
- Availability varies by edition, country, and source policy. Users must check local copyright rules.
- Source details and the product boundary are recorded in [docs/DATA-SOURCES.md](docs/DATA-SOURCES.md).

## Explicit non-goals

- No Z-Library or shadow-library integration
- No DRM circumvention or copyright-unclear file sources
- No accounts, cloud sync, community, team permissions, or admin console

The earlier Z-Library feasibility note is retained as an audit record in [docs/ZLIBRARY-FEASIBILITY.md](docs/ZLIBRARY-FEASIBILITY.md); it is not a product dependency.
