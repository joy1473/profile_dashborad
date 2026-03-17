# Bid Document Builder - Design Document

## 1. Overview

Analytics 페이지를 입찰문서 작성기로 전면 개편.
Board 이슈의 첨부 문서(RFP, 내부 자료)를 참조하며 단계별 위자드로 제안서/견적서를 HTML로 생성.
기존 `reports`/`report_histories` 테이블 재활용.

---

## 2. Database

### 2.1 기존 테이블 재활용 (변경 없음)

- `reports`: template_id = "proposal" | "estimate", data = JSONB (위자드 전체 데이터)
- `report_histories`: 버전 이력

### 2.2 기존 lib/reports.ts CRUD 그대로 사용

- `createReport`, `updateReport`, `deleteReport`, `fetchReportsByIssueId`, `fetchReportHistories`

---

## 3. Type Definitions

### 3.1 src/types/bid.ts

```typescript
// ── 제안서 데이터 ──
export interface ProposalData {
  // Step 1: 기본 정보
  projectName: string;
  clientName: string;
  submitDate: string;
  company: {
    name: string;
    ceo: string;
    phone: string;
    address: string;
  };
  // Step 2: 회사 소개
  companyIntro: string;
  trackRecord: { project: string; client: string; period: string; amount: string }[];
  // Step 3: 기술 방안
  understanding: string;
  strategy: string;
  systemDiagram: string;
  techDetail: string;
  // Step 4: 추진 일정
  totalPeriod: string;
  schedule: { phase: string; period: string; deliverable: string }[];
  // Step 5: 투입 인력
  team: { name: string; role: string; grade: string; period: string }[];
  // Step 6: 비용
  costs: { item: string; qty: number; unitPrice: number; amount: number }[];
  vatIncluded: boolean;
}

// ── 견적서 데이터 ──
export interface EstimateData {
  // Step 1: 기본 정보
  title: string;
  recipient: { company: string; contact: string };
  sender: { company: string; ceo: string; phone: string };
  date: string;
  validUntil: string;
  // Step 2: 견적 항목
  items: { name: string; spec: string; qty: number; unitPrice: number; amount: number }[];
  // Step 3: 조건
  deliveryTerms: string;
  paymentTerms: string;
  notes: string;
}

// ── 위자드 Step ──
export interface WizardStep {
  id: number;
  label: string;
  isValid: (data: ProposalData | EstimateData) => boolean;
}

// ── 템플릿 타입 ──
export type BidTemplateId = "proposal" | "estimate";
```

---

## 4. Template Definitions

### 4.1 src/lib/bid-templates.ts

```typescript
export const PROPOSAL_STEPS: WizardStep[] = [
  { id: 1, label: "기본 정보" },
  { id: 2, label: "회사 소개" },
  { id: 3, label: "기술 방안" },
  { id: 4, label: "추진 일정" },
  { id: 5, label: "투입 인력" },
  { id: 6, label: "비용" },
  { id: 7, label: "미리보기" },
];

export const ESTIMATE_STEPS: WizardStep[] = [
  { id: 1, label: "기본 정보" },
  { id: 2, label: "견적 항목" },
  { id: 3, label: "조건/비고" },
  { id: 4, label: "미리보기" },
];

export const EMPTY_PROPOSAL: ProposalData = { ... };
export const EMPTY_ESTIMATE: EstimateData = { ... };
```

---

## 5. Component Design

### 5.1 Component Tree

```
analytics/page.tsx
└── BidBuilder (메인 컨테이너)
    ├── IssuePicker (좌측 — 이슈 + 저장문서 + 첨부파일)
    │   ├── 이슈 목록 (fetchIssues)
    │   ├── SavedDocList (저장된 제안서/견적서)
    │   ├── AttachmentViewer (첨부파일 다운로드 링크)
    │   └── DocumentHistory (이력 타임라인)
    ├── TemplateSelector (제안서 / 견적서 선택)
    ├── StepNavigator (스텝 진행바)
    ├── Proposal Steps (조건부)
    │   ├── StepBasic
    │   ├── StepCompany
    │   ├── StepTech
    │   ├── StepSchedule
    │   ├── StepTeam
    │   ├── StepCost
    │   └── ProposalPreview
    ├── Estimate Steps (조건부)
    │   ├── EstStepBasic
    │   ├── EstStepItems
    │   ├── EstStepTerms
    │   └── EstimatePreview
    └── WizardControls (이전/다음/저장 버튼)
```

### 5.2 Component Specs

#### BidBuilder (src/components/bid/bid-builder.tsx)
- 전체 상태 관리: selectedIssue, templateId, currentStep, formData
- 이슈 선택 시 저장된 문서 목록 로드
- 저장 시 reports 테이블에 CRUD

#### StepNavigator (src/components/bid/step-navigator.tsx)
- Props: `steps: WizardStep[]`, `currentStep: number`, `onStepClick`
- 수평 진행바, 완료/현재/미완료 상태 표시
- 클릭으로 스텝 이동 가능

#### DynamicRows (src/components/bid/dynamic-rows.tsx)
- Props: `columns: { key, label, type }[]`, `rows: Record[]`, `onChange`, `onAdd`, `onRemove`
- 동적 행 추가/삭제 테이블
- 금액 자동 계산 (qty * unitPrice = amount)
- 합계행 표시

#### AttachmentViewer (src/components/bid/attachment-viewer.tsx)
- Props: `issueId: string`
- 첨부 파일 목록 (fetchAttachments)
- 다운로드 링크 (getSignedDownloadUrl)
- PDF/이미지는 아이콘, CSV/텍스트는 아이콘 구분

#### DocumentHistory (src/components/bid/document-history.tsx)
- 기존 report-history.tsx 기반 재활용
- 버전 클릭 → 해당 데이터 로드

#### ProposalPreview (src/components/bid/proposal/proposal-preview.tsx)
- formData → 인쇄 최적화 HTML 렌더링
- A4 비율, @media print CSS
- 표지 / 목차 / 본문 섹션 구분
- window.print() 버튼

#### EstimatePreview (src/components/bid/estimate/estimate-preview.tsx)
- formData → 견적서 HTML 렌더링
- 견적 테이블, 합계, 조건 표시
- window.print() 버튼

---

## 6. State Management

```typescript
// bid-builder.tsx 로컬 상태
const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null);
const [templateId, setTemplateId] = useState<BidTemplateId | null>(null);
const [currentStep, setCurrentStep] = useState(1);
const [proposalData, setProposalData] = useState<ProposalData>(EMPTY_PROPOSAL);
const [estimateData, setEstimateData] = useState<EstimateData>(EMPTY_ESTIMATE);
const [currentReport, setCurrentReport] = useState<Report | null>(null);
const [savedDocs, setSavedDocs] = useState<Report[]>([]);
const [histories, setHistories] = useState<ReportHistory[]>([]);
```

---

## 7. Data Flow

```
1. 이슈 선택 → fetchReportsByIssueId → 저장된 문서 목록 표시

2. 새 문서 생성
   템플릿 선택 (proposal/estimate) → EMPTY 데이터 초기화 → Step 1 표시

3. 기존 문서 로드
   저장된 문서 클릭 → report.data를 formData에 로드 → Step 1 표시

4. 위자드 진행
   각 Step에서 formData 업데이트 → 다음/이전 이동

5. 미리보기
   마지막 Step → formData를 HTML로 렌더링

6. 저장
   createReport({ issue_id, template_id, title, data: formData, chart_config: [] })
   또는 updateReport(id, { data: formData, change_note })

7. 인쇄
   window.print() → @media print CSS로 깔끔한 출력
```

---

## 8. Print CSS Strategy

```css
@media print {
  /* 사이드바, 네비게이션 숨김 */
  .no-print { display: none !important; }

  /* A4 페이지 */
  .print-page {
    width: 210mm;
    min-height: 297mm;
    padding: 20mm;
    margin: 0 auto;
  }

  /* 페이지 나누기 */
  .page-break { page-break-before: always; }

  /* 테이블 */
  table { border-collapse: collapse; width: 100%; }
  th, td { border: 1px solid #333; padding: 8px; }
}
```

---

## 9. Files to Delete (기존 차트 리포트)

| File | Reason |
|------|--------|
| `src/components/reports/dynamic-chart.tsx` | 차트 컴포넌트 불필요 |
| `src/components/reports/data-table.tsx` | 차트용 데이터 테이블 |
| `src/components/reports/template-picker.tsx` | 차트 템플릿 선택기 |
| `src/components/reports/qa-form.tsx` | 차트 Q&A 폼 |
| `src/components/reports/report-builder.tsx` | 차트 빌더 메인 |
| `src/components/reports/report-history.tsx` | → document-history.tsx로 교체 |
| `src/components/reports/issue-picker.tsx` | → bid 내 IssuePicker로 교체 |
| `src/lib/csv-parser.ts` | CSV 파싱 불필요 |
| `src/lib/field-matcher.ts` | 필드 매칭 불필요 |
| `src/lib/report-templates.ts` | 차트 템플릿 불필요 |

### Keep
| File | Reason |
|------|--------|
| `src/lib/reports.ts` | CRUD 로직 재활용 |
| `src/types/report.ts` | Report/ReportHistory 타입 유지 |
| `supabase/migrations/012_reports.sql` | DB 테이블 유지 |

---

## 10. Implementation Order

| Step | File | Description |
|------|------|-------------|
| 1 | Delete old chart components | 위 표 파일 삭제 |
| 2 | `src/types/bid.ts` | 타입 정의 |
| 3 | `src/lib/bid-templates.ts` | 템플릿 + 빈 데이터 정의 |
| 4 | `src/components/bid/step-navigator.tsx` | 스텝 진행바 |
| 5 | `src/components/bid/dynamic-rows.tsx` | 동적 행 공통 컴포넌트 |
| 6 | `src/components/bid/attachment-viewer.tsx` | 첨부 파일 참조 |
| 7 | `src/components/bid/document-history.tsx` | 이력 관리 |
| 8 | `src/components/bid/proposal/step-basic.tsx` | 제안서 Step 1 |
| 9 | `src/components/bid/proposal/step-company.tsx` | 제안서 Step 2 |
| 10 | `src/components/bid/proposal/step-tech.tsx` | 제안서 Step 3 |
| 11 | `src/components/bid/proposal/step-schedule.tsx` | 제안서 Step 4 |
| 12 | `src/components/bid/proposal/step-team.tsx` | 제안서 Step 5 |
| 13 | `src/components/bid/proposal/step-cost.tsx` | 제안서 Step 6 |
| 14 | `src/components/bid/proposal/proposal-preview.tsx` | 제안서 미리보기 |
| 15 | `src/components/bid/estimate/step-basic.tsx` | 견적서 Step 1 |
| 16 | `src/components/bid/estimate/step-items.tsx` | 견적서 Step 2 |
| 17 | `src/components/bid/estimate/step-terms.tsx` | 견적서 Step 3 |
| 18 | `src/components/bid/estimate/estimate-preview.tsx` | 견적서 미리보기 |
| 19 | `src/components/bid/bid-builder.tsx` | 메인 컨테이너 |
| 20 | `src/app/(dashboard)/analytics/page.tsx` | 페이지 개편 |

---

## 11. Dependencies

| Package | Action |
|---------|--------|
| papaparse | **Remove** (pnpm remove papaparse @types/papaparse) |
| recharts | Keep (dashboard 페이지에서 사용) |

---

## 12. Edge Cases

| Case | Handling |
|------|----------|
| 첨부 파일 없는 이슈 | "첨부 파일이 없습니다" 표시, 위자드는 정상 진행 |
| 비용 항목 0개 | 합계 0원 표시 |
| 매우 긴 텍스트 | 미리보기에서 자동 페이지 나누기 |
| 저장 후 스텝 이동 | 자동 저장 없음, 명시적 저장 버튼만 |
| 이전 버전 로드 | formData 전체 교체 + Step 1로 이동 |
