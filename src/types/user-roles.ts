// 사용자 역할 배정 (1 user = N 역할, 기간 기반)

export type RoleType = "영업" | "강사" | "행정" | "관리자";

export type InstructorGrade = "S급" | "A급" | "B급" | "C급" | "보조";
export type SalesGrade = "관리자" | "실무" | "제휴";
export type AdminGrade = "정규" | "계약";
export type ManagerGrade = "대표" | "PM";

export type RoleGrade = InstructorGrade | SalesGrade | AdminGrade | ManagerGrade | "";

/** 강사 등급별 기본 단가 (천원/시간) */
export const INSTRUCTOR_RATES: Record<InstructorGrade, { ai: number; normal: number }> = {
  "S급": { ai: 150, normal: 80 },
  "A급": { ai: 100, normal: 50 },
  "B급": { ai: 65, normal: 30 },
  "C급": { ai: 40, normal: 20 },
  "보조": { ai: 15, normal: 8 },
};

/** 영업 등급별 기본 배분율 (%) */
export const SALES_RATES: Record<SalesGrade, { ai: number; normal: number }> = {
  "관리자": { ai: 25, normal: 15 },
  "실무": { ai: 20, normal: 12 },
  "제휴": { ai: 15, normal: 10 },
};

/** 역할별 가능한 등급 */
export const GRADE_OPTIONS: Record<RoleType, string[]> = {
  "강사": ["S급", "A급", "B급", "C급", "보조"],
  "영업": ["관리자", "실무", "제휴"],
  "행정": ["정규", "계약"],
  "관리자": ["대표", "PM"],
};

/** 역할 배정 */
export interface UserRoleAssignment {
  id: string;
  userId: string;
  userName?: string;
  role: RoleType;
  grade: RoleGrade;
  aiHourlyRate: number;       // 강사: AI 시간단가 (천원)
  normalHourlyRate: number;   // 강사: 일반 시간단가 (천원)
  ratePercent: number;        // 영업/행정: 배분율 (%)
  monthlySalary: number;      // 정규직: 월급여 (천원)
  startDate: string;          // YYYY-MM-DD
  endDate: string | null;     // null = 현재 활성
  ncsCode: string;
  ncsName: string;
  qualification: string;
  careerYears: number;
  notes: string;
}

/** 특정 월에 활성인 역할만 필터 */
export function getActiveRolesForMonth(
  assignments: UserRoleAssignment[],
  yearMonth: string // "2026-03"
): UserRoleAssignment[] {
  const monthStart = `${yearMonth}-01`;
  const monthEnd = `${yearMonth}-31`; // 대략적 (28/30/31 무관)
  return assignments.filter((a) => {
    const started = a.startDate <= monthEnd;
    const notEnded = !a.endDate || a.endDate >= monthStart;
    return started && notEnded;
  });
}

/** 특정 사용자의 현재 활성 역할 목록 */
export function getCurrentRoles(assignments: UserRoleAssignment[], userId: string): UserRoleAssignment[] {
  const today = new Date().toISOString().split("T")[0];
  return assignments.filter((a) => {
    return a.userId === userId && a.startDate <= today && (!a.endDate || a.endDate >= today);
  });
}

/** 정산용: 월별 사용자-역할 매핑 */
export interface MonthlyRoleSummary {
  userId: string;
  userName: string;
  roles: {
    role: RoleType;
    grade: RoleGrade;
    aiRate: number;
    normalRate: number;
    ratePercent: number;
  }[];
}
