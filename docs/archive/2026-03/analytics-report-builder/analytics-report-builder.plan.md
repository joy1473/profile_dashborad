# Analytics Report Builder Plan

## Executive Summary

| Perspective | Description |
|-------------|-------------|
| **Problem** | Analytics 페이지가 mock 데이터만 표시하여 실용성이 없음. Board 이슈에 첨부된 문서(엑셀, CSV 등)를 분석에 활용할 수 없음 |
| **Solution** | Board 이슈 연동 Report Builder — 이슈 선택 → 첨부 문서 파싱 → Template 기반 출력물 생성 → Q&A로 데이터 보완 → 이력 관리 |
| **Function UX Effect** | 이슈 단위로 첨부 문서를 선택하면 자동으로 차트/테이블 출력물이 생성되고, 부족한 데이터는 대화형 Q&A로 수집하여 반복 개선 가능 |
| **Core Value** | 문서 기반 데이터 시각화를 이슈 워크플로우에 통합하여, "데이터 → 인사이트 → 의사결정"의 전체 흐름을 하나의 플랫폼에서 완성 |

---

## 1. Background & Problem

### 1.1 Current State

- `/analytics` 페이지: `mock-data.ts`의 하드코딩된 매출/사용자 차트 2개만 표시
- `/board` 페이지: 이슈에 첨부파일(엑셀, CSV, PDF, 이미지 등) 업로드 가능하지만 단순 저장/다운로드만 지원
- 첨부된 문서 데이터를 분석에 활용하는 기능 없음

### 1.2 Pain Points

1. **데이터 사일로**: Board 첨부 문서의 데이터를 시각화하려면 별도 도구(엑셀, 구글시트) 필요
2. **반복 작업**: 같은 형태의 보고서를 매번 수동으로 만들어야 함
3. **이력 부재**: 보고서 생성/수정 히스토리가 없어 변경 추적 불가
4. **데이터 불완전성**: 첨부 문서만으로 출력물을 완성하기 어려운 경우 대응 방법 없음

---

## 2. Goals & Scope

### 2.1 Core Goals

1. **이슈 연동 리포트**: Board 이슈 선택 → 첨부 문서 기반 출력물 자동 생성
2. **Template 시스템**: 재사용 가능한 리포트 템플릿 (차트 종류, 레이아웃, 데이터 매핑)
3. **Q&A 데이터 수집**: 첨부 문서 데이터 부족 시 사용자에게 질문 → 답변으로 데이터 보완
4. **이력 관리**: 리포트 생성/수정/Q&A 응답 이력 전체 추적

### 2.2 Scope

#### In Scope
- Board 이슈 목록 연동 (이슈 선택 UI)
- 첨부 파일 파싱 (CSV, JSON — 클라이언트 사이드)
- Template 정의 및 관리 (차트 타입, 데이터 매핑 규칙)
- Q&A 폼: 템플릿이 요구하는 데이터 필드 vs 첨부 문서 데이터 비교 → 부족한 항목 질문
- 출력물 렌더링 (Recharts 기반 차트 + 테이블)
- 리포트 이력 테이블 (report_histories)
- 리포트 저장/수정/삭제

#### Out of Scope (v1)
- 서버사이드 파일 파싱 (PDF OCR, 엑셀 .xlsx 파싱 등) — v2 고려
- AI 기반 자동 데이터 분석/요약
- 리포트 PDF 내보내기
- 리포트 공유/공개 링크

---

## 3. Feature Description

### 3.1 User Flow

```
[Analytics 페이지 진입]
  ↓
[Board 이슈 목록 표시] → 이슈 선택
  ↓
[선택 이슈의 첨부 파일 목록 표시] → CSV/JSON 파일 선택
  ↓
[Template 선택] (매출 분석, 사용자 분석, 커스텀 등)
  ↓
[파일 파싱 → 데이터 추출]
  ↓
[Template 필수 필드 vs 추출 데이터 비교]
  ├── 충분 → 출력물 즉시 생성
  └── 부족 → Q&A 폼 표시 (부족한 필드 입력 요청)
       ↓
     [사용자 데이터 입력]
       ↓
     [출력물 생성/업데이트]
  ↓
[출력물 표시] (차트 + 테이블)
  ↓
[저장] → report_histories에 이력 기록
  ↓
[수정] → 데이터 변경 → 재생성 → 이력 추가
```

### 3.2 Template System

각 Template은 다음을 정의:

```typescript
interface ReportTemplate {
  id: string;
  name: string;           // "매출 분석", "사용자 분석" 등
  description: string;
  requiredFields: FieldDef[];  // 필수 데이터 필드
  optionalFields: FieldDef[];  // 선택 데이터 필드
  charts: ChartDef[];          // 출력할 차트 정의
  tableColumns?: string[];     // 테이블 컬럼 정의
}

interface FieldDef {
  key: string;          // "date", "revenue", "users"
  label: string;        // "날짜", "매출", "사용자 수"
  type: "string" | "number" | "date";
  question: string;     // Q&A에서 물어볼 질문
}

interface ChartDef {
  type: "bar" | "line" | "area" | "pie";
  xKey: string;
  yKeys: string[];
  title: string;
}
```

### 3.3 Built-in Templates (v1)

1. **매출 분석**: 필수(date, revenue), 선택(users, category) → 바차트 + 라인차트
2. **사용자 분석**: 필수(date, users), 선택(new_users, churn) → 에어리어차트
3. **커스텀**: 사용자가 직접 X축/Y축/차트타입 지정

### 3.4 Q&A Data Collection

첨부 문서 파싱 후 Template의 `requiredFields`와 비교:

- **매칭 성공**: 컬럼명이 fieldDef.key와 일치하거나 유사 → 자동 매핑
- **매칭 실패**: 부족한 필드를 Q&A 폼으로 표시, `fieldDef.question`으로 질문
- **수동 입력**: 사용자가 값을 직접 입력하거나 CSV 데이터 붙여넣기
- **반복 개선**: 출력물 확인 → "데이터 수정" 버튼 → Q&A 다시 표시 → 재생성

### 3.5 History Tracking

```sql
report_histories {
  id UUID PRIMARY KEY,
  report_id UUID,           -- 동일 리포트의 버전 그룹
  issue_id UUID,            -- 연결된 Board 이슈
  template_id TEXT,         -- 사용한 템플릿
  title TEXT,               -- 리포트 제목
  data JSONB,               -- 파싱/입력된 전체 데이터
  chart_config JSONB,       -- 차트 설정
  version INTEGER,          -- 버전 번호
  change_note TEXT,         -- 수정 메모
  created_by UUID,
  created_at TIMESTAMPTZ
}
```

---

## 4. Data Model

### 4.1 New Tables

| Table | Purpose |
|-------|---------|
| `report_templates` | 리포트 템플릿 정의 (built-in + custom) |
| `reports` | 저장된 리포트 (현재 버전) |
| `report_histories` | 리포트 수정 이력 (모든 버전) |

### 4.2 Relationships

```
issues (1) ──< reports (N)
reports (1) ──< report_histories (N)
report_templates (1) ──< reports (N)
issue_attachments (N) >── issues (1)
```

---

## 5. Technical Approach

### 5.1 File Parsing (Client-side)

- **CSV**: `Papa Parse` 라이브러리 또는 간단한 커스텀 파서
- **JSON**: `JSON.parse()` 직접 처리
- 파일은 Supabase Storage에서 다운로드 → 클라이언트에서 파싱
- 파싱 결과: `{ headers: string[], rows: Record<string, string | number>[] }`

### 5.2 Chart Rendering

- 기존 Recharts 활용 (이미 설치됨)
- Template의 ChartDef에 따라 동적 차트 렌더링
- 지원 차트: BarChart, LineChart, AreaChart, PieChart

### 5.3 Page Layout

```
/analytics (개선)
├── 좌측: 이슈 목록 + 첨부 파일 선택 패널
├── 중앙: 출력물 (차트 + 테이블)
├── 우측 또는 모달: Q&A 폼 / 데이터 편집
└── 하단: 이력 타임라인
```

---

## 6. Implementation Order

1. **DB**: `reports`, `report_histories` 테이블 + RLS
2. **Types**: ReportTemplate, Report, ReportHistory 타입 정의
3. **Lib**: CSV 파서, 리포트 CRUD, 이력 관리 함수
4. **Templates**: Built-in 템플릿 3종 정의
5. **Components**: 이슈 선택기, 파일 선택기, Q&A 폼, 동적 차트, 이력 타임라인
6. **Page**: Analytics 페이지 전면 개편

---

## 7. Dependencies

| Package | Purpose | Status |
|---------|---------|--------|
| recharts | 차트 렌더링 | Already installed |
| papaparse | CSV 파싱 | **New** |
| @supabase/supabase-js | DB/Storage | Already installed |

---

## 8. Success Criteria

- [ ] Board 이슈 선택 → 첨부 CSV/JSON 파일 기반 차트 출력물 생성
- [ ] Template 3종 (매출, 사용자, 커스텀) 정상 동작
- [ ] 데이터 부족 시 Q&A 폼으로 추가 데이터 수집 후 출력물 업데이트
- [ ] 리포트 저장/수정 시 이력 자동 기록
- [ ] 이력 목록에서 이전 버전 조회 가능
