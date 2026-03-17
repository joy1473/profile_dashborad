"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from "recharts";
import { Card } from "@/components/ui/card";
import { revenueData } from "@/lib/mock-data";
import { ReportBuilder } from "@/components/reports/report-builder";

export default function AnalyticsPage() {
  return (
    <div className="space-y-8">
      <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50" data-testid="page-title">분석</h2>

      {/* Report Builder — 이슈 기반 출력물 생성 */}
      <div className="rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
        <h3 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          리포트 빌더
        </h3>
        <p className="mb-6 text-sm text-zinc-500">
          Board 이슈의 첨부 문서(CSV/JSON)를 선택하면 출력물을 자동으로 생성합니다.
          데이터가 부족하면 Q&A로 추가 입력할 수 있습니다.
        </p>
        <ReportBuilder />
      </div>

      {/* 기존 차트 유지 */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card data-testid="bar-chart">
          <h3 className="mb-4 text-sm font-medium text-zinc-500 dark:text-zinc-400">월별 매출 비교</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
                <XAxis dataKey="name" fontSize={12} stroke="#a1a1aa" />
                <YAxis fontSize={12} stroke="#a1a1aa" />
                <Tooltip />
                <Bar dataKey="revenue" fill="#3b82f6" radius={[4, 4, 0, 0]} name="매출 (만원)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card data-testid="area-chart">
          <h3 className="mb-4 text-sm font-medium text-zinc-500 dark:text-zinc-400">사용자 증가 추이</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
                <XAxis dataKey="name" fontSize={12} stroke="#a1a1aa" />
                <YAxis fontSize={12} stroke="#a1a1aa" />
                <Tooltip />
                <Area type="monotone" dataKey="users" stroke="#10b981" fill="#10b98133" name="사용자 수" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
    </div>
  );
}
