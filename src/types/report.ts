// ── Template 정의 ──

export interface FieldDef {
  key: string;
  label: string;
  type: "string" | "number" | "date";
  question: string;
}

export interface ChartDef {
  type: "bar" | "line" | "area" | "pie";
  xKey: string;
  yKeys: string[];
  title: string;
  colors?: string[];
}

export interface ReportTemplate {
  id: string;
  name: string;
  description: string;
  requiredFields: FieldDef[];
  optionalFields: FieldDef[];
  charts: ChartDef[];
  tableColumns?: string[];
}

// ── Report 데이터 ──

export interface QaResponse {
  fieldKey: string;
  question: string;
  answer: string;
  answeredAt: string;
}

export interface Report {
  id: string;
  issue_id: string | null;
  template_id: string;
  title: string;
  data: Record<string, string | number>[];
  chart_config: ChartDef[];
  qa_responses: QaResponse[];
  version: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ReportHistory {
  id: string;
  report_id: string;
  version: number;
  data: Record<string, string | number>[];
  chart_config: ChartDef[];
  qa_responses: QaResponse[];
  change_note: string | null;
  created_by: string | null;
  created_at: string;
}

// ── 파싱 결과 ──

export interface ParsedData {
  headers: string[];
  rows: Record<string, string | number>[];
  fileName: string;
}

// ── 필드 매칭 결과 ──

export interface FieldMatchResult {
  matched: { field: FieldDef; column: string }[];
  missing: FieldDef[];
}
