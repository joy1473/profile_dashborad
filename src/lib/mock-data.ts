import type { User, MetricCard, ChartData, Activity } from "@/types";

export const metrics: MetricCard[] = [
  { title: "총 매출", value: "₩48,250,000", change: 12.5, trend: "up" },
  { title: "활성 사용자", value: "2,430", change: 8.2, trend: "up" },
  { title: "전환율", value: "3.24%", change: -1.8, trend: "down" },
  { title: "평균 세션", value: "4분 32초", change: 5.1, trend: "up" },
];

export const revenueData: ChartData[] = [
  { name: "1월", date: "2025-01-01", revenue: 3200, users: 1800 },
  { name: "2월", date: "2025-02-01", revenue: 4100, users: 2000 },
  { name: "3월", date: "2025-03-01", revenue: 3800, users: 2200 },
  { name: "4월", date: "2025-04-01", revenue: 5200, users: 2400 },
  { name: "5월", date: "2025-05-01", revenue: 4800, users: 2100 },
  { name: "6월", date: "2025-06-01", revenue: 6100, users: 2600 },
  { name: "7월", date: "2025-07-01", revenue: 5900, users: 2430 },
  { name: "8월", date: "2025-08-01", revenue: 6400, users: 2700 },
  { name: "9월", date: "2025-09-01", revenue: 5800, users: 2550 },
  { name: "10월", date: "2025-10-01", revenue: 6900, users: 2850 },
  { name: "11월", date: "2025-11-01", revenue: 7500, users: 2950 },
  { name: "12월", date: "2025-12-01", revenue: 7200, users: 3100 },
];

export const categoryData: ChartData[] = [
  { name: "직접 유입", value: 35 },
  { name: "검색 엔진", value: 30 },
  { name: "소셜 미디어", value: 20 },
  { name: "이메일", value: 10 },
  { name: "기타", value: 5 },
];

export const users: User[] = [
  { id: "1", name: "김민수", email: "minsu@example.com", role: "admin", status: "active", joinedAt: "2024-01-15" },
  { id: "2", name: "이지은", email: "jieun@example.com", role: "user", status: "active", joinedAt: "2024-02-20" },
  { id: "3", name: "박서준", email: "seojun@example.com", role: "user", status: "inactive", joinedAt: "2024-03-10" },
  { id: "4", name: "최유리", email: "yuri@example.com", role: "viewer", status: "active", joinedAt: "2024-04-05" },
  { id: "5", name: "정하늘", email: "haneul@example.com", role: "user", status: "active", joinedAt: "2024-05-12" },
  { id: "6", name: "강도윤", email: "doyun@example.com", role: "admin", status: "active", joinedAt: "2024-06-01" },
  { id: "7", name: "윤서연", email: "seoyeon@example.com", role: "user", status: "inactive", joinedAt: "2024-07-18" },
  { id: "8", name: "임재현", email: "jaehyun@example.com", role: "viewer", status: "active", joinedAt: "2024-08-22" },
];

export const activities: Activity[] = [
  { id: "1", user: "김민수", action: "새 프로젝트 생성", target: "마케팅 캠페인 Q1", timestamp: "5분 전" },
  { id: "2", user: "이지은", action: "보고서 다운로드", target: "월간 매출 리포트", timestamp: "12분 전" },
  { id: "3", user: "박서준", action: "설정 변경", target: "알림 설정", timestamp: "1시간 전" },
  { id: "4", user: "최유리", action: "팀원 초대", target: "dev@example.com", timestamp: "2시간 전" },
  { id: "5", user: "정하늘", action: "대시보드 생성", target: "KPI 트래커", timestamp: "3시간 전" },
];
