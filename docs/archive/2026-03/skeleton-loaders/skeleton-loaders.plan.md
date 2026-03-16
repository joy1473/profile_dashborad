# Skeleton Loaders — Plan

## Executive Summary

| Perspective | Description |
|-------------|-------------|
| **Problem** | 5개 페이지/레이아웃에서 동일한 spinner만 사용하여 로딩 중 레이아웃 시프트 및 빈 화면 발생 |
| **Solution** | 재사용 가능한 Skeleton 컴포넌트 라이브러리를 만들고 각 페이지에 맞는 로딩 UI로 교체 |
| **Function UX Effect** | 콘텐츠 영역의 윤곽이 미리 표시되어 체감 로딩 속도 향상, 레이아웃 시프트 제거 |
| **Core Value** | Perceived performance 개선으로 사용자 이탈률 감소, 전문적인 UX 품질 달성 |

## 1. 배경 및 목적

### 1.1 현재 상태

5곳에서 동일한 border-spinner 패턴을 사용:

| 위치 | 파일 | 로딩 대상 |
|------|------|----------|
| 대시보드 레이아웃 | `(dashboard)/layout.tsx` | 인증 확인 |
| 보드 페이지 | `(dashboard)/board/page.tsx` | 이슈 목록 fetch |
| 그래프 페이지 | `(dashboard)/graph/page.tsx` | 그래프 데이터 fetch |
| Kakao 콜백 | `auth/kakao/callback/page.tsx` | OAuth 처리 |
| 명함 공유 | `u/[uniqueId]/page.tsx` | 프로필 조회 |

모든 곳에서 동일한 코드:
```tsx
<div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
```

### 1.2 문제점

- 로딩 중 빈 화면 → 레이아웃 시프트 발생
- 콘텐츠 구조를 미리 보여주지 않음
- Spinner만으로는 어떤 콘텐츠가 로드될지 예측 불가
- 5곳에서 인라인 중복 코드

### 1.3 목표

- 재사용 가능한 `Skeleton` base 컴포넌트 생성
- 페이지별 조합형 skeleton 컴포넌트 생성 (메트릭 카드, 칸반 보드, 테이블 등)
- 기존 spinner를 skeleton으로 교체
- 다크모드 지원

## 2. 범위

### 2.1 In Scope

| 항목 | 설명 |
|------|------|
| Skeleton base 컴포넌트 | 애니메이션 pulse 효과의 기본 빌딩 블록 |
| MetricCardSkeleton | 대시보드 메트릭 카드 4개 로딩 |
| ChartSkeleton | 차트 영역 로딩 |
| KanbanSkeleton | 보드 페이지 4-column 로딩 |
| TableSkeleton | 사용자 테이블 로딩 |
| 대시보드 레이아웃 spinner 교체 | layout.tsx의 인증 로딩 |
| 보드/그래프 페이지 spinner 교체 | 각 페이지 로딩 상태 |

### 2.2 Out of Scope

- Kakao 콜백 페이지 (단순 리다이렉트로 skeleton 불필요)
- 명함 공유 페이지 (외부 공개 페이지, 현재 spinner 충분)
- Suspense 경계 도입 (별도 feature로 분리)
- 서버 컴포넌트 전환

## 3. 기술 요구사항

### 3.1 새 파일

| 파일 | 목적 |
|------|------|
| `src/components/ui/skeleton.tsx` | Skeleton base 컴포넌트 |
| `src/components/skeletons/dashboard-skeleton.tsx` | 대시보드용 (메트릭 + 차트 + 활동) |
| `src/components/skeletons/board-skeleton.tsx` | 보드용 (4-column 칸반) |
| `src/components/skeletons/graph-skeleton.tsx` | 그래프용 (필터 + 캔버스 영역) |
| `src/components/skeletons/table-skeleton.tsx` | 사용자 테이블용 |

### 3.2 수정 파일

| 파일 | 변경 |
|------|------|
| `(dashboard)/layout.tsx` | spinner → DashboardSkeleton |
| `(dashboard)/board/page.tsx` | spinner → BoardSkeleton |
| `(dashboard)/graph/page.tsx` | spinner → GraphSkeleton |

### 3.3 의존성

- 0개 (Tailwind CSS `animate-pulse` 사용)

## 4. Skeleton 디자인 원칙

1. **콘텐츠 윤곽 모방**: 실제 콘텐츠와 동일한 높이/너비로 placeholder 표시
2. **animate-pulse**: Tailwind 기본 pulse 애니메이션 (부드러운 opacity 변화)
3. **다크모드 대응**: `bg-zinc-200 dark:bg-zinc-700` 계열
4. **조합 가능**: base `Skeleton` 컴포넌트를 조합하여 페이지별 skeleton 구성

## 5. 구현 순서

1. `skeleton.tsx` base 컴포넌트 생성
2. `dashboard-skeleton.tsx` 생성 (메트릭 카드 4개 + 차트 2개 + 활동 피드)
3. `board-skeleton.tsx` 생성 (4-column 칸반 레이아웃)
4. `graph-skeleton.tsx` 생성 (필터 바 + 캔버스 영역)
5. `table-skeleton.tsx` 생성 (헤더 + 행 5개)
6. `layout.tsx` spinner 교체
7. `board/page.tsx` spinner 교체
8. `graph/page.tsx` spinner 교체

## 6. 성공 기준

- Skeleton base 컴포넌트 1개 + 페이지별 skeleton 4개 생성
- 3개 페이지/레이아웃의 spinner가 skeleton으로 교체
- 다크모드에서 정상 표시
- 기존 기능 회귀 없음
- 새 의존성 0개
