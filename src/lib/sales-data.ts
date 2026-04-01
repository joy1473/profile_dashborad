import type { SalesLead, CourseRun, MonthlySettlement, PipelineSummary, LeadStatus } from "@/types/sales";

// ── 로컬 스토리지 기반 CRUD (Supabase 미설정 시) ──

const LEADS_KEY = "sales_leads";
const COURSES_KEY = "sales_courses";

function loadFromStorage<T>(key: string): T[] {
  if (typeof window === "undefined") return [];
  const raw = localStorage.getItem(key);
  return raw ? JSON.parse(raw) : [];
}

function saveToStorage<T>(key: string, data: T[]): void {
  localStorage.setItem(key, JSON.stringify(data));
}

// ── Leads CRUD ──

export function getLeads(): SalesLead[] {
  return loadFromStorage<SalesLead>(LEADS_KEY);
}

export function createLead(input: Omit<SalesLead, "id" | "createdAt" | "updatedAt">): SalesLead {
  const leads = getLeads();
  const lead: SalesLead = {
    ...input,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  leads.unshift(lead);
  saveToStorage(LEADS_KEY, leads);
  return lead;
}

export function updateLead(id: string, updates: Partial<SalesLead>): SalesLead | null {
  const leads = getLeads();
  const idx = leads.findIndex((l) => l.id === id);
  if (idx === -1) return null;
  leads[idx] = { ...leads[idx], ...updates, updatedAt: new Date().toISOString() };
  saveToStorage(LEADS_KEY, leads);
  return leads[idx];
}

export function deleteLead(id: string): void {
  const leads = getLeads().filter((l) => l.id !== id);
  saveToStorage(LEADS_KEY, leads);
}

// ── Courses CRUD ──

export function getCourses(): CourseRun[] {
  return loadFromStorage<CourseRun>(COURSES_KEY);
}

export function createCourse(input: Omit<CourseRun, "id">): CourseRun {
  const courses = getCourses();
  const course: CourseRun = { ...input, id: crypto.randomUUID() };
  courses.unshift(course);
  saveToStorage(COURSES_KEY, courses);
  return course;
}

// ── Pipeline 집계 ──

export function getPipelineSummary(): PipelineSummary[] {
  const leads = getLeads();
  const statuses: LeadStatus[] = ["신규", "접촉중", "제안", "협상", "계약", "완료", "보류"];
  return statuses.map((status) => {
    const filtered = leads.filter((l) => l.status === status);
    return {
      status,
      count: filtered.length,
      totalRevenue: filtered.reduce((sum, l) => sum + l.expectedRevenue, 0),
    };
  });
}

// ── MM 정산 계산 ──

const DEFAULT_RATIOS: Record<string, { aiPct: number; normalPct: number }> = {
  영업: { aiPct: 22, normalPct: 12 },
  강사: { aiPct: 48, normalPct: 52 },
  행정: { aiPct: 13, normalPct: 16 },
  운영비: { aiPct: 10, normalPct: 7 },
  순마진: { aiPct: 17, normalPct: 13 },
};

export function calculateSettlement(
  yearMonth: string,
  teamMembers: { role: string; name: string; hours: number }[],
  isAI: boolean
): MonthlySettlement {
  const courses = getCourses().filter(
    (c) => c.startDate.startsWith(yearMonth) || c.endDate.startsWith(yearMonth)
  );
  const totalRevenue = courses.reduce((sum, c) => sum + c.revenue, 0);

  const items = teamMembers.map((m) => {
    const ratioSet = DEFAULT_RATIOS[m.role] || { aiPct: 10, normalPct: 10 };
    const ratio = isAI ? ratioSet.aiPct : ratioSet.normalPct;
    return {
      role: m.role as "영업" | "강사" | "행정" | "관리자",
      name: m.name,
      ratio,
      amount: Math.round(totalRevenue * ratio / 100),
      hours: m.hours,
      mm: Math.round((m.hours / 160) * 100) / 100,
    };
  });

  return {
    id: crypto.randomUUID(),
    yearMonth,
    totalRevenue,
    items,
  };
}

// ── Demo 데이터 시딩 ──

export function seedDemoData(): void {
  if (getLeads().length > 0) return;

  const demoLeads: Omit<SalesLead, "id" | "createdAt" | "updatedAt">[] = [
    { company: "(주)디지털공작소", contact: "김민수", phone: "02-123-4567", email: "kim@dgjs.kr", region: "금천구", employeeCount: 25, status: "신규", courseType: "AI_6H", expectedRevenue: 3000, assignedTo: "", notes: "가산디지털단지 IT기업, AI도입 관심" },
    { company: "한솔테크", contact: "이정화", phone: "02-234-5678", email: "lee@hansol.co.kr", region: "구로구", employeeCount: 45, status: "접촉중", courseType: "AI_6H", expectedRevenue: 4500, assignedTo: "", notes: "제조업 MES 연동 관심" },
    { company: "(주)그린로지스", contact: "박서연", phone: "02-345-6789", email: "park@greenlogis.com", region: "금천구", employeeCount: 15, status: "제안", courseType: "AI_40H", expectedRevenue: 15000, assignedTo: "", notes: "물류 AI 최적화 교육 희망" },
    { company: "코리아빌드", contact: "최동현", phone: "02-456-7890", email: "choi@kbuild.kr", region: "구로구", employeeCount: 80, status: "협상", courseType: "AI_40H", expectedRevenue: 25000, assignedTo: "", notes: "건설업 입찰분석 AI 도입" },
    { company: "(주)스마트HR", contact: "정유진", phone: "02-567-8901", email: "jung@smarthr.kr", region: "금천구", employeeCount: 30, status: "계약", courseType: "AI_6H", expectedRevenue: 4500, assignedTo: "", notes: "HR AI 면접 시스템 구축" },
    { company: "넥스트ERP", contact: "한도윤", phone: "02-678-9012", email: "han@nexterp.co.kr", region: "구로구", employeeCount: 50, status: "완료", courseType: "AI_40H", expectedRevenue: 20000, assignedTo: "", notes: "ERP AI 자동화 완료" },
  ];

  demoLeads.forEach((l) => createLead(l));

  const demoCourses: Omit<CourseRun, "id">[] = [
    { title: "AI 실무 맛보기 (6H) - 1기", courseType: "AI_6H", startDate: "2026-05-15", endDate: "2026-05-15", students: 15, hours: 6, revenue: 4500, govSupport: 4050, status: "완료" },
    { title: "AI 실무 맛보기 (6H) - 2기", courseType: "AI_6H", startDate: "2026-06-12", endDate: "2026-06-12", students: 20, hours: 6, revenue: 6000, govSupport: 5400, status: "진행중" },
    { title: "산업맞춤 AI 심화 (40H)", courseType: "AI_40H", startDate: "2026-07-01", endDate: "2026-08-30", students: 10, hours: 40, revenue: 25000, govSupport: 22500, status: "예정" },
  ];

  demoCourses.forEach((c) => createCourse(c));
}
