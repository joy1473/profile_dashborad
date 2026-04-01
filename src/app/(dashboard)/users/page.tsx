"use client";

import { useState, useEffect, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { UserAvatar } from "@/components/users/user-avatar";
import { UserModal } from "@/components/users/user-modal";
import { useToast } from "@/components/ui/toast";
import { fetchProfiles, updateProfile } from "@/lib/users";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import {
  Plus, X, Edit2, Trash2, Calendar, Briefcase, GraduationCap,
  Phone, UserCheck, Crown, ChevronDown, ChevronUp,
} from "lucide-react";
import type { User, UpdateProfileInput } from "@/types";
import type { UserRoleAssignment, RoleType, RoleGrade } from "@/types/user-roles";
import { GRADE_OPTIONS, INSTRUCTOR_RATES, SALES_RATES, getCurrentRoles, getActiveRolesForMonth } from "@/types/user-roles";
import { getRoleAssignments, createRoleAssignment, updateRoleAssignment, deleteRoleAssignment, seedRoleAssignments } from "@/lib/user-roles-data";

const roleColors: Record<string, string> = {
  admin: "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300",
  user: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
  viewer: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
};
const statusColors: Record<string, string> = {
  active: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
  inactive: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
};
const teamRoleIcons: Record<RoleType, typeof Briefcase> = {
  "영업": Phone, "강사": GraduationCap, "행정": UserCheck, "관리자": Crown,
};
const teamRoleColors: Record<RoleType, string> = {
  "영업": "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  "강사": "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300",
  "행정": "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
  "관리자": "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300",
};

type ViewTab = "list" | "roles" | "settlement";

export default function UsersPage() {
  const [viewTab, setViewTab] = useState<ViewTab>("list");
  const [filter, setFilter] = useState<"all" | "active" | "inactive">("all");
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserRole, setCurrentUserRole] = useState<User["role"] | null>(null);
  const { showToast } = useToast();

  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  // 역할 배정
  const [assignments, setAssignments] = useState<UserRoleAssignment[]>([]);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState<UserRoleAssignment | null>(null);
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null);

  // MM 정산
  const [settlementMonth, setSettlementMonth] = useState(() => new Date().toISOString().substring(0, 7));

  const reloadAssignments = useCallback(async () => {
    const data = await getRoleAssignments();
    setAssignments(data);
  }, []);

  useEffect(() => {
    fetchProfiles().then((data) => { setUsers(data); setLoading(false); });
    supabase.auth.getUser().then(({ data }) => setCurrentUserId(data.user?.id ?? null));
    seedRoleAssignments().then(() => reloadAssignments());
  }, [reloadAssignments]);

  useEffect(() => {
    if (currentUserId && users.length > 0) {
      setCurrentUserRole(users.find((u) => u.id === currentUserId)?.role ?? null);
    }
  }, [currentUserId, users]);

  const isAdmin = currentUserRole === "admin";

  const handleUpdate = useCallback(async (userId: string, input: UpdateProfileInput) => {
    const original = users.find((u) => u.id === userId);
    if (!original) return;
    if (!isAdmin && userId !== currentUserId) { showToast("관리자만 수정 가능"); return; }
    setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, ...input } : u)));
    try {
      const updated = await updateProfile(userId, input);
      setUsers((prev) => prev.map((u) => (u.id === userId ? updated : u)));
      showToast("수정 완료", "success");
    } catch (err) {
      setUsers((prev) => prev.map((u) => (u.id === userId ? original : u)));
      showToast(err instanceof Error ? err.message : "수정 실패");
    }
  }, [users, showToast, isAdmin, currentUserId]);

  const filtered = filter === "all" ? users : users.filter((u) => u.status === filter);

  // 월별 활성 역할
  const monthlyRoles = getActiveRolesForMonth(assignments, settlementMonth);

  return (
    <div className="space-y-4">
      {/* 헤더 + 탭 */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">사용자</h2>
        <div className="flex gap-1 rounded-lg bg-zinc-100 p-1 dark:bg-zinc-800">
          {([
            { key: "list" as ViewTab, label: "사용자" },
            { key: "roles" as ViewTab, label: "역할 배정" },
            { key: "settlement" as ViewTab, label: "MM 정산" },
          ]).map((t) => (
            <button key={t.key} onClick={() => setViewTab(t.key)} className={cn(
              "rounded-md px-3 py-1.5 text-xs font-medium transition",
              viewTab === t.key ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-700 dark:text-zinc-100" : "text-zinc-500"
            )}>{t.label}</button>
          ))}
        </div>
      </div>

      {/* ── 사용자 목록 탭 ── */}
      {viewTab === "list" && (
        <>
          <div className="flex gap-2">
            {(["all", "active", "inactive"] as const).map((f) => (
              <button key={f} onClick={() => setFilter(f)} className={cn(
                "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
                filter === f ? "bg-zinc-900 text-white dark:bg-zinc-50 dark:text-zinc-900" : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
              )}>{f === "all" ? "전체" : f === "active" ? "활성" : "비활성"}</button>
            ))}
          </div>
          <Card>
            <div className="overflow-x-auto">
              {loading ? <div className="py-12 text-center text-zinc-400">로딩 중...</div> : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-zinc-200 dark:border-zinc-800">
                      <th className="pb-3 text-left font-medium text-zinc-500">이름</th>
                      <th className="pb-3 text-left font-medium text-zinc-500">이메일</th>
                      <th className="pb-3 text-left font-medium text-zinc-500">시스템 역할</th>
                      <th className="pb-3 text-left font-medium text-zinc-500">팀 역할</th>
                      <th className="pb-3 text-left font-medium text-zinc-500">상태</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((user) => {
                      const userRoles = getCurrentRoles(assignments, user.id);
                      return (
                        <tr key={user.id} onClick={() => { setSelectedUser(user); setModalOpen(true); }}
                          className={cn("cursor-pointer border-b border-zinc-100 last:border-0 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-800/50",
                            currentUserId === user.id && "bg-blue-50/50 dark:bg-blue-950/20"
                          )}>
                          <td className="py-3">
                            <div className="flex items-center gap-2.5">
                              <UserAvatar name={user.name} avatar={user.avatar} size="sm" />
                              <span className="font-medium text-zinc-900 dark:text-zinc-50">{user.name || "(이름 없음)"}</span>
                              {currentUserId === user.id && <span className="rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-medium text-blue-600">나</span>}
                            </div>
                          </td>
                          <td className="py-3 text-zinc-600 dark:text-zinc-400">{user.email}</td>
                          <td className="py-3">
                            <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", roleColors[user.role])}>{user.role}</span>
                          </td>
                          <td className="py-3">
                            <div className="flex flex-wrap gap-1">
                              {userRoles.length === 0 && <span className="text-xs text-zinc-400">-</span>}
                              {userRoles.map((r) => {
                                const Icon = teamRoleIcons[r.role];
                                return (
                                  <span key={r.id} className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium", teamRoleColors[r.role])}>
                                    <Icon size={10} />{r.role}{r.grade ? `(${r.grade})` : ""}
                                  </span>
                                );
                              })}
                            </div>
                          </td>
                          <td className="py-3">
                            <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", statusColors[user.status])}>
                              {user.status === "active" ? "활성" : "비활성"}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </Card>
        </>
      )}

      {/* ── 역할 배정 탭 ── */}
      {viewTab === "roles" && (
        <div className="space-y-3">
          <div className="flex justify-end">
            <button onClick={() => { setEditingAssignment(null); setShowRoleModal(true); }}
              className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-medium text-white hover:bg-indigo-700">
              <Plus size={14} /> 역할 배정
            </button>
          </div>

          {users.map((user) => {
            const userAssignments = assignments.filter((a) => a.userId === user.id);
            if (userAssignments.length === 0) return null;
            const isExpanded = expandedUserId === user.id;
            return (
              <Card key={user.id}>
                <button onClick={() => setExpandedUserId(isExpanded ? null : user.id)}
                  className="flex w-full items-center justify-between p-4">
                  <div className="flex items-center gap-3">
                    <UserAvatar name={user.name} avatar={user.avatar} size="sm" />
                    <div className="text-left">
                      <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100">{user.name}</p>
                      <div className="flex gap-1 mt-1">
                        {getCurrentRoles(assignments, user.id).map((r) => (
                          <span key={r.id} className={cn("rounded-full px-2 py-0.5 text-[10px] font-medium", teamRoleColors[r.role])}>{r.role}({r.grade})</span>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-zinc-400">{userAssignments.length}개 역할</span>
                    {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </div>
                </button>
                {isExpanded && (
                  <div className="border-t border-zinc-100 px-4 pb-4 dark:border-zinc-800">
                    <table className="mt-3 w-full text-xs">
                      <thead>
                        <tr className="text-zinc-500">
                          <th className="pb-2 text-left font-medium">역할</th>
                          <th className="pb-2 text-left font-medium">등급</th>
                          <th className="pb-2 text-right font-medium">단가/배분율</th>
                          <th className="pb-2 text-center font-medium">기간</th>
                          <th className="pb-2 text-center font-medium">상태</th>
                          <th className="pb-2 text-center font-medium">액션</th>
                        </tr>
                      </thead>
                      <tbody>
                        {userAssignments.map((a) => {
                          const isActive = !a.endDate || a.endDate >= new Date().toISOString().split("T")[0];
                          return (
                            <tr key={a.id} className="border-t border-zinc-50 dark:border-zinc-800/50">
                              <td className="py-2"><span className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold", teamRoleColors[a.role])}>{a.role}</span></td>
                              <td className="py-2 text-zinc-700 dark:text-zinc-300">{a.grade || "-"}</td>
                              <td className="py-2 text-right font-medium text-zinc-900 dark:text-zinc-100">
                                {a.role === "강사" ? `AI ${a.aiHourlyRate}천/H · 일반 ${a.normalHourlyRate}천/H` :
                                 a.ratePercent ? `${a.ratePercent}%` :
                                 a.monthlySalary ? `월 ${a.monthlySalary.toLocaleString()}천` : "-"}
                              </td>
                              <td className="py-2 text-center text-zinc-500">{a.startDate} ~ {a.endDate || "현재"}</td>
                              <td className="py-2 text-center">
                                <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold",
                                  isActive ? "bg-green-100 text-green-700" : "bg-zinc-100 text-zinc-500"
                                )}>{isActive ? "활성" : "종료"}</span>
                              </td>
                              <td className="py-2 text-center">
                                <div className="flex justify-center gap-1">
                                  <button onClick={() => { setEditingAssignment(a); setShowRoleModal(true); }}
                                    className="rounded p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"><Edit2 size={12} /></button>
                                  <button onClick={async () => { await deleteRoleAssignment(a.id); await reloadAssignments(); }}
                                    className="rounded p-1 text-zinc-400 hover:bg-red-50 hover:text-red-600"><Trash2 size={12} /></button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* ── MM 정산 탭 ── */}
      {viewTab === "settlement" && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <Calendar size={16} className="text-indigo-600" />
            <input type="month" value={settlementMonth} onChange={(e) => setSettlementMonth(e.target.value)}
              className="rounded-lg border border-zinc-200 px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100" />
            <span className="text-xs text-zinc-500">{monthlyRoles.length}명 활성</span>
          </div>

          <Card>
            <div className="overflow-x-auto p-4">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-zinc-200 dark:border-zinc-800">
                    <th className="pb-2 text-left font-medium text-zinc-500">이름</th>
                    <th className="pb-2 text-left font-medium text-zinc-500">역할</th>
                    <th className="pb-2 text-left font-medium text-zinc-500">등급</th>
                    <th className="pb-2 text-right font-medium text-zinc-500">AI 단가</th>
                    <th className="pb-2 text-right font-medium text-zinc-500">일반 단가</th>
                    <th className="pb-2 text-right font-medium text-zinc-500">배분율</th>
                    <th className="pb-2 text-right font-medium text-zinc-500">월급여</th>
                    <th className="pb-2 text-center font-medium text-zinc-500">기간</th>
                  </tr>
                </thead>
                <tbody>
                  {monthlyRoles.map((a) => (
                    <tr key={a.id} className="border-b border-zinc-50 dark:border-zinc-800/50">
                      <td className="py-2.5 font-semibold text-zinc-900 dark:text-zinc-100">{a.userName || users.find(u => u.id === a.userId)?.name || a.userId}</td>
                      <td className="py-2.5"><span className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold", teamRoleColors[a.role])}>{a.role}</span></td>
                      <td className="py-2.5 text-zinc-600 dark:text-zinc-400">{a.grade || "-"}</td>
                      <td className="py-2.5 text-right font-medium">{a.aiHourlyRate ? `${a.aiHourlyRate}천/H` : "-"}</td>
                      <td className="py-2.5 text-right">{a.normalHourlyRate ? `${a.normalHourlyRate}천/H` : "-"}</td>
                      <td className="py-2.5 text-right font-medium text-indigo-600">{a.ratePercent ? `${a.ratePercent}%` : "-"}</td>
                      <td className="py-2.5 text-right">{a.monthlySalary ? `${a.monthlySalary.toLocaleString()}천` : "-"}</td>
                      <td className="py-2.5 text-center text-zinc-500">{a.startDate} ~ {a.endDate || "현재"}</td>
                    </tr>
                  ))}
                  {monthlyRoles.length === 0 && (
                    <tr><td colSpan={8} className="py-8 text-center text-zinc-400">{settlementMonth}에 활성 역할이 없습니다</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* ── 사용자 상세 모달 (기존) ── */}
      <UserModal user={selectedUser} open={modalOpen}
        onClose={() => { setModalOpen(false); setSelectedUser(null); }}
        onUpdate={handleUpdate} currentUserId={currentUserId} isAdmin={isAdmin} />

      {/* ── 역할 배정 모달 ── */}
      {showRoleModal && (
        <RoleAssignmentModal
          assignment={editingAssignment}
          users={users}
          onClose={() => { setShowRoleModal(false); setEditingAssignment(null); }}
          onSave={async (data) => {
            if (editingAssignment) await updateRoleAssignment(editingAssignment.id, data);
            else await createRoleAssignment(data as Omit<UserRoleAssignment, "id">);
            await reloadAssignments();
            setShowRoleModal(false);
            setEditingAssignment(null);
          }}
        />
      )}
    </div>
  );
}

/* ── 역할 배정 모달 ── */

function RoleAssignmentModal({ assignment, users, onClose, onSave }: {
  assignment: UserRoleAssignment | null;
  users: User[];
  onClose: () => void;
  onSave: (data: Partial<UserRoleAssignment>) => void;
}) {
  const [form, setForm] = useState({
    userId: assignment?.userId ?? users[0]?.id ?? "",
    role: (assignment?.role ?? "강사") as RoleType,
    grade: (assignment?.grade ?? "") as RoleGrade,
    aiHourlyRate: assignment?.aiHourlyRate ?? 0,
    normalHourlyRate: assignment?.normalHourlyRate ?? 0,
    ratePercent: assignment?.ratePercent ?? 0,
    monthlySalary: assignment?.monthlySalary ?? 0,
    startDate: assignment?.startDate ?? new Date().toISOString().split("T")[0],
    endDate: assignment?.endDate ?? "",
    ncsCode: assignment?.ncsCode ?? "",
    ncsName: assignment?.ncsName ?? "",
    qualification: assignment?.qualification ?? "",
    careerYears: assignment?.careerYears ?? 0,
    notes: assignment?.notes ?? "",
  });

  const set = (key: string, value: string | number) => setForm((p) => ({ ...p, [key]: value }));

  // 등급 변경 시 기본 단가 자동 설정
  const handleGradeChange = (grade: string) => {
    const g = grade as RoleGrade;
    if (form.role === "강사" && grade in INSTRUCTOR_RATES) {
      const rates = INSTRUCTOR_RATES[grade as keyof typeof INSTRUCTOR_RATES];
      setForm((p) => ({ ...p, grade: g, aiHourlyRate: rates.ai, normalHourlyRate: rates.normal }));
    } else if (form.role === "영업" && grade in SALES_RATES) {
      const rates = SALES_RATES[grade as keyof typeof SALES_RATES];
      setForm((p) => ({ ...p, grade: g, ratePercent: rates.ai }));
    } else {
      setForm((p) => ({ ...p, grade: g }));
    }
  };

  const handleRoleChange = (role: string) => {
    const r = role as RoleType;
    const grades = GRADE_OPTIONS[r];
    const firstGrade = (grades[0] || "") as RoleGrade;
    setForm((p) => ({ ...p, role: r, grade: firstGrade, aiHourlyRate: 0, normalHourlyRate: 0, ratePercent: 0 }));
    if (firstGrade) handleGradeChange(firstGrade);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl dark:bg-zinc-900" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">{assignment ? "역할 수정" : "역할 배정"}</h2>
          <button onClick={onClose} className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-100"><X size={18} /></button>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-zinc-600">사용자</label>
            <select value={form.userId} onChange={(e) => set("userId", e.target.value)} disabled={!!assignment}
              className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100">
              {users.map((u) => <option key={u.id} value={u.id}>{u.name} ({u.email})</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-zinc-600">역할</label>
            <select value={form.role} onChange={(e) => handleRoleChange(e.target.value)}
              className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100">
              {(["영업", "강사", "행정", "관리자"] as RoleType[]).map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-zinc-600">등급</label>
            <select value={form.grade as string} onChange={(e) => handleGradeChange(e.target.value)}
              className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100">
              {GRADE_OPTIONS[form.role].map((g) => <option key={g} value={g}>{g}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-zinc-600">경력 (년)</label>
            <input type="number" value={form.careerYears} onChange={(e) => set("careerYears", Number(e.target.value))}
              className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100" />
          </div>

          {/* 강사: 단가 */}
          {form.role === "강사" && (<>
            <div>
              <label className="text-xs font-medium text-zinc-600">AI 단가 (천원/H)</label>
              <input type="number" value={form.aiHourlyRate} onChange={(e) => set("aiHourlyRate", Number(e.target.value))}
                className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100" />
            </div>
            <div>
              <label className="text-xs font-medium text-zinc-600">일반 단가 (천원/H)</label>
              <input type="number" value={form.normalHourlyRate} onChange={(e) => set("normalHourlyRate", Number(e.target.value))}
                className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100" />
            </div>
          </>)}

          {/* 영업/행정: 배분율 */}
          {(form.role === "영업" || form.role === "행정" || form.role === "관리자") && (
            <div>
              <label className="text-xs font-medium text-zinc-600">배분율 (%)</label>
              <input type="number" value={form.ratePercent} onChange={(e) => set("ratePercent", Number(e.target.value))}
                className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100" />
            </div>
          )}

          {/* 행정: 월급여 */}
          {form.role === "행정" && (
            <div>
              <label className="text-xs font-medium text-zinc-600">월급여 (천원)</label>
              <input type="number" value={form.monthlySalary} onChange={(e) => set("monthlySalary", Number(e.target.value))}
                className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100" />
            </div>
          )}

          {/* 기간 */}
          <div>
            <label className="text-xs font-medium text-zinc-600">시작일</label>
            <input type="date" value={form.startDate} onChange={(e) => set("startDate", e.target.value)}
              className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100" />
          </div>
          <div>
            <label className="text-xs font-medium text-zinc-600">종료일 (빈칸=현재)</label>
            <input type="date" value={form.endDate} onChange={(e) => set("endDate", e.target.value)}
              className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100" />
          </div>

          {/* NCS (강사) */}
          {form.role === "강사" && (<>
            <div>
              <label className="text-xs font-medium text-zinc-600">NCS 코드</label>
              <input value={form.ncsCode} onChange={(e) => set("ncsCode", e.target.value)} placeholder="20010703"
                className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100" />
            </div>
            <div>
              <label className="text-xs font-medium text-zinc-600">NCS 명칭</label>
              <input value={form.ncsName} onChange={(e) => set("ncsName", e.target.value)} placeholder="인공지능모델링"
                className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100" />
            </div>
          </>)}

          <div className="col-span-2">
            <label className="text-xs font-medium text-zinc-600">자격/메모</label>
            <input value={form.qualification} onChange={(e) => set("qualification", e.target.value)} placeholder="학위, 자격증, 비고"
              className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100" />
          </div>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-lg px-4 py-2 text-xs font-medium text-zinc-600 hover:bg-zinc-100">취소</button>
          <button onClick={() => onSave({ ...form, userName: users.find(u => u.id === form.userId)?.name ?? "", endDate: form.endDate || null })}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-xs font-medium text-white hover:bg-indigo-700">저장</button>
        </div>
      </div>
    </div>
  );
}
