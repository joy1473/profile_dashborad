"use client";

import { useRef, useCallback } from "react";
import { useRagStore } from "@/store/rag-store";
import { FileText, Printer, Save, Eye, Search, Edit3 } from "lucide-react";
import { supabase } from "@/lib/supabase";

export function RagPreview() {
  const {
    currentHtml, activeDocumentId, versions, viewMode, setViewMode,
    pushUndo, updateHtml, setVersions, setActiveDocument,
  } = useRagStore();
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // 인쇄
  const handlePrint = useCallback(() => {
    iframeRef.current?.contentWindow?.print();
  }, []);

  // 버전 저장
  const handleSaveVersion = useCallback(async () => {
    if (!activeDocumentId || !currentHtml) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const latestVersion = versions[0];
    const nextNum = latestVersion ? Math.round((latestVersion.version_number + 0.1) * 10) / 10 : 0.1;
    const label = `v${nextNum.toFixed(1)}`;

    const { data: ver } = await supabase.from("rag_versions").insert({
      document_id: activeDocumentId,
      version_label: label,
      version_number: nextNum,
      html_content: currentHtml,
      html_size_bytes: new Blob([currentHtml]).size,
      created_by: user.id,
      created_via: "manual",
    }).select().single();

    if (ver) {
      await supabase.from("rag_documents").update({ current_version_id: ver.id }).eq("id", activeDocumentId);
      const { data: allVersions } = await supabase.from("rag_versions").select("*").eq("document_id", activeDocumentId).order("version_number", { ascending: false });
      if (allVersions) setVersions(allVersions);
    }
  }, [activeDocumentId, currentHtml, versions, setVersions]);

  if (!currentHtml) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-zinc-50 dark:bg-zinc-950 text-zinc-600 gap-3">
        <FileText size={48} className="opacity-30" />
        <p className="text-sm font-bold text-zinc-500">문서를 선택하거나 업로드하세요</p>
        <p className="text-xs text-center max-w-[300px]">
          좌측 패널에서 HTML 파일을 업로드하면<br/>
          여기에 미리보기가 표시됩니다
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-zinc-50 dark:bg-zinc-950 overflow-hidden">
      {/* 툴바 */}
      <div className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 shrink-0">
        <button onClick={() => setViewMode("edit")} className={`flex items-center gap-1 px-3 py-1 rounded text-xs font-bold ${viewMode === "edit" ? "bg-blue-600 text-white" : "text-zinc-400"}`}>
          <Edit3 size={12} /> 편집
        </button>
        <button onClick={() => setViewMode("diff")} className={`flex items-center gap-1 px-3 py-1 rounded text-xs font-bold ${viewMode === "diff" ? "bg-blue-600 text-white" : "text-zinc-400"}`}>
          <Search size={12} /> 비교
        </button>
        <button onClick={() => setViewMode("preview")} className={`flex items-center gap-1 px-3 py-1 rounded text-xs font-bold ${viewMode === "preview" ? "bg-blue-600 text-white" : "text-zinc-400"}`}>
          <Eye size={12} /> 미리보기
        </button>
        <div className="flex-1" />
        <button onClick={handlePrint} className="flex items-center gap-1 px-3 py-1 border border-zinc-300 dark:border-zinc-700 rounded text-xs text-zinc-400 hover:bg-zinc-800">
          <Printer size={12} /> 인쇄
        </button>
        <button onClick={handleSaveVersion} className="flex items-center gap-1 px-3 py-1 bg-blue-600 text-white rounded text-xs font-bold hover:bg-blue-700">
          <Save size={12} /> 버전 저장
        </button>
      </div>

      {/* 미리보기 iframe */}
      <div className="flex-1 m-3 rounded-lg overflow-hidden bg-white">
        <iframe
          ref={iframeRef}
          srcDoc={currentHtml}
          className="w-full h-full border-0"
          sandbox="allow-same-origin"
          title="문서 미리보기"
        />
      </div>
    </div>
  );
}
