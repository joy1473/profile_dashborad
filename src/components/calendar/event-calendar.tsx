"use client";

import { useState, useMemo } from "react";
import { ChevronLeft, ChevronRight, Video } from "lucide-react";
import { cn } from "@/lib/utils";

export interface CalendarEvent {
  id: string;
  title: string;
  description: string;
  start_at: string;
  end_at: string;
  all_day: boolean;
  color: string;
  meeting_room_name: string | null;
  created_by: string;
  created_by_name: string;
}

interface EventCalendarProps {
  events: CalendarEvent[];
  onEventClick: (event: CalendarEvent) => void;
}

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

export function EventCalendar({ events, onEventClick }: EventCalendarProps) {
  const [current, setCurrent] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });

  const { year, month } = current;

  const calendarDays = useMemo(() => {
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const prevDays = new Date(year, month, 0).getDate();

    const days: { date: number; currentMonth: boolean; fullDate: string; key: string }[] = [];

    for (let i = firstDay - 1; i >= 0; i--) {
      const d = prevDays - i;
      const m = month === 0 ? 11 : month - 1;
      const y = month === 0 ? year - 1 : year;
      days.push({ date: d, currentMonth: false, fullDate: `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`, key: `prev-${d}` });
    }

    for (let d = 1; d <= daysInMonth; d++) {
      days.push({
        date: d,
        currentMonth: true,
        fullDate: `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`,
        key: `cur-${d}`,
      });
    }

    const remaining = 42 - days.length;
    for (let d = 1; d <= remaining; d++) {
      const m = month === 11 ? 0 : month + 1;
      const y = month === 11 ? year + 1 : year;
      days.push({ date: d, currentMonth: false, fullDate: `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`, key: `next-${d}` });
    }

    return days;
  }, [year, month]);

  const eventsByDay = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const ev of events) {
      const d = new Date(ev.start_at);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(ev);
    }
    return map;
  }, [events]);

  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

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

  function formatTime(iso: string): string {
    const d = new Date(iso);
    return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  }

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
          const dayEvents = eventsByDay.get(day.fullDate) ?? [];
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
                  day.fullDate === todayStr &&
                    day.currentMonth &&
                    "inline-flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-white"
                )}
              >
                {day.date}
              </div>
              <div className="space-y-0.5">
                {dayEvents.slice(0, 3).map((ev) => (
                  <button
                    key={ev.id}
                    onClick={() => onEventClick(ev)}
                    className="w-full text-left rounded px-1.5 py-0.5 text-[10px] font-medium truncate flex items-center gap-1 hover:opacity-80"
                    style={{ backgroundColor: ev.color + "20", color: ev.color }}
                    title={`${ev.title} (${formatTime(ev.start_at)}~${formatTime(ev.end_at)})`}
                  >
                    {ev.meeting_room_name && <Video size={8} className="shrink-0" />}
                    <span className="truncate">
                      {!ev.all_day && <span className="opacity-70">{formatTime(ev.start_at)} </span>}
                      {ev.title}
                    </span>
                  </button>
                ))}
                {dayEvents.length > 3 && (
                  <span className="text-[10px] text-zinc-400 pl-1">+{dayEvents.length - 3}건</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
