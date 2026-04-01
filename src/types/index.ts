export type TeamRole = "" | "영업" | "강사" | "행정" | "관리자";

export interface User {
  id: string;
  name: string;
  email: string;
  role: "admin" | "user" | "viewer";
  teamRole: TeamRole;
  status: "active" | "inactive";
  joinedAt: string;
  avatar?: string;
}

export interface UpdateProfileInput {
  name?: string;
  role?: "admin" | "user" | "viewer";
  status?: "active" | "inactive";
}

export interface MetricCard {
  title: string;
  value: string;
  change: number;
  trend: "up" | "down";
}

export interface ChartData {
  name: string;
  [key: string]: string | number;
}

export interface Activity {
  id: string;
  user: string;
  action: string;
  target: string;
  timestamp: string;
}
