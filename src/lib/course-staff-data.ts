import { supabase, isSupabaseConfigured } from "./supabase";
import type { CourseStaffAssignment, StaffRole, PaymentType, SettlementStatus } from "@/types/course-staff";

const USE_SUPABASE = isSupabaseConfigured;
const STORAGE_KEY = "course_staff_assignments";

function loadLocal(): CourseStaffAssignment[] {
  if (typeof window === "undefined") return [];
  const raw = localStorage.getItem(STORAGE_KEY);
  return raw ? JSON.parse(raw) : [];
}
function saveLocal(data: CourseStaffAssignment[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function mapRow(row: Record<string, unknown>): CourseStaffAssignment {
  return {
    id: row.id as string,
    courseId: row.course_id as string,
    userId: (row.user_id as string) ?? null,
    externalName: (row.external_name as string) ?? "",
    externalContact: (row.external_contact as string) ?? "",
    role: row.role as StaffRole,
    grade: (row.grade as string) ?? "",
    hours: Number(row.hours ?? 0),
    unitPrice: (row.unit_price as number) ?? 0,
    ratePercent: Number(row.rate_percent ?? 0),
    paymentType: (row.payment_type as PaymentType) ?? "3.3%",
    grossAmount: (row.gross_amount as number) ?? 0,
    taxAmount: (row.tax_amount as number) ?? 0,
    netAmount: (row.net_amount as number) ?? 0,
    orgCost: (row.org_cost as number) ?? 0,
    status: (row.status as SettlementStatus) ?? "배당",
    paidAt: (row.paid_at as string) ?? null,
    notes: (row.notes as string) ?? "",
  };
}

// ── CRUD ──

export async function getStaffByCourseuseId(courseId: string): Promise<CourseStaffAssignment[]> {
  if (!USE_SUPABASE) return loadLocal().filter((s) => s.courseId === courseId);
  const { data, error } = await supabase
    .from("course_staff_assignments")
    .select("*")
    .eq("course_id", courseId)
    .order("role");
  if (error) { console.error("getStaffByCourse:", error); return []; }
  return (data ?? []).map(mapRow);
}

export async function getAllStaff(): Promise<CourseStaffAssignment[]> {
  if (!USE_SUPABASE) return loadLocal();
  const { data, error } = await supabase
    .from("course_staff_assignments")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) { console.error("getAllStaff:", error); return []; }
  return (data ?? []).map(mapRow);
}

export async function createStaff(input: Omit<CourseStaffAssignment, "id">): Promise<CourseStaffAssignment> {
  if (!USE_SUPABASE) {
    const all = loadLocal();
    const item: CourseStaffAssignment = { ...input, id: crypto.randomUUID() };
    all.unshift(item);
    saveLocal(all);
    return item;
  }
  const { data, error } = await supabase
    .from("course_staff_assignments")
    .insert({
      course_id: input.courseId,
      user_id: input.userId || null,
      external_name: input.externalName,
      external_contact: input.externalContact,
      role: input.role,
      grade: input.grade,
      hours: input.hours,
      unit_price: input.unitPrice,
      rate_percent: input.ratePercent,
      payment_type: input.paymentType,
      gross_amount: input.grossAmount,
      tax_amount: input.taxAmount,
      net_amount: input.netAmount,
      org_cost: input.orgCost,
      status: input.status,
      paid_at: input.paidAt || null,
      notes: input.notes,
    })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return mapRow(data);
}

export async function updateStaff(id: string, updates: Partial<CourseStaffAssignment>): Promise<void> {
  if (!USE_SUPABASE) {
    const all = loadLocal();
    const idx = all.findIndex((s) => s.id === id);
    if (idx >= 0) { all[idx] = { ...all[idx], ...updates }; saveLocal(all); }
    return;
  }
  const payload: Record<string, unknown> = {};
  if (updates.role !== undefined) payload.role = updates.role;
  if (updates.grade !== undefined) payload.grade = updates.grade;
  if (updates.hours !== undefined) payload.hours = updates.hours;
  if (updates.unitPrice !== undefined) payload.unit_price = updates.unitPrice;
  if (updates.ratePercent !== undefined) payload.rate_percent = updates.ratePercent;
  if (updates.paymentType !== undefined) payload.payment_type = updates.paymentType;
  if (updates.grossAmount !== undefined) payload.gross_amount = updates.grossAmount;
  if (updates.taxAmount !== undefined) payload.tax_amount = updates.taxAmount;
  if (updates.netAmount !== undefined) payload.net_amount = updates.netAmount;
  if (updates.orgCost !== undefined) payload.org_cost = updates.orgCost;
  if (updates.status !== undefined) payload.status = updates.status;
  if (updates.paidAt !== undefined) payload.paid_at = updates.paidAt || null;
  if (updates.notes !== undefined) payload.notes = updates.notes;
  const { error } = await supabase.from("course_staff_assignments").update(payload).eq("id", id);
  if (error) throw new Error(error.message);
}

export async function deleteStaff(id: string): Promise<void> {
  if (!USE_SUPABASE) {
    saveLocal(loadLocal().filter((s) => s.id !== id));
    return;
  }
  const { error } = await supabase.from("course_staff_assignments").delete().eq("id", id);
  if (error) throw new Error(error.message);
}
