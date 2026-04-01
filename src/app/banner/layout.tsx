import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "GrowFit AI 실무 역량 강화 과정 | 6시간 커리큘럼",
  description:
    "코딩 없이 6시간 만에 AI가 일하게 만드는 사람이 됩니다. 금천구·구로구 중소기업 대상 AI 실무 교육. GrowFit 플랫폼 기반 22+ LLM 비교, RAG, MCP 도구, 에이전트 빌더 실습.",
  keywords: [
    "AI교육",
    "GrowFit",
    "기업교육",
    "AI실무",
    "금천구",
    "구로구",
    "중소기업",
    "사업주훈련",
    "LLM",
    "RAG",
    "에이전트",
    "노코드AI",
    "프롬프트엔지니어링",
    "디지털전환",
    "AX",
  ],
  openGraph: {
    title: "GrowFit AI 실무 역량 강화 과정 — 6시간 커리큘럼",
    description:
      "코딩 없이, 6시간 만에 AI가 일하게 만드는 사람이 됩니다. 22+ LLM 비교, RAG, MCP 70+종 도구, 에이전트 빌더 실습.",
    type: "website",
    url: "https://profile-dashborad.vercel.app/banner",
    siteName: "GrowFit AI 교육",
  },
};

export default function BannerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      {/* 심플 헤더 (로그인 불필요) */}
      <header className="border-b border-zinc-200 bg-white px-6 py-3 dark:border-zinc-800 dark:bg-zinc-950">
        <div className="flex items-center justify-between">
          <a href="/" className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
            GrowFit AI 교육
          </a>
          <div className="flex items-center gap-3">
            <a
              href="https://bctone-71574429.mintlify.app/guide"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-zinc-500 hover:underline dark:text-zinc-400"
            >
              매뉴얼
            </a>
            <a
              href="https://growfit.kr"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-indigo-600 hover:underline dark:text-indigo-400"
            >
              growfit.kr
            </a>
            <a
              href="https://growfit.kr"
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900"
            >
              로그인
            </a>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-4xl p-6">{children}</main>
      {/* 푸터 */}
      <footer className="border-t border-zinc-200 bg-white px-6 py-4 text-center text-xs text-zinc-400 dark:border-zinc-800 dark:bg-zinc-950">
        copyright&copy; 2005 The Polestar All rights reserved. | 사업자등록번호 : 110-11-23776 | 대표자 : 조은아 | joytec@naver.com
      </footer>
    </div>
  );
}
