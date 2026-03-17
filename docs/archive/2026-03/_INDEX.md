# Archive Index - 2026-03

| Feature | Phase | Match Rate | Archived Date | Documents |
|---------|-------|:----------:|:-------------:|:---------:|
| jira-board | Complete | 96% | 2026-03-15 | 4 |
| neo4j-graph | Complete | ~96% | 2026-03-15 | 4 |
| api-auth-middleware | Complete | 97% | 2026-03-15 | 4 |
| reusable-error-boundary | Complete | 97% | 2026-03-15 | 4 |
| e2e-tests | Complete | 97% | 2026-03-15 | 4 |
| skeleton-loaders | Complete | 97% | 2026-03-16 | 4 |
| dark-mode-toggle | Complete | 100% | 2026-03-16 | 4 |
| dashboard-analytics-charts | Complete | 99% | 2026-03-16 | 4 |
| supabase-neo4j-integration | Complete | 97% | 2026-03-16 | 4 |
| realtime-notifications | Complete | 100% | 2026-03-16 | 4 |
| subtasks | Complete | 98% | 2026-03-16 | 4 |
| users-enhancement | Complete | 95% | 2026-03-17 | 4 |
| analytics-report-builder | Complete | 97% | 2026-03-17 | 4 |
| bid-document-builder | Complete | 95% | 2026-03-17 | 4 |
| login-logging | Complete | 93% | 2026-03-17 | 4 |

## login-logging

- **Duration**: 2026-03-17 (1 session)
- **Match Rate**: 93% (first pass, no iteration)
- **Files**: 1 new + 2 modified (~53 lines)
- **Dependencies**: 0 new
- **Key Feature**: Edge Function 구조화 로그 + /api/auth-log 실패 기록 + activities 테이블 로그인 이벤트
- **Documents**:
  - [login-logging.plan.md](login-logging/login-logging.plan.md)
  - [login-logging.design.md](login-logging/login-logging.design.md)
  - [login-logging.analysis.md](login-logging/login-logging.analysis.md)
  - [login-logging.report.md](login-logging/login-logging.report.md)

## bid-document-builder

- **Duration**: 2026-03-01 ~ 2026-03-17
- **Match Rate**: 95% (first pass, no iteration needed)
- **Files**: 15 new components + 2 lib/type, 10 old files deleted (~2,500 lines)
- **Dependencies**: papaparse removed
- **Key Feature**: 입찰문서 작성기 — 제안서 7단계 + 견적서 4단계 위자드, 인쇄/PDF, 버전 이력
- **Documents**:
  - [bid-document-builder.plan.md](bid-document-builder/bid-document-builder.plan.md)
  - [bid-document-builder.design.md](bid-document-builder/bid-document-builder.design.md)
  - [bid-document-builder.analysis.md](bid-document-builder/bid-document-builder.analysis.md)
  - [bid-document-builder.report.md](bid-document-builder/bid-document-builder.report.md)

## analytics-report-builder

- **Duration**: 2026-03-17 (1 session)
- **Match Rate**: 93% -> 97% (gap fixes, no iteration cycle)
- **Files**: 14 new + 1 modified (~2,900 lines)
- **Dependencies**: papaparse (CSV parsing)
- **Key Feature**: Board 이슈 첨부 문서 기반 리포트 빌더 (Template, Q&A, 이력 관리)
- **Documents**:
  - [analytics-report-builder.plan.md](analytics-report-builder/analytics-report-builder.plan.md)
  - [analytics-report-builder.design.md](analytics-report-builder/analytics-report-builder.design.md)
  - [analytics-report-builder.analysis.md](analytics-report-builder/analytics-report-builder.analysis.md)
  - [analytics-report-builder.report.md](analytics-report-builder/analytics-report-builder.report.md)

## users-enhancement

- **Duration**: 2026-03-17 (1 session)
- **Match Rate**: 89% -> 95% (1 iteration)
- **Files**: 4 new + 3 modified (~450 lines)
- **Dependencies**: 0 new (uses existing @supabase/supabase-js)
- **Bug Fix**: "Database error creating user" trigger fix + Edge Function error handling
- **Documents**:
  - [users-enhancement.plan.md](users-enhancement/users-enhancement.plan.md)
  - [users-enhancement.design.md](users-enhancement/users-enhancement.design.md)
  - [users-enhancement.analysis.md](users-enhancement/users-enhancement.analysis.md)
  - [users-enhancement.report.md](users-enhancement/users-enhancement.report.md)

## subtasks

- **Duration**: 2026-03-16 (1 session)
- **Match Rate**: 98% (first pass, no iteration)
- **Files**: 4 new + 5 modified (~950 lines)
- **Dependencies**: 0 new (uses existing @supabase/supabase-js)
- **Documents**:
  - [subtasks.plan.md](subtasks/subtasks.plan.md)
  - [subtasks.design.md](subtasks/subtasks.design.md)
  - [subtasks.analysis.md](subtasks/subtasks.analysis.md)
  - [subtasks.report.md](subtasks/subtasks.report.md)

## realtime-notifications

- **Duration**: 2026-03-16 (1 session)
- **Match Rate**: 100% (first pass, no iteration)
- **Files**: 1 new (~50 lines) + 2 modified
- **Dependencies**: 0 new (uses existing @supabase/supabase-js Realtime)
- **Documents**:
  - [realtime-notifications.plan.md](realtime-notifications/realtime-notifications.plan.md)
  - [realtime-notifications.design.md](realtime-notifications/realtime-notifications.design.md)
  - [realtime-notifications.analysis.md](realtime-notifications/realtime-notifications.analysis.md)
  - [realtime-notifications.report.md](realtime-notifications/realtime-notifications.report.md)

## supabase-neo4j-integration

- **Duration**: 2026-03-16 (1 session)
- **Match Rate**: 97% (first pass, no iteration)
- **Files**: 8 new (~280 lines) + 3 modified
- **Dependencies**: 0 new (uses existing @supabase/supabase-js, neo4j-driver)
- **Documents**:
  - [supabase-neo4j-integration.plan.md](supabase-neo4j-integration/supabase-neo4j-integration.plan.md)
  - [supabase-neo4j-integration.design.md](supabase-neo4j-integration/supabase-neo4j-integration.design.md)
  - [supabase-neo4j-integration.analysis.md](supabase-neo4j-integration/supabase-neo4j-integration.analysis.md)
  - [supabase-neo4j-integration.report.md](supabase-neo4j-integration/supabase-neo4j-integration.report.md)

## dashboard-analytics-charts

- **Duration**: 2026-03-16 (1 session)
- **Match Rate**: 99% (first pass, no iteration)
- **Files**: 5 new + 2 modified
- **Dependencies**: 0 new (uses existing recharts, lucide-react)
- **Documents**:
  - [dashboard-analytics-charts.plan.md](dashboard-analytics-charts/dashboard-analytics-charts.plan.md)
  - [dashboard-analytics-charts.design.md](dashboard-analytics-charts/dashboard-analytics-charts.design.md)
  - [dashboard-analytics-charts.analysis.md](dashboard-analytics-charts/dashboard-analytics-charts.analysis.md)
  - [dashboard-analytics-charts.report.md](dashboard-analytics-charts/dashboard-analytics-charts.report.md)

## dark-mode-toggle

- **Duration**: 2026-03-16 (1 session)
- **Match Rate**: 100% (first pass, no iteration)
- **Files**: 0 new + 4 modified
- **Dependencies**: 0 new
- **Documents**:
  - [dark-mode-toggle.plan.md](dark-mode-toggle/dark-mode-toggle.plan.md)
  - [dark-mode-toggle.design.md](dark-mode-toggle/dark-mode-toggle.design.md)
  - [dark-mode-toggle.analysis.md](dark-mode-toggle/dark-mode-toggle.analysis.md)
  - [dark-mode-toggle.report.md](dark-mode-toggle/dark-mode-toggle.report.md)

## skeleton-loaders

- **Duration**: 2026-03-16 (1 session)
- **Match Rate**: 97% (first pass, no iteration)
- **Files**: 5 new (204 lines) + 3 modified
- **Dependencies**: 0 new
- **Documents**:
  - [skeleton-loaders.plan.md](skeleton-loaders/skeleton-loaders.plan.md)
  - [skeleton-loaders.design.md](skeleton-loaders/skeleton-loaders.design.md)
  - [skeleton-loaders.analysis.md](skeleton-loaders/skeleton-loaders.analysis.md)
  - [skeleton-loaders.report.md](skeleton-loaders/skeleton-loaders.report.md)

## e2e-tests

- **Duration**: 2026-03-15 (1 session, ~30 min)
- **Match Rate**: 97% (first pass, no iteration)
- **Files**: 3 new (124 lines) + 2 modified
- **Dependencies**: 0 new (uses existing @playwright/test)
- **Documents**:
  - [e2e-tests.plan.md](e2e-tests/e2e-tests.plan.md)
  - [e2e-tests.design.md](e2e-tests/e2e-tests.design.md)
  - [e2e-tests.analysis.md](e2e-tests/e2e-tests.analysis.md)
  - [e2e-tests.report.md](e2e-tests/e2e-tests.report.md)

## reusable-error-boundary

- **Duration**: 2026-03-15 (1 session, ~35 min)
- **Match Rate**: 97% (first pass, no iteration)
- **Files**: 1 new (63 lines) + 1 modified (-25 lines net)
- **Dependencies**: 0 new
- **Documents**:
  - [reusable-error-boundary.plan.md](reusable-error-boundary/reusable-error-boundary.plan.md)
  - [reusable-error-boundary.design.md](reusable-error-boundary/reusable-error-boundary.design.md)
  - [reusable-error-boundary.analysis.md](reusable-error-boundary/reusable-error-boundary.analysis.md)
  - [reusable-error-boundary.report.md](reusable-error-boundary/reusable-error-boundary.report.md)

## api-auth-middleware

- **Duration**: 2026-03-15 (1 session)
- **Match Rate**: 97% (first pass, no iteration)
- **Files**: 2 new + 1 modified
- **Dependencies**: 0 new (uses existing @supabase/supabase-js)
- **Documents**:
  - [api-auth-middleware.plan.md](api-auth-middleware/api-auth-middleware.plan.md)
  - [api-auth-middleware.design.md](api-auth-middleware/api-auth-middleware.design.md)
  - [api-auth-middleware.analysis.md](api-auth-middleware/api-auth-middleware.analysis.md)
  - [api-auth-middleware.report.md](api-auth-middleware/api-auth-middleware.report.md)

## neo4j-graph

- **Duration**: 2026-03-15 (1 day, single session)
- **Match Rate**: 90% -> ~96% (1 iteration)
- **Files**: 9 new + 2 modified
- **Dependencies**: react-force-graph-2d, neo4j-driver
- **Documents**:
  - [neo4j-graph.plan.md](neo4j-graph/neo4j-graph.plan.md)
  - [neo4j-graph.design.md](neo4j-graph/neo4j-graph.design.md)
  - [neo4j-graph.analysis.md](neo4j-graph/neo4j-graph.analysis.md)
  - [neo4j-graph.report.md](neo4j-graph/neo4j-graph.report.md)

## jira-board

- **Duration**: 2026-03-15 (1 day, single session)
- **Match Rate**: 85% -> 96% (1 iteration)
- **Files**: 11 new + 2 modified
- **Documents**:
  - [jira-board.plan.md](jira-board/jira-board.plan.md)
  - [jira-board.design.md](jira-board/jira-board.design.md)
  - [jira-board.analysis.md](jira-board/jira-board.analysis.md)
  - [jira-board.report.md](jira-board/jira-board.report.md)
