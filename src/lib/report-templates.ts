import type { ReportTemplate } from "@/types/report";

export const REPORT_TEMPLATES: ReportTemplate[] = [
  {
    id: "revenue",
    name: "매출 분석",
    description: "기간별 매출 데이터를 시각화합니다",
    requiredFields: [
      { key: "date", label: "날짜", type: "date", question: "데이터 기간(날짜)을 입력해주세요" },
      { key: "revenue", label: "매출", type: "number", question: "매출 금액을 입력해주세요 (단위: 만원)" },
    ],
    optionalFields: [
      { key: "category", label: "카테고리", type: "string", question: "매출 카테고리가 있으면 입력해주세요" },
      { key: "target", label: "목표", type: "number", question: "목표 매출이 있으면 입력해주세요" },
    ],
    charts: [
      { type: "bar", xKey: "date", yKeys: ["revenue"], title: "기간별 매출", colors: ["#3b82f6"] },
      { type: "line", xKey: "date", yKeys: ["revenue", "target"], title: "매출 vs 목표", colors: ["#3b82f6", "#f59e0b"] },
    ],
    tableColumns: ["date", "revenue", "category", "target"],
  },
  {
    id: "users",
    name: "사용자 분석",
    description: "사용자 증감 추이를 분석합니다",
    requiredFields: [
      { key: "date", label: "날짜", type: "date", question: "데이터 기간(날짜)을 입력해주세요" },
      { key: "users", label: "사용자 수", type: "number", question: "사용자 수를 입력해주세요" },
    ],
    optionalFields: [
      { key: "new_users", label: "신규 사용자", type: "number", question: "신규 가입자 수가 있으면 입력해주세요" },
      { key: "churn", label: "이탈 수", type: "number", question: "이탈 사용자 수가 있으면 입력해주세요" },
    ],
    charts: [
      { type: "area", xKey: "date", yKeys: ["users"], title: "사용자 추이", colors: ["#10b981"] },
      { type: "bar", xKey: "date", yKeys: ["new_users", "churn"], title: "신규 vs 이탈", colors: ["#3b82f6", "#ef4444"] },
    ],
    tableColumns: ["date", "users", "new_users", "churn"],
  },
  {
    id: "custom",
    name: "커스텀",
    description: "데이터에 맞게 직접 차트를 구성합니다",
    requiredFields: [],
    optionalFields: [],
    charts: [],
    tableColumns: [],
  },
];
