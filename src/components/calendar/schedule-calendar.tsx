"use client";

import { useNextCalendarApp, ScheduleXCalendar } from "@schedule-x/react";
import {
  createViewDay,
  createViewWeek,
  createViewMonthGrid,
  createViewMonthAgenda,
} from "@schedule-x/calendar";
import { createEventsServicePlugin } from "@schedule-x/events-service";
import { createDragAndDropPlugin } from "@schedule-x/drag-and-drop";
import "temporal-polyfill/global";
import "@schedule-x/theme-default/dist/index.css";
import { useState, useEffect, useRef } from "react";

interface CalendarEvent {
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

interface ScheduleCalendarProps {
  events: CalendarEvent[];
  onEventUpdate?: (eventId: string, start: string, end: string) => void;
}

function toPlainDate(iso: string): Temporal.PlainDate {
  const d = new Date(iso);
  return Temporal.PlainDate.from({
    year: d.getFullYear(),
    month: d.getMonth() + 1,
    day: d.getDate(),
  });
}

function toZonedDateTime(iso: string): Temporal.ZonedDateTime {
  const d = new Date(iso);
  return Temporal.PlainDateTime.from({
    year: d.getFullYear(),
    month: d.getMonth() + 1,
    day: d.getDate(),
    hour: d.getHours(),
    minute: d.getMinutes(),
  }).toZonedDateTime("Asia/Seoul");
}

function convertEvents(events: CalendarEvent[]) {
  return events.map((e) => ({
    id: e.id,
    title: e.meeting_room_name ? `📹 ${e.title}` : e.title,
    start: e.all_day ? toPlainDate(e.start_at) : toZonedDateTime(e.start_at),
    end: e.all_day ? toPlainDate(e.end_at) : toZonedDateTime(e.end_at),
    description: e.description || undefined,
    calendarId: e.color,
  }));
}

// 색상별 캘린더 정의 (컴포넌트 밖에서 한 번만)
const colorMap: Record<string, [string, string, string]> = {
  "#3b82f6": ["#3b82f6", "#dbeafe", "#1e40af"],
  "#10b981": ["#10b981", "#d1fae5", "#065f46"],
  "#f59e0b": ["#f59e0b", "#fef3c7", "#92400e"],
  "#ef4444": ["#ef4444", "#fee2e2", "#991b1b"],
  "#8b5cf6": ["#8b5cf6", "#ede9fe", "#5b21b6"],
  "#ec4899": ["#ec4899", "#fce7f3", "#9d174d"],
};
const calendars: Record<string, { colorName: string; lightColors: { main: string; container: string; onContainer: string } }> = {};
for (const [hex, [main, container, onContainer]] of Object.entries(colorMap)) {
  calendars[hex] = {
    colorName: hex,
    lightColors: { main, container, onContainer },
  };
}

export default function ScheduleCalendar({ events, onEventUpdate }: ScheduleCalendarProps) {
  const [eventsService] = useState(() => createEventsServicePlugin());
  const prevEventsRef = useRef<string>("");

  const calendar = useNextCalendarApp({
    views: [createViewMonthGrid(), createViewWeek(), createViewDay(), createViewMonthAgenda()],
    events: convertEvents(events),
    plugins: [eventsService, createDragAndDropPlugin()],
    calendars,
    locale: "ko-KR",
    firstDayOfWeek: 7,
    callbacks: {
      onEventUpdate(updatedEvent) {
        if (onEventUpdate) {
          const start = new Date(String(updatedEvent.start)).toISOString();
          const end = new Date(String(updatedEvent.end)).toISOString();
          onEventUpdate(updatedEvent.id as string, start, end);
        }
      },
    },
  });

  // events가 변경될 때만 동기화
  useEffect(() => {
    const key = events.map((e) => e.id + e.start_at).join(",");
    if (key !== prevEventsRef.current && eventsService) {
      prevEventsRef.current = key;
      eventsService.set(convertEvents(events));
    }
  }, [events, eventsService]);

  return <ScheduleXCalendar calendarApp={calendar} />;
}
