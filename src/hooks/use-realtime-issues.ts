"use client";

import { useEffect } from "react";
import { supabase } from "@/lib/supabase";
import type { Issue } from "@/types/issue";

type RealtimeEventType = "INSERT" | "UPDATE" | "DELETE";

export interface RealtimeIssueEvent {
  eventType: RealtimeEventType;
  new: Issue | null;
  old: { id: string };
}

type RealtimeIssueCallback = (event: RealtimeIssueEvent) => void;

export function useRealtimeIssues(onEvent: RealtimeIssueCallback) {
  useEffect(() => {
    const channel = supabase
      .channel("issues-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "issues" },
        (payload) => {
          onEvent({
            eventType: payload.eventType as RealtimeEventType,
            new: (payload.new as Issue) ?? null,
            old: payload.old as { id: string },
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [onEvent]);
}

export function getRealtimeToastMessage(event: RealtimeIssueEvent): string {
  switch (event.eventType) {
    case "INSERT":
      return `새 이슈가 생성되었습니다: ${event.new?.title ?? ""}`;
    case "UPDATE":
      return `이슈가 수정되었습니다: ${event.new?.title ?? ""}`;
    case "DELETE":
      return "이슈가 삭제되었습니다";
  }
}
