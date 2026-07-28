import { z } from "zod";

import type { QuotaSubject } from "./quota";
import { getSupabaseServiceClient } from "./supabase/server";

export const quotaRequestSchema = z.object({
  expectedDailyDownloads: z.enum(["20", "50", "100", "unlimited"]),
  useCase: z.enum(["personal_reading", "study_research", "collection_management", "other"]),
});

export type QuotaRequest = z.infer<typeof quotaRequestSchema> & {
  id: string;
  subjectKind: QuotaSubject["kind"];
  subjectId: string;
  email: string | null;
  createdAt: string;
  status: "recorded";
};

const memoryRequests: QuotaRequest[] = [];

export async function recordQuotaRequest(subject: QuotaSubject, input: z.infer<typeof quotaRequestSchema>) {
  const id = crypto.randomUUID();
  const createdAt = new Date().toISOString();
  const request: QuotaRequest = {
    ...input,
    id,
    subjectKind: subject.kind,
    subjectId: subject.id,
    email: subject.email,
    createdAt,
    status: "recorded",
  };
  memoryRequests.unshift(request);
  const supabase = getSupabaseServiceClient();
  if (supabase) {
    try {
      await supabase.from("shelfmark_quota_requests").insert({
        id,
        subject_kind: subject.kind,
        subject_id: subject.id,
        email: subject.email,
        expected_daily_downloads: input.expectedDailyDownloads,
        use_case: input.useCase,
        status: "recorded",
        created_at: createdAt,
      });
    } catch {
      return request;
    }
  }
  return request;
}

export function listQuotaRequestsForTests() {
  return memoryRequests;
}
