# Shelfmark

Find the book. Get the file.

Live: https://books.bulidoge.site

Shelfmark is a download-focused book search tool. Search by ISBN, title, or author, confirm the right book from a compact preview, then compare available EPUB, PDF, MOBI, and AZW3 file options.

## What it does

- Search by title, author, ISBN-10, or ISBN-13
- Show a compact book preview with cover, author, publisher, year, language, ISBN, and description
- Find downloadable file versions and group formats into clear rows
- Download through a server-side file flow instead of exposing upstream file URLs
- Let guests try downloads before signing in
- Use email OTP sign-in for higher daily download limits
- Keep a browser-local shelf for saved records and user-imported EPUB/PDF files

## Launch scope

The Hacker News launch version focuses on one path:

```text
Search
→ preview the likely book
→ compare downloadable versions
→ download a selected file format
```

Open Library and Google Books metadata may be used to improve the top preview. Downloadable versions are handled by the configured server-side connector.

## Local development

```bash
npm install
cp .env.example .env.local
npm run dev
```

Useful environment variables:

```text
NEXT_PUBLIC_SITE_URL=http://localhost:3000
GOOGLE_BOOKS_API_KEY=optional_server_side_key
OPEN_LIBRARY_CONTACT_EMAIL=you@example.com

ZLIBRARY_BASE_URL=
ZLIBRARY_EMAIL=
ZLIBRARY_PASSWORD=
ZLIBRARY_TIMEOUT_MS=30000
SHELFMARK_DOWNLOAD_SECRET=
SHELFMARK_QUOTA_SECRET=

NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
ADMIN_EMAILS=

NEXT_PUBLIC_POSTHOG_KEY=
NEXT_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com
```

## Verification

```bash
npm run check
npm test
npm run build
```

HN launch specification: [docs/HN-LAUNCH-SPEC.md](docs/HN-LAUNCH-SPEC.md)
