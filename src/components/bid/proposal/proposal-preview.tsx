"use client";

import { Printer } from "lucide-react";
import type { ProposalData } from "@/types/bid";

interface ProposalPreviewProps {
  data: ProposalData;
}

export function ProposalPreview({ data }: ProposalPreviewProps) {
  const total = data.costs.reduce((sum, c) => sum + (c.amount || 0), 0);
  const vat = data.vatIncluded ? Math.round(total * 0.1) : 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between no-print">
        <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">제안서 미리보기</h3>
        <button
          onClick={() => window.print()}
          className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          <Printer size={16} />
          인쇄 / PDF
        </button>
      </div>

      {/* Print-optimized content */}
      <div className="print-content rounded-lg border border-zinc-200 bg-white p-8 text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50">
        {/* Cover page */}
        <div className="print-page text-center">
          <div className="mb-16 pt-24">
            <h1 className="text-3xl font-bold">{data.projectName || "프로젝트명"}</h1>
            <p className="mt-4 text-xl text-zinc-500">기술 제안서</p>
          </div>
          <div className="mb-8 text-lg text-zinc-600 dark:text-zinc-400">
            <p>{data.clientName || "발주처"} 귀중</p>
          </div>
          <div className="mt-24 text-sm text-zinc-500">
            <p>{data.submitDate}</p>
            <p className="mt-2 text-lg font-semibold">{data.company.name}</p>
            <p>대표이사 {data.company.ceo}</p>
          </div>
        </div>

        {/* Company intro */}
        {data.companyIntro && (
          <div className="page-break pt-6">
            <h2 className="mb-4 border-b-2 border-blue-600 pb-2 text-xl font-bold">1. 회사 소개</h2>
            <p className="whitespace-pre-wrap text-sm leading-relaxed">{data.companyIntro}</p>

            {data.trackRecord.some((r) => r.project) && (
              <div className="mt-6">
                <h3 className="mb-2 text-base font-semibold">주요 수행실적</h3>
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="bg-zinc-100 dark:bg-zinc-800">
                      <th className="border border-zinc-300 px-3 py-2 text-left dark:border-zinc-600">프로젝트</th>
                      <th className="border border-zinc-300 px-3 py-2 text-left dark:border-zinc-600">발주처</th>
                      <th className="border border-zinc-300 px-3 py-2 text-left dark:border-zinc-600">기간</th>
                      <th className="border border-zinc-300 px-3 py-2 text-left dark:border-zinc-600">금액</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.trackRecord
                      .filter((r) => r.project)
                      .map((r, i) => (
                        <tr key={i}>
                          <td className="border border-zinc-300 px-3 py-2 dark:border-zinc-600">{r.project}</td>
                          <td className="border border-zinc-300 px-3 py-2 dark:border-zinc-600">{r.client}</td>
                          <td className="border border-zinc-300 px-3 py-2 dark:border-zinc-600">{r.period}</td>
                          <td className="border border-zinc-300 px-3 py-2 dark:border-zinc-600">{r.amount}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Tech approach */}
        {(data.understanding || data.strategy || data.techDetail) && (
          <div className="page-break pt-6">
            <h2 className="mb-4 border-b-2 border-blue-600 pb-2 text-xl font-bold">2. 기술 방안</h2>

            {data.understanding && (
              <div className="mb-4">
                <h3 className="mb-2 text-base font-semibold">2.1 사업 이해도</h3>
                <p className="whitespace-pre-wrap text-sm leading-relaxed">{data.understanding}</p>
              </div>
            )}
            {data.strategy && (
              <div className="mb-4">
                <h3 className="mb-2 text-base font-semibold">2.2 추진 전략</h3>
                <p className="whitespace-pre-wrap text-sm leading-relaxed">{data.strategy}</p>
              </div>
            )}
            {data.systemDiagram && (
              <div className="mb-4">
                <h3 className="mb-2 text-base font-semibold">2.3 시스템 구성도</h3>
                <p className="whitespace-pre-wrap text-sm leading-relaxed">{data.systemDiagram}</p>
              </div>
            )}
            {data.techDetail && (
              <div className="mb-4">
                <h3 className="mb-2 text-base font-semibold">2.4 세부 기술 방안</h3>
                <p className="whitespace-pre-wrap text-sm leading-relaxed">{data.techDetail}</p>
              </div>
            )}
          </div>
        )}

        {/* Schedule */}
        {data.schedule.some((s) => s.phase) && (
          <div className="page-break pt-6">
            <h2 className="mb-4 border-b-2 border-blue-600 pb-2 text-xl font-bold">3. 추진 일정</h2>
            {data.totalPeriod && (
              <p className="mb-3 text-sm">
                <strong>총 사업 기간:</strong> {data.totalPeriod}
              </p>
            )}
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-zinc-100 dark:bg-zinc-800">
                  <th className="border border-zinc-300 px-3 py-2 text-left dark:border-zinc-600">단계</th>
                  <th className="border border-zinc-300 px-3 py-2 text-left dark:border-zinc-600">기간</th>
                  <th className="border border-zinc-300 px-3 py-2 text-left dark:border-zinc-600">산출물</th>
                </tr>
              </thead>
              <tbody>
                {data.schedule
                  .filter((s) => s.phase)
                  .map((s, i) => (
                    <tr key={i}>
                      <td className="border border-zinc-300 px-3 py-2 dark:border-zinc-600">{s.phase}</td>
                      <td className="border border-zinc-300 px-3 py-2 dark:border-zinc-600">{s.period}</td>
                      <td className="border border-zinc-300 px-3 py-2 dark:border-zinc-600">{s.deliverable}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Team */}
        {data.team.some((t) => t.name) && (
          <div className="pt-6">
            <h2 className="mb-4 border-b-2 border-blue-600 pb-2 text-xl font-bold">4. 투입 인력</h2>
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-zinc-100 dark:bg-zinc-800">
                  <th className="border border-zinc-300 px-3 py-2 text-left dark:border-zinc-600">성명</th>
                  <th className="border border-zinc-300 px-3 py-2 text-left dark:border-zinc-600">역할</th>
                  <th className="border border-zinc-300 px-3 py-2 text-left dark:border-zinc-600">등급</th>
                  <th className="border border-zinc-300 px-3 py-2 text-left dark:border-zinc-600">투입 기간</th>
                </tr>
              </thead>
              <tbody>
                {data.team
                  .filter((t) => t.name)
                  .map((t, i) => (
                    <tr key={i}>
                      <td className="border border-zinc-300 px-3 py-2 dark:border-zinc-600">{t.name}</td>
                      <td className="border border-zinc-300 px-3 py-2 dark:border-zinc-600">{t.role}</td>
                      <td className="border border-zinc-300 px-3 py-2 dark:border-zinc-600">{t.grade}</td>
                      <td className="border border-zinc-300 px-3 py-2 dark:border-zinc-600">{t.period}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Costs */}
        {data.costs.some((c) => c.item) && (
          <div className="page-break pt-6">
            <h2 className="mb-4 border-b-2 border-blue-600 pb-2 text-xl font-bold">5. 비용</h2>
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-zinc-100 dark:bg-zinc-800">
                  <th className="border border-zinc-300 px-3 py-2 text-left dark:border-zinc-600">항목</th>
                  <th className="border border-zinc-300 px-3 py-2 text-right dark:border-zinc-600">수량</th>
                  <th className="border border-zinc-300 px-3 py-2 text-right dark:border-zinc-600">단가</th>
                  <th className="border border-zinc-300 px-3 py-2 text-right dark:border-zinc-600">금액</th>
                </tr>
              </thead>
              <tbody>
                {data.costs
                  .filter((c) => c.item)
                  .map((c, i) => (
                    <tr key={i}>
                      <td className="border border-zinc-300 px-3 py-2 dark:border-zinc-600">{c.item}</td>
                      <td className="border border-zinc-300 px-3 py-2 text-right dark:border-zinc-600">{c.qty}</td>
                      <td className="border border-zinc-300 px-3 py-2 text-right dark:border-zinc-600">
                        {c.unitPrice.toLocaleString()}
                      </td>
                      <td className="border border-zinc-300 px-3 py-2 text-right dark:border-zinc-600">
                        {c.amount.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                <tr className="bg-zinc-50 font-medium dark:bg-zinc-800">
                  <td colSpan={3} className="border border-zinc-300 px-3 py-2 text-right dark:border-zinc-600">
                    소계
                  </td>
                  <td className="border border-zinc-300 px-3 py-2 text-right dark:border-zinc-600">
                    {total.toLocaleString()}원
                  </td>
                </tr>
                {data.vatIncluded && (
                  <>
                    <tr>
                      <td colSpan={3} className="border border-zinc-300 px-3 py-2 text-right dark:border-zinc-600">
                        부가세 (10%)
                      </td>
                      <td className="border border-zinc-300 px-3 py-2 text-right dark:border-zinc-600">
                        {vat.toLocaleString()}원
                      </td>
                    </tr>
                    <tr className="bg-blue-50 font-bold dark:bg-blue-900/30">
                      <td colSpan={3} className="border border-zinc-300 px-3 py-2 text-right dark:border-zinc-600">
                        총액 (VAT 포함)
                      </td>
                      <td className="border border-zinc-300 px-3 py-2 text-right dark:border-zinc-600">
                        {(total + vat).toLocaleString()}원
                      </td>
                    </tr>
                  </>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
