export interface ProposalData {
  projectName: string;
  clientName: string;
  submitDate: string;
  company: { name: string; ceo: string; phone: string; address: string };
  companyIntro: string;
  trackRecord: { project: string; client: string; period: string; amount: string }[];
  understanding: string;
  strategy: string;
  systemDiagram: string;
  techDetail: string;
  totalPeriod: string;
  schedule: { phase: string; period: string; deliverable: string }[];
  team: { name: string; role: string; grade: string; period: string }[];
  costs: { item: string; qty: number; unitPrice: number; amount: number }[];
  vatIncluded: boolean;
}

export interface EstimateData {
  title: string;
  recipient: { company: string; contact: string };
  sender: { company: string; ceo: string; phone: string };
  date: string;
  validUntil: string;
  items: { name: string; spec: string; qty: number; unitPrice: number; amount: number }[];
  deliveryTerms: string;
  paymentTerms: string;
  notes: string;
}

export interface WizardStep {
  id: number;
  label: string;
}

export type BidTemplateId = "proposal" | "estimate";
