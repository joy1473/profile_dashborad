"use client";

import { useState, useMemo } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Issue } from "@/types/issue";

interface CalendarBoardProps {
  issues: Issue[];
  onIssueClick: (issue: Issue) => void;
}

const PRIORITY_COLORS: Record<string, string> = {
  high: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400",
  medium: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-400",
  low: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400",
};

const STATUS_DOT: Record<string, string> = {
  todo: "bg-zinc-400",
  in_progress: "bg-blue-500",
  in_review: "bg-yellow-500",
  done: "bg-green-500",
};

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

export function CalendarBoard({ issues, onIssueClick }: CalendarBoardProps) {
  const [current, setCurrent] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });

  const { year, month } = current;

  const calendarDays = useMemo(() => {
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const prevDays = new Date(year, month, 0).getDate();

    const days: { date: number; currentMonth: boolean; key: string }[] = [];

    // Previous month padding
    for (let i = firstDay - 1; i >= 0; i--) {
      const d = prevDays - i;
      days.push({ date: d, currentMonth: false, key: `prev-${d}` });
    }

    // Current month
    for (let d = 1; d <= daysInMonth; d++) {
      days.push({ date: d, currentMonth: true, key: `cur-${d}` });
    }

    // Next month padding
    const remaining = 42 - days.length;
    for (let d = 1; d <= remaining; d++) {
      days.push({ date: d, currentMonth: false, key: `next-${d}` });
    }

    return days;
  }, [year, month]);

  // Group issues by due_date day
  const issuesByDay = useMemo(() => {
    const map = new Map<number, Issue[]>();
    for (const issue of issues) {
      if (!issue.due_date) continue;
      const d = new Date(issue.due_date);
      if (d.getFullYear() === year && d.getMonth() === month) {
        const day = d.getDate();
        if (!map.has(day)) map.set(day, []);
        map.get(day)!.push(issue);
      }
    }
    return map;
  }, [issues, year, month]);

  const today = new Date();
  const isToday = (d: number) =>
    today.getFullYear() === year && today.getMonth() === month && today.getDate() === d;

  function goPrev() {
    setCurrent((c) => (c.month === 0 ? { year: c.year - 1, month: 11 } : { year: c.year, month: c.month - 1 }));
  }

  function goNext() {
    setCurrent((c) => (c.month === 11 ? { year: c.year + 1, month: 0 } : { year: c.year, month: c.month + 1 }));
  }

  function goToday() {
    const now = new Date();
    setCurrent({ year: now.getFullYear(), month: now.getMonth() });
  }

  const issuesWithoutDate = issues.filter((i) => !i.due_date);

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <button onClick={goPrev} className="rounded-lg p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800">
            <ChevronLeft size={18} />
          </button>
          <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-50 min-w-[120px] text-center">
            {year}년 {month + 1}월
          </h3>
          <button onClick={goNext} className="rounded-lg p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800">
            <ChevronRight size={18} />
          </button>
          <button
            onClick={goToday}
            className="rounded-lg border border-zinc-300 px-3 py-1 text-xs font-medium text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800"
          >
            오늘
          </button>
        </div>
        <div className="flex items-center gap-3 text-xs text-zinc-500">
          <span className="flex items-center gap-1"><span className="inline-block w-2 h-2 rounded-full bg-zinc-400" />할일</span>
          <span className="flex items-center gap-1"><span className="inline-block w-2 h-2 rounded-full bg-blue-500" />진행</span>
          <span className="flex items-center gap-1"><span className="inline-block w-2 h-2 rounded-full bg-yellow-500" />검토</span>
          <span className="flex items-center gap-1"><span className="inline-block w-2 h-2 rounded-full bg-green-500" />완료</span>
        </div>
      </div>

      {/* Weekday header */}
      <div className="grid grid-cols-7 border-b border-zinc-200 dark:border-zinc-800">
        {WEEKDAYS.map((day, i) => (
          <div
            key={day}
            className={cn(
              "py-2 text-center text-xs font-medium",
              i === 0 ? "text-red-500" : i === 6 ? "text-blue-500" : "text-zinc-500 dark:text-zinc-400"
            )}
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 border-l border-zinc-200 dark:border-zinc-800">
        {calendarDays.map((day) => {
          const dayIssues = day.currentMonth ? issuesByDay.get(day.date) ?? [] : [];
          return (
            <div
              key={day.key}
              className={cn(
                "min-h-[100px] border-r border-b border-zinc-200 dark:border-zinc-800 p-1.5",
                !day.currentMonth && "bg-zinc-50 dark:bg-zinc-900/50"
              )}
            >
              <div
                className={cn(
                  "text-xs font-medium mb-1",
                  !day.currentMonth && "text-zinc-300 dark:text-zinc-700",
                  day.currentMonth && "text-zinc-700 dark:text-zinc-300",
                  isToday(day.date) &&
                    day.currentMonth &&
                    "inline-flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-white"
                )}
              >
                {day.date}
              </div>
              <div className="space-y-0.5">
                {dayIssues.slice(0, 3).map((issue) => (
                  <button
                    key={issue.id}
                    onClick={() => onIssueClick(issue)}
                    className={cn(
                      "w-full text-left rounded px-1.5 py-0.5 text-[10px] font-medium truncate flex items-center gap-1",
                      PRIORITY_COLORS[issue.priority]
                    )}
                    title={issue.title}
                  >
                    <span className={cn("inline-block w-1.5 h-1.5 rounded-full shrink-0", STATUS_DOT[issue.status])} />
                    {issue.title}
                  </button>
                ))}
                {dayIssues.length > 3 && (
                  <span className="text-[10px] text-zinc-400 pl-1">+{dayIssues.length - 3}건</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* 마감일 없는 이슈 */}
      {issuesWithoutDate.length > 0 && (
        <div className="mt-4 rounded-lg border border-zinc-200 dark:border-zinc-800 p-3">
          <h4 className="text-xs font-medium text-zinc-500 mb-2">마감일 미지정 ({issuesWithoutDate.length}건)</h4>
          <div className="flex flex-wrap gap-2">
            {issuesWithoutDate.map((issue) => (
              <button
                key={issue.id}
                onClick={() => onIssueClick(issue)}
                className={cn(
                  "rounded px-2 py-1 text-xs font-medium flex items-center gap-1",
                  PRIORITY_COLORS[issue.priority]
                )}
              >
                <span className={cn("inline-block w-1.5 h-1.5 rounded-full", STATUS_DOT[issue.status])} />
                {issue.title}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
