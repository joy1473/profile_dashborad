"use client";

import { useEffect, useState, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { supabase } from "@/lib/supabase";
import { Video, Plus, Users, Copy, ExternalLink, Trash2, Loader2 } from "lucide-react";
import { MeetingRoom } from "@/components/meeting/meeting-room";

interface Meeting {
  id: string;
  title: string;
  room_name: string;
  host_id: string;
  host_name: string;
  status: "waiting" | "active" | "ended";
  participants: string[];
  created_at: string;
  ended_at: string | null;
}

export default function MeetingPage() {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [activeMeeting, setActiveMeeting] = useState<Meeting | null>(null);
  const [userName, setUserName] = useState("사용자");
  const [userId, setUserId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fetchMeetings = useCallback(async () => {
    const { data } = await supabase
      .from("meetings")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(20);
    if (data) setMeetings(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setUserName(user.user_metadata?.full_name ?? user.email ?? "사용자");
        setUserId(user.id);
      }
    });
    fetchMeetings();
  }, [fetchMeetings]);

  const createMeeting = async () => {
    if (!newTitle.trim() || !userId) return;
    setCreating(true);
    const roomName = `meeting-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const { error } = await supabase.from("meetings").insert({
      title: newTitle.trim(),
      room_name: roomName,
      host_id: userId,
      host_name: userName,
      status: "waiting",
    });
    if (!error) {
      setNewTitle("");
      setShowCreate(false);
      await fetchMeetings();
    }
    setCreating(false);
  };

  const deleteMeeting = async (id: string) => {
    await supabase.from("meetings").delete().eq("id", id);
    setMeetings((prev) => prev.filter((m) => m.id !== id));
  };

  const joinMeeting = async (meeting: Meeting) => {
    if (meeting.status === "waiting") {
      await supabase.from("meetings").update({ status: "active" }).eq("id", meeting.id);
    }
    setActiveMeeting({ ...meeting, status: "active" });
  };

  const leaveMeeting = async () => {
    if (activeMeeting) {
      await supabase.from("meetings").update({ status: "ended", ended_at: new Date().toISOString() }).eq("id", activeMeeting.id);
    }
    setActiveMeeting(null);
    fetchMeetings();
  };

  const copyInviteLink = (meeting: Meeting) => {
    const link = `${window.location.origin}/settings?join=${meeting.room_name}`;
    navigator.clipboard.writeText(link);
    setCopiedId(meeting.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const shareKakao = (meeting: Meeting) => {
    const link = `${window.location.origin}/settings?join=${meeting.room_name}`;
    const kakaoKey = process.env.NEXT_PUBLIC_KAKAO_REST_API_KEY;

    if (typeof window !== "undefined" && window.Kakao) {
      if (!window.Kakao.isInitialized() && kakaoKey) {
        window.Kakao.init(kakaoKey);
      }
      window.Kakao.Share.sendDefault({
        objectType: "feed",
        content: {
          title: `회의 초대: ${meeting.title}`,
          description: `${userName}님이 회의에 초대합니다. 참여하려면 클릭하세요.`,
          imageUrl: "https://profile-dashborad.vercel.app/og-image.png",
          link: { mobileWebUrl: link, webUrl: link },
        },
        buttons: [
          { title: "회의 참여", link: { mobileWebUrl: link, webUrl: link } },
        ],
      });
    } else {
      // 카카오 SDK 없으면 링크 복사 폴백
      copyInviteLink(meeting);
      alert("카카오톡 공유가 불가능합니다. 초대 링크가 복사되었습니다.");
    }
  };

  // URL에 join 파라미터가 있으면 자동 참여
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const joinRoom = params.get("join");
    if (joinRoom && meetings.length > 0 && !activeMeeting) {
      const meeting = meetings.find((m) => m.room_name === joinRoom);
      if (meeting && meeting.status !== "ended") {
        joinMeeting(meeting);
        // URL에서 join 파라미터 제거
        window.history.replaceState({}, "", "/settings");
      }
    }
  }, [meetings, activeMeeting]);

  // 회의 진행 중이면 Jitsi 화면 표시
  if (activeMeeting) {
    return (
      <MeetingRoom
        roomName={activeMeeting.room_name}
        displayName={userName}
        meetingTitle={activeMeeting.title}
        onLeave={leaveMeeting}
      />
    );
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50" data-testid="page-title">
          회의
        </h2>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          <Plus size={16} /> 새 회의
        </button>
      </div>

      {/* 회의 생성 */}
      {showCreate && (
        <Card className="mb-6">
          <h3 className="mb-3 text-lg font-semibold text-zinc-900 dark:text-zinc-50">새 회의 만들기</h3>
          <div className="flex gap-3">
            <input
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="회의 제목을 입력하세요"
              className="flex-1 rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-blue-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
              onKeyDown={(e) => e.key === "Enter" && createMeeting()}
            />
            <button
              onClick={createMeeting}
              disabled={creating || !newTitle.trim()}
              className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {creating ? <Loader2 size={16} className="animate-spin" /> : <Video size={16} />}
              만들기
            </button>
            <button
              onClick={() => { setShowCreate(false); setNewTitle(""); }}
              className="rounded-lg border border-zinc-200 px-4 py-2 text-sm text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800"
            >
              취소
            </button>
          </div>
        </Card>
      )}

      {/* 회의 목록 */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="animate-spin text-zinc-400" size={32} />
        </div>
      ) : meetings.length === 0 ? (
        <Card className="py-12 text-center">
          <Video className="mx-auto mb-3 text-zinc-300" size={48} />
          <p className="text-sm text-zinc-500">아직 회의가 없습니다</p>
          <p className="mt-1 text-xs text-zinc-400">새 회의를 만들어 시작하세요</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {meetings.map((meeting) => (
            <Card key={meeting.id} className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-medium text-zinc-900 dark:text-zinc-50">{meeting.title}</h3>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      meeting.status === "active"
                        ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
                        : meeting.status === "waiting"
                        ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300"
                        : "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400"
                    }`}
                  >
                    {meeting.status === "active" ? "진행 중" : meeting.status === "waiting" ? "대기 중" : "종료"}
                  </span>
                </div>
                <div className="mt-1 flex items-center gap-3 text-xs text-zinc-500">
                  <span><Users size={12} className="mr-1 inline" />{meeting.host_name}</span>
                  <span>{new Date(meeting.created_at).toLocaleString("ko-KR")}</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {meeting.status !== "ended" && (
                  <>
                    <button
                      onClick={() => joinMeeting(meeting)}
                      className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700"
                    >
                      <ExternalLink size={12} /> 참여
                    </button>
                    <button
                      onClick={() => copyInviteLink(meeting)}
                      className="flex items-center gap-1.5 rounded-lg border border-zinc-200 px-3 py-1.5 text-xs text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800"
                    >
                      <Copy size={12} /> {copiedId === meeting.id ? "복사됨!" : "링크"}
                    </button>
                    <button
                      onClick={() => shareKakao(meeting)}
                      className="flex items-center gap-1.5 rounded-lg bg-yellow-400 px-3 py-1.5 text-xs font-medium text-yellow-900 hover:bg-yellow-500"
                    >
                      카카오 초대
                    </button>
                  </>
                )}
                {meeting.host_id === userId && (
                  <button
                    onClick={() => deleteMeeting(meeting.id)}
                    className="rounded-lg p-1.5 text-zinc-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// 카카오 SDK 타입
declare global {
  interface Window {
    Kakao?: {
      isInitialized(): boolean;
      init(key: string): void;
      Share: {
        sendDefault(options: Record<string, unknown>): void;
      };
    };
  }
}
