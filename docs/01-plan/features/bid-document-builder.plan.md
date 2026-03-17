# Bid Document Builder Plan

## Executive Summary

| Perspective | Description |
|-------------|-------------|
| **Problem** | Analytics 페이지가 차트/그래프 중심이라 실무에 활용 불가. 입찰 제안서/견적서를 별도 도구(한글, 워드)에서 매번 수작업으로 작성해야 함 |
| **Solution** | Board 이슈 단위로 첨부 RFP/내부 자료를 참고하여, 단계별 위자드(Step-by-step)로 데이터를 수집하고 입찰 제안서 + 견적서 HTML을 자동 생성. 부족한 정보는 반복 Q&A로 보완하며, 생성/수정 이력을 전부 관리 |
| **Function UX Effect** | 이슈 선택 → 템플릿 선택 → 위자드 단계별 입력 → 실시간 미리보기 → HTML 완성 문서 출력. 첨부 문서를 참고하며 위자드를 채워나가는 직관적 워크플로우 |
| **Core Value** | 입찰 문서 작성 시간 대폭 단축 + 일관된 포맷 + 이력 관리를 통해 과거 제안서 재활용 가능 |

---

## 1. Background & Problem

### 1.1 Current State

- `/analytics` 페이지: 차트/그래프 리포트 빌더 (방금 구축했으나 실제 필요한 것은 입찰문서 작성)
- Board 이슈에 RFP, 내부 기획서 등 첨부되지만 단순 저장/다운로드만 가능
- 입찰 문서(제안서, 견적서)는 외부 도구에서 수작업

### 1.2 Pain Points

1. **반복 작업**: 비슷한 구조의 제안서를 매번 처음부터 작성
2. **포맷 불일치**: 작성자마다 제안서 형태가 다름
3. **이력 부재**: 과거 제안서를 찾기 어렵고 재활용 어려움
4. **정보 누락**: RFP 요구사항을 빠뜨리기 쉬움

---

## 2. Goals & Scope

### 2.1 Core Goals

1. **제안서 Template**: 표지, 목차, 회사소개, 기술방안, 일정, 비용 등 섹션별 구조
2. **견적서 Template**: 항목, 수량, 단가, 합계 테이블 형태
3. **단계별 위자드**: Step 1(기본정보) → Step 2(기술방안) → Step 3(일정) → Step 4(비용) → 미리보기
4. **첨부 문서 참조**: 이슈의 첨부 파일을 위자드 옆에 표시하여 참고하며 작성
5. **HTML 출력**: 인쇄/PDF 변환 가능한 깔끔한 HTML 문서 생성
6. **이력 관리**: 버전별 저장, 이전 버전 조회

### 2.2 Scope

#### In Scope
- Analytics 페이지 전면 개편 (차트 리포트 빌더 → 입찰문서 빌더)
- 제안서 Template (표지 ~ 비용)
- 견적서 Template (품목 테이블)
- 단계별 위자드 UI
- 첨부 파일 뷰어 (사이드 패널에서 참조)
- HTML 미리보기 + 인쇄 기능 (window.print)
- 기존 reports/report_histories 테이블 재활용
- 이력 관리

#### Out of Scope (v1)
- AI 자동 문서 생성 (RFP 자동 분석)
- PDF 서버사이드 생성 (html2pdf 등)
- 협업 편집 (동시 작성)
- 전자 서명

---

## 3. Template Design

### 3.1 제안서 Template (proposal)

```
Step 1: 기본 정보
  - 프로젝트명
  - 발주처명
  - 제출일
  - 제안사 (회사명, 대표자, 연락처, 주소)

Step 2: 회사 소개
  - 회사 개요 (설립일, 직원수, 주요사업)
  - 수행실적 (프로젝트명, 발주처, 기간, 금액) — 동적 행 추가

Step 3: 기술 방안
  - 사업 이해 (에디터)
  - 추진 전략 (에디터)
  - 시스템 구성도 (이미지 업로드 또는 텍스트)
  - 기술 상세 (에디터)

Step 4: 추진 일정
  - 단계별 일정 (단계명, 기간, 산출물) — 동적 행 추가
  - 전체 사업 기간

Step 5: 투입 인력
  - 인력 구성 (성명, 역할, 등급, 투입기간) — 동적 행 추가

Step 6: 비용
  - 비용 항목 (항목명, 수량, 단가, 금액) — 동적 행 추가
  - 합계 자동 계산
  - 부가세 / 총액

Step 7: 미리보기 & 저장
  - 전체 HTML 미리보기
  - 인쇄 (window.print)
  - 저장
```

### 3.2 견적서 Template (estimate)

```
Step 1: 기본 정보
  - 견적 제목
  - 수신처 (회사명, 담당자)
  - 발신처 (회사명, 대표자, 연락처)
  - 견적일
  - 유효기간

Step 2: 견적 항목
  - 품목 (항목명, 규격, 수량, 단가, 금액) — 동적 행 추가
  - 소계 / 부가세 / 합계 자동 계산

Step 3: 조건 & 비고
  - 납품 조건
  - 결제 조건
  - 비고

Step 4: 미리보기 & 저장
  - HTML 미리보기
  - 인쇄
  - 저장
```

---

## 4. Data Model

### 4.1 기존 테이블 재활용

- `reports` 테이블: template_id를 "proposal" / "estimate"로 사용
- `report_histories` 테이블: 버전 이력 그대로 활용
- `data` JSONB 컬럼에 위자드 전체 데이터 저장

### 4.2 data 구조 예시

```json
// 제안서
{
  "projectName": "OO시스템 구축",
  "clientName": "XX공사",
  "submitDate": "2026-03-20",
  "company": { "name": "...", "ceo": "...", "phone": "...", "address": "..." },
  "companyIntro": "...",
  "trackRecord": [{ "project": "...", "client": "...", "period": "...", "amount": "..." }],
  "techApproach": "...",
  "strategy": "...",
  "schedule": [{ "phase": "...", "period": "...", "deliverable": "..." }],
  "team": [{ "name": "...", "role": "...", "grade": "...", "period": "..." }],
  "costs": [{ "item": "...", "qty": 1, "unitPrice": 1000000, "amount": 1000000 }],
  "vatIncluded": true
}

// 견적서
{
  "title": "...",
  "recipient": { "company": "...", "contact": "..." },
  "sender": { "company": "...", "ceo": "...", "phone": "..." },
  "date": "2026-03-20",
  "validUntil": "2026-04-20",
  "items": [{ "name": "...", "spec": "...", "qty": 1, "unitPrice": 100000, "amount": 100000 }],
  "deliveryTerms": "...",
  "paymentTerms": "...",
  "notes": "..."
}
```

---

## 5. Technical Approach

### 5.1 기존 코드 처리

- `src/components/reports/` → 차트 관련 컴포넌트 **삭제** (dynamic-chart, data-table 등)
- `src/lib/csv-parser.ts`, `field-matcher.ts`, `report-templates.ts` → **삭제**
- `src/lib/reports.ts` → **유지** (CRUD 로직 재활용)
- `papaparse` 의존성 → **제거**

### 5.2 새 컴포넌트

```
src/components/bid/
├── bid-builder.tsx          — 메인 컨테이너 (위자드 스텝 관리)
├── step-navigator.tsx       — 스텝 진행바 UI
├── proposal/
│   ├── step-basic.tsx       — Step 1: 기본 정보
│   ├── step-company.tsx     — Step 2: 회사 소개
│   ├── step-tech.tsx        — Step 3: 기술 방안
│   ├── step-schedule.tsx    — Step 4: 추진 일정
│   ├── step-team.tsx        — Step 5: 투입 인력
│   ├── step-cost.tsx        — Step 6: 비용
│   └── proposal-preview.tsx — Step 7: 미리보기
├── estimate/
│   ├── step-basic.tsx       — Step 1: 기본 정보
│   ├── step-items.tsx       — Step 2: 견적 항목
│   ├── step-terms.tsx       — Step 3: 조건/비고
│   └── estimate-preview.tsx — Step 4: 미리보기
├── attachment-viewer.tsx    — 첨부 파일 참조 패널
├── dynamic-rows.tsx         — 동적 행 추가/삭제 공통 컴포넌트
└── document-history.tsx     — 이력 관리
```

### 5.3 페이지 레이아웃

```
┌─────────────────────────────────────────────────────────────┐
│ 입찰문서                                     [+ 새 문서]    │
├──────────────────┬──────────────────────────────────────────┤
│ 이슈 & 문서 목록 │  위자드 영역                              │
│                  │                                          │
│ [이슈 A]         │  [Step 1] [Step 2] [Step 3] ... [미리보기]│
│  ├─ 제안서 v3    │  ─────────────────────────────────────── │
│  └─ 견적서 v1    │                                          │
│ [이슈 B]         │  < 현재 Step 입력 폼 >                    │
│                  │                                          │
│ ──────────────── │  ┌──────────────────────────────────────┐│
│ 첨부 파일 참조   │  │  입력 필드들                           ││
│  RFP.pdf ▶       │  │  (텍스트, 테이블, 에디터 등)           ││
│  기획서.docx ▶   │  └──────────────────────────────────────┘│
│                  │                                          │
│ 이력             │  [이전] [다음] [저장]                      │
│  v3 03/17 14:30  │                                          │
│  v2 03/17 10:00  │                                          │
└──────────────────┴──────────────────────────────────────────┘
```

---

## 6. Implementation Order

1. 기존 차트 리포트 컴포넌트 삭제 + papaparse 제거
2. Template 정의 (proposal, estimate)
3. 공통 컴포넌트 (step-navigator, dynamic-rows, attachment-viewer)
4. 제안서 위자드 Steps (1~7)
5. 견적서 위자드 Steps (1~4)
6. 미리보기 HTML 렌더링 (인쇄 최적화 CSS)
7. bid-builder 메인 컨테이너
8. Analytics 페이지 개편
9. 이력 관리 (document-history)

---

## 7. Dependencies

| Package | Purpose | Action |
|---------|---------|--------|
| recharts | 기존 차트 | 유지 (dashboard에서 사용) |
| papaparse | CSV 파싱 | **Remove** |
| @supabase/supabase-js | DB | Existing |

---

## 8. Success Criteria

- [ ] 제안서 7단계 위자드로 완성 → HTML 미리보기 + 인쇄
- [ ] 견적서 4단계 위자드로 완성 → HTML 미리보기 + 인쇄
- [ ] Board 이슈 연동 (이슈 선택 → 첨부 파일 참조)
- [ ] 저장/수정 시 이력 자동 기록
- [ ] 이전 버전 조회 가능
- [ ] 첨부 파일 사이드 패널에서 다운로드/참조 가능
