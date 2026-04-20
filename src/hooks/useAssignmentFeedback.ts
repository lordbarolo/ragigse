import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";

export type FeedbackStage = "start" | "end";

export interface PendingFeedback {
  representation_request_id: string;
  stage: FeedbackStage;
  consultant_name: string | null;
  agency_name: string;
  unit: string | null;
  region: string;
  period_start: string | null;
  period_end: string | null;
  feedback_id: string | null; // existing row id if snoozed
}

/**
 * Detects if the consultant has any signed representation request whose
 * start_date is in the past (start-stage) or end_date is in the past (end-stage),
 * and returns the first pending feedback that is not yet responded and not snoozed.
 */
export function useAssignmentFeedback(user: User | null) {
  const [pending, setPending] = useState<PendingFeedback | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.email) {
      setLoading(false);
      return;
    }

    const today = new Date().toISOString().slice(0, 10);
    const nowIso = new Date().toISOString();

    (async () => {
      // 1. Fetch signed representation requests where this user is the consultant
      const { data: requests, error: reqErr } = await supabase
        .from("ref_representation_requests_safe" as any)
        .select("id, agency_name, unit, region, consultant_name, period_start, period_end")
        .eq("consultant_email", user.email!.toLowerCase())
        .eq("status", "signed")
        .order("period_start", { ascending: false })
        .limit(20);

      if (reqErr || !requests || requests.length === 0) {
        setLoading(false);
        return;
      }

      const reqIds = (requests as any[]).map((r) => r.id);

      // 2. Fetch existing feedback rows
      const { data: existing } = await supabase
        .from("assignment_feedback")
        .select("id, representation_request_id, feedback_stage, responded_at, snoozed_until")
        .in("representation_request_id", reqIds);

      const feedbackMap = new Map<string, any>();
      (existing ?? []).forEach((f: any) => {
        feedbackMap.set(`${f.representation_request_id}:${f.feedback_stage}`, f);
      });

      // 3. Find first request needing feedback
      for (const req of requests as any[]) {
        const candidates: FeedbackStage[] = [];
        if (req.period_start && req.period_start <= today) candidates.push("start");
        if (req.period_end && req.period_end < today) candidates.push("end");

        for (const stage of candidates) {
          const fb = feedbackMap.get(`${req.id}:${stage}`);
          if (fb?.responded_at) continue;
          if (fb?.snoozed_until && fb.snoozed_until > nowIso) continue;

          setPending({
            representation_request_id: req.id,
            stage,
            consultant_name: req.consultant_name,
            agency_name: req.agency_name,
            unit: req.unit,
            region: req.region,
            period_start: req.period_start,
            period_end: req.period_end,
            feedback_id: fb?.id ?? null,
          });
          setLoading(false);
          return;
        }
      }

      setLoading(false);
    })();
  }, [user?.id, user?.email]);

  const dismiss = () => setPending(null);

  return { pending, loading, dismiss };
}
