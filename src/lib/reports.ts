import { supabase } from "./supabase";
import type { Report, ReportHistory, ChartDef, QaResponse } from "@/types/report";

const USE_MOCK = !process.env.NEXT_PUBLIC_SUPABASE_URL;

function mapReport(row: Record<string, unknown>): Report {
  return {
    id: row.id as string,
    issue_id: (row.issue_id as string) ?? null,
    template_id: row.template_id as string,
    title: row.title as string,
    data: (row.data as Record<string, string | number>[]) ?? [],
    chart_config: (row.chart_config as ChartDef[]) ?? [],
    qa_responses: (row.qa_responses as QaResponse[]) ?? [],
    version: (row.version as number) ?? 1,
    created_by: (row.created_by as string) ?? null,
    created_at: (row.created_at as string) ?? "",
    updated_at: (row.updated_at as string) ?? "",
  };
}

function mapHistory(row: Record<string, unknown>): ReportHistory {
  return {
    id: row.id as string,
    report_id: row.report_id as string,
    version: (row.version as number) ?? 1,
    data: (row.data as Record<string, string | number>[]) ?? [],
    chart_config: (row.chart_config as ChartDef[]) ?? [],
    qa_responses: (row.qa_responses as QaResponse[]) ?? [],
    change_note: (row.change_note as string) ?? null,
    created_by: (row.created_by as string) ?? null,
    created_at: (row.created_at as string) ?? "",
  };
}

export async function fetchReports(): Promise<Report[]> {
  if (USE_MOCK) return [];
  const { data, error } = await supabase
    .from("reports")
    .select("*")
    .order("updated_at", { ascending: false });
  if (error) return [];
  return (data ?? []).map(mapReport);
}

export async function fetchReportsByIssueId(issueId: string): Promise<Report[]> {
  if (USE_MOCK) return [];
  const { data, error } = await supabase
    .from("reports")
    .select("*")
    .eq("issue_id", issueId)
    .order("updated_at", { ascending: false });
  if (error) return [];
  return (data ?? []).map(mapReport);
}

export async function fetchReport(id: string): Promise<Report | null> {
  if (USE_MOCK) return null;
  const { data, error } = await supabase
    .from("reports")
    .select("*")
    .eq("id", id)
    .single();
  if (error || !data) return null;
  return mapReport(data);
}

export interface CreateReportInput {
  issue_id?: string | null;
  template_id: string;
  title: string;
  data: Record<string, string | number>[];
  chart_config: ChartDef[];
  qa_responses?: QaResponse[];
}

export async function createReport(input: CreateReportInput): Promise<Report> {
  const { data: { user } } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from("reports")
    .insert({
      issue_id: input.issue_id || null,
      template_id: input.template_id,
      title: input.title,
      data: input.data,
      chart_config: input.chart_config,
      qa_responses: input.qa_responses ?? [],
      version: 1,
      created_by: user?.id ?? null,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return mapReport(data);
}

export interface UpdateReportInput {
  title?: string;
  data?: Record<string, string | number>[];
  chart_config?: ChartDef[];
  qa_responses?: QaResponse[];
  change_note?: string;
}

export async function updateReport(
  id: string,
  input: UpdateReportInput,
): Promise<Report> {
  const { data: { user } } = await supabase.auth.getUser();

  // 1. 현재 버전을 이력에 저장
  const current = await fetchReport(id);
  if (current) {
    await supabase.from("report_histories").insert({
      report_id: id,
      version: current.version,
      data: current.data,
      chart_config: current.chart_config,
      qa_responses: current.qa_responses,
      change_note: input.change_note ?? null,
      created_by: user?.id ?? null,
    });
  }

  // 2. 리포트 업데이트 (version +1)
  const updateData: Record<string, unknown> = {
    version: (current?.version ?? 0) + 1,
    updated_at: new Date().toISOString(),
  };
  if (input.title !== undefined) updateData.title = input.title;
  if (input.data !== undefined) updateData.data = input.data;
  if (input.chart_config !== undefined) updateData.chart_config = input.chart_config;
  if (input.qa_responses !== undefined) updateData.qa_responses = input.qa_responses;

  const { data, error } = await supabase
    .from("reports")
    .update(updateData)
    .eq("id", id)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return mapReport(data);
}

export async function deleteReport(id: string): Promise<void> {
  const { error } = await supabase.from("reports").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function fetchReportHistories(reportId: string): Promise<ReportHistory[]> {
  if (USE_MOCK) return [];
  const { data, error } = await supabase
    .from("report_histories")
    .select("*")
    .eq("report_id", reportId)
    .order("version", { ascending: false });
  if (error) return [];
  return (data ?? []).map(mapHistory);
}
