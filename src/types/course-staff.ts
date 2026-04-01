// 과정별 인력 배당 + 정산

export type StaffRole = "강사" | "영업" | "행정" | "관리자" | "운영비";
export type PaymentType = "3.3%" | "세금계산서" | "기타소득8.8%";
export type SettlementStatus = "배당" | "강의완료" | "입금대기" | "입금완료" | "정산완료";

export interface CourseStaffAssignment {
  id: string;
  courseId: string;
  courseName?: string;     // 조인용
  userId: string | null;   // null = 외부 인력
  userName?: string;       // 조인용
  externalName: string;    // 외부 인력명
  externalContact: string;
  role: StaffRole;
  grade: string;
  hours: number;           // 투입 시간
  unitPrice: number;       // 시간당 단가 (천원)
  ratePercent: number;     // 배분율 (%)
  paymentType: PaymentType;
  grossAmount: number;     // 총 지급액 (세전)
  taxAmount: number;       // 세금
  netAmount: number;       // 실지급액
  orgCost: number;         // 기관 실부담
  status: SettlementStatus;
  paidAt: string | null;
  notes: string;
}

/** 세금 자동 계산 */
export function calculateTax(
  grossAmount: number,
  paymentType: PaymentType
): { taxAmount: number; netAmount: number; orgCost: number } {
  switch (paymentType) {
    case "3.3%":
      // 원천징수: 기관이 3.3% 떼고 지급
      const tax33 = Math.round(grossAmount * 0.033);
      return { taxAmount: tax33, netAmount: grossAmount - tax33, orgCost: grossAmount };

    case "세금계산서":
      // VAT: 기관이 gross + 10% 지급, 강사 전액 수령
      const vat = Math.round(grossAmount * 0.1);
      return { taxAmount: vat, netAmount: grossAmount, orgCost: grossAmount + vat };

    case "기타소득8.8%":
      // 원천징수 8.8%
      const tax88 = Math.round(grossAmount * 0.088);
      return { taxAmount: tax88, netAmount: grossAmount - tax88, orgCost: grossAmount };
  }
}

/** 총 지급액 계산 (역할별) */
export function calculateGrossAmount(
  role: StaffRole,
  hours: number,
  unitPrice: number,
  ratePercent: number,
  courseRevenue: number
): number {
  if (role === "강사") {
    return hours * unitPrice; // 시간 × 단가
  }
  // 영업/행정/관리자/운영비: 매출 × 배분율
  return Math.round(courseRevenue * ratePercent / 100);
}

/** 과정 상태 흐름 */
export const COURSE_STATUS_FLOW = ["계약", "개설", "진행중", "수료", "입금대기", "입금완료", "정산완료"] as const;

export function getDisplayName(staff: CourseStaffAssignment): string {
  if (staff.userId && staff.userName) return staff.userName;
  if (staff.externalName) return `${staff.externalName} (외부)`;
  return "(미지정)";
}
