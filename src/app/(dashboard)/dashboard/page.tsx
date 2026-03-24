"use client";

import { useEffect, useState, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { supabase } from "@/lib/supabase";
import { Plus, Video, Clock, CalendarDays, List, Loader2, X, Trash2 } from "lucide-react";
import dynamic from "next/dynamic";

const ScheduleCalendar = dynamic(() => import("@/components/calendar/schedule-calendar"), { ssr: false });

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

interface Meeting {
  id: string;
  title: string;
  room_name: string;
  status: string;
}

export default function DashboardPage() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [viewMode, setViewMode] = useState<"calendar" | "list">("calendar");
  const [userId, setUserId] = useState<string | null>(null);
  const [userName, setUserName] = useState("");

  // 새 일정 폼
  const [form, setForm] = useState({
    title: "",
    description: "",
    start: "",
    end: "",
    allDay: false,
    color: "#3b82f6",
    meetingRoomName: "",
  });

  const fetchEvents = useCallback(async () => {
    const { data } = await supabase
      .from("events")
      .select("*")
      .order("start_at", { ascending: true });
    if (data) setEvents(data);
    setLoading(false);
  }, []);

  const fetchMeetings = useCallback(async () => {
    const { data } = await supabase
      .from("meetings")
      .select("id, title, room_name, status")
      .in("status", ["waiting", "active"])
      .order("created_at", { ascending: false });
    if (data) setMeetings(data);
  }, []);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setUserId(user.id);
        setUserName(user.user_metadata?.full_name ?? user.email ?? "");
      }
    });
    fetchEvents();
    fetchMeetings();
  }, [fetchEvents, fetchMeetings]);

  const createEvent = async () => {
    if (!form.title.trim() || !form.start || !form.end || !userId) return;

    const { error } = await supabase.from("events").insert({
      title: form.title.trim(),
      description: form.description.trim(),
      start_at: new Date(form.start).toISOString(),
      end_at: new Date(form.end).toISOString(),
      all_day: form.allDay,
      color: form.color,
      meeting_room_name: form.meetingRoomName || null,
      created_by: userId,
      created_by_name: userName,
    });

    if (!error) {
      // 알림 생성 (모든 로그인 사용자에게)
      await createNotificationForAll(
        `새 일정: ${form.title.trim()}`,
        `${userName}님이 일정을 등록했습니다. ${formatDateTime(form.start)}`,
        form.meetingRoomName ? `/settings?join=${form.meetingRoomName}` : "/dashboard"
      );

      setForm({ title: "", description: "", start: "", end: "", allDay: false, color: "#3b82f6", meetingRoomName: "" });
      setShowCreate(false);
      fetchEvents();
    }
  };

  const deleteEvent = async (id: string) => {
    await supabase.from("events").delete().eq("id", id);
    setEvents((prev) => prev.filter((e) => e.id !== id));
  };

  const handleEventUpdate = async (eventId: string, start: string, end: string) => {
    await supabase.from("events").update({
      start_at: start,
      end_at: end,
    }).eq("id", eventId);
    fetchEvents();
  };

  // 오늘 & 이번주 일정
  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);
  const weekEnd = new Date(now);
  weekEnd.setDate(weekEnd.getDate() + 7);

  const todayEvents = events.filter((e) => e.start_at.slice(0, 10) === todayStr);
  const weekEvents = events.filter((e) => {
    const d = new Date(e.start_at);
    return d >= now && d <= weekEnd;
  });

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50" data-testid="page-title">일정 관리</h2>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-zinc-200 dark:border-zinc-700">
            <button
              onClick={() => setViewMode("calendar")}
              className={`flex items-center gap-1 px-3 py-1.5 text-xs ${viewMode === "calendar" ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900" : "text-zinc-600 dark:text-zinc-400"} rounded-l-lg`}
            >
              <CalendarDays size={14} /> 캘린더
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`flex items-center gap-1 px-3 py-1.5 text-xs ${viewMode === "list" ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900" : "text-zinc-600 dark:text-zinc-400"} rounded-r-lg`}
            >
              <List size={14} /> 리스트
            </button>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            <Plus size={16} /> 새 일정
          </button>
        </div>
      </div>

      {/* 일정 생성 폼 */}
      {showCreate && (
        <Card className="mb-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">새 일정 만들기</h3>
            <button onClick={() => setShowCreate(false)} className="p-1 text-zinc-400 hover:text-zinc-600"><X size={18} /></button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <input
                type="text"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="일정 제목"
                className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-blue-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-zinc-500">시작</label>
              <input
                type="datetime-local"
                value={form.start}
                onChange={(e) => setForm({ ...form, start: e.target.value })}
                className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-blue-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-zinc-500">종료</label>
              <input
                type="datetime-local"
                value={form.end}
                onChange={(e) => setForm({ ...form, end: e.target.value })}
                className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-blue-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
              />
            </div>
            <div className="sm:col-span-2">
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="설명 (선택)"
                rows={2}
                className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-blue-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-zinc-500">회의 연결 (선택)</label>
              <select
                value={form.meetingRoomName}
                onChange={(e) => setForm({ ...form, meetingRoomName: e.target.value })}
                className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-blue-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
              >
                <option value="">회의 없음</option>
                {meetings.map((m) => (
                  <option key={m.id} value={m.room_name}>{m.title}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs text-zinc-500">색상</label>
              <div className="flex items-center gap-2">
                {["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"].map((c) => (
                  <button
                    key={c}
                    onClick={() => setForm({ ...form, color: c })}
                    className={`h-7 w-7 rounded-full border-2 ${form.color === c ? "border-zinc-900 dark:border-white" : "border-transparent"}`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>
          </div>
          <div className="mt-3 flex items-center gap-3">
            <label className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
              <input type="checkbox" checked={form.allDay} onChange={(e) => setForm({ ...form, allDay: e.target.checked })} />
              종일
            </label>
            <div className="flex-1" />
            <button
              onClick={createEvent}
              disabled={!form.title.trim() || !form.start || !form.end}
              className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              만들기
            </button>
          </div>
        </Card>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="animate-spin text-zinc-400" size={32} />
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
          {/* 캘린더 / 리스트 */}
          <div>
            {viewMode === "calendar" ? (
              <Card className="p-0 overflow-hidden">
                <div className="h-[600px]">
                  <ScheduleCalendar events={events} onEventUpdate={handleEventUpdate} />
                </div>
              </Card>
            ) : (
              <Card>
                <h3 className="mb-3 text-sm font-semibold text-zinc-500">전체 일정</h3>
                {events.length === 0 ? (
                  <p className="py-8 text-center text-sm text-zinc-400">등록된 일정이 없습니다</p>
                ) : (
                  <div className="space-y-2">
                    {events.map((ev) => (
                      <EventItem key={ev.id} event={ev} userId={userId} onDelete={deleteEvent} />
                    ))}
                  </div>
                )}
              </Card>
            )}
          </div>

          {/* 사이드바: 오늘/이번주 일정 */}
          <div className="space-y-4">
            <Card>
              <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                <Clock size={14} /> 오늘 일정
              </h3>
              {todayEvents.length === 0 ? (
                <p className="text-xs text-zinc-400">오늘 일정이 없습니다</p>
              ) : (
                <div className="space-y-2">
                  {todayEvents.map((ev) => (
                    <MiniEventItem key={ev.id} event={ev} />
                  ))}
                </div>
              )}
            </Card>
            <Card>
              <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                <CalendarDays size={14} /> 이번주 일정
              </h3>
              {weekEvents.length === 0 ? (
                <p className="text-xs text-zinc-400">이번주 일정이 없습니다</p>
              ) : (
                <div className="space-y-2">
                  {weekEvents.map((ev) => (
                    <MiniEventItem key={ev.id} event={ev} />
                  ))}
                </div>
              )}
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}

function EventItem({ event, userId, onDelete }: { event: CalendarEvent; userId: string | null; onDelete: (id: string) => void }) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-zinc-100 p-3 dark:border-zinc-800">
      <div className="h-10 w-1 rounded-full" style={{ backgroundColor: event.color }} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50 truncate">{event.title}</p>
          {event.meeting_room_name && (
            <a
              href={`/settings?join=${event.meeting_room_name}`}
              className="flex items-center gap-1 rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-medium text-blue-700 hover:bg-blue-200 dark:bg-blue-900 dark:text-blue-300"
            >
              <Video size={10} /> 회의
            </a>
          )}
        </div>
        <p className="text-xs text-zinc-500">
          {formatDateTime(event.start_at)} ~ {formatDateTime(event.end_at)}
        </p>
        {event.description && <p className="mt-1 text-xs text-zinc-400 truncate">{event.description}</p>}
      </div>
      {event.created_by === userId && (
        <button onClick={() => onDelete(event.id)} className="p-1 text-zinc-400 hover:text-red-500">
          <Trash2 size={14} />
        </button>
      )}
    </div>
  );
}

function MiniEventItem({ event }: { event: CalendarEvent }) {
  return (
    <div className="flex items-center gap-2">
      <div className="h-2 w-2 rounded-full" style={{ backgroundColor: event.color }} />
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-zinc-700 dark:text-zinc-300 truncate">{event.title}</p>
        <p className="text-[10px] text-zinc-400">{formatTime(event.start_at)}</p>
      </div>
      {event.meeting_room_name && (
        <a href={`/settings?join=${event.meeting_room_name}`} className="text-blue-500 hover:text-blue-700">
          <Video size={12} />
        </a>
      )}
    </div>
  );
}

function formatDateTime(dt: string): string {
  return new Date(dt).toLocaleString("ko-KR", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

function formatTime(dt: string): string {
  return new Date(dt).toLocaleString("ko-KR", { hour: "2-digit", minute: "2-digit" });
}

async function createNotificationForAll(title: string, body: string, link: string) {
  // 모든 프로필 사용자에게 알림 생성
  const { data: profiles } = await supabase.from("profiles").select("id");
  if (!profiles) return;
  const notifications = profiles.map((p) => ({
    user_id: p.id,
    title,
    body,
    link,
  }));
  await supabase.from("notifications").insert(notifications);
}
