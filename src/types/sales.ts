// 영업관리 타입 정의

export type LeadStatus = "신규" | "접촉중" | "제안" | "협상" | "계약" | "완료" | "보류";
export type CourseType = "AI_6H" | "AI_40H" | "일반";
export type TeamRole = "영업" | "강사" | "행정" | "관리자";

/** 영업 리드 (잠재 고객) */
export interface SalesLead {
  id: string;
  company: string;          // 기업명
  contact: string;          // 담당자명
  phone: string;
  email: string;
  region: string;            // 금천구 / 구로구 / 기타
  employeeCount: number;     // 직원 수
  status: LeadStatus;
  courseType: CourseType;
  expectedRevenue: number;   // 예상 수강료 (천원)
  assignedTo: string;        // 담당 영업자 (user_id)
  notes: string;
  createdAt: string;
  updatedAt: string;
}

/** 교육 과정 운영 */
export interface CourseRun {
  id: string;
  title: string;
  courseType: CourseType;
  startDate: string;
  endDate: string;
  students: number;
  hours: number;
  revenue: number;           // 수강료 (천원)
  govSupport: number;        // 정부지원금 (천원)
  status: "예정" | "진행중" | "완료" | "취소";
  leadId?: string;
  instructorId?: string;
}

/** 월간 정산 (MM 계산) */
export interface MonthlySettlement {
  id: string;
  yearMonth: string;         // 2026-07
  totalRevenue: number;      // 총 매출 (천원)
  items: SettlementItem[];
}

export interface SettlementItem {
  role: TeamRole;
  name: string;
  ratio: number;             // 배분 비율 (%)
  amount: number;            // 배분 금액 (천원)
  hours: number;             // 투입 시간
  mm: number;                // M/M (투입 시간 / 160)
}

/** 영업 파이프라인 요약 */
export interface PipelineSummary {
  status: LeadStatus;
  count: number;
  totalRevenue: number;
}
