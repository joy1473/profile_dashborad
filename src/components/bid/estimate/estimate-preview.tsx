"use client";

import { Printer } from "lucide-react";
import type { EstimateData } from "@/types/bid";

interface EstimatePreviewProps {
  data: EstimateData;
}

export function EstimatePreview({ data }: EstimatePreviewProps) {
  const total = data.items.reduce((sum, item) => sum + (item.amount || 0), 0);
  const vat = Math.round(total * 0.1);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between no-print">
        <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">견적서 미리보기</h3>
        <button
          onClick={() => window.print()}
          className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          <Printer size={16} />
          인쇄 / PDF
        </button>
      </div>

      <div className="print-content rounded-lg border border-zinc-200 bg-white p-8 text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50">
        <div className="print-page">
          {/* Header */}
          <h1 className="mb-8 text-center text-2xl font-bold">견 적 서</h1>

          {/* Info grid */}
          <div className="mb-6 grid grid-cols-2 gap-8">
            <div>
              <p className="mb-1 text-sm font-semibold">수신</p>
              <p className="text-sm">{data.recipient.company} {data.recipient.contact && `/ ${data.recipient.contact}`}</p>
            </div>
            <div className="text-right">
              <p className="mb-1 text-sm font-semibold">발신</p>
              <p className="text-sm">{data.sender.company}</p>
              <p className="text-sm">대표: {data.sender.ceo}</p>
              <p className="text-sm">TEL: {data.sender.phone}</p>
            </div>
          </div>

          <div className="mb-6 flex justify-between text-sm text-zinc-600 dark:text-zinc-400">
            <span>견적일: {data.date}</span>
            {data.validUntil && <span>유효기간: {data.validUntil}</span>}
          </div>

          {/* Summary */}
          <div className="mb-6 rounded-lg bg-blue-50 p-4 dark:bg-blue-900/20">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">견적 금액 (VAT 별도)</span>
              <span className="text-xl font-bold text-blue-600">{total.toLocaleString()}원</span>
            </div>
            <div className="mt-1 flex items-center justify-between text-sm text-zinc-500">
              <span>VAT 포함</span>
              <span>{(total + vat).toLocaleString()}원</span>
            </div>
          </div>

          {/* Items table */}
          <table className="mb-6 w-full border-collapse text-sm">
            <thead>
              <tr className="bg-zinc-100 dark:bg-zinc-800">
                <th className="border border-zinc-300 px-3 py-2 text-center dark:border-zinc-600">No.</th>
                <th className="border border-zinc-300 px-3 py-2 text-left dark:border-zinc-600">품목</th>
                <th className="border border-zinc-300 px-3 py-2 text-left dark:border-zinc-600">규격</th>
                <th className="border border-zinc-300 px-3 py-2 text-right dark:border-zinc-600">수량</th>
                <th className="border border-zinc-300 px-3 py-2 text-right dark:border-zinc-600">단가</th>
                <th className="border border-zinc-300 px-3 py-2 text-right dark:border-zinc-600">금액</th>
              </tr>
            </thead>
            <tbody>
              {data.items
                .filter((item) => item.name)
                .map((item, i) => (
                  <tr key={i}>
                    <td className="border border-zinc-300 px-3 py-2 text-center dark:border-zinc-600">{i + 1}</td>
                    <td className="border border-zinc-300 px-3 py-2 dark:border-zinc-600">{item.name}</td>
                    <td className="border border-zinc-300 px-3 py-2 dark:border-zinc-600">{item.spec}</td>
                    <td className="border border-zinc-300 px-3 py-2 text-right dark:border-zinc-600">{item.qty}</td>
                    <td className="border border-zinc-300 px-3 py-2 text-right dark:border-zinc-600">
                      {item.unitPrice.toLocaleString()}
                    </td>
                    <td className="border border-zinc-300 px-3 py-2 text-right dark:border-zinc-600">
                      {item.amount.toLocaleString()}
                    </td>
                  </tr>
                ))}
              <tr className="bg-zinc-50 font-medium dark:bg-zinc-800">
                <td colSpan={5} className="border border-zinc-300 px-3 py-2 text-right dark:border-zinc-600">
                  합계
                </td>
                <td className="border border-zinc-300 px-3 py-2 text-right dark:border-zinc-600">
                  {total.toLocaleString()}원
                </td>
              </tr>
              <tr>
                <td colSpan={5} className="border border-zinc-300 px-3 py-2 text-right dark:border-zinc-600">
                  부가세 (10%)
                </td>
                <td className="border border-zinc-300 px-3 py-2 text-right dark:border-zinc-600">
                  {vat.toLocaleString()}원
                </td>
              </tr>
              <tr className="bg-blue-50 font-bold dark:bg-blue-900/30">
                <td colSpan={5} className="border border-zinc-300 px-3 py-2 text-right dark:border-zinc-600">
                  총액 (VAT 포함)
                </td>
                <td className="border border-zinc-300 px-3 py-2 text-right dark:border-zinc-600">
                  {(total + vat).toLocaleString()}원
                </td>
              </tr>
            </tbody>
          </table>

          {/* Terms */}
          {(data.deliveryTerms || data.paymentTerms || data.notes) && (
            <div className="space-y-3 text-sm">
              {data.deliveryTerms && (
                <div>
                  <p className="font-semibold">납품 조건</p>
                  <p className="whitespace-pre-wrap text-zinc-600 dark:text-zinc-400">{data.deliveryTerms}</p>
                </div>
              )}
              {data.paymentTerms && (
                <div>
                  <p className="font-semibold">결제 조건</p>
                  <p className="whitespace-pre-wrap text-zinc-600 dark:text-zinc-400">{data.paymentTerms}</p>
                </div>
              )}
              {data.notes && (
                <div>
                  <p className="font-semibold">비고</p>
                  <p className="whitespace-pre-wrap text-zinc-600 dark:text-zinc-400">{data.notes}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
