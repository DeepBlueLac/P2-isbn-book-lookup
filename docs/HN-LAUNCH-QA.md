# Shelfmark HN Launch QA Log

## 2026-07-28 Local API Smoke

Environment:

- Local URL: `http://127.0.0.1:3022`
- Branch: `codex/p2-hn-launch`
- Query: `ç«æ˜Ÿæ•‘æ´`

Results:

| Check | Result |
| --- | --- |
| Search API | Passed |
| Catalog results | 21 books |
| Z-Library downloadable editions | 30 editions |
| First downloadable format | EPUB |
| Download intent generated | Yes |
| Proxy download response | HTTP 200 |
| Response content type | `application/epub+zip` |
| Attachment header | Present |
| Guest quota after first transfer | 2 remaining |

Validation method:

- Search request used `/api/books/search?q=ç«æ˜Ÿæ•‘æ´&mode=search`.
- Download request used `/api/books/download?token=...`.
- Download validation read response headers only with `ResponseHeadersRead`; no book file was saved to the repository.

Current blockers for Supabase persistence smoke:

- Supabase CLI is installed locally at `.tools/supabase/supabase.exe`, but the machine is not logged in to Supabase.
- `.env.local` does not yet contain Supabase URL, anon key, service role key, or PostHog key.

Migration ready to apply:

```text
supabase/migrations/202607280001_hn_launch_usage.sql
```

Vercel environment progress:

- `SHELFMARK_DOWNLOAD_SECRET` and `SHELFMARK_QUOTA_SECRET` were generated locally and added to Production, Preview, and Development.
- Z-Library variables were copied from Production to Preview and Development so Preview deploys can exercise the search/download path.

## 2026-07-29 Supabase Persistence Smoke

Supabase project:

- Project ref: `hgaolvkvgmgkdcahattj`
- Region: `ap-northeast-1`

Migration:

- `202607280001_hn_launch_usage.sql` pushed successfully.
- CLI emitted Docker catalog-cache warnings because Docker Desktop is not running, but the remote migration was applied.

Direct database smoke:

| Check | Result |
| --- | --- |
| Insert/select/delete `shelfmark_usage_events` | Passed |
| Insert/select/delete `shelfmark_quota_requests` | Passed |
| Read `shelfmark_daily_usage` view | Passed |

Application API smoke:

| Check | Result |
| --- | --- |
| `/api/books/search?q=ç«æ˜Ÿæ•‘æ´&mode=search` | HTTP 200 |
| Z-Library downloadable editions | 30 |
| Search event persisted | Yes |
| `/api/quota/requests` | HTTP 201 |
| Quota request persisted | Yes |
| Test quota request cleaned | Yes |
| `/api/books/download?token=...` | HTTP 200 |
| Download response content type | `application/epub+zip` |
| Download event persisted | Yes |
| Download event format | `epub` |
| Guest quota after transfer | 2 remaining |

## 2026-07-29 PostHog And Vercel Preview Smoke

PostHog:

| Check | Result |
| --- | --- |
| `NEXT_PUBLIC_POSTHOG_KEY` configured locally | Passed |
| `NEXT_PUBLIC_POSTHOG_KEY` configured on Vercel Production/Preview/Development | Passed |
| `NEXT_PUBLIC_POSTHOG_HOST` configured on Vercel Production/Preview/Development | Passed |
| Direct capture endpoint smoke to US Cloud | HTTP 200 |
| Browser analytics state on Preview | `posthogReady: true` |
| Browser product events on Preview | `page_view`, `search_submitted`, `zlib_results_loaded` |

Latest Preview:

```text
https://isbn-book-lookup-axsmyzs9i-deepbluelacs-projects.vercel.app
```

Preview API smoke:

| Check | Result |
| --- | --- |
| Direct internal Z-Library API with bearer token | HTTP 200 |
| Direct Z-Library results | 30 books |
| Public search API for `ç«æ˜Ÿæ•‘æ´` | HTTP 200 |
| Public search downloadable editions | 30 |
| First downloadable format | EPUB |
| Preview proxy download | HTTP 200 |
| Preview download content type | `application/epub+zip` |
| Preview attachment header | Present |
| Preview guest quota after transfer | 2 remaining |

Preview mobile UI smoke:

| Check | Result |
| --- | --- |
| Viewport | `390Ã—844` |
| Search submitted from UI | Passed |
| API returned downloadable editions | 30 |
| Result page contains format buttons | Passed |
| Buttons found | EPUB, PDF, MOBI, AZW3 |
| Screenshot | `tmp/preview-mobile-download-results.png` |

Note:

- The first Preview deployment had unreliable copied Z-Library Preview variables. Preview/Development Z-Library env was rewritten from local `.env.local`, then redeployed.
- `.vercelignore` was added to exclude local tools/caches after the first Preview upload exceeded Vercel's file-size limit.

## 2026-07-29 Cloudflare Production Smoke

Official production domain:

```text
https://books.bulidoge.site
```

Deployment:

- Platform: Cloudflare Workers / OpenNext
- Worker: `dbl-tools-shelfmark`
- Custom domain: `books.bulidoge.site`
- Worker version: `87cdbd1a-1eaa-4f7e-bd98-06072d6d1c53`

Production API smoke:

| Check | Result |
| --- | --- |
| Homepage | HTTP 200 |
| `/api/books/search?q=ç«æ˜Ÿæ•‘æ´&mode=search` | HTTP 200 |
| Catalog results | 1 book |
| Z-Library downloadable editions | 30 |
| First downloadable format | EPUB |
| Download intent generated | Yes |
| `/api/books/download?token=...` | HTTP 200 |
| Download response content type | `application/epub+zip` |
| Attachment header | Present |

Validation method:

- Search used the official production domain, not the Vercel deployment URL.
- Download validation read response headers only with `ResponseHeadersRead`; no book file was saved to the repository.

Production mobile UI smoke:

| Check | Result |
| --- | --- |
| Viewport | `390x844` |
| Search submitted from UI | Passed |
| Search API on official domain | HTTP 200 |
| Result page contains format buttons | Passed |
| Buttons found | EPUB, PDF, MOBI, AZW3 |
| Screenshot | `tmp/production-mobile-download-results.png` |

