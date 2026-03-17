# Analytics Report Builder - Design Document

## 1. Overview

Board 이슈의 첨부 문서(CSV/JSON)를 파싱하여 Template 기반 출력물(차트/테이블)을 생성하고,
데이터 부족 시 Q&A로 보완하며, 모든 생성/수정을 이력으로 추적하는 시스템.

---

## 2. Database Schema

### 2.1 reports 테이블

```sql
CREATE TABLE reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  issue_id UUID REFERENCES issues(id) ON DELETE SET NULL,
  template_id TEXT NOT NULL,          -- 'revenue', 'users', 'custom'
  title TEXT NOT NULL,
  data JSONB NOT NULL DEFAULT '[]',   -- 파싱/입력된 데이터 배열
  chart_config JSONB NOT NULL DEFAULT '{}', -- 차트 설정
  qa_responses JSONB DEFAULT '[]',    -- Q&A 응답 이력
  version INTEGER NOT NULL DEFAULT 1,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_reports_issue_id ON reports(issue_id);
```

### 2.2 report_histories 테이블

```sql
CREATE TABLE report_histories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  data JSONB NOT NULL,
  chart_config JSONB NOT NULL,
  qa_responses JSONB DEFAULT '[]',
  change_note TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_report_histories_report_id ON report_histories(report_id);
```

### 2.3 RLS Policies

```sql
-- reports: 인증된 사용자 읽기/쓰기
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "reports_select" ON reports
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "reports_insert" ON reports
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "reports_update" ON reports
  FOR UPDATE TO authenticated
  USING (created_by = auth.uid()
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "reports_delete" ON reports
  FOR DELETE TO authenticated
  USING (created_by = auth.uid()
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- report_histories: 인증된 사용자 읽기, 자동 생성
ALTER TABLE report_histories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "report_histories_select" ON report_histories
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "report_histories_insert" ON report_histories
  FOR INSERT TO authenticated WITH CHECK (true);
```

---

## 3. Type Definitions

### 3.1 src/types/report.ts

```typescript
// ── Template 정의 ──

export interface FieldDef {
  key: string;                            // "date", "revenue"
  label: string;                          // "날짜", "매출"
  type: "string" | "number" | "date";
  question: string;                       // Q&A용 질문 텍스트
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
```

---

## 4. Built-in Templates

### 4.1 src/lib/report-templates.ts

```typescript
export const REPORT_TEMPLATES: ReportTemplate[] = [
  {
    id: "revenue",
    name: "매출 분석",
    description: "기간별 매출 데이터를 시각화합니다",
    requiredFields: [
      { key: "date", label: "날짜", type: "date", question: "데이터 기간(날짜)을 입력해주세요" },
      { key: "revenue", label: "매출", type: "number", question: "매출 금액을 입력해주세요 (단위: 만원)" },
    ],
    optionalFields: [
      { key: "category", label: "카테고리", type: "string", question: "매출 카테고리가 있으면 입력해주세요" },
      { key: "target", label: "목표", type: "number", question: "목표 매출이 있으면 입력해주세요" },
    ],
    charts: [
      { type: "bar", xKey: "date", yKeys: ["revenue"], title: "기간별 매출" },
      { type: "line", xKey: "date", yKeys: ["revenue", "target"], title: "매출 vs 목표" },
    ],
    tableColumns: ["date", "revenue", "category", "target"],
  },
  {
    id: "users",
    name: "사용자 분석",
    description: "사용자 증감 추이를 분석합니다",
    requiredFields: [
      { key: "date", label: "날짜", type: "date", question: "데이터 기간(날짜)을 입력해주세요" },
      { key: "users", label: "사용자 수", type: "number", question: "사용자 수를 입력해주세요" },
    ],
    optionalFields: [
      { key: "new_users", label: "신규 사용자", type: "number", question: "신규 가입자 수가 있으면 입력해주세요" },
      { key: "churn", label: "이탈 수", type: "number", question: "이탈 사용자 수가 있으면 입력해주세요" },
    ],
    charts: [
      { type: "area", xKey: "date", yKeys: ["users"], title: "사용자 추이" },
      { type: "bar", xKey: "date", yKeys: ["new_users", "churn"], title: "신규 vs 이탈" },
    ],
    tableColumns: ["date", "users", "new_users", "churn"],
  },
  {
    id: "custom",
    name: "커스텀",
    description: "데이터에 맞게 직접 차트를 구성합니다",
    requiredFields: [],
    optionalFields: [],
    charts: [],
  },
];
```

---

## 5. Library Functions

### 5.1 src/lib/csv-parser.ts — CSV 파싱

```typescript
export function parseCSV(text: string): ParsedData;
  // - 첫 줄 = 헤더, 나머지 = 데이터
  // - 숫자로 변환 가능한 값은 number로 변환
  // - 빈 값 허용

export function parseJSON(text: string): ParsedData;
  // - JSON 배열 파싱, 키 = 헤더

export async function parseAttachmentFile(filePath: string): Promise<ParsedData>;
  // - Supabase Storage에서 파일 다운로드
  // - content_type에 따라 parseCSV 또는 parseJSON 호출
```

### 5.2 src/lib/field-matcher.ts — 필드 매칭

```typescript
export function matchFields(
  template: ReportTemplate,
  parsed: ParsedData
): FieldMatchResult;
  // - template.requiredFields의 key를 parsed.headers와 비교
  // - 정확 매칭 우선, 유사 매칭(includes) 차선
  // - matched: 매칭된 필드+컬럼 쌍
  // - missing: 매칭 실패한 필수 필드 → Q&A 대상
```

### 5.3 src/lib/reports.ts — Report CRUD

```typescript
export async function fetchReports(): Promise<Report[]>;
export async function fetchReportsByIssueId(issueId: string): Promise<Report[]>;
export async function fetchReport(id: string): Promise<Report | null>;
export async function createReport(input: CreateReportInput): Promise<Report>;
export async function updateReport(id: string, input: UpdateReportInput): Promise<Report>;
  // - 업데이트 시 기존 데이터를 report_histories에 자동 저장
  // - version 자동 증가
export async function deleteReport(id: string): Promise<void>;
export async function fetchReportHistories(reportId: string): Promise<ReportHistory[]>;
```

---

## 6. Component Design

### 6.1 Page Layout — src/app/(dashboard)/analytics/page.tsx

```
┌─────────────────────────────────────────────────────────────┐
│ 분석                                           [+ 새 리포트] │
├──────────────────┬──────────────────────────────────────────┤
│ 이슈 & 리포트    │  출력물 영역                              │
│                  │                                          │
│ [이슈 목록]      │  [차트 1]          [차트 2]               │
│  ├─ 이슈 A       │                                          │
│  │  ├─ 리포트1   │  ┌──────────────────────────────────┐   │
│  │  └─ 리포트2   │  │        데이터 테이블              │   │
│  ├─ 이슈 B       │  └──────────────────────────────────┘   │
│  │  └─ 리포트3   │                                          │
│  └─ 리포트 없음   │  [이력 타임라인]                          │
│                  │   v3 ← v2 ← v1                          │
│ [첨부파일 목록]   │                                          │
│  file1.csv ✓     │  [Q&A 패널] (데이터 부족 시)              │
│  file2.json      │   "매출 금액을 입력해주세요"               │
│                  │   [입력] [건너뛰기]                       │
├──────────────────┴──────────────────────────────────────────┤
│ (하단 이전 Mock 차트 유지 — 기존 매출/사용자 차트)              │
└─────────────────────────────────────────────────────────────┘
```

### 6.2 Component Tree

```
analytics/page.tsx
├── ReportBuilder (NEW - 메인 컨테이너)
│   ├── IssuePicker                    — Board 이슈 목록 + 선택
│   │   └── AttachmentList             — 선택 이슈의 첨부 파일 목록
│   ├── TemplatePicker                 — 템플릿 선택 (매출/사용자/커스텀)
│   ├── QaForm                         — 부족한 데이터 Q&A 입력 폼
│   ├── ReportOutput                   — 출력물 렌더링
│   │   ├── DynamicChart               — Template ChartDef에 따른 동적 차트
│   │   └── DataTable                  — 데이터 테이블
│   ├── ReportHistory                  — 이력 타임라인
│   └── SavedReportList                — 저장된 리포트 목록
├── Card (기존 — 월별 매출 BarChart)
└── Card (기존 — 사용자 증가 AreaChart)
```

### 6.3 Component Specs

#### IssuePicker
- `fetchIssues()` 호출하여 이슈 목록 표시
- 이슈 선택 시 → `fetchAttachments(issueId)` 호출
- CSV/JSON 파일만 파싱 가능 표시 (아이콘 구분)
- 파일 클릭 → `parseAttachmentFile()` 실행

#### TemplatePicker
- `REPORT_TEMPLATES` 3종 카드 형태로 표시
- 선택 시 → `matchFields(template, parsedData)` 실행
- 매칭 결과에 따라 QaForm 또는 즉시 렌더링

#### QaForm
- `FieldMatchResult.missing` 필드에 대해 질문 폼 생성
- 각 필드: label, question, 입력란
- "적용" 버튼 → 입력값을 데이터에 병합 → 출력물 갱신
- "건너뛰기" → 해당 필드 없이 생성 (optional만)
- 반복 가능: 출력물 확인 후 "데이터 수정" → QaForm 재표시

#### DynamicChart
- Props: `chartDef: ChartDef`, `data: Record<string, any>[]`
- `chartDef.type`에 따라 Recharts 컴포넌트 분기:
  - bar → `<BarChart>`, line → `<LineChart>`, area → `<AreaChart>`, pie → `<PieChart>`
- 색상: `chartDef.colors` 또는 기본 팔레트

#### DataTable
- Props: `columns: string[]`, `data: Record<string, any>[]`
- 간단한 테이블 렌더링, 정렬 지원

#### ReportHistory
- `fetchReportHistories(reportId)` 호출
- 타임라인 UI: 버전 번호, 변경 메모, 시간
- 이전 버전 클릭 → 해당 버전 데이터로 출력물 미리보기

#### SavedReportList
- 이슈별 저장된 리포트 목록
- 클릭 → 해당 리포트 로드

---

## 7. State Management

```typescript
// analytics/page.tsx 로컬 상태
const [issues, setIssues] = useState<Issue[]>([]);
const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null);
const [attachments, setAttachments] = useState<Attachment[]>([]);
const [parsedData, setParsedData] = useState<ParsedData | null>(null);
const [selectedTemplate, setSelectedTemplate] = useState<ReportTemplate | null>(null);
const [matchResult, setMatchResult] = useState<FieldMatchResult | null>(null);
const [reportData, setReportData] = useState<Record<string, any>[]>([]);
const [qaResponses, setQaResponses] = useState<QaResponse[]>([]);
const [currentReport, setCurrentReport] = useState<Report | null>(null);
const [histories, setHistories] = useState<ReportHistory[]>([]);
const [showQa, setShowQa] = useState(false);
```

---

## 8. Data Flow

```
1. 이슈 선택
   fetchIssues() → setIssues
   사용자 클릭 → setSelectedIssue → fetchAttachments(issueId) → setAttachments

2. 파일 파싱
   사용자 파일 클릭 → parseAttachmentFile(filePath) → setParsedData

3. 템플릿 선택 & 매칭
   사용자 템플릿 클릭 → setSelectedTemplate
   matchFields(template, parsedData) → setMatchResult
   if missing.length > 0 → setShowQa(true)
   else → setReportData(parsedData.rows)

4. Q&A 응답
   사용자 입력 → setQaResponses 추가
   데이터 병합 → setReportData 갱신 → 차트 자동 업데이트

5. 저장
   createReport({ issue_id, template_id, title, data, chart_config, qa_responses })
   → setCurrentReport

6. 수정
   데이터 변경 → updateReport(id, { data, chart_config, qa_responses, change_note })
   → version 증가, 이전 버전 report_histories에 자동 기록
   → fetchReportHistories → setHistories
```

---

## 9. Implementation Order

| Step | File | Description |
|------|------|-------------|
| 1 | `supabase/migrations/012_reports.sql` | reports + report_histories 테이블, RLS |
| 2 | `src/types/report.ts` | 타입 정의 |
| 3 | `src/lib/report-templates.ts` | Built-in 템플릿 3종 |
| 4 | `src/lib/csv-parser.ts` | CSV/JSON 파서 + 첨부파일 파싱 |
| 5 | `src/lib/field-matcher.ts` | 필드 매칭 로직 |
| 6 | `src/lib/reports.ts` | Report CRUD + 이력 관리 |
| 7 | `src/components/reports/dynamic-chart.tsx` | 동적 차트 렌더링 |
| 8 | `src/components/reports/data-table.tsx` | 데이터 테이블 |
| 9 | `src/components/reports/issue-picker.tsx` | 이슈 선택기 |
| 10 | `src/components/reports/template-picker.tsx` | 템플릿 선택기 |
| 11 | `src/components/reports/qa-form.tsx` | Q&A 데이터 수집 폼 |
| 12 | `src/components/reports/report-history.tsx` | 이력 타임라인 |
| 13 | `src/components/reports/report-builder.tsx` | 메인 컨테이너 |
| 14 | `src/app/(dashboard)/analytics/page.tsx` | 페이지 개편 |

---

## 10. Dependencies

| Package | Purpose | Action |
|---------|---------|--------|
| recharts | 차트 | Existing |
| papaparse | CSV 파싱 | **Install** |
| @supabase/supabase-js | DB/Storage | Existing |
| lucide-react | 아이콘 | Existing |

---

## 11. Edge Cases

| Case | Handling |
|------|----------|
| 첨부 파일 없는 이슈 | "첨부 파일이 없습니다" 표시 + 수동 데이터 입력 안내 |
| 파싱 불가 파일 (PDF, 이미지) | 비활성 표시 + "CSV/JSON만 지원" 툴팁 |
| 빈 CSV | "데이터가 없습니다" 에러 토스트 |
| 커스텀 템플릿 | 파싱된 헤더를 그대로 사용, 사용자가 X/Y축 직접 선택 |
| 이슈 삭제 시 | `ON DELETE SET NULL` → 리포트는 유지, issue_id만 null |
| 대용량 CSV (>10만행) | 처음 1000행만 파싱 + 경고 표시 |
