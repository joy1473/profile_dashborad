"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { GraphSearch } from "@/components/graph/graph-search";
import { useToast } from "@/components/ui/toast";
import { GraphSkeleton } from "@/components/skeletons/graph-skeleton";
import { Card } from "@/components/ui/card";
import { supabase } from "@/lib/supabase";
import { Plus, X, Loader2, Users, User } from "lucide-react";
import dynamic from "next/dynamic";
import type { GraphData, GraphNode } from "@/types/graph";

const G6Graph = dynamic(() => import("@/components/graph/g6-graph"), { ssr: false });

const EMPTY_DATA: GraphData = { nodes: [], links: [] };

const NODE_TYPE_CONFIG: Record<string, { label: string; color: string; emoji: string }> = {
  person: { label: "사람", color: "#3b82f6", emoji: "👤" },
  skill: { label: "스킬", color: "#10b981", emoji: "⚡" },
  project: { label: "프로젝트", color: "#f59e0b", emoji: "📁" },
  education: { label: "교육", color: "#8b5cf6", emoji: "🎓" },
  certificate: { label: "자격증", color: "#ef4444", emoji: "📜" },
  document: { label: "문서", color: "#ec4899", emoji: "📄" },
  role: { label: "역할", color: "#06b6d4", emoji: "💼" },
  tool: { label: "도구", color: "#64748b", emoji: "🔧" },
};

const ADD_TYPES = ["skill", "project", "education", "certificate", "document", "role", "tool"] as const;
const SKILL_CATEGORIES = ["AI/ML", "프로그래밍", "디자인", "기획/관리", "인프라/DevOps", "산업/도메인", "데이터분석", "마케팅", "영업/커뮤니케이션", "기타"];

const META_LABELS: Record<string, string> = {
  category: "카테고리", level: "수준", tech: "기술스택", status: "상태",
  description: "설명", provider: "교육기관", issuer: "발급기관", date: "날짜",
  hours: "시간(h)", department: "부서", email: "이메일", type: "유형",
  degree: "학위", gender: "성별", age: "나이", bio: "소개",
};
const LEVEL_LABELS: Record<string, string> = { high: "상", medium: "중", low: "하" };

export default function GraphPage() {
  const [graphData, setGraphData] = useState<GraphData>(EMPTY_DATA);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [search, setSearch] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
  const [userName, setUserName] = useState("");
  const { showToast } = useToast();

  // 뷰 모드: 내 프로필 vs 전체
  const [viewAll, setViewAll] = useState(true);

  // 추가 모달
  const [showAdd, setShowAdd] = useState(false);
  const [addType, setAddType] = useState<string>("skill");
  const [addForm, setAddForm] = useState<Record<string, string>>({});
  const [adding, setAdding] = useState(false);

  // 프로필 편집
  const [showProfile, setShowProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({ degree: "", gender: "", age: "", bio: "" });

  // 필터
  const [filters, setFilters] = useState<Record<string, boolean>>(() => {
    const f: Record<string, boolean> = {};
    for (const key of Object.keys(NODE_TYPE_CONFIG)) f[key] = true;
    return f;
  });

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setUserId(user.id);
        setUserName(user.user_metadata?.full_name ?? user.email ?? "");
        fetch("/api/graph", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "ensurePerson",
            data: { userId: user.id, name: user.user_metadata?.full_name ?? user.email ?? "", email: user.email, avatarUrl: user.user_metadata?.avatar_url },
          }),
        }).catch(() => {});
      }
    });
  }, []);

  const fetchGraph = useCallback(async () => {
    try {
      const res = await fetch("/api/graph", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch");
      const data: GraphData = await res.json();
      setGraphData(data);
      setError(null);
    } catch {
      setError("그래프 데이터를 불러올 수 없습니다");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchGraph(); }, [fetchGraph]);

  // 필터 + 뷰 모드 적용
  const filteredData = useMemo<GraphData>(() => {
    let nodes = graphData.nodes.filter((n) => filters[n.type] !== false);

    // 내 프로필만 보기
    if (!viewAll && userId) {
      const myPersonNode = graphData.nodes.find((n) => n.type === "person" && n.meta?.userId === userId);
      if (myPersonNode) {
        const connectedIds = new Set<string>();
        connectedIds.add(myPersonNode.id);
        for (const l of graphData.links) {
          const src = typeof l.source === "string" ? l.source : (l.source as any).id;
          const tgt = typeof l.target === "string" ? l.target : (l.target as any).id;
          if (src === myPersonNode.id) connectedIds.add(tgt);
          if (tgt === myPersonNode.id) connectedIds.add(src);
        }
        nodes = nodes.filter((n) => connectedIds.has(n.id));
      }
    }

    // 검색 필터
    if (search) {
      const q = search.toLowerCase();
      const matchIds = new Set(nodes.filter((n) => n.name.toLowerCase().includes(q)).map((n) => n.id));
      // 매칭 노드 + 연결된 노드
      for (const l of graphData.links) {
        const src = typeof l.source === "string" ? l.source : (l.source as any).id;
        const tgt = typeof l.target === "string" ? l.target : (l.target as any).id;
        if (matchIds.has(src)) matchIds.add(tgt);
        if (matchIds.has(tgt)) matchIds.add(src);
      }
      nodes = nodes.filter((n) => matchIds.has(n.id));
    }

    const nodeIds = new Set(nodes.map((n) => n.id));
    const links = graphData.links.filter((l) => {
      const src = typeof l.source === "string" ? l.source : (l.source as any).id;
      const tgt = typeof l.target === "string" ? l.target : (l.target as any).id;
      return nodeIds.has(src) && nodeIds.has(tgt);
    });

    return { nodes, links };
  }, [graphData, filters, viewAll, userId, search]);

  // 노드 추가
  const handleAdd = async () => {
    if (!userId) return;
    setAdding(true);
    const actionMap: Record<string, string> = {
      skill: "addSkill", project: "addProject", education: "addEducation",
      certificate: "addCertificate", document: "addDocument", role: "addRole", tool: "addTool",
    };
    const dataMap: Record<string, Record<string, any>> = {
      skill: { userId, skillName: addForm.name, category: addForm.category, level: addForm.level || "medium" },
      project: { userId, name: addForm.name, type: addForm.type, tech: addForm.tech, status: addForm.status || "active", description: addForm.description },
      education: { userId, name: addForm.name, provider: addForm.provider, date: addForm.date, category: addForm.category, hours: parseInt(addForm.hours || "0") },
      certificate: { userId, name: addForm.name, issuer: addForm.issuer, date: addForm.date, category: addForm.category },
      document: { userId, name: addForm.name, type: addForm.type, date: addForm.date, description: addForm.description },
      role: { userId, name: addForm.name, department: addForm.department },
      tool: { userId, name: addForm.name, category: addForm.category, description: addForm.description },
    };
    try {
      const res = await fetch("/api/graph", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: actionMap[addType], data: dataMap[addType] }),
      });
      if (!res.ok) throw new Error("Failed");
      showToast(`${NODE_TYPE_CONFIG[addType]?.label} 추가 완료`);
      setShowAdd(false); setAddForm({});
      fetchGraph();
    } catch { showToast("추가 실패"); }
    finally { setAdding(false); }
  };

  // 프로필 저장
  const saveProfile = async () => {
    if (!userId) return;
    await fetch("/api/graph", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "updatePerson", data: { userId, ...profileForm } }),
    });
    showToast("프로필 저장 완료");
    setShowProfile(false);
    fetchGraph();
  };

  // 통계
  const stats = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const n of graphData.nodes) counts[n.type] = (counts[n.type] || 0) + 1;
    return counts;
  }, [graphData]);

  if (loading) return <GraphSkeleton />;

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50" data-testid="page-title">SW 역량 프로필</h2>
        <div className="flex items-center gap-2">
          <GraphSearch value={search} onChange={setSearch} />
          {/* 전체/내 프로필 토글 */}
          <div className="flex rounded-lg border border-zinc-200 dark:border-zinc-700">
            <button
              onClick={() => setViewAll(true)}
              className={`flex items-center gap-1 px-3 py-1.5 text-xs rounded-l-lg ${viewAll ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900" : "text-zinc-600 dark:text-zinc-400"}`}
            >
              <Users size={14} /> 전체
            </button>
            <button
              onClick={() => setViewAll(false)}
              className={`flex items-center gap-1 px-3 py-1.5 text-xs rounded-r-lg ${!viewAll ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900" : "text-zinc-600 dark:text-zinc-400"}`}
            >
              <User size={14} /> 내 프로필
            </button>
          </div>
          <button onClick={() => setShowProfile(true)} className="rounded-lg border border-zinc-200 px-3 py-2 text-xs text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800">
            프로필 편집
          </button>
          <button onClick={() => { setShowAdd(true); setAddForm({}); setAddType("skill"); }} className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
            <Plus size={16} /> 역량 추가
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-950/30 dark:text-red-400">
          {error} <button onClick={() => window.location.reload()} className="ml-2 underline">재시도</button>
        </div>
      )}

      {/* 프로필 편집 */}
      {showProfile && (
        <Card className="mb-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">내 프로필 편집</h3>
            <button onClick={() => setShowProfile(false)} className="p-1 text-zinc-400 hover:text-zinc-600"><X size={18} /></button>
          </div>
          <div className="grid gap-3 sm:grid-cols-4">
            <div>
              <label className="mb-1 block text-xs text-zinc-500">학위</label>
              <select value={profileForm.degree} onChange={(e) => setProfileForm({ ...profileForm, degree: e.target.value })} className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100">
                <option value="">선택</option>
                <option value="고졸">고졸</option>
                <option value="전문학사">전문학사</option>
                <option value="학사">학사</option>
                <option value="석사">석사</option>
                <option value="박사">박사</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs text-zinc-500">성별</label>
              <select value={profileForm.gender} onChange={(e) => setProfileForm({ ...profileForm, gender: e.target.value })} className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100">
                <option value="">선택</option>
                <option value="남">남</option>
                <option value="여">여</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs text-zinc-500">나이</label>
              <input type="number" value={profileForm.age} onChange={(e) => setProfileForm({ ...profileForm, age: e.target.value })} placeholder="나이" className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100" />
            </div>
            <div>
              <label className="mb-1 block text-xs text-zinc-500">한줄 소개</label>
              <input type="text" value={profileForm.bio} onChange={(e) => setProfileForm({ ...profileForm, bio: e.target.value })} placeholder="AI 개발자" className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100" />
            </div>
          </div>
          <div className="mt-3 flex justify-end">
            <button onClick={saveProfile} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">저장</button>
          </div>
        </Card>
      )}

      {/* 역량 추가 */}
      {showAdd && (
        <Card className="mb-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">역량 추가</h3>
            <button onClick={() => setShowAdd(false)} className="p-1 text-zinc-400 hover:text-zinc-600"><X size={18} /></button>
          </div>
          <div className="flex flex-wrap gap-2 mb-3">
            {ADD_TYPES.map((t) => (
              <button key={t} onClick={() => { setAddType(t); setAddForm({}); }}
                className={`flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium ${addType === t ? "text-white" : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"}`}
                style={addType === t ? { backgroundColor: NODE_TYPE_CONFIG[t].color } : {}}
              >
                {NODE_TYPE_CONFIG[t].emoji} {NODE_TYPE_CONFIG[t].label}
              </button>
            ))}
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className={addType === "skill" ? "" : "sm:col-span-2"}>
              <input type="text" value={addForm.name || ""} onChange={(e) => setAddForm({ ...addForm, name: e.target.value })} placeholder={`${NODE_TYPE_CONFIG[addType].label} 이름`} className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-blue-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100" />
            </div>
            {addType === "skill" && (<>
              <select value={addForm.category || ""} onChange={(e) => setAddForm({ ...addForm, category: e.target.value })} className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100">
                <option value="">카테고리</option>
                {SKILL_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              <select value={addForm.level || "medium"} onChange={(e) => setAddForm({ ...addForm, level: e.target.value })} className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100">
                <option value="high">상</option><option value="medium">중</option><option value="low">하</option>
              </select>
            </>)}
            {addType === "project" && (<>
              <input type="text" value={addForm.tech || ""} onChange={(e) => setAddForm({ ...addForm, tech: e.target.value })} placeholder="기술 스택" className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100" />
              <input type="text" value={addForm.description || ""} onChange={(e) => setAddForm({ ...addForm, description: e.target.value })} placeholder="설명" className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100" />
            </>)}
            {addType === "education" && (<>
              <input type="text" value={addForm.provider || ""} onChange={(e) => setAddForm({ ...addForm, provider: e.target.value })} placeholder="교육기관" className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100" />
              <input type="text" value={addForm.date || ""} onChange={(e) => setAddForm({ ...addForm, date: e.target.value })} placeholder="수료일 (2026-03)" className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100" />
              <select value={addForm.category || ""} onChange={(e) => setAddForm({ ...addForm, category: e.target.value })} className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100">
                <option value="">카테고리</option>{SKILL_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              <input type="number" value={addForm.hours || ""} onChange={(e) => setAddForm({ ...addForm, hours: e.target.value })} placeholder="교육시간" className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100" />
            </>)}
            {addType === "certificate" && (<>
              <input type="text" value={addForm.issuer || ""} onChange={(e) => setAddForm({ ...addForm, issuer: e.target.value })} placeholder="발급기관" className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100" />
              <input type="text" value={addForm.date || ""} onChange={(e) => setAddForm({ ...addForm, date: e.target.value })} placeholder="취득일 (2026-03)" className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100" />
            </>)}
            {addType === "document" && (<>
              <select value={addForm.type || ""} onChange={(e) => setAddForm({ ...addForm, type: e.target.value })} className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100">
                <option value="">유형</option><option value="proposal">제안서</option><option value="design">설계서</option><option value="report">보고서</option><option value="manual">매뉴얼</option><option value="code">코드</option><option value="other">기타</option>
              </select>
              <input type="text" value={addForm.description || ""} onChange={(e) => setAddForm({ ...addForm, description: e.target.value })} placeholder="설명" className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100" />
            </>)}
            {addType === "role" && (
              <input type="text" value={addForm.department || ""} onChange={(e) => setAddForm({ ...addForm, department: e.target.value })} placeholder="부서/팀" className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100" />
            )}
            {addType === "tool" && (<>
              <select value={addForm.category || ""} onChange={(e) => setAddForm({ ...addForm, category: e.target.value })} className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100">
                <option value="">분류</option><option value="AI">AI</option><option value="IDE">IDE</option><option value="디자인">디자인</option><option value="협업">협업</option><option value="BaaS">BaaS</option><option value="배포">배포</option><option value="기타">기타</option>
              </select>
              <input type="text" value={addForm.description || ""} onChange={(e) => setAddForm({ ...addForm, description: e.target.value })} placeholder="설명" className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100" />
            </>)}
          </div>
          <div className="mt-3 flex justify-end">
            <button onClick={handleAdd} disabled={!addForm.name?.trim() || adding} className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
              {adding ? <Loader2 size={14} className="animate-spin" /> : null} 추가
            </button>
          </div>
        </Card>
      )}

      {/* 필터 */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {Object.entries(NODE_TYPE_CONFIG).map(([key, cfg]) => (
          <button key={key} onClick={() => setFilters((f) => ({ ...f, [key]: !f[key] }))}
            className={`flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium transition-opacity ${filters[key] ? "" : "opacity-30"}`}
            style={{ backgroundColor: cfg.color + "20", color: cfg.color }}
          >
            {cfg.emoji} {cfg.label} {stats[key] ? `(${stats[key]})` : ""}
          </button>
        ))}
      </div>

      {/* 그래프 + 상세 패널 */}
      <div className="grid gap-4 lg:grid-cols-[1fr_300px]">
        <div className="relative overflow-hidden rounded-lg border border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-900" style={{ height: "calc(100vh - 340px)", minHeight: 400 }}>
          {filteredData.nodes.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-2 text-sm text-zinc-400">
              <p>프로필 데이터가 없습니다</p>
              <p className="text-xs">&quot;역량 추가&quot; 버튼으로 스킬, 프로젝트 등을 추가하세요</p>
            </div>
          ) : (
            <G6Graph data={filteredData} onNodeClick={setSelectedNode} filterUserId={viewAll ? null : userId} />
          )}
        </div>

        {/* 상세 패널 */}
        <div>
          {selectedNode ? (
            <Card>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{NODE_TYPE_CONFIG[selectedNode.type]?.emoji ?? "📌"}</span>
                  <span className="text-xs font-medium text-zinc-400">{NODE_TYPE_CONFIG[selectedNode.type]?.label ?? selectedNode.type}</span>
                </div>
                <button onClick={() => setSelectedNode(null)} className="rounded p-1 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-700"><X size={16} /></button>
              </div>
              <h3 className="mb-3 text-lg font-semibold text-zinc-900 dark:text-zinc-50">{selectedNode.name}</h3>
              {selectedNode.meta && (
                <dl className="space-y-1.5">
                  {Object.entries(selectedNode.meta).filter(([k, v]) => !["name", "userId", "avatarUrl", "elementId", "nodeType", "originalNode", "shared"].includes(k) && v !== undefined && v !== "").map(([key, value]) => (
                    <div key={key} className="flex items-baseline gap-2 text-sm">
                      <dt className="min-w-[60px] font-medium text-zinc-500 dark:text-zinc-400">{META_LABELS[key] ?? key}</dt>
                      <dd className="text-zinc-900 dark:text-zinc-100">{key === "level" ? LEVEL_LABELS[String(value)] ?? value : String(value)}</dd>
                    </div>
                  ))}
                </dl>
              )}
            </Card>
          ) : (
            <Card>
              <h3 className="mb-3 text-sm font-semibold text-zinc-900 dark:text-zinc-50">역량 요약</h3>
              <div className="space-y-2">
                {Object.entries(NODE_TYPE_CONFIG).map(([key, cfg]) => {
                  if (!stats[key]) return null;
                  return (
                    <div key={key} className="flex items-center justify-between text-xs">
                      <span className="flex items-center gap-1.5">
                        <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: cfg.color }} />{cfg.label}
                      </span>
                      <span className="font-medium text-zinc-900 dark:text-zinc-100">{stats[key]}</span>
                    </div>
                  );
                })}
              </div>
              <div className="mt-4 pt-3 border-t border-zinc-100 dark:border-zinc-800">
                <p className="text-[10px] text-zinc-400">💡 노드를 클릭하면 상세 정보가 표시됩니다</p>
                <p className="text-[10px] text-zinc-400 mt-1">🟡 노란 테두리 = 여러 사람이 공유하는 역량</p>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
