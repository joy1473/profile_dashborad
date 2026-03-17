import type { WizardStep, ProposalData, EstimateData } from "@/types/bid";

export const PROPOSAL_STEPS: WizardStep[] = [
  { id: 1, label: "기본 정보" },
  { id: 2, label: "회사 소개" },
  { id: 3, label: "기술 방안" },
  { id: 4, label: "추진 일정" },
  { id: 5, label: "투입 인력" },
  { id: 6, label: "비용" },
  { id: 7, label: "미리보기" },
];

export const ESTIMATE_STEPS: WizardStep[] = [
  { id: 1, label: "기본 정보" },
  { id: 2, label: "견적 항목" },
  { id: 3, label: "조건/비고" },
  { id: 4, label: "미리보기" },
];

export const EMPTY_PROPOSAL: ProposalData = {
  projectName: "",
  clientName: "",
  submitDate: new Date().toISOString().split("T")[0],
  company: { name: "", ceo: "", phone: "", address: "" },
  companyIntro: "",
  trackRecord: [{ project: "", client: "", period: "", amount: "" }],
  understanding: "",
  strategy: "",
  systemDiagram: "",
  techDetail: "",
  totalPeriod: "",
  schedule: [{ phase: "", period: "", deliverable: "" }],
  team: [{ name: "", role: "", grade: "", period: "" }],
  costs: [{ item: "", qty: 1, unitPrice: 0, amount: 0 }],
  vatIncluded: true,
};

export const EMPTY_ESTIMATE: EstimateData = {
  title: "",
  recipient: { company: "", contact: "" },
  sender: { company: "", ceo: "", phone: "" },
  date: new Date().toISOString().split("T")[0],
  validUntil: "",
  items: [{ name: "", spec: "", qty: 1, unitPrice: 0, amount: 0 }],
  deliveryTerms: "",
  paymentTerms: "",
  notes: "",
};
