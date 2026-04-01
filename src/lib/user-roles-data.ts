import { supabase, isSupabaseConfigured } from "./supabase";
import type { UserRoleAssignment, RoleType, RoleGrade } from "@/types/user-roles";

const USE_SUPABASE = isSupabaseConfigured;
const STORAGE_KEY = "user_role_assignments";

// ── localStorage helpers ──

function loadLocal(): UserRoleAssignment[] {
  if (typeof window === "undefined") return [];
  const raw = localStorage.getItem(STORAGE_KEY);
  return raw ? JSON.parse(raw) : [];
}

function saveLocal(data: UserRoleAssignment[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

// ── Row mapper ──

function mapRow(row: Record<string, unknown>): UserRoleAssignment {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    userName: (row.user_name as string) ?? "",
    role: row.role as RoleType,
    grade: (row.grade as RoleGrade) ?? "",
    aiHourlyRate: (row.ai_hourly_rate as number) ?? 0,
    normalHourlyRate: (row.normal_hourly_rate as number) ?? 0,
    ratePercent: Number(row.rate_percent ?? 0),
    monthlySalary: (row.monthly_salary as number) ?? 0,
    startDate: (row.start_date as string) ?? "",
    endDate: (row.end_date as string) ?? null,
    ncsCode: (row.ncs_code as string) ?? "",
    ncsName: (row.ncs_name as string) ?? "",
    qualification: (row.qualification as string) ?? "",
    careerYears: (row.career_years as number) ?? 0,
    notes: (row.notes as string) ?? "",
  };
}

// ── CRUD ──

export async function getRoleAssignments(): Promise<UserRoleAssignment[]> {
  if (!USE_SUPABASE) return loadLocal();

  const { data, error } = await supabase
    .from("user_role_assignments")
    .select("*, profiles(name)")
    .order("start_date", { ascending: false });

  if (error) { console.error("getRoleAssignments:", error); return []; }
  return (data ?? []).map((row: Record<string, unknown>) => ({
    ...mapRow(row),
    userName: (row.profiles as Record<string, unknown>)?.name as string ?? "",
  }));
}

export async function createRoleAssignment(
  input: Omit<UserRoleAssignment, "id">
): Promise<UserRoleAssignment> {
  if (!USE_SUPABASE) {
    const all = loadLocal();
    const item: UserRoleAssignment = { ...input, id: crypto.randomUUID() };
    all.unshift(item);
    saveLocal(all);
    return item;
  }

  const { data, error } = await supabase
    .from("user_role_assignments")
    .insert({
      user_id: input.userId,
      role: input.role,
      grade: input.grade,
      ai_hourly_rate: input.aiHourlyRate,
      normal_hourly_rate: input.normalHourlyRate,
      rate_percent: input.ratePercent,
      monthly_salary: input.monthlySalary,
      start_date: input.startDate,
      end_date: input.endDate || null,
      ncs_code: input.ncsCode,
      ncs_name: input.ncsName,
      qualification: input.qualification,
      career_years: input.careerYears,
      notes: input.notes,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return mapRow(data);
}

export async function updateRoleAssignment(
  id: string,
  updates: Partial<UserRoleAssignment>
): Promise<void> {
  if (!USE_SUPABASE) {
    const all = loadLocal();
    const idx = all.findIndex((a) => a.id === id);
    if (idx >= 0) {
      all[idx] = { ...all[idx], ...updates };
      saveLocal(all);
    }
    return;
  }

  const payload: Record<string, unknown> = {};
  if (updates.role !== undefined) payload.role = updates.role;
  if (updates.grade !== undefined) payload.grade = updates.grade;
  if (updates.aiHourlyRate !== undefined) payload.ai_hourly_rate = updates.aiHourlyRate;
  if (updates.normalHourlyRate !== undefined) payload.normal_hourly_rate = updates.normalHourlyRate;
  if (updates.ratePercent !== undefined) payload.rate_percent = updates.ratePercent;
  if (updates.monthlySalary !== undefined) payload.monthly_salary = updates.monthlySalary;
  if (updates.startDate !== undefined) payload.start_date = updates.startDate;
  if (updates.endDate !== undefined) payload.end_date = updates.endDate || null;
  if (updates.ncsCode !== undefined) payload.ncs_code = updates.ncsCode;
  if (updates.ncsName !== undefined) payload.ncs_name = updates.ncsName;
  if (updates.qualification !== undefined) payload.qualification = updates.qualification;
  if (updates.careerYears !== undefined) payload.career_years = updates.careerYears;
  if (updates.notes !== undefined) payload.notes = updates.notes;

  const { error } = await supabase
    .from("user_role_assignments")
    .update(payload)
    .eq("id", id);

  if (error) throw new Error(error.message);
}

export async function deleteRoleAssignment(id: string): Promise<void> {
  if (!USE_SUPABASE) {
    const all = loadLocal().filter((a) => a.id !== id);
    saveLocal(all);
    return;
  }

  const { error } = await supabase
    .from("user_role_assignments")
    .delete()
    .eq("id", id);

  if (error) throw new Error(error.message);
}

// ── 데모 시딩 ──

export async function seedRoleAssignments(): Promise<void> {
  if (USE_SUPABASE) return;
  if (loadLocal().length > 0) return;

  const demos: Omit<UserRoleAssignment, "id">[] = [
    // 김민수: 관리자(대표) — 전 기간
    { userId: "1", userName: "김민수", role: "관리자", grade: "대표", aiHourlyRate: 0, normalHourlyRate: 0, ratePercent: 17, monthlySalary: 0, startDate: "2026-01-01", endDate: null, ncsCode: "", ncsName: "", qualification: "", careerYears: 15, notes: "순마진 배분" },
    // 이지은: 영업(실무) 1~3월 → 강사(B급) 4월~
    { userId: "2", userName: "이지은", role: "영업", grade: "실무", aiHourlyRate: 0, normalHourlyRate: 0, ratePercent: 20, monthlySalary: 0, startDate: "2026-01-01", endDate: "2026-03-31", ncsCode: "", ncsName: "", qualification: "", careerYears: 5, notes: "1~3월 영업 담당" },
    { userId: "2", userName: "이지은", role: "강사", grade: "B급", aiHourlyRate: 65, normalHourlyRate: 30, ratePercent: 0, monthlySalary: 0, startDate: "2026-04-01", endDate: null, ncsCode: "20010703", ncsName: "인공지능모델링", qualification: "석사, NCS확인강사", careerYears: 5, notes: "4월부터 AI 강사 전환" },
    // 박서준: 강사(A급) 전 기간 + 영업(제휴) 동시
    { userId: "3", userName: "박서준", role: "강사", grade: "A급", aiHourlyRate: 100, normalHourlyRate: 50, ratePercent: 0, monthlySalary: 0, startDate: "2026-01-01", endDate: null, ncsCode: "20010705", ncsName: "인공지능서비스구현", qualification: "박사, 경력8년", careerYears: 8, notes: "AI/NLP 메인 강사" },
    { userId: "3", userName: "박서준", role: "영업", grade: "제휴", aiHourlyRate: 0, normalHourlyRate: 0, ratePercent: 15, monthlySalary: 0, startDate: "2026-01-01", endDate: null, ncsCode: "", ncsName: "", qualification: "", careerYears: 8, notes: "제휴 영업 병행" },
    // 정하늘: 행정(정규) 전 기간
    { userId: "5", userName: "정하늘", role: "행정", grade: "정규", aiHourlyRate: 0, normalHourlyRate: 0, ratePercent: 13, monthlySalary: 3500, startDate: "2026-01-01", endDate: null, ncsCode: "", ncsName: "", qualification: "HRD-Net 정산, 사후관리", careerYears: 3, notes: "" },
  ];

  for (const d of demos) await createRoleAssignment(d);
}
