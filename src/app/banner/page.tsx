"use client";

import { useState } from "react";
import {
  Brain, Sparkles, Users, Clock, Target, ChevronRight,
  Zap, MessageSquare, Database, Wrench, Bot, Mail,
  Building2, TrendingUp, GraduationCap, Phone,
  Briefcase, Calculator, UserCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";

/* ────────────────────────────────────────────
   GrowFit AI 실무 역량 강화 과정 — 배너 & 커리큘럼
   ──────────────────────────────────────────── */

const GROWFIT_STEPS = [
  { step: 1, label: "LLM 실습", desc: "22+ 모델 비교", icon: Brain, color: "from-blue-500 to-blue-600" },
  { step: 2, label: "프롬프트", desc: "시스템 프롬프트, Few-shot", icon: MessageSquare, color: "from-violet-500 to-violet-600" },
  { step: 3, label: "지식베이스", desc: "문서 연결, RAG", icon: Database, color: "from-emerald-500 to-emerald-600" },
  { step: 4, label: "MCP 도구", desc: "외부 도구 70+종", icon: Wrench, color: "from-orange-500 to-orange-600" },
  { step: 5, label: "에이전트 빌더", desc: "노코드 워크플로우", icon: Bot, color: "from-rose-500 to-rose-600" },
];

const CURRICULUM = [
  {
    id: "overview",
    time: "1시간",
    title: "개요 — AI 시대, 왜 지금인가",
    tag: "동기부여",
    tagColor: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
    items: [
      "생성형 AI 등장 이후 산업별 변화 사례",
      '"검색의 시대 → 생성의 시대"로의 전환',
      "AI 도입 기업 vs 미도입 기업 — 실제 생산성 격차",
      "AI 활용 수준 자가 진단 (물어보는 → 부리는 → 일하게 만드는)",
      "5단계 학습 로드맵 소개 + GrowFit 플랫폼 첫 접속",
    ],
  },
  {
    id: "common1",
    time: "40분",
    title: "공통 1 — AI를 이해하자",
    tag: "공통수업",
    tagColor: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
    items: [
      "22개 AI 모델 직접 비교 (GPT-4o, Claude, Gemini 등)",
      "Temperature, Top-P 설정값 체험",
      '시스템 프롬프트(역할 부여) + Few-shot(패턴 학습) — "보고서 써줘" vs 구체적 지시',
      '"AI에게 우리 회사 문서를 읽히는 것" — 샘플 문서 업로드 → RAG 체험',
    ],
    highlight: "같은 AI도 어떻게 쓰느냐에 따라 결과가 완전히 다르다",
  },
  {
    id: "common2",
    time: "40분",
    title: "공통 2 — AI에게 도구를 주자",
    tag: "공통수업",
    tagColor: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
    items: [
      '"말하는 AI" → "일하는 AI" — 70+ 외부 도구 연동 체험',
      "웹검색, 계산, 환율, DART 재무조회 등 MCP 도구 실습",
      "에이전트 빌더 소개 — AI에게 업무 매뉴얼을 주는 것",
      "16가지 노드 소개 + AI 자동 생성 시연",
    ],
    highlight: "AI에게 도구와 매뉴얼을 주면, AI가 알아서 일한다",
  },
  {
    id: "applied",
    time: "3시간",
    title: "응용 — AI가 일하게 만들자",
    tag: "응용수업",
    tagColor: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300",
    items: [
      "에이전트 빌더로 실제 업무 자동화 워크플로우 구축",
      "나의 업무에 맞는 AI 에이전트 직접 설계",
      "노코드로 데이터 수집 → 분석 → 보고서 자동 생성",
      "팀 프로젝트: 부서별 AI 업무 자동화 시나리오 발표",
      "수료 후 실행 계획 수립 — 내일부터 적용할 AI 업무 3가지",
    ],
  },
];

const COST_TABLE = [
  { item: "AI 과정", unit: "기준단가 × 300%", revenue: "1,500~4,500만", monthly: "8,000~15,000만", margin: "25~35%" },
  { item: "일반 과정", unit: "기준단가 × 100%", revenue: "500~1,500만", monthly: "3,000~6,000만", margin: "15~20%" },
];

const TEAM_ROLES = [
  { role: "영업·섭외·홍보", people: "1~2명", aiPct: "18~25%", normalPct: "10~15%", icon: Phone },
  { role: "강사진", people: "2명", aiPct: "45~52%", normalPct: "50~55%", icon: GraduationCap },
  { role: "행정·사후관리", people: "1~2명", aiPct: "12~15%", normalPct: "15~18%", icon: UserCheck },
  { role: "운영비·마케팅", people: "공통", aiPct: "8~12%", normalPct: "5~8%", icon: Briefcase },
  { role: "기관 순마진", people: "대표·예비금", aiPct: "15~20%", normalPct: "10~15%", icon: Calculator },
];

const EXPANSION_PLAN = [
  { phase: "Phase 1", period: "2026 Q2~Q3", title: "맛보기 6H 과정", desc: "금천구·구로구 중소기업 대상, 월 3~4회 운영", status: "NOW" },
  { phase: "Phase 2", period: "2026 Q4", title: "산업별 40H 심화", desc: "입찰·물류·제조 등 산업 맞춤 AI 교육", status: "NEXT" },
  { phase: "Phase 3", period: "2027~", title: "AI 자체개발 팀 유치", desc: "HR·ERP·MES 산업 단위 AI 팀 빌딩", status: "PLAN" },
];

type TabKey = "curriculum" | "business" | "expansion";

export default function BannerPage() {
  const [activeTab, setActiveTab] = useState<TabKey>("curriculum");

  return (
    <div className="space-y-6">
      {/* ── Hero Banner ── */}
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 p-8 text-white">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDM0djItSDI0di0yaDEyek0zNiAyNHYySDI0di0yaDEyeiIvPjwvZz48L2c+PC9zdmc+')] opacity-30" />
        <div className="relative z-10 max-w-3xl">
          <div className="mb-3 flex items-center gap-2">
            <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-medium backdrop-blur">GrowFit</span>
            <span className="rounded-full bg-yellow-400/20 px-3 py-1 text-xs font-medium text-yellow-200 backdrop-blur">2026 신규</span>
          </div>
          <h1 className="mb-3 text-3xl font-bold leading-tight sm:text-4xl">
            AI 실무 역량 강화 과정
          </h1>
          <p className="mb-1 text-lg text-white/90">코딩 없이, 6시간 만에 &quot;AI가 일하게 만드는 사람&quot;이 됩니다.</p>
          <p className="mb-2 text-sm text-white/70">대상: 금천구·구로구 중소기업 실무자 | 플랫폼: <a href="https://growfit.kr" target="_blank" rel="noopener noreferrer" className="underline hover:text-white">growfit.kr</a></p>
          <p className="mb-5 text-xs text-white/50">문의: 조은아 | joytec@naver.com | 010-2648-6726</p>
          <div className="flex flex-wrap gap-3">
            <a href="tel:010-2648-6726" className="flex items-center gap-2 rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-indigo-700 shadow-lg transition hover:bg-indigo-50">
              <Phone size={16} /> 교육 문의 (전화)
            </a>
            <a href="mailto:joytec@naver.com?subject=GrowFit AI 6시간 과정 문의" className="flex items-center gap-2 rounded-xl bg-white/20 px-5 py-2.5 text-sm font-medium text-white backdrop-blur transition hover:bg-white/30">
              <Mail size={16} /> 이메일 문의
            </a>
            <a href="https://growfit.kr" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 rounded-xl border border-white/30 px-5 py-2.5 text-sm font-medium text-white backdrop-blur transition hover:bg-white/10">
              <Sparkles size={16} /> GrowFit 체험하기
            </a>
          </div>
        </div>
        {/* 우측 장식 */}
        <div className="pointer-events-none absolute -right-10 -top-10 h-64 w-64 rounded-full bg-white/5 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 right-20 h-48 w-48 rounded-full bg-pink-400/10 blur-2xl" />
      </section>

      {/* ── GrowFit 5단계 ── */}
      <section>
        <h2 className="mb-3 text-lg font-bold text-zinc-900 dark:text-zinc-100">
          GrowFit 5단계 학습 체계
        </h2>
        <p className="mb-4 text-xs text-zinc-500 dark:text-zinc-400">
          <span className="font-medium text-emerald-600">공통</span> = &quot;AI를 이해하는 시간&quot; &nbsp;|&nbsp;
          <span className="font-medium text-rose-600">응용</span> = &quot;AI가 일하게 만드는 시간&quot;
        </p>
        <div className="grid grid-cols-5 gap-2">
          {GROWFIT_STEPS.map((s) => (
            <div key={s.step} className="group relative overflow-hidden rounded-xl bg-white p-3 shadow-sm ring-1 ring-zinc-200/60 transition hover:shadow-md dark:bg-zinc-900 dark:ring-zinc-700/60">
              <div className={cn("mb-2 inline-flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br text-white", s.color)}>
                <s.icon size={16} />
              </div>
              <p className="text-xs font-bold text-zinc-900 dark:text-zinc-100">Step {s.step}</p>
              <p className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">{s.label}</p>
              <p className="mt-0.5 text-[10px] text-zinc-500 dark:text-zinc-400">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Tab 전환 ── */}
      <div className="flex gap-1 rounded-lg bg-zinc-100 p-1 dark:bg-zinc-800">
        {([
          { key: "curriculum" as TabKey, label: "6시간 커리큘럼", icon: Clock },
          { key: "business" as TabKey, label: "수익 구조·팀 편성", icon: TrendingUp },
          { key: "expansion" as TabKey, label: "확장 계획", icon: Building2 },
        ]).map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              "flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-2 text-xs font-medium transition",
              activeTab === tab.key
                ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-700 dark:text-zinc-100"
                : "text-zinc-500 hover:text-zinc-700 dark:text-zinc-400"
            )}
          >
            <tab.icon size={14} /> {tab.label}
          </button>
        ))}
      </div>

      {/* ── 커리큘럼 탭 ── */}
      {activeTab === "curriculum" && (
        <section className="space-y-4">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">6시간 커리큘럼</h2>
            <span className="rounded-full bg-indigo-100 px-3 py-0.5 text-xs font-medium text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300">
              총 6시간 (휴식·점심 별도)
            </span>
          </div>

          <div className="space-y-3">
            {CURRICULUM.map((c, idx) => (
              <div key={c.id} className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-zinc-200/60 dark:bg-zinc-900 dark:ring-zinc-700/60">
                <div className="flex items-center gap-3 border-b border-zinc-100 px-4 py-3 dark:border-zinc-800">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-600 text-xs font-bold text-white">
                    {String(idx + 1).padStart(2, "0")}
                  </span>
                  <div className="flex-1">
                    <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">{c.title}</h3>
                  </div>
                  <span className={cn("rounded-full px-2.5 py-0.5 text-[10px] font-medium", c.tagColor)}>{c.tag}</span>
                  <span className="rounded bg-zinc-100 px-2 py-0.5 text-xs font-mono font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">{c.time}</span>
                </div>
                <div className="px-4 py-3">
                  <ul className="space-y-1.5">
                    {c.items.map((item, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs text-zinc-600 dark:text-zinc-400">
                        <ChevronRight size={12} className="mt-0.5 shrink-0 text-indigo-400" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                  {c.highlight && (
                    <div className="mt-3 rounded-lg bg-indigo-50 px-3 py-2 text-xs font-medium text-indigo-700 dark:bg-indigo-900/20 dark:text-indigo-300">
                      <Target size={12} className="mr-1 inline" />
                      핵심: &ldquo;{c.highlight}&rdquo;
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* CTA */}
          <div className="rounded-xl bg-gradient-to-r from-indigo-50 to-purple-50 p-5 text-center dark:from-indigo-950/30 dark:to-purple-950/30">
            <p className="mb-1 text-base font-bold text-zinc-900 dark:text-zinc-100">6시간 후, &quot;AI가 일하게 만드는 사람&quot;이 됩니다.</p>
            <p className="mb-2 text-xs text-zinc-500">금천구·구로구 중소기업 대상 | 코딩 불필요 | GrowFit 플랫폼 제공</p>
            <p className="mb-3 text-xs font-medium text-zinc-600 dark:text-zinc-400">조은아 | 010-2648-6726 | joytec@naver.com</p>
            <div className="flex items-center justify-center gap-3">
              <a href="tel:010-2648-6726" className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg transition hover:bg-indigo-700">
                <Phone size={16} /> 전화 문의
              </a>
              <a href="mailto:joytec@naver.com?subject=GrowFit AI 6시간 과정 신청" className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-indigo-700 shadow ring-1 ring-indigo-200 transition hover:bg-indigo-50">
                <Mail size={16} /> 이메일 신청
              </a>
            </div>
          </div>
        </section>
      )}

      {/* ── 수익 구조 탭 ── */}
      {activeTab === "business" && (
        <section className="space-y-5">
          <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">AI 과정 vs 일반 과정 수익 구조</h2>

          <div className="overflow-x-auto rounded-xl bg-white shadow-sm ring-1 ring-zinc-200/60 dark:bg-zinc-900 dark:ring-zinc-700/60">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-zinc-100 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-800/50">
                  <th className="px-3 py-2 text-left font-medium text-zinc-500">구분</th>
                  <th className="px-3 py-2 text-left font-medium text-zinc-500">훈련비 단가</th>
                  <th className="px-3 py-2 text-right font-medium text-zinc-500">과정당 수강료</th>
                  <th className="px-3 py-2 text-right font-medium text-zinc-500">월 예상 매출</th>
                  <th className="px-3 py-2 text-right font-medium text-zinc-500">마진</th>
                </tr>
              </thead>
              <tbody>
                {COST_TABLE.map((r) => (
                  <tr key={r.item} className="border-b border-zinc-50 dark:border-zinc-800/50">
                    <td className="px-3 py-2.5 font-semibold text-zinc-900 dark:text-zinc-100">{r.item}</td>
                    <td className="px-3 py-2.5 text-zinc-600 dark:text-zinc-400">{r.unit}</td>
                    <td className="px-3 py-2.5 text-right text-zinc-700 dark:text-zinc-300">{r.revenue}</td>
                    <td className="px-3 py-2.5 text-right font-medium text-zinc-900 dark:text-zinc-100">{r.monthly}</td>
                    <td className="px-3 py-2.5 text-right">
                      <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold", r.item === "AI 과정" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300" : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400")}>
                        {r.margin}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">팀 편성 · 경비 배분 (월 매출 1억 기준)</h3>
          <div className="overflow-x-auto rounded-xl bg-white shadow-sm ring-1 ring-zinc-200/60 dark:bg-zinc-900 dark:ring-zinc-700/60">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-zinc-100 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-800/50">
                  <th className="px-3 py-2 text-left font-medium text-zinc-500">역할</th>
                  <th className="px-3 py-2 text-center font-medium text-zinc-500">인원</th>
                  <th className="px-3 py-2 text-right font-medium text-emerald-600">AI 과정 %</th>
                  <th className="px-3 py-2 text-right font-medium text-zinc-500">일반 과정 %</th>
                </tr>
              </thead>
              <tbody>
                {TEAM_ROLES.map((r) => (
                  <tr key={r.role} className="border-b border-zinc-50 dark:border-zinc-800/50">
                    <td className="px-3 py-2.5">
                      <span className="flex items-center gap-2 font-semibold text-zinc-900 dark:text-zinc-100">
                        <r.icon size={14} className="text-indigo-500" /> {r.role}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-center text-zinc-500">{r.people}</td>
                    <td className="px-3 py-2.5 text-right font-medium text-emerald-700 dark:text-emerald-400">{r.aiPct}</td>
                    <td className="px-3 py-2.5 text-right text-zinc-500">{r.normalPct}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="rounded-lg bg-amber-50 p-3 text-xs text-amber-800 dark:bg-amber-900/20 dark:text-amber-300">
            <strong>근거:</strong> 고용노동부·한국산업인력공단 「2026년 기업훈련 탄력운영제」 공고 제2025-235호, 사업주 직업능력개발훈련 지원규정. AI 과정은 신기술(29개 분야)로 기준단가 최대 300% 적용.
          </div>
        </section>
      )}

      {/* ── 확장 계획 탭 ── */}
      {activeTab === "expansion" && (
        <section className="space-y-5">
          <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">사업 확장 로드맵</h2>

          <div className="space-y-3">
            {EXPANSION_PLAN.map((p) => (
              <div key={p.phase} className={cn(
                "rounded-xl p-4 ring-1 transition",
                p.status === "NOW"
                  ? "bg-indigo-50 ring-indigo-200 dark:bg-indigo-950/30 dark:ring-indigo-700"
                  : "bg-white ring-zinc-200/60 dark:bg-zinc-900 dark:ring-zinc-700/60"
              )}>
                <div className="mb-2 flex items-center gap-2">
                  <span className={cn(
                    "rounded-full px-2.5 py-0.5 text-[10px] font-bold",
                    p.status === "NOW" ? "bg-indigo-600 text-white" : p.status === "NEXT" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300" : "bg-zinc-100 text-zinc-500 dark:bg-zinc-800"
                  )}>
                    {p.status}
                  </span>
                  <span className="text-xs font-medium text-zinc-500">{p.period}</span>
                </div>
                <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">{p.phase}: {p.title}</h3>
                <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">{p.desc}</p>
              </div>
            ))}
          </div>

          <div className="rounded-xl bg-gradient-to-r from-zinc-900 to-zinc-800 p-5 text-white dark:from-zinc-800 dark:to-zinc-700">
            <h3 className="mb-2 text-sm font-bold">향후 AI 자체개발 팀 유치 계획</h3>
            <div className="grid grid-cols-3 gap-3 text-center">
              {[
                { label: "HR·채용", desc: "AI 면접, 이력서 분석" },
                { label: "ERP·경영", desc: "AI 재고관리, 수요예측" },
                { label: "MES·제조", desc: "AI 품질검사, 공정최적화" },
              ].map((item) => (
                <div key={item.label} className="rounded-lg bg-white/10 p-3 backdrop-blur">
                  <p className="text-xs font-bold">{item.label}</p>
                  <p className="mt-0.5 text-[10px] text-zinc-300">{item.desc}</p>
                </div>
              ))}
            </div>
            <p className="mt-3 text-[10px] text-zinc-400">
              산업 단위 AI 자체개발 팀 빌딩 → 기업별 맞춤 AI 솔루션 → 정부 훈련비 환급 구조 활용
            </p>
          </div>

          {/* 운영 전략 */}
          <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-zinc-200/60 dark:bg-zinc-900 dark:ring-zinc-700/60">
            <h3 className="mb-3 text-sm font-bold text-zinc-900 dark:text-zinc-100">조직 운영 흐름</h3>
            <div className="space-y-2 text-xs text-zinc-600 dark:text-zinc-400">
              <div className="flex gap-2">
                <span className="shrink-0 font-mono font-bold text-indigo-500">01</span>
                <span><strong>월초 계획</strong>: 영업팀 목표 기업 15곳 섭외 (AI 과정 우선), 월 3~4개 과정 스케줄 확정</span>
              </div>
              <div className="flex gap-2">
                <span className="shrink-0 font-mono font-bold text-indigo-500">02</span>
                <span><strong>과정 운영</strong>: 영업→계약→행정(HRD-Net)→강의→사후관리(보고서)→환급 완료</span>
              </div>
              <div className="flex gap-2">
                <span className="shrink-0 font-mono font-bold text-indigo-500">03</span>
                <span><strong>경비 정산</strong>: 매월 5일, AI 과정 별도 태그→영업·마케팅 추가 배분. 수료율 95%+ 시 보너스 +10%</span>
              </div>
              <div className="flex gap-2">
                <span className="shrink-0 font-mono font-bold text-indigo-500">04</span>
                <span><strong>확장 전략</strong>: 초기 3개월 혼합→4개월 후 AI 70%+→영업팀 확대, 마진 25% 목표</span>
              </div>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
