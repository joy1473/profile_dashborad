"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { GraphCanvas } from "@/components/graph/graph-canvas";
import { GraphSearch } from "@/components/graph/graph-search";
import { NodeDetailPanel } from "@/components/graph/node-detail-panel";
import { useToast } from "@/components/ui/toast";
import { GraphSkeleton } from "@/components/skeletons/graph-skeleton";
import { Card } from "@/components/ui/card";
import { supabase } from "@/lib/supabase";
import { Plus, X, Loader2 } from "lucide-react";
import type { GraphData, GraphNode, GraphFilterState, SelectedNode } from "@/types/graph";

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

const SKILL_CATEGORIES = [
  "AI/ML", "프로그래밍", "디자인", "기획/관리", "인프라/DevOps",
  "산업/도메인", "데이터분석", "마케팅", "영업/커뮤니케이션", "기타",
];

export default function GraphPage() {
  const [graphData, setGraphData] = useState<GraphData>(EMPTY_DATA);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<SelectedNode>(null);
  const [focusNodeId, setFocusNodeId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
  const [userName, setUserName] = useState("");
  const { showToast } = useToast();

  // 추가 모달
  const [showAdd, setShowAdd] = useState(false);
  const [addType, setAddType] = useState<string>("skill");
  const [addForm, setAddForm] = useState<Record<string, string>>({});
  const [adding, setAdding] = useState(false);

  // 필터
  const [filters, setFilters] = useState<Record<string, boolean>>(() => {
    const f: Record<string, boolean> = {};
    for (const key of Object.keys(NODE_TYPE_CONFIG)) f[key] = true;
    return f;
  });

  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 500 });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) setDimensions({ width: entry.contentRect.width, height: Math.max(entry.contentRect.height, 400) });
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setUserId(user.id);
        setUserName(user.user_metadata?.full_name ?? user.email ?? "");
        // Person 노드 자동 생성
        fetch("/api/graph", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "ensurePerson",
            data: {
              userId: user.id,
              name: user.user_metadata?.full_name ?? user.email ?? "",
              email: user.email,
              avatarUrl: user.user_metadata?.avatar_url,
            },
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

  // 필터링
  const filteredData = useMemo<GraphData>(() => {
    const visibleIds = new Set(graphData.nodes.filter((n) => filters[n.type] !== false).map((n) => n.id));
    return {
      nodes: graphData.nodes.filter((n) => visibleIds.has(n.id)),
      links: graphData.links.filter((l) => {
        const srcId = typeof l.source === "string" ? l.source : (l.source as any).id;
        const tgtId = typeof l.target === "string" ? l.target : (l.target as any).id;
        return visibleIds.has(srcId) && visibleIds.has(tgtId);
      }),
    };
  }, [graphData, filters]);

  // 검색
  useEffect(() => {
    if (!search) { setFocusNodeId(null); return; }
    const q = search.toLowerCase();
    const match = graphData.nodes.find((n) => n.name.toLowerCase().includes(q));
    setFocusNodeId(match?.id ?? null);
  }, [search, graphData.nodes]);

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
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: actionMap[addType], data: dataMap[addType] }),
      });
      if (!res.ok) throw new Error("Failed");
      showToast(`${NODE_TYPE_CONFIG[addType]?.label} 추가 완료`);
      setShowAdd(false);
      setAddForm({});
      fetchGraph();
    } catch {
      showToast("추가 실패");
    } finally {
      setAdding(false);
    }
  };

  // 통계
  const stats = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const n of graphData.nodes) {
      counts[n.type] = (counts[n.type] || 0) + 1;
    }
    return counts;
  }, [graphData]);

  if (loading) return <GraphSkeleton />;

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50" data-testid="page-title">SW 역량 프로필</h2>
        <div className="flex items-center gap-2">
          <GraphSearch value={search} onChange={setSearch} />
          <button
            onClick={() => { setShowAdd(true); setAddForm({}); setAddType("skill"); }}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            <Plus size={16} /> 프로필 추가
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-950/30 dark:text-red-400">
          {error}
          <button onClick={() => window.location.reload()} className="ml-2 underline">재시도</button>
        </div>
      )}

      {/* 추가 모달 */}
      {showAdd && (
        <Card className="mb-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">프로필 추가</h3>
            <button onClick={() => setShowAdd(false)} className="p-1 text-zinc-400 hover:text-zinc-600"><X size={18} /></button>
          </div>

          {/* 타입 선택 */}
          <div className="flex flex-wrap gap-2 mb-3">
            {ADD_TYPES.map((t) => (
              <button
                key={t}
                onClick={() => { setAddType(t); setAddForm({}); }}
                className={`flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium ${addType === t ? "text-white" : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"}`}
                style={addType === t ? { backgroundColor: NODE_TYPE_CONFIG[t].color } : {}}
              >
                {NODE_TYPE_CONFIG[t].emoji} {NODE_TYPE_CONFIG[t].label}
              </button>
            ))}
          </div>

          {/* 폼 필드 (타입별) */}
          <div className="grid gap-3 sm:grid-cols-2">
            <div className={addType === "skill" ? "" : "sm:col-span-2"}>
              <input
                type="text"
                value={addForm.name || ""}
                onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
                placeholder={`${NODE_TYPE_CONFIG[addType].label} 이름`}
                className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-blue-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
              />
            </div>

            {addType === "skill" && (
              <>
                <div>
                  <select
                    value={addForm.category || ""}
                    onChange={(e) => setAddForm({ ...addForm, category: e.target.value })}
                    className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                  >
                    <option value="">카테고리 선택</option>
                    {SKILL_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <select
                    value={addForm.level || "medium"}
                    onChange={(e) => setAddForm({ ...addForm, level: e.target.value })}
                    className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                  >
                    <option value="high">상</option>
                    <option value="medium">중</option>
                    <option value="low">하</option>
                  </select>
                </div>
              </>
            )}

            {addType === "project" && (
              <>
                <input type="text" value={addForm.tech || ""} onChange={(e) => setAddForm({ ...addForm, tech: e.target.value })} placeholder="기술 스택 (예: Next.js, Python)" className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100" />
                <input type="text" value={addForm.description || ""} onChange={(e) => setAddForm({ ...addForm, description: e.target.value })} placeholder="설명" className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100" />
              </>
            )}

            {addType === "education" && (
              <>
                <input type="text" value={addForm.provider || ""} onChange={(e) => setAddForm({ ...addForm, provider: e.target.value })} placeholder="교육기관" className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100" />
                <input type="text" value={addForm.date || ""} onChange={(e) => setAddForm({ ...addForm, date: e.target.value })} placeholder="수료일 (2026-03)" className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100" />
                <select value={addForm.category || ""} onChange={(e) => setAddForm({ ...addForm, category: e.target.value })} className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100">
                  <option value="">카테고리</option>
                  {SKILL_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
                <input type="number" value={addForm.hours || ""} onChange={(e) => setAddForm({ ...addForm, hours: e.target.value })} placeholder="교육시간" className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100" />
              </>
            )}

            {addType === "certificate" && (
              <>
                <input type="text" value={addForm.issuer || ""} onChange={(e) => setAddForm({ ...addForm, issuer: e.target.value })} placeholder="발급기관" className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100" />
                <input type="text" value={addForm.date || ""} onChange={(e) => setAddForm({ ...addForm, date: e.target.value })} placeholder="취득일 (2026-03)" className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100" />
              </>
            )}

            {addType === "document" && (
              <>
                <select value={addForm.type || ""} onChange={(e) => setAddForm({ ...addForm, type: e.target.value })} className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100">
                  <option value="">문서 유형</option>
                  <option value="proposal">제안서</option>
                  <option value="design">설계서</option>
                  <option value="report">보고서</option>
                  <option value="manual">매뉴얼</option>
                  <option value="code">코드</option>
                  <option value="other">기타</option>
                </select>
                <input type="text" value={addForm.description || ""} onChange={(e) => setAddForm({ ...addForm, description: e.target.value })} placeholder="설명" className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100" />
              </>
            )}

            {addType === "role" && (
              <input type="text" value={addForm.department || ""} onChange={(e) => setAddForm({ ...addForm, department: e.target.value })} placeholder="부서/팀" className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100" />
            )}

            {addType === "tool" && (
              <>
                <select value={addForm.category || ""} onChange={(e) => setAddForm({ ...addForm, category: e.target.value })} className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100">
                  <option value="">도구 분류</option>
                  <option value="AI">AI</option>
                  <option value="IDE">IDE</option>
                  <option value="디자인">디자인</option>
                  <option value="협업">협업</option>
                  <option value="BaaS">BaaS</option>
                  <option value="배포">배포</option>
                  <option value="기타">기타</option>
                </select>
                <input type="text" value={addForm.description || ""} onChange={(e) => setAddForm({ ...addForm, description: e.target.value })} placeholder="설명" className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100" />
              </>
            )}
          </div>

          <div className="mt-3 flex justify-end">
            <button
              onClick={handleAdd}
              disabled={!addForm.name?.trim() || adding}
              className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {adding ? <Loader2 size={14} className="animate-spin" /> : null}
              추가
            </button>
          </div>
        </Card>
      )}

      {/* 필터 + 통계 */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {Object.entries(NODE_TYPE_CONFIG).map(([key, cfg]) => (
          <button
            key={key}
            onClick={() => setFilters((f) => ({ ...f, [key]: !f[key] }))}
            className={`flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium transition-opacity ${filters[key] ? "" : "opacity-30"}`}
            style={{ backgroundColor: cfg.color + "20", color: cfg.color }}
          >
            {cfg.emoji} {cfg.label} {stats[key] ? `(${stats[key]})` : ""}
          </button>
        ))}
      </div>

      {/* 그래프 + 상세 패널 */}
      <div className="grid gap-4 lg:grid-cols-[1fr_300px]">
        <div
          ref={containerRef}
          className="relative min-h-[400px] overflow-hidden rounded-lg border border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-900"
          style={{ height: "calc(100vh - 340px)" }}
        >
          {graphData.nodes.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-2 text-sm text-zinc-400">
              <p>프로필 데이터가 없습니다</p>
              <p className="text-xs">상단의 &quot;프로필 추가&quot; 버튼으로 스킬, 프로젝트 등을 추가하세요</p>
            </div>
          ) : (
            <GraphCanvas
              data={filteredData}
              selectedNode={selectedNode}
              onNodeClick={(n) => setSelectedNode(n)}
              onBackgroundClick={() => setSelectedNode(null)}
              focusNodeId={focusNodeId}
              width={dimensions.width}
              height={dimensions.height}
            />
          )}
        </div>

        {/* 상세 패널 */}
        <div>
          {selectedNode ? (
            <NodeDetailPanel node={selectedNode} onClose={() => setSelectedNode(null)} />
          ) : (
            <Card>
              <h3 className="mb-3 text-sm font-semibold text-zinc-900 dark:text-zinc-50">내 역량 요약</h3>
              <div className="space-y-2">
                {Object.entries(NODE_TYPE_CONFIG).map(([key, cfg]) => {
                  if (!stats[key]) return null;
                  return (
                    <div key={key} className="flex items-center justify-between text-xs">
                      <span className="flex items-center gap-1.5">
                        <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: cfg.color }} />
                        {cfg.label}
                      </span>
                      <span className="font-medium text-zinc-900 dark:text-zinc-100">{stats[key]}</span>
                    </div>
                  );
                })}
                {graphData.nodes.length === 0 && (
                  <p className="text-xs text-zinc-400">노드를 클릭하면 상세 정보가 표시됩니다</p>
                )}
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
