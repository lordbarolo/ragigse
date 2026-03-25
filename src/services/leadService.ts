import { supabase } from "@/integrations/supabase/client";
import type { SurveyData } from "@/components/Survey";

export interface LeadData {
  id: string;
  employment_type: string;
  yrke: string | null;
  kommun: string | null;
  experience: number | null;
  salary_type: string | null;
  current_salary: number | null;
}

export interface LeadResponse {
  lead: LeadData;
  report_id: string | null;
  ab_variant: string;
  report_status: string | null;
  unlocked_by_referral: boolean;
}

/** Fetch lead + report metadata from backend */
export async function fetchLead(leadId: string): Promise<LeadResponse> {
  const { data, error } = await supabase.functions.invoke("get-lead", {
    body: { lead_id: leadId },
  });
  if (error || !data?.lead) throw new Error(data?.error || "Lead not found");
  return data as LeadResponse;
}

/** Convert LeadData to SurveyData shape for UI compatibility */
export function leadToSurvey(lead: LeadData): SurveyData & { track?: string } {
  return {
    email: "",
    employmentType: lead.employment_type as "anstalld" | "foretagare",
    yrke: lead.yrke || "",
    kommun: lead.kommun || "",
    experience: lead.experience || 0,
    salaryType: lead.salary_type === "hourly" || lead.salary_type === "monthly" ? lead.salary_type : "hourly",
    currentSalary: lead.current_salary || 0,
    obShare: "",
    track: "consultant",
  };
}

/** Create report via backend */
export async function createReport(params: {
  leadId: string;
  email?: string;
  survey: SurveyData;
  track?: string;
}): Promise<{ reportId: string; abVariant: string }> {
  const { data, error } = await supabase.functions.invoke("create-report", {
    body: {
      lead_id: params.leadId,
      email: params.email || undefined,
      occupation: params.survey.yrke,
      employment_type: params.survey.employmentType,
      kommun: params.survey.kommun,
      current_salary: params.survey.currentSalary,
      salary_type: params.survey.salaryType,
      track: params.track || "consultant",
    },
  });
  if (error || !data?.report_id) throw new Error(data?.error || "Failed to create report");
  return { reportId: data.report_id, abVariant: data.ab_variant || "A" };
}

/** Save email to lead + report (also creates auth user + consultant profile) */
export async function saveEmail(params: {
  leadId: string;
  reportId: string;
  email: string;
}): Promise<void> {
  const { error } = await supabase.functions.invoke("save-email", {
    body: { lead_id: params.leadId, report_id: params.reportId, email: params.email },
  });
  if (error) throw error;
}
