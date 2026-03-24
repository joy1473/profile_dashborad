"use client";

import { useRef, useState } from "react";
import { JitsiMeeting } from "@jitsi/react-sdk";
import { PhoneOff, Maximize2, Minimize2 } from "lucide-react";

interface MeetingRoomProps {
  roomName: string;
  displayName: string;
  meetingTitle: string;
  onLeave: () => void;
}

export function MeetingRoom({ roomName, displayName, meetingTitle, onLeave }: MeetingRoomProps) {
  const apiRef = useRef<unknown>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  return (
    <div ref={containerRef} className="flex h-[calc(100vh-5rem)] flex-col">
      {/* 상단 바 */}
      <div className="flex items-center justify-between border-b border-zinc-200 bg-white px-4 py-2 dark:border-zinc-800 dark:bg-zinc-950">
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">{meetingTitle}</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={toggleFullscreen}
            className="rounded-lg p-2 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </button>
          <button
            onClick={onLeave}
            className="flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700"
          >
            <PhoneOff size={14} /> 회의 종료
          </button>
        </div>
      </div>

      {/* Jitsi Meet */}
      <div className="flex-1">
        <JitsiMeeting
          domain={process.env.NEXT_PUBLIC_JITSI_DOMAIN ?? "meet.calyx.net"}
          roomName={roomName}
          configOverwrite={{
            startWithAudioMuted: true,
            startWithVideoMuted: false,
            disableModeratorIndicator: true,
            enableEmailInStats: false,
            prejoinPageEnabled: false,
            disableDeepLinking: true,
            lang: "ko",
            lobbyEnabled: false,
            enableLobby: false,
            requireDisplayName: false,
            enableInsecureRoomNameWarning: false,
            enableWelcomePage: false,
          }}
          interfaceConfigOverwrite={{
            DISABLE_JOIN_LEAVE_NOTIFICATIONS: true,
            SHOW_JITSI_WATERMARK: false,
            SHOW_WATERMARK_FOR_GUESTS: false,
          }}
          userInfo={{ displayName, email: "" }}
          onApiReady={(api) => {
            apiRef.current = api;
          }}
          onReadyToClose={onLeave}
          getIFrameRef={(iframe) => {
            iframe.style.height = "100%";
            iframe.style.width = "100%";
          }}
        />
      </div>
    </div>
  );
}
