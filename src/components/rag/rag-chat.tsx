"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRagStore } from "@/store/rag-store";
import { supabase } from "@/lib/supabase";
import { Send, Target, Loader2 } from "lucide-react";

export function RagChat() {
  const {
    activeDocumentId, chatMessages, appendMessage, isStreaming, streamingContent, setStreaming,
    selectedSectionId, sections, references, selectedReferenceIds, toggleReference,
    sessionId, setSessionId, setChatMessages, currentHtml, pushUndo, updateHtml, setVersions,
  } = useRagStore();

  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // 자동 스크롤
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages, streamingContent]);

  // 세션 초기화
  useEffect(() => {
    if (!activeDocumentId) return;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      let { data: session } = await supabase.from("rag_chat_sessions")
        .select("*")
        .eq("document_id", activeDocumentId)
        .eq("user_id", user.id)
        .order("started_at", { ascending: false })
        .limit(1)
        .single();

      if (!session) {
        const { data: newSession } = await supabase.from("rag_chat_sessions").insert({
          document_id: activeDocumentId,
          user_id: user.id,
        }).select().single();
        session = newSession;
      }

      if (session) {
        setSessionId(session.id);
        const { data: msgs } = await supabase.from("rag_chat_messages")
          .select("*")
          .eq("session_id", session.id)
          .order("created_at", { ascending: true })
          .limit(50);
        if (msgs) setChatMessages(msgs);
      }
    })();
  }, [activeDocumentId, setSessionId, setChatMessages]);

  // 메시지 전송
  const handleSend = useCallback(async () => {
    if (!input.trim() || !activeDocumentId || !sessionId || isStreaming) return;
    const message = input.trim();
    setInput("");

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // 사용자 메시지 저장
    const userMsg = {
      id: crypto.randomUUID(),
      session_id: sessionId,
      document_id: activeDocumentId,
      role: "user" as const,
      content: message,
      token_count: 0,
      targeted_section_id: selectedSectionId,
      version_created_id: null,
      created_at: new Date().toISOString(),
    };
    appendMessage(userMsg);
    await supabase.from("rag_chat_messages").insert(userMsg);

    // 참조 텍스트 수집
    const refTexts = references
      .filter((r) => selectedReferenceIds.includes(r.id) && r.extracted_text)
      .map((r) => `[${r.filename ?? r.source_url}]\n${r.extracted_text?.slice(0, 3000)}`)
      .join("\n\n---\n\n");

    // 대상 섹션 HTML
    const targetSection = selectedSectionId ? sections.find((s) => s.id === selectedSectionId) : null;

    // AI 호출 (서버 API)
    setStreaming("", true);

    try {
      const res = await fetch("/api/rag/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message,
          documentId: activeDocumentId,
          sessionId,
          referenceTexts: refTexts,
          targetSectionHtml: targetSection?.html_fragment ?? null,
          targetSectionHeading: targetSection?.heading_text ?? null,
          documentSections: sections.map((s) => s.heading_text).filter(Boolean),
        }),
      });

      if (!res.ok) throw new Error("AI 응답 실패");

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let fullContent = "";

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          fullContent += chunk;
          setStreaming(fullContent, true);
        }
      }

      setStreaming("", false);

      // AI 응답 메시지 저장
      const aiMsg = {
        id: crypto.randomUUID(),
        session_id: sessionId,
        document_id: activeDocumentId,
        role: "assistant" as const,
        content: fullContent,
        token_count: Math.ceil(fullContent.length / 4),
        targeted_section_id: selectedSectionId,
        version_created_id: null,
        created_at: new Date().toISOString(),
      };
      appendMessage(aiMsg);
      await supabase.from("rag_chat_messages").insert(aiMsg);

    } catch (err) {
      setStreaming("", false);
      appendMessage({
        id: crypto.randomUUID(),
        session_id: sessionId,
        document_id: activeDocumentId,
        role: "system" as const,
        content: "AI 응답 오류. 다시 시도해주세요.",
        token_count: 0,
        targeted_section_id: null,
        version_created_id: null,
        created_at: new Date().toISOString(),
      });
    }
  }, [input, activeDocumentId, sessionId, isStreaming, selectedSectionId, sections, references, selectedReferenceIds, appendMessage, setStreaming]);

  const selectedSection = selectedSectionId ? sections.find((s) => s.id === selectedSectionId) : null;

  return (
    <div className="w-[360px] bg-zinc-900 border-l border-zinc-800 flex flex-col overflow-hidden shrink-0">
      {/* Header */}
      <div className="p-3 border-b border-zinc-800 flex items-center justify-between">
        <span className="text-sm font-bold text-zinc-200">💬 AI 어시스턴트</span>
        <span className="text-[10px] text-zinc-500">Claude</span>
      </div>

      {/* 대상 섹션 */}
      {selectedSection && (
        <div className="mx-3 mt-2 px-3 py-1.5 bg-zinc-950 border border-zinc-800 rounded-md flex items-center gap-2 text-[10px] text-zinc-400">
          <Target size={10} className="text-blue-400" />
          대상: <span className="bg-purple-600 text-white px-1.5 py-0.5 rounded text-[9px] font-bold">{selectedSection.heading_text}</span>
        </div>
      )}

      {/* 참조 선택 */}
      {references.length > 0 && (
        <div className="px-3 py-2 border-b border-zinc-800">
          <div className="text-[10px] text-zinc-500 mb-1">참조 자료 선택:</div>
          <div className="space-y-0.5 max-h-20 overflow-y-auto">
            {references.map((ref) => (
              <label key={ref.id} className="flex items-center gap-1.5 text-[10px] text-zinc-400 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedReferenceIds.includes(ref.id)}
                  onChange={() => toggleReference(ref.id)}
                  className="accent-blue-600"
                  disabled={ref.extraction_status !== "ready"}
                />
                {ref.filename ?? ref.source_url}
              </label>
            ))}
          </div>
        </div>
      )}

      {/* 채팅 메시지 */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {!activeDocumentId && (
          <div className="text-center text-zinc-600 text-xs py-8">문서를 선택하면 채팅이 시작됩니다</div>
        )}

        {chatMessages.map((msg) => (
          <div key={msg.id} className={`max-w-[90%] px-3 py-2 rounded-xl text-xs leading-relaxed ${
            msg.role === "user" ? "bg-blue-600 text-white self-end ml-auto rounded-br-sm" :
            msg.role === "assistant" ? "bg-zinc-800 text-zinc-200 rounded-bl-sm" :
            "bg-zinc-950 text-zinc-500 text-center mx-auto border border-zinc-800 text-[10px]"
          }`}>
            <div className="whitespace-pre-wrap">{msg.content}</div>
          </div>
        ))}

        {isStreaming && streamingContent && (
          <div className="max-w-[90%] px-3 py-2 rounded-xl rounded-bl-sm bg-zinc-800 text-zinc-200 text-xs leading-relaxed">
            <div className="whitespace-pre-wrap">{streamingContent}</div>
            <Loader2 size={12} className="animate-spin mt-1 text-blue-400" />
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* 입력 */}
      <div className="p-3 border-t border-zinc-800">
        <div className="flex gap-2">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
            placeholder={activeDocumentId ? "메시지 입력... (Shift+Enter 줄바꿈)" : "문서를 먼저 선택하세요"}
            disabled={!activeDocumentId || isStreaming}
            className="flex-1 bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-zinc-200 outline-none resize-none min-h-[36px] max-h-[100px] disabled:opacity-30 focus:border-blue-600"
            rows={1}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || !activeDocumentId || isStreaming}
            className="w-9 h-9 bg-blue-600 rounded-lg flex items-center justify-center text-white disabled:opacity-30 hover:bg-blue-700 shrink-0"
          >
            {isStreaming ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
          </button>
        </div>
      </div>
    </div>
  );
}
