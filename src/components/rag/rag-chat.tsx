"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRagStore } from "@/store/rag-store";
import { supabase } from "@/lib/supabase";
import { Send, Target, Loader2 } from "lucide-react";

export function RagChat() {
  const {
    activeDocumentId, chatMessages, appendMessage, isStreaming, streamingContent, setStreaming,
    selectedSectionId, sections, references, selectedReferenceIds, toggleReference,
    sessionId, setSessionId, setChatMessages, currentHtml, pushUndo, updateHtml, versions, setVersions,
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

  // JSON 교체 지시 추출
  const extractJsonReplacements = (content: string): { find: string; replace: string }[] | null => {
    const match = content.match(/```json\s*([\s\S]*?)```/);
    if (!match) return null;
    try {
      const parsed = JSON.parse(match[1].trim());
      if (Array.isArray(parsed) && parsed.every((r: any) => r.find && r.replace !== undefined)) return parsed;
    } catch { /* invalid JSON */ }
    return null;
  };

  // HTML 코드블록 추출 (새 섹션 작성용)
  const extractHtmlBlock = (content: string): string | null => {
    const match = content.match(/```html\s*([\s\S]*?)```/);
    return match ? match[1].trim() : null;
  };

  // 교체 가능한 블록이 있는지 확인
  const hasApplyableContent = (content: string): boolean => {
    return !!extractJsonReplacements(content) || !!extractHtmlBlock(content);
  };

  // AI 응답을 문서에 적용
  const applyToDocument = useCallback(async (content: string) => {
    if (!currentHtml || !activeDocumentId) return;
    pushUndo(currentHtml);

    let updatedHtml = currentHtml;
    let changeCount = 0;

    // 1. JSON 교체 지시 적용 (우선)
    const replacements = extractJsonReplacements(content);
    if (replacements) {
      for (const { find, replace } of replacements) {
        if (updatedHtml.includes(find)) {
          updatedHtml = updatedHtml.split(find).join(replace);
          changeCount++;
        }
      }
    }

    // 2. HTML 코드블록 (새 섹션 삽입용)
    if (changeCount === 0) {
      const htmlBlock = extractHtmlBlock(content);
      if (htmlBlock) {
        const isFullDoc = htmlBlock.includes("<html") || htmlBlock.includes("<body");
        if (isFullDoc) {
          updatedHtml = htmlBlock;
          changeCount = 1;
        }
      }
    }

    if (changeCount === 0) {
      alert("적용할 변경사항을 찾지 못했습니다. AI에게 다시 요청해보세요.");
      return;
    }

    updateHtml(updatedHtml);

    // 새 버전 자동 생성
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const latestVer = versions[0];
    const nextNum = latestVer ? Math.round((latestVer.version_number + 0.1) * 10) / 10 : 0.1;

    await supabase.from("rag_versions").insert({
      document_id: activeDocumentId,
      version_label: `v${nextNum.toFixed(1)}`,
      version_number: nextNum,
      html_content: updatedHtml,
      html_size_bytes: new Blob([updatedHtml]).size,
      created_by: user.id,
      created_via: "ai_edit",
    });

    const { data: allVers } = await supabase.from("rag_versions").select("*").eq("document_id", activeDocumentId).order("version_number", { ascending: false });
    if (allVers) setVersions(allVers);

    alert(`문서에 ${changeCount}건 적용 완료! (v${nextNum.toFixed(1)})`);
  }, [currentHtml, activeDocumentId, versions, pushUndo, updateHtml, setVersions]);

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
      // 문서 내용 요약 (토큰 절약을 위해 텍스트만 추출, 최대 8000자)
      let documentText = "";
      if (currentHtml) {
        const tmp = new DOMParser().parseFromString(currentHtml, "text/html");
        documentText = (tmp.body.textContent || "").replace(/\s+/g, " ").trim().slice(0, 8000);
      }

      const res = await fetch("/api/rag/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message,
          documentId: activeDocumentId,
          sessionId,
          documentText,
          currentHtml: currentHtml?.slice(0, 30000) ?? null,
          referenceTexts: refTexts,
          targetSectionHtml: targetSection?.html_fragment ?? null,
          targetSectionHeading: targetSection?.heading_text ?? null,
          documentSections: sections.map((s) => s.heading_text).filter(Boolean),
        }),
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(errText || `HTTP ${res.status}`);
      }

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
        content: `AI 응답 오류: ${err instanceof Error ? err.message : "알 수 없는 오류"}`,
        token_count: 0,
        targeted_section_id: null,
        version_created_id: null,
        created_at: new Date().toISOString(),
      });
    }
  }, [input, activeDocumentId, sessionId, isStreaming, selectedSectionId, sections, references, selectedReferenceIds, appendMessage, setStreaming]);

  const selectedSection = selectedSectionId ? sections.find((s) => s.id === selectedSectionId) : null;

  return (
    <div className="w-[360px] bg-white dark:bg-zinc-900 border-l border-zinc-200 dark:border-zinc-800 flex flex-col overflow-hidden shrink-0">
      {/* Header */}
      <div className="p-3 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
        <span className="text-sm font-bold text-zinc-900 dark:text-zinc-200">💬 AI 어시스턴트</span>
        <span className="text-[10px] text-zinc-500">Claude</span>
      </div>

      {/* 대상 섹션 */}
      {selectedSection && (
        <div className="mx-3 mt-2 px-3 py-1.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-md flex items-center gap-2 text-[10px] text-zinc-400">
          <Target size={10} className="text-blue-400" />
          대상: <span className="bg-purple-600 text-white px-1.5 py-0.5 rounded text-[9px] font-bold">{selectedSection.heading_text}</span>
        </div>
      )}

      {/* 참조 선택 */}
      {references.length > 0 && (
        <div className="px-3 py-2 border-b border-zinc-200 dark:border-zinc-800">
          <div className="text-[10px] text-zinc-500 mb-1">참조 자료 선택:</div>
          <div className="space-y-0.5 max-h-20 overflow-y-auto">
            {references.map((ref) => (
              <label key={ref.id} className="flex items-center gap-1.5 text-[10px] text-zinc-700 dark:text-zinc-400 cursor-pointer">
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
            msg.role === "assistant" ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 rounded-bl-sm" :
            "bg-zinc-50 dark:bg-zinc-950 text-zinc-500 text-center mx-auto border border-zinc-200 dark:border-zinc-800 text-[10px]"
          }`}>
            <div className="whitespace-pre-wrap">{msg.content}</div>
            {msg.role === "assistant" && hasApplyableContent(msg.content) && (
              <button
                onClick={() => applyToDocument(msg.content)}
                className="mt-2 px-3 py-1 bg-green-600 text-white text-[10px] font-bold rounded hover:bg-green-700"
              >
                ✅ 문서에 적용
              </button>
            )}
          </div>
        ))}

        {isStreaming && streamingContent && (
          <div className="max-w-[90%] px-3 py-2 rounded-xl rounded-bl-sm bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 text-xs leading-relaxed">
            <div className="whitespace-pre-wrap">{streamingContent}</div>
            <Loader2 size={12} className="animate-spin mt-1 text-blue-400" />
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* 입력 */}
      <div className="p-3 border-t border-zinc-200 dark:border-zinc-800">
        <div className="flex gap-2">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
            placeholder={activeDocumentId ? "메시지 입력... (Shift+Enter 줄바꿈)" : "문서를 먼저 선택하세요"}
            disabled={!activeDocumentId || isStreaming}
            className="flex-1 bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-lg px-3 py-2 text-xs text-zinc-900 dark:text-zinc-200 outline-none resize-none min-h-[36px] max-h-[100px] disabled:opacity-30 focus:border-blue-600"
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
