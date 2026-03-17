"use client";

import { BidBuilder } from "@/components/bid/bid-builder";

export default function AnalyticsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50" data-testid="page-title">
          입찰문서 작성
        </h2>
        <p className="mt-1 text-sm text-zinc-500">
          이슈를 선택하고 제안서 또는 견적서를 작성하세요. 첨부 파일을 참조하며 단계별로 입력합니다.
        </p>
      </div>

      <div className="rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
        <BidBuilder />
      </div>

      {/* Print CSS */}
      <style jsx global>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white; }
          .print-page {
            width: 210mm;
            min-height: 297mm;
            padding: 20mm;
            margin: 0 auto;
          }
          .page-break { page-break-before: always; }
          .print-content {
            border: none !important;
            box-shadow: none !important;
            padding: 0 !important;
          }
          table { border-collapse: collapse; width: 100%; }
          th, td { border: 1px solid #333; padding: 8px; }
        }
      `}</style>
    </div>
  );
}
