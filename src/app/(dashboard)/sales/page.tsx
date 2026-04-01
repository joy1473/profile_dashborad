"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Plus, Search, Phone, Mail, Building2, Users as UsersIcon,
  TrendingUp, ChevronRight, X, Edit2, Trash2,
  DollarSign, GraduationCap, Calculator, BarChart3,
  Filter, RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getSession } from "@/lib/auth";
import type { SalesLead, CourseRun, PipelineSummary, LeadStatus, CourseType } from "@/types/sales";
import {
  getLeads, createLead, updateLead, deleteLead,
  getCourses, createCourse,
  getPipelineSummary, calculateSettlement, seedDemoData,
} from "@/lib/sales-data";

/* ── 상수 ── */

const STATUS_COLORS: Record<LeadStatus, string> = {
  "신규": "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  "접촉중": "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  "제안": "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300",
  "협상": "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300",
  "계약": "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
  "완료": "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400",
  "보류": "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
};

const ALL_STATUSES: LeadStatus[] = ["신규", "접촉중", "제안", "협상", "계약", "완료", "보류"];
const COURSE_LABELS: Record<CourseType, string> = { AI_6H: "AI 6H 맛보기", AI_40H: "AI 40H 심화", "일반": "일반 과정" };

type TabKey = "pipeline" | "leads" | "courses" | "settlement";

/* ── 메인 페이지 ── */

export default function SalesPage() {
  const [tab, setTab] = useState<TabKey>("pipeline");
  const [leads, setLeads] = useState<SalesLead[]>([]);
  const [courses, setCourses] = useState<CourseRun[]>([]);
  const [pipeline, setPipeline] = useState<PipelineSummary[]>([]);
  const [userName, setUserName] = useState("");
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<LeadStatus | "전체">("전체");
  const [showModal, setShowModal] = useState(false);
  const [editingLead, setEditingLead] = useState<SalesLead | null>(null);
  const [showCourseModal, setShowCourseModal] = useState(false);

  const reload = useCallback(async () => {
    const [l, c, p] = await Promise.all([getLeads(), getCourses(), getPipelineSummary()]);
    setLeads(l);
    setCourses(c);
    setPipeline(p);
  }, []);

  useEffect(() => {
    seedDemoData().then(() => reload());
    getSession().then((s) => {
      if (s?.user) setUserName(s.user.user_metadata?.full_name ?? s.user.email ?? "");
    });
  }, [reload]);

  const filteredLeads = leads.filter((l) => {
    const matchSearch = !search || l.company.includes(search) || l.contact.includes(search) || l.region.includes(search);
    const matchStatus = filterStatus === "전체" || l.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const totalExpected = leads.reduce((s, l) => s + l.expectedRevenue, 0);
  const contractedRevenue = leads.filter((l) => l.status === "계약" || l.status === "완료").reduce((s, l) => s + l.expectedRevenue, 0);
  const courseRevenue = courses.reduce((s, c) => s + c.revenue, 0);

  return (
    <div className="space-y-5">
      {/* ── 헤더 ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">영업관리</h1>
          <p className="text-xs text-zinc-500">{userName && `${userName} · `}GrowFit AI 교육 과정 영업·운영·정산</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => { setEditingLead(null); setShowModal(true); }} className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-medium text-white hover:bg-indigo-700">
            <Plus size={14} /> 리드 추가
          </button>
          <button onClick={() => setShowCourseModal(true)} className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-medium text-white hover:bg-emerald-700">
            <GraduationCap size={14} /> 과정 추가
          </button>
        </div>
      </div>

      {/* ── KPI 카드 ── */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: "총 리드", value: `${leads.length}건`, sub: `예상 ${(totalExpected / 1000).toFixed(0)}백만`, icon: UsersIcon, color: "text-blue-600" },
          { label: "계약·완료", value: `${leads.filter((l) => l.status === "계약" || l.status === "완료").length}건`, sub: `${(contractedRevenue / 1000).toFixed(0)}백만 확정`, icon: TrendingUp, color: "text-emerald-600" },
          { label: "교육 과정", value: `${courses.length}건`, sub: `매출 ${(courseRevenue / 1000).toFixed(0)}백만`, icon: GraduationCap, color: "text-violet-600" },
          { label: "전환율", value: leads.length ? `${Math.round(leads.filter((l) => l.status === "계약" || l.status === "완료").length / leads.length * 100)}%` : "0%", sub: "리드→계약", icon: BarChart3, color: "text-orange-600" },
        ].map((kpi) => (
          <div key={kpi.label} className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-zinc-200/60 dark:bg-zinc-900 dark:ring-zinc-700/60">
            <div className="flex items-center justify-between">
              <kpi.icon size={18} className={kpi.color} />
              <span className="text-lg font-bold text-zinc-900 dark:text-zinc-100">{kpi.value}</span>
            </div>
            <p className="mt-1 text-xs font-medium text-zinc-600 dark:text-zinc-400">{kpi.label}</p>
            <p className="text-[10px] text-zinc-400">{kpi.sub}</p>
          </div>
        ))}
      </div>

      {/* ── 탭 ── */}
      <div className="flex gap-1 rounded-lg bg-zinc-100 p-1 dark:bg-zinc-800">
        {([
          { key: "pipeline" as TabKey, label: "파이프라인" },
          { key: "leads" as TabKey, label: "리드 목록" },
          { key: "courses" as TabKey, label: "교육 과정" },
          { key: "settlement" as TabKey, label: "MM 정산" },
        ]).map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)} className={cn(
            "flex-1 rounded-md px-3 py-2 text-xs font-medium transition",
            tab === t.key ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-700 dark:text-zinc-100" : "text-zinc-500 hover:text-zinc-700 dark:text-zinc-400"
          )}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── 파이프라인 탭 ── */}
      {tab === "pipeline" && (
        <div className="grid grid-cols-7 gap-2">
          {pipeline.map((p) => (
            <div key={p.status} className="rounded-xl bg-white p-3 shadow-sm ring-1 ring-zinc-200/60 dark:bg-zinc-900 dark:ring-zinc-700/60">
              <div className="mb-2 flex items-center justify-between">
                <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold", STATUS_COLORS[p.status])}>{p.status}</span>
                <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100">{p.count}</span>
              </div>
              <p className="text-[10px] text-zinc-500">{p.totalRevenue > 0 ? `${(p.totalRevenue / 1000).toFixed(1)}백만` : "-"}</p>
              {/* 리드 카드 */}
              <div className="mt-2 space-y-1.5">
                {leads.filter((l) => l.status === p.status).map((l) => (
                  <button key={l.id} onClick={() => { setEditingLead(l); setShowModal(true); }} className="w-full rounded-lg bg-zinc-50 p-2 text-left transition hover:bg-zinc-100 dark:bg-zinc-800 dark:hover:bg-zinc-700">
                    <p className="text-[11px] font-semibold text-zinc-800 dark:text-zinc-200 truncate">{l.company}</p>
                    <p className="text-[10px] text-zinc-500 truncate">{l.contact} · {l.region}</p>
                    <p className="text-[10px] font-medium text-indigo-600">{COURSE_LABELS[l.courseType]}</p>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── 리드 목록 탭 ── */}
      {tab === "leads" && (
        <div className="space-y-3">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="기업명, 담당자, 지역 검색..." className="w-full rounded-lg border border-zinc-200 bg-white py-2 pl-9 pr-3 text-xs dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100" />
            </div>
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value as LeadStatus | "전체")} className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100">
              <option value="전체">전체 상태</option>
              {ALL_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          <div className="overflow-x-auto rounded-xl bg-white shadow-sm ring-1 ring-zinc-200/60 dark:bg-zinc-900 dark:ring-zinc-700/60">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-zinc-100 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-800/50">
                  <th className="px-3 py-2 text-left font-medium text-zinc-500">기업명</th>
                  <th className="px-3 py-2 text-left font-medium text-zinc-500">담당자</th>
                  <th className="px-3 py-2 text-left font-medium text-zinc-500">지역</th>
                  <th className="px-3 py-2 text-left font-medium text-zinc-500">과정</th>
                  <th className="px-3 py-2 text-right font-medium text-zinc-500">예상매출</th>
                  <th className="px-3 py-2 text-center font-medium text-zinc-500">상태</th>
                  <th className="px-3 py-2 text-center font-medium text-zinc-500">액션</th>
                </tr>
              </thead>
              <tbody>
                {filteredLeads.map((l) => (
                  <tr key={l.id} className="border-b border-zinc-50 hover:bg-zinc-50/50 dark:border-zinc-800/50 dark:hover:bg-zinc-800/30">
                    <td className="px-3 py-2.5 font-semibold text-zinc-900 dark:text-zinc-100">{l.company}</td>
                    <td className="px-3 py-2.5">
                      <div className="text-zinc-700 dark:text-zinc-300">{l.contact}</div>
                      <div className="text-[10px] text-zinc-400">{l.phone}</div>
                    </td>
                    <td className="px-3 py-2.5 text-zinc-600 dark:text-zinc-400">{l.region}</td>
                    <td className="px-3 py-2.5"><span className="rounded bg-indigo-50 px-1.5 py-0.5 text-[10px] font-medium text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300">{COURSE_LABELS[l.courseType]}</span></td>
                    <td className="px-3 py-2.5 text-right font-medium text-zinc-900 dark:text-zinc-100">{l.expectedRevenue.toLocaleString()}천원</td>
                    <td className="px-3 py-2.5 text-center"><span className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold", STATUS_COLORS[l.status])}>{l.status}</span></td>
                    <td className="px-3 py-2.5 text-center">
                      <div className="flex justify-center gap-1">
                        <button onClick={() => { setEditingLead(l); setShowModal(true); }} className="rounded p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800"><Edit2 size={12} /></button>
                        <button onClick={async () => { await deleteLead(l.id); await reload(); }} className="rounded p-1 text-zinc-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20"><Trash2 size={12} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── 교육 과정 탭 ── */}
      {tab === "courses" && (
        <div className="space-y-3">
          {courses.map((c) => (
            <div key={c.id} className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-zinc-200/60 dark:bg-zinc-900 dark:ring-zinc-700/60">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">{c.title}</h3>
                  <p className="text-xs text-zinc-500">{c.startDate} ~ {c.endDate} · {c.students}명 · {c.hours}시간</p>
                </div>
                <div className="text-right">
                  <span className={cn("rounded-full px-2.5 py-0.5 text-[10px] font-semibold",
                    c.status === "완료" ? "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400" :
                    c.status === "진행중" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300" :
                    c.status === "예정" ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300" :
                    "bg-red-100 text-red-700"
                  )}>{c.status}</span>
                  <p className="mt-1 text-sm font-bold text-zinc-900 dark:text-zinc-100">{c.revenue.toLocaleString()}천원</p>
                  <p className="text-[10px] text-zinc-400">정부지원 {c.govSupport.toLocaleString()}천원</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── MM 정산 탭 ── */}
      {tab === "settlement" && (
        <SettlementPanel courses={courses} />
      )}

      {/* ── 리드 모달 ── */}
      {showModal && (
        <LeadModal
          lead={editingLead}
          onClose={() => { setShowModal(false); setEditingLead(null); }}
          onSave={async (data) => {
            if (editingLead) await updateLead(editingLead.id, data);
            else await createLead({ ...data, assignedTo: "" } as Omit<SalesLead, "id" | "createdAt" | "updatedAt">);
            await reload();
            setShowModal(false);
            setEditingLead(null);
          }}
        />
      )}

      {/* ── 과정 모달 ── */}
      {showCourseModal && (
        <CourseModal
          onClose={() => setShowCourseModal(false)}
          onSave={async (data) => { await createCourse(data); await reload(); setShowCourseModal(false); }}
        />
      )}
    </div>
  );
}

/* ── 정산 패널 ── */

function SettlementPanel({ courses }: { courses: CourseRun[] }) {
  const totalRevenue = courses.reduce((s, c) => s + c.revenue, 0);
  const isAI = true;

  const team = [
    { role: "영업", name: "영업담당", hours: 120 },
    { role: "강사", name: "AI강사A", hours: 160 },
    { role: "강사", name: "AI강사B", hours: 80 },
    { role: "행정", name: "행정담당", hours: 140 },
    { role: "운영비", name: "(공통경비)", hours: 0 },
    { role: "순마진", name: "(기관)", hours: 0 },
  ];

  const settlement = calculateSettlement(
    new Date().toISOString().substring(0, 7),
    totalRevenue,
    team,
    isAI
  );

  const items = team.map((m) => {
    const ratios: Record<string, number> = { 영업: 22, 강사: 24, 행정: 13, 운영비: 10, 순마진: 17 };
    const ratio = ratios[m.role] || 10;
    const amount = Math.round(totalRevenue * ratio / 100);
    return { ...m, ratio, amount, mm: m.hours > 0 ? Math.round((m.hours / 160) * 100) / 100 : 0 };
  });

  return (
    <div className="space-y-4">
      <div className="rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 p-5 text-white">
        <p className="text-xs text-white/70">총 매출 (교육 과정 합계)</p>
        <p className="text-2xl font-bold">{totalRevenue.toLocaleString()} 천원</p>
        <p className="text-xs text-white/60">AI 과정 기준 배분 (탄력운영제 300% 적용)</p>
      </div>

      <div className="overflow-x-auto rounded-xl bg-white shadow-sm ring-1 ring-zinc-200/60 dark:bg-zinc-900 dark:ring-zinc-700/60">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-zinc-100 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-800/50">
              <th className="px-3 py-2 text-left font-medium text-zinc-500">역할</th>
              <th className="px-3 py-2 text-left font-medium text-zinc-500">담당자</th>
              <th className="px-3 py-2 text-right font-medium text-zinc-500">배분율</th>
              <th className="px-3 py-2 text-right font-medium text-zinc-500">금액 (천원)</th>
              <th className="px-3 py-2 text-right font-medium text-zinc-500">투입시간</th>
              <th className="px-3 py-2 text-right font-medium text-zinc-500">M/M</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, i) => (
              <tr key={i} className="border-b border-zinc-50 dark:border-zinc-800/50">
                <td className="px-3 py-2.5 font-semibold text-zinc-900 dark:text-zinc-100">{item.role}</td>
                <td className="px-3 py-2.5 text-zinc-600 dark:text-zinc-400">{item.name}</td>
                <td className="px-3 py-2.5 text-right font-medium text-indigo-600">{item.ratio}%</td>
                <td className="px-3 py-2.5 text-right font-bold text-zinc-900 dark:text-zinc-100">{item.amount.toLocaleString()}</td>
                <td className="px-3 py-2.5 text-right text-zinc-500">{item.hours > 0 ? `${item.hours}H` : "-"}</td>
                <td className="px-3 py-2.5 text-right text-zinc-500">{item.mm > 0 ? item.mm.toFixed(2) : "-"}</td>
              </tr>
            ))}
            <tr className="bg-zinc-50 font-bold dark:bg-zinc-800/50">
              <td className="px-3 py-2.5 text-zinc-900 dark:text-zinc-100">합계</td>
              <td></td>
              <td className="px-3 py-2.5 text-right text-indigo-600">100%</td>
              <td className="px-3 py-2.5 text-right text-zinc-900 dark:text-zinc-100">{items.reduce((s, i) => s + i.amount, 0).toLocaleString()}</td>
              <td className="px-3 py-2.5 text-right text-zinc-500">{items.reduce((s, i) => s + i.hours, 0)}H</td>
              <td className="px-3 py-2.5 text-right text-zinc-500">{items.reduce((s, i) => s + i.mm, 0).toFixed(2)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="rounded-lg bg-amber-50 p-3 text-xs text-amber-800 dark:bg-amber-900/20 dark:text-amber-300">
        <strong>M/M 산정:</strong> 투입시간 / 160H(월 표준근로시간). 예) 120H = 0.75 M/M. 정부 환급은 HRD-Net 수료 기준으로 별도 정산.
      </div>
    </div>
  );
}

/* ── 리드 추가/수정 모달 ── */

function LeadModal({ lead, onClose, onSave }: {
  lead: SalesLead | null;
  onClose: () => void;
  onSave: (data: Partial<SalesLead>) => void;
}) {
  const [form, setForm] = useState({
    company: lead?.company ?? "",
    contact: lead?.contact ?? "",
    phone: lead?.phone ?? "",
    email: lead?.email ?? "",
    region: lead?.region ?? "금천구",
    employeeCount: lead?.employeeCount ?? 10,
    status: lead?.status ?? "신규" as LeadStatus,
    courseType: lead?.courseType ?? "AI_6H" as CourseType,
    expectedRevenue: lead?.expectedRevenue ?? 3000,
    notes: lead?.notes ?? "",
  });

  const set = (key: string, value: string | number) => setForm((p) => ({ ...p, [key]: value }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl dark:bg-zinc-900" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">{lead ? "리드 수정" : "새 리드 추가"}</h2>
          <button onClick={onClose} className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"><X size={18} /></button>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Input label="기업명" value={form.company} onChange={(v) => set("company", v)} />
          <Input label="담당자" value={form.contact} onChange={(v) => set("contact", v)} />
          <Input label="전화번호" value={form.phone} onChange={(v) => set("phone", v)} />
          <Input label="이메일" value={form.email} onChange={(v) => set("email", v)} />
          <Select label="지역" value={form.region} options={["금천구", "구로구", "영등포구", "기타"]} onChange={(v) => set("region", v)} />
          <Input label="직원수" type="number" value={String(form.employeeCount)} onChange={(v) => set("employeeCount", Number(v))} />
          <Select label="상태" value={form.status} options={ALL_STATUSES} onChange={(v) => set("status", v)} />
          <Select label="과정 유형" value={form.courseType} options={["AI_6H", "AI_40H", "일반"]} onChange={(v) => set("courseType", v)} />
          <Input label="예상 매출 (천원)" type="number" value={String(form.expectedRevenue)} onChange={(v) => set("expectedRevenue", Number(v))} />
        </div>
        <div className="mt-3">
          <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400">메모</label>
          <textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} rows={2} className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100" />
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-lg px-4 py-2 text-xs font-medium text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800">취소</button>
          <button onClick={() => onSave(form)} className="rounded-lg bg-indigo-600 px-4 py-2 text-xs font-medium text-white hover:bg-indigo-700">저장</button>
        </div>
      </div>
    </div>
  );
}

/* ── 과정 추가 모달 ── */

function CourseModal({ onClose, onSave }: {
  onClose: () => void;
  onSave: (data: Omit<CourseRun, "id">) => void;
}) {
  const [form, setForm] = useState({
    title: "", courseType: "AI_6H" as CourseType,
    startDate: "", endDate: "", students: 15, hours: 6,
    revenue: 4500, govSupport: 4050, status: "예정" as CourseRun["status"],
  });
  const set = (key: string, value: string | number) => setForm((p) => ({ ...p, [key]: value }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl dark:bg-zinc-900" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">교육 과정 추가</h2>
          <button onClick={onClose} className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"><X size={18} /></button>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2"><Input label="과정명" value={form.title} onChange={(v) => set("title", v)} /></div>
          <Select label="유형" value={form.courseType} options={["AI_6H", "AI_40H", "일반"]} onChange={(v) => set("courseType", v)} />
          <Select label="상태" value={form.status} options={["예정", "진행중", "완료", "취소"]} onChange={(v) => set("status", v)} />
          <Input label="시작일" type="date" value={form.startDate} onChange={(v) => set("startDate", v)} />
          <Input label="종료일" type="date" value={form.endDate} onChange={(v) => set("endDate", v)} />
          <Input label="수강생(명)" type="number" value={String(form.students)} onChange={(v) => set("students", Number(v))} />
          <Input label="시간" type="number" value={String(form.hours)} onChange={(v) => set("hours", Number(v))} />
          <Input label="수강료(천원)" type="number" value={String(form.revenue)} onChange={(v) => set("revenue", Number(v))} />
          <Input label="정부지원(천원)" type="number" value={String(form.govSupport)} onChange={(v) => set("govSupport", Number(v))} />
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-lg px-4 py-2 text-xs font-medium text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800">취소</button>
          <button onClick={() => onSave(form)} className="rounded-lg bg-emerald-600 px-4 py-2 text-xs font-medium text-white hover:bg-emerald-700">추가</button>
        </div>
      </div>
    </div>
  );
}

/* ── 공통 UI ── */

function Input({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (v: string) => void; type?: string }) {
  return (
    <div>
      <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400">{label}</label>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100" />
    </div>
  );
}

function Select({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400">{label}</label>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100">
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}
