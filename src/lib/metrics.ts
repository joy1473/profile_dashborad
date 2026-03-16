import { supabase } from "./supabase";
import { metrics as mockMetrics, revenueData as mockRevenueData } from "./mock-data";
import type { MetricCard, ChartData } from "@/types";

const USE_MOCK = !process.env.NEXT_PUBLIC_SUPABASE_URL;

export async function fetchMetrics(): Promise<MetricCard[]> {
  if (USE_MOCK) return mockMetrics;

  try {
    const { data, error } = await supabase
      .from("daily_metrics")
      .select("*")
      .order("date", { ascending: false })
      .limit(2);
    if (error || !data || data.length < 2) return mockMetrics;

  const [latest, prev] = data;
  const pctChange = (curr: number, old: number) =>
    old === 0 ? 0 : Math.round(((curr - old) / old) * 1000) / 10;

  const revChange = pctChange(latest.revenue, prev.revenue);
  const userChange = pctChange(latest.active_users, prev.active_users);
  const convChange = pctChange(Number(latest.conversion_rate), Number(prev.conversion_rate));
  const sessChange = pctChange(latest.avg_session_seconds, prev.avg_session_seconds);

  return [
    { title: "총 매출", value: `₩${(latest.revenue * 10000).toLocaleString()}`, change: Math.abs(revChange), trend: revChange >= 0 ? "up" : "down" },
    { title: "활성 사용자", value: latest.active_users.toLocaleString(), change: Math.abs(userChange), trend: userChange >= 0 ? "up" : "down" },
    { title: "전환율", value: `${latest.conversion_rate}%`, change: Math.abs(convChange), trend: convChange >= 0 ? "up" : "down" },
    { title: "평균 세션", value: formatSeconds(latest.avg_session_seconds), change: Math.abs(sessChange), trend: sessChange >= 0 ? "up" : "down" },
  ];
  } catch {
    return mockMetrics;
  }
}

export async function fetchRevenueData(): Promise<ChartData[]> {
  if (USE_MOCK) return mockRevenueData;

  try {
    const { data, error } = await supabase
      .from("daily_metrics")
      .select("date, revenue, active_users")
      .order("date", { ascending: true });
    if (error) return mockRevenueData;

  const monthNames = ["1월", "2월", "3월", "4월", "5월", "6월", "7월", "8월", "9월", "10월", "11월", "12월"];
  return (data ?? []).map((d) => ({
    name: monthNames[new Date(d.date).getMonth()],
    date: d.date,
    revenue: d.revenue,
    users: d.active_users,
  }));
  } catch {
    return mockRevenueData;
  }
}

function formatSeconds(s: number): string {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}분 ${sec}초`;
}
