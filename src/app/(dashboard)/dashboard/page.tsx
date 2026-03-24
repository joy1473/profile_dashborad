"use client";

import { useEffect, useState, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { supabase } from "@/lib/supabase";
import { Plus, Video, Clock, CalendarDays, List, Loader2, X, Trash2 } from "lucide-react";
import { EventCalendar } from "@/components/calendar/event-calendar";
import type { CalendarEvent } from "@/components/calendar/event-calendar";

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

  // 수정 모달
  const [editEvent, setEditEvent] = useState<CalendarEvent | null>(null);
  const [saving, setSaving] = useState(false);

  // 새 일정 / 수정 폼
  const [form, setForm] = useState({
    title: "",
    description: "",
    startDate: "",
    startTime: "09:00",
    endDate: "",
    endTime: "10:00",
    allDay: false,
    color: "#3b82f6",
    meetingRoomName: "",
  });

  const resetForm = () => setForm({
    title: "", description: "", startDate: "", startTime: "09:00", endDate: "", endTime: "10:00",
    allDay: false, color: "#3b82f6", meetingRoomName: "",
  });

  const fetchEvents = useCallback(async () => {
    const { data, error } = await supabase
      .from("events")
      .select("*")
      .order("start_at", { ascending: true });
    if (error) console.error("[EVENTS]", error.message);
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

  function buildTimestamp(date: string, time: string): string {
    return new Date(`${date}T${time}`).toISOString();
  }

  const createEvent = async () => {
    if (!form.title.trim() || !form.startDate || !form.endDate || !userId) return;
    setSaving(true);

    const startAt = buildTimestamp(form.startDate, form.allDay ? "00:00" : form.startTime);
    const endAt = buildTimestamp(form.endDate, form.allDay ? "23:59" : form.endTime);

    const { error } = await supabase.from("events").insert({
      title: form.title.trim(),
      description: form.description.trim(),
      start_at: startAt,
      end_at: endAt,
      all_day: form.allDay,
      color: form.color,
      meeting_room_name: form.meetingRoomName || null,
      created_by: userId,
      created_by_name: userName,
    });

    if (!error) {
      await createNotificationForAll(
        `새 일정: ${form.title.trim()}`,
        `${userName}님이 일정을 등록했습니다. ${formatDateTime(startAt)}`,
        form.meetingRoomName ? `/settings?join=${form.meetingRoomName}` : "/dashboard"
      );
      resetForm();
      setShowCreate(false);
      fetchEvents();
    }
    setSaving(false);
  };

  const updateEvent = async () => {
    if (!editEvent || !form.title.trim() || !form.startDate || !form.endDate) return;
    setSaving(true);

    const startAt = buildTimestamp(form.startDate, form.allDay ? "00:00" : form.startTime);
    const endAt = buildTimestamp(form.endDate, form.allDay ? "23:59" : form.endTime);

    const { error } = await supabase.from("events").update({
      title: form.title.trim(),
      description: form.description.trim(),
      start_at: startAt,
      end_at: endAt,
      all_day: form.allDay,
      color: form.color,
      meeting_room_name: form.meetingRoomName || null,
    }).eq("id", editEvent.id);

    if (error) { alert(`일정 수정 실패: ${error.message}`); setSaving(false); return; }

    setEditEvent(null);
    resetForm();
    fetchEvents();
    setSaving(false);
  };

  const deleteEvent = async (id: string) => {
    if (!window.confirm("일정을 삭제하시겠습니까?")) return;
    const { error } = await supabase.from("events").delete().eq("id", id);
    if (error) { alert(`삭제 실패: ${error.message}`); return; }
    setEditEvent(null);
    resetForm();
    setEvents((prev) => prev.filter((e) => e.id !== id));
  };

  const openEditModal = (ev: CalendarEvent) => {
    const start = new Date(ev.start_at);
    const end = new Date(ev.end_at);
    setForm({
      title: ev.title,
      description: ev.description || "",
      startDate: toDateStr(start),
      startTime: toTimeStr(start),
      endDate: toDateStr(end),
      endTime: toTimeStr(end),
      allDay: ev.all_day,
      color: ev.color,
      meetingRoomName: ev.meeting_room_name || "",
    });
    setEditEvent(ev);
  };

  // 오늘 & 이번주 일정
  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const weekEnd = new Date(now);
  weekEnd.setDate(weekEnd.getDate() + 7);

  const todayEvents = events.filter((e) => {
    const d = new Date(e.start_at);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}` === todayStr;
  });
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
            onClick={() => { resetForm(); setShowCreate(true); setEditEvent(null); }}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            <Plus size={16} /> 새 일정
          </button>
        </div>
      </div>

      {/* 일정 생성/수정 폼 */}
      {(showCreate || editEvent) && (
        <Card className="mb-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
              {editEvent ? "일정 수정" : "새 일정 만들기"}
            </h3>
            <button onClick={() => { setShowCreate(false); setEditEvent(null); resetForm(); }} className="p-1 text-zinc-400 hover:text-zinc-600">
              <X size={18} />
            </button>
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
              <label className="mb-1 block text-xs text-zinc-500">시작일</label>
              <input
                type="date"
                value={form.startDate}
                onChange={(e) => setForm({ ...form, startDate: e.target.value, endDate: form.endDate || e.target.value })}
                className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-blue-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-zinc-500">종료일</label>
              <input
                type="date"
                value={form.endDate}
                onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-blue-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
              />
            </div>
            {!form.allDay && (
              <>
                <div>
                  <label className="mb-1 block text-xs text-zinc-500">시작 시간</label>
                  <input
                    type="time"
                    value={form.startTime}
                    onChange={(e) => setForm({ ...form, startTime: e.target.value })}
                    className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-blue-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-zinc-500">종료 시간</label>
                  <input
                    type="time"
                    value={form.endTime}
                    onChange={(e) => setForm({ ...form, endTime: e.target.value })}
                    className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-blue-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                  />
                </div>
              </>
            )}
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
            {editEvent && editEvent.created_by === userId && (
              <button
                onClick={() => deleteEvent(editEvent.id)}
                className="flex items-center gap-1 rounded-lg border border-red-200 px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/20"
              >
                <Trash2 size={14} /> 삭제
              </button>
            )}
            <button
              onClick={editEvent ? updateEvent : createEvent}
              disabled={!form.title.trim() || !form.startDate || !form.endDate || saving}
              className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? <><Loader2 size={14} className="animate-spin" /> 저장 중...</> : editEvent ? "수정" : "만들기"}
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
          <div>
            {viewMode === "calendar" ? (
              <Card>
                <EventCalendar events={events} onEventClick={openEditModal} />
              </Card>
            ) : (
              <Card>
                <h3 className="mb-3 text-sm font-semibold text-zinc-500">전체 일정</h3>
                {events.length === 0 ? (
                  <p className="py-8 text-center text-sm text-zinc-400">등록된 일정이 없습니다</p>
                ) : (
                  <div className="space-y-2">
                    {events.map((ev) => (
                      <EventListItem key={ev.id} event={ev} userId={userId} onClick={() => openEditModal(ev)} />
                    ))}
                  </div>
                )}
              </Card>
            )}
          </div>

          {/* 사이드바 */}
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
                    <MiniEventItem key={ev.id} event={ev} onClick={() => openEditModal(ev)} />
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
                    <MiniEventItem key={ev.id} event={ev} onClick={() => openEditModal(ev)} />
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

function EventListItem({ event, userId, onClick }: { event: CalendarEvent; userId: string | null; onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex w-full items-center gap-3 rounded-lg border border-zinc-100 p-3 text-left hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-800/50">
      <div className="h-10 w-1 rounded-full" style={{ backgroundColor: event.color }} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50 truncate">{event.title}</p>
          {event.meeting_room_name && (
            <span className="flex items-center gap-1 rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-medium text-blue-700 dark:bg-blue-900 dark:text-blue-300">
              <Video size={10} /> 회의
            </span>
          )}
        </div>
        <p className="text-xs text-zinc-500">
          {formatDateTime(event.start_at)} ~ {formatDateTime(event.end_at)}
        </p>
        {event.description && <p className="mt-1 text-xs text-zinc-400 truncate">{event.description}</p>}
      </div>
    </button>
  );
}

function MiniEventItem({ event, onClick }: { event: CalendarEvent; onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex w-full items-center gap-2 rounded p-1 text-left hover:bg-zinc-50 dark:hover:bg-zinc-800">
      <div className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: event.color }} />
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-zinc-700 dark:text-zinc-300 truncate">{event.title}</p>
        <p className="text-[10px] text-zinc-400">{formatTime(event.start_at)}</p>
      </div>
      {event.meeting_room_name && (
        <Video size={12} className="text-blue-500 shrink-0" />
      )}
    </button>
  );
}

function formatDateTime(dt: string): string {
  return new Date(dt).toLocaleString("ko-KR", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

function formatTime(dt: string): string {
  return new Date(dt).toLocaleString("ko-KR", { hour: "2-digit", minute: "2-digit" });
}

function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function toTimeStr(d: Date): string {
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

async function createNotificationForAll(title: string, body: string, link: string) {
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
