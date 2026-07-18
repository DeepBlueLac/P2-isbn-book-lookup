# API canary — 2026-07-18

## Local server

- Base URL: `http://127.0.0.1:3000`
- No Z-Library, Tor, bridge, or account was used.

## Observed results

- `Pride and Prejudice` returned Project Gutenberg records with an explicit EPUB source link and `public-domain` classification.
- `The Martian` returned catalog results without attempting a copyrighted file download; the UI exposes source and access labels so a same-title public-domain record is not silently represented as Andy Weir’s edition.
- Open Library and Google Books timed out in the local Node network; the response preserved successful Gutenberg results and reported the other sources as unavailable.
- After the source timeout was reduced to 4.5 seconds, the worst observed response was approximately 4.6 seconds rather than waiting for the 8-second upstream default.

## Decision

Partial-source success is acceptable for the MVP. Before public launch, verify the Vercel region can reach Open Library and Google Books, configure a server-side Google key only if needed, and keep the source status rail visible.
