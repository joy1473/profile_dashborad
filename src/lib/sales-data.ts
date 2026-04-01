import { supabase, isSupabaseConfigured } from "./supabase";
import type { SalesLead, CourseRun, MonthlySettlement, PipelineSummary, LeadStatus, SettlementItem } from "@/types/sales";

// ════════════════════════════════════════
// Supabase 연동 + localStorage fallback
// ════════════════════════════════════════

const USE_SUPABASE = isSupabaseConfigured;
const LEADS_KEY = "sales_leads";
const COURSES_KEY = "sales_courses";

// ── localStorage helpers ──

function loadLocal<T>(key: string): T[] {
  if (typeof window === "undefined") return [];
  const raw = localStorage.getItem(key);
  return raw ? JSON.parse(raw) : [];
}

function saveLocal<T>(key: string, data: T[]): void {
  localStorage.setItem(key, JSON.stringify(data));
}

// ── Row mapper (snake_case → camelCase) ──

function mapLeadRow(row: Record<string, unknown>): SalesLead {
  return {
    id: row.id as string,
    company: row.company as string,
    contact: (row.contact as string) ?? "",
    phone: (row.phone as string) ?? "",
    email: (row.email as string) ?? "",
    region: (row.region as string) ?? "",
    employeeCount: (row.employee_count as number) ?? 0,
    status: row.status as LeadStatus,
    courseType: row.course_type as SalesLead["courseType"],
    expectedRevenue: (row.expected_revenue as number) ?? 0,
    assignedTo: (row.assigned_to as string) ?? "",
    notes: (row.notes as string) ?? "",
    createdAt: (row.created_at as string) ?? "",
    updatedAt: (row.updated_at as string) ?? "",
  };
}

function mapCourseRow(row: Record<string, unknown>): CourseRun {
  return {
    id: row.id as string,
    title: row.title as string,
    courseType: row.course_type as CourseRun["courseType"],
    startDate: (row.start_date as string) ?? "",
    endDate: (row.end_date as string) ?? "",
    students: (row.students as number) ?? 0,
    hours: (row.hours as number) ?? 0,
    revenue: (row.revenue as number) ?? 0,
    govSupport: (row.gov_support as number) ?? 0,
    status: row.status as CourseRun["status"],
    leadId: (row.lead_id as string) ?? undefined,
    instructorId: (row.instructor_id as string) ?? undefined,
  };
}

// ════════════════════════════════════════
// Leads CRUD
// ════════════════════════════════════════

export async function getLeads(): Promise<SalesLead[]> {
  if (!USE_SUPABASE) return loadLocal<SalesLead>(LEADS_KEY);

  const { data, error } = await supabase
    .from("sales_leads")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) { console.error("getLeads:", error); return []; }
  return (data ?? []).map(mapLeadRow);
}

export async function createLead(
  input: Omit<SalesLead, "id" | "createdAt" | "updatedAt">
): Promise<SalesLead> {
  if (!USE_SUPABASE) {
    const leads = loadLocal<SalesLead>(LEADS_KEY);
    const lead: SalesLead = {
      ...input,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    leads.unshift(lead);
    saveLocal(LEADS_KEY, leads);
    return lead;
  }

  const { data, error } = await supabase
    .from("sales_leads")
    .insert({
      company: input.company,
      contact: input.contact,
      phone: input.phone,
      email: input.email,
      region: input.region,
      employee_count: input.employeeCount,
      status: input.status,
      course_type: input.courseType,
      expected_revenue: input.expectedRevenue,
      assigned_to: input.assignedTo || null,
      notes: input.notes,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return mapLeadRow(data);
}

export async function updateLead(
  id: string,
  updates: Partial<SalesLead>
): Promise<SalesLead | null> {
  if (!USE_SUPABASE) {
    const leads = loadLocal<SalesLead>(LEADS_KEY);
    const idx = leads.findIndex((l) => l.id === id);
    if (idx === -1) return null;
    leads[idx] = { ...leads[idx], ...updates, updatedAt: new Date().toISOString() };
    saveLocal(LEADS_KEY, leads);
    return leads[idx];
  }

  // camelCase → snake_case
  const payload: Record<string, unknown> = {};
  if (updates.company !== undefined) payload.company = updates.company;
  if (updates.contact !== undefined) payload.contact = updates.contact;
  if (updates.phone !== undefined) payload.phone = updates.phone;
  if (updates.email !== undefined) payload.email = updates.email;
  if (updates.region !== undefined) payload.region = updates.region;
  if (updates.employeeCount !== undefined) payload.employee_count = updates.employeeCount;
  if (updates.status !== undefined) payload.status = updates.status;
  if (updates.courseType !== undefined) payload.course_type = updates.courseType;
  if (updates.expectedRevenue !== undefined) payload.expected_revenue = updates.expectedRevenue;
  if (updates.assignedTo !== undefined) payload.assigned_to = updates.assignedTo || null;
  if (updates.notes !== undefined) payload.notes = updates.notes;

  const { data, error } = await supabase
    .from("sales_leads")
    .update(payload)
    .eq("id", id)
    .select()
    .single();

  if (error) { console.error("updateLead:", error); return null; }
  return mapLeadRow(data);
}

export async function deleteLead(id: string): Promise<void> {
  if (!USE_SUPABASE) {
    const leads = loadLocal<SalesLead>(LEADS_KEY).filter((l) => l.id !== id);
    saveLocal(LEADS_KEY, leads);
    return;
  }

  const { error } = await supabase
    .from("sales_leads")
    .delete()
    .eq("id", id);

  if (error) throw new Error(error.message);
}

// ════════════════════════════════════════
// Courses CRUD
// ════════════════════════════════════════

export async function getCourses(): Promise<CourseRun[]> {
  if (!USE_SUPABASE) return loadLocal<CourseRun>(COURSES_KEY);

  const { data, error } = await supabase
    .from("course_runs")
    .select("*")
    .order("start_date", { ascending: false });

  if (error) { console.error("getCourses:", error); return []; }
  return (data ?? []).map(mapCourseRow);
}

export async function createCourse(
  input: Omit<CourseRun, "id">
): Promise<CourseRun> {
  if (!USE_SUPABASE) {
    const courses = loadLocal<CourseRun>(COURSES_KEY);
    const course: CourseRun = { ...input, id: crypto.randomUUID() };
    courses.unshift(course);
    saveLocal(COURSES_KEY, courses);
    return course;
  }

  const { data, error } = await supabase
    .from("course_runs")
    .insert({
      title: input.title,
      course_type: input.courseType,
      start_date: input.startDate || null,
      end_date: input.endDate || null,
      students: input.students,
      hours: input.hours,
      revenue: input.revenue,
      gov_support: input.govSupport,
      status: input.status,
      lead_id: input.leadId || null,
      instructor_id: input.instructorId || null,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return mapCourseRow(data);
}

// ════════════════════════════════════════
// Pipeline 집계
// ════════════════════════════════════════

export async function getPipelineSummary(): Promise<PipelineSummary[]> {
  const leads = await getLeads();
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

// ════════════════════════════════════════
// MM 정산 계산
// ════════════════════════════════════════

const DEFAULT_RATIOS: Record<string, { aiPct: number; normalPct: number }> = {
  영업: { aiPct: 22, normalPct: 12 },
  강사: { aiPct: 48, normalPct: 52 },
  행정: { aiPct: 13, normalPct: 16 },
  운영비: { aiPct: 10, normalPct: 7 },
  순마진: { aiPct: 17, normalPct: 13 },
};

export function calculateSettlement(
  yearMonth: string,
  totalRevenue: number,
  teamMembers: { role: string; name: string; hours: number }[],
  isAI: boolean
): MonthlySettlement {
  const items: SettlementItem[] = teamMembers.map((m) => {
    const ratioSet = DEFAULT_RATIOS[m.role] || { aiPct: 10, normalPct: 10 };
    const ratio = isAI ? ratioSet.aiPct : ratioSet.normalPct;
    return {
      role: m.role as SettlementItem["role"],
      name: m.name,
      ratio,
      amount: Math.round(totalRevenue * ratio / 100),
      hours: m.hours,
      mm: m.hours > 0 ? Math.round((m.hours / 160) * 100) / 100 : 0,
    };
  });

  return { id: crypto.randomUUID(), yearMonth, totalRevenue, items };
}

// ════════════════════════════════════════
// 데모 데이터 시딩 (localStorage only)
// ════════════════════════════════════════

export async function seedDemoData(): Promise<void> {
  if (USE_SUPABASE) return; // Supabase 사용 시 시딩 안함
  if (loadLocal(LEADS_KEY).length > 0) return;

  const demoLeads: Omit<SalesLead, "id" | "createdAt" | "updatedAt">[] = [
    { company: "(주)디지털공작소", contact: "김민수", phone: "02-123-4567", email: "kim@dgjs.kr", region: "금천구", employeeCount: 25, status: "신규", courseType: "AI_6H", expectedRevenue: 3000, assignedTo: "", notes: "가산디지털단지 IT기업, AI도입 관심" },
    { company: "한솔테크", contact: "이정화", phone: "02-234-5678", email: "lee@hansol.co.kr", region: "구로구", employeeCount: 45, status: "접촉중", courseType: "AI_6H", expectedRevenue: 4500, assignedTo: "", notes: "제조업 MES 연동 관심" },
    { company: "(주)그린로지스", contact: "박서연", phone: "02-345-6789", email: "park@greenlogis.com", region: "금천구", employeeCount: 15, status: "제안", courseType: "AI_40H", expectedRevenue: 15000, assignedTo: "", notes: "물류 AI 최적화 교육 희망" },
    { company: "코리아빌드", contact: "최동현", phone: "02-456-7890", email: "choi@kbuild.kr", region: "구로구", employeeCount: 80, status: "협상", courseType: "AI_40H", expectedRevenue: 25000, assignedTo: "", notes: "건설업 입찰분석 AI 도입" },
    { company: "(주)스마트HR", contact: "정유진", phone: "02-567-8901", email: "jung@smarthr.kr", region: "금천구", employeeCount: 30, status: "계약", courseType: "AI_6H", expectedRevenue: 4500, assignedTo: "", notes: "HR AI 면접 시스템 구축" },
    { company: "넥스트ERP", contact: "한도윤", phone: "02-678-9012", email: "han@nexterp.co.kr", region: "구로구", employeeCount: 50, status: "완료", courseType: "AI_40H", expectedRevenue: 20000, assignedTo: "", notes: "ERP AI 자동화 완료" },
  ];

  for (const l of demoLeads) await createLead(l);

  const demoCourses: Omit<CourseRun, "id">[] = [
    { title: "AI 실무 맛보기 (6H) - 1기", courseType: "AI_6H", startDate: "2026-05-15", endDate: "2026-05-15", students: 15, hours: 6, revenue: 4500, govSupport: 4050, status: "완료" },
    { title: "AI 실무 맛보기 (6H) - 2기", courseType: "AI_6H", startDate: "2026-06-12", endDate: "2026-06-12", students: 20, hours: 6, revenue: 6000, govSupport: 5400, status: "진행중" },
    { title: "산업맞춤 AI 심화 (40H)", courseType: "AI_40H", startDate: "2026-07-01", endDate: "2026-08-30", students: 10, hours: 40, revenue: 25000, govSupport: 22500, status: "예정" },
  ];

  for (const c of demoCourses) await createCourse(c);
}
