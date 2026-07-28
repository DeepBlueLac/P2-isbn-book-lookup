import type { QuotaSubject } from "./quota";
import { getSupabaseServiceClient } from "./supabase/server";

export type SearchUsageEvent = {
  type: "search";
  subject: QuotaSubject;
  query: string;
  mode: "isbn" | "search";
  resultCount: number;
  downloadableCount: number;
  zlibraryStatus: "available" | "unavailable" | "skipped";
  partial: boolean;
};

export type DownloadUsageEvent = {
  type: "download";
  subject: QuotaSubject;
  bookId: string;
  format: string;
  retry: boolean;
  downloadsUsed: number;
  remainingDownloads: number;
};

export function normalizeMetricQuery(query: string) {
  return query.trim().replace(/\s+/g, " ").toLowerCase();
}

export async function recordUsageEvent(event: SearchUsageEvent | DownloadUsageEvent) {
  const supabase = getSupabaseServiceClient();
  if (!supabase) return { recorded: false, skipped: true };

  const basePayload = {
    subject_kind: event.subject.kind,
    subject_id: event.subject.id,
  };

  const payload: Record<string, unknown> = event.type === "search"
    ? {
        ...basePayload,
        event_type: "search",
        normalized_query: normalizeMetricQuery(event.query),
        search_mode: event.mode,
        result_count: event.resultCount,
        downloadable_count: event.downloadableCount,
        zlibrary_status: event.zlibraryStatus,
        metadata: { partial: event.partial },
      }
    : {
        ...basePayload,
        event_type: "download",
        download_book_id: event.bookId,
        download_format: event.format.toLowerCase(),
        quota_downloads_used: event.downloadsUsed,
        metadata: {
          retry: event.retry,
          remainingDownloads: event.remainingDownloads,
        },
      };

  try {
    const { error } = await supabase.from("shelfmark_usage_events").insert(payload);
    return { recorded: !error, skipped: false };
  } catch {
    return { recorded: false, skipped: false };
  }
}
