import type { GraphData } from "@/types/graph";

export const mockGraphData: GraphData = {
  nodes: [
    // Users (from mock-data.ts)
    { id: "user-1", name: "김민수", type: "user", meta: { email: "minsu@example.com", role: "admin", status: "active" } },
    { id: "user-2", name: "이지은", type: "user", meta: { email: "jieun@example.com", role: "user", status: "active" } },
    { id: "user-3", name: "박서준", type: "user", meta: { email: "seojun@example.com", role: "user", status: "inactive" } },
    { id: "user-4", name: "최유리", type: "user", meta: { email: "yuri@example.com", role: "viewer", status: "active" } },
    { id: "user-5", name: "정하늘", type: "user", meta: { email: "haneul@example.com", role: "user", status: "active" } },

    // Issues (from mock-issues.ts)
    { id: "issue-1", name: "로그인 페이지 오류 수정", type: "issue", meta: { status: "todo", priority: "high" } },
    { id: "issue-2", name: "대시보드 차트 반응형 개선", type: "issue", meta: { status: "in_progress", priority: "medium" } },
    { id: "issue-3", name: "QR 명함 공유 기능", type: "issue", meta: { status: "todo", priority: "medium" } },
    { id: "issue-4", name: "사용자 목록 페이지네이션", type: "issue", meta: { status: "done", priority: "low" } },
    { id: "issue-5", name: "다크모드 색상 통일", type: "issue", meta: { status: "done", priority: "low" } },
    { id: "issue-6", name: "설정 페이지 알림 토글 버그", type: "issue", meta: { status: "in_review", priority: "high" } },

    // Labels
    { id: "label-bug", name: "bug", type: "label", meta: { color: "#ef4444" } },
    { id: "label-auth", name: "auth", type: "label", meta: { color: "#8b5cf6" } },
    { id: "label-ui", name: "ui", type: "label", meta: { color: "#3b82f6" } },
    { id: "label-responsive", name: "responsive", type: "label", meta: { color: "#06b6d4" } },
    { id: "label-feature", name: "feature", type: "label", meta: { color: "#22c55e" } },
    { id: "label-enhancement", name: "enhancement", type: "label", meta: { color: "#f59e0b" } },
    { id: "label-darkmode", name: "darkmode", type: "label", meta: { color: "#6366f1" } },
  ],
  links: [
    // ASSIGNED_TO (user -> issue)
    { source: "user-1", target: "issue-1", type: "ASSIGNED_TO" },
    { source: "user-2", target: "issue-2", type: "ASSIGNED_TO" },
    { source: "user-4", target: "issue-4", type: "ASSIGNED_TO" },
    { source: "user-1", target: "issue-5", type: "ASSIGNED_TO" },
    { source: "user-2", target: "issue-6", type: "ASSIGNED_TO" },

    // CREATED_BY (issue -> user)
    { source: "issue-1", target: "user-1", type: "CREATED_BY" },
    { source: "issue-2", target: "user-1", type: "CREATED_BY" },
    { source: "issue-3", target: "user-1", type: "CREATED_BY" },
    { source: "issue-4", target: "user-1", type: "CREATED_BY" },
    { source: "issue-5", target: "user-1", type: "CREATED_BY" },
    { source: "issue-6", target: "user-1", type: "CREATED_BY" },

    // LABELED_WITH (issue -> label)
    { source: "issue-1", target: "label-bug", type: "LABELED_WITH" },
    { source: "issue-1", target: "label-auth", type: "LABELED_WITH" },
    { source: "issue-2", target: "label-ui", type: "LABELED_WITH" },
    { source: "issue-2", target: "label-responsive", type: "LABELED_WITH" },
    { source: "issue-3", target: "label-feature", type: "LABELED_WITH" },
    { source: "issue-4", target: "label-enhancement", type: "LABELED_WITH" },
    { source: "issue-5", target: "label-ui", type: "LABELED_WITH" },
    { source: "issue-5", target: "label-darkmode", type: "LABELED_WITH" },
    { source: "issue-6", target: "label-bug", type: "LABELED_WITH" },
  ],
};
