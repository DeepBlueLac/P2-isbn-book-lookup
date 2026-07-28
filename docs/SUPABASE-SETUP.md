# Shelfmark Supabase Setup

This project uses Supabase for:

- email OTP authentication;
- server-side usage event storage;
- higher quota request records;
- future admin views.

## Local CLI

The Supabase CLI is installed locally for this workspace at:

```powershell
.tools\supabase\supabase.exe
```

`.tools/` is intentionally ignored by Git.

## Migration

The HN launch schema is:

```text
supabase/migrations/202607280001_hn_launch_usage.sql
```

It creates:

- `shelfmark_usage_events`
- `shelfmark_daily_usage`
- `shelfmark_quota_requests`

## Required environment variables

Set these in `.env.local` and in the Vercel project:

```text
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
ADMIN_EMAILS=
NEXT_PUBLIC_POSTHOG_KEY=
NEXT_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com
```

Already generated locally and added to Vercel:

```text
SHELFMARK_DOWNLOAD_SECRET
SHELFMARK_QUOTA_SECRET
```

## Apply the migration

Option A: CLI

```powershell
.\.tools\supabase\supabase.exe login
.\.tools\supabase\supabase.exe link --project-ref <your-project-ref>
.\.tools\supabase\supabase.exe db push
```

Current linked project:

```text
hgaolvkvgmgkdcahattj
```

The HN launch migration has been pushed successfully.

Option B: Supabase SQL Editor

Open the SQL editor in the Supabase dashboard and run the full contents of:

```text
supabase/migrations/202607280001_hn_launch_usage.sql
```

## After migration

Run a local smoke test:

1. open `http://127.0.0.1:3022`;
2. search `火星救援`;
3. click one EPUB/PDF download;
4. confirm rows appear in:
   - `shelfmark_usage_events`;
   - `shelfmark_daily_usage`;
5. submit a higher quota request and confirm a row appears in `shelfmark_quota_requests`.
