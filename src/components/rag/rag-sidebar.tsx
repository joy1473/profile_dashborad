"use client";

import { useCallback, useRef, useState } from "react";
import { useRagStore } from "@/store/rag-store";
import { supabase } from "@/lib/supabase";
import { FileText, Upload, Plus, Globe, Download, RotateCcw, Search, Loader2 } from "lucide-react";

interface RagSidebarProps {
  onRefresh: () => void;
}

export function RagSidebar({ onRefresh }: RagSidebarProps) {
  const {
    documents, activeDocumentId, setActiveDocument,
    versions, references, sections,
    setReferences,
  } = useRagStore();

  const htmlInputRef = useRef<HTMLInputElement>(null);
  const refInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [urlInput, setUrlInput] = useState("");

  // HTML 문서 업로드
  const handleHtmlUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    const htmlFile = Array.from(files).find((f) => f.name.endsWith(".html") || f.name.endsWith(".htm"));
    if (!htmlFile) { alert("HTML 파일이 필요합니다."); setUploading(false); return; }

    const htmlContent = await htmlFile.text();
    const titleMatch = htmlContent.match(/<title>(.*?)<\/title>/i);
    const name = titleMatch?.[1] || htmlFile.name.replace(/\.html?$/, "");

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setUploading(false); return; }

    // 문서 생성
    const { data: doc, error: docErr } = await supabase.from("rag_documents").insert({
      owner_id: user.id,
      name,
      description: "",
    }).select().single();

    if (docErr || !doc) { alert("문서 생성 실패"); setUploading(false); return; }

    // v0.1 버전 생성
    const { data: ver } = await supabase.from("rag_versions").insert({
      document_id: doc.id,
      version_label: "v0.1",
      version_number: 0.1,
      html_content: htmlContent,
      html_size_bytes: new Blob([htmlContent]).size,
      created_by: user.id,
      created_via: "initial",
    }).select().single();

    if (ver) {
      // 섹션 파싱 (h2 기준)
      const parser = new DOMParser();
      const parsed = parser.parseFromString(htmlContent, "text/html");
      const headings = parsed.querySelectorAll("h1, h2, h3");
      const sectionInserts = Array.from(headings).map((h, i) => ({
        document_id: doc.id,
        version_id: ver.id,
        section_index: i,
        element_id: h.id || null,
        element_tag: h.tagName.toLowerCase(),
        heading_text: h.textContent?.trim().slice(0, 100) || null,
        char_count: (h.parentElement?.textContent?.length ?? 0),
        html_fragment: h.outerHTML,
      }));

      if (sectionInserts.length > 0) {
        await supabase.from("rag_sections").insert(sectionInserts);
      }

      await supabase.from("rag_documents").update({
        current_version_id: ver.id,
        section_count: sectionInserts.length,
      }).eq("id", doc.id);
    }

    onRefresh();
    setActiveDocument(doc.id);
    setUploading(false);
    if (htmlInputRef.current) htmlInputRef.current.value = "";
  }, [onRefresh, setActiveDocument]);

  // 참조 파일 업로드
  const handleRefUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !activeDocumentId) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    for (const file of Array.from(files)) {
      const ext = file.name.split(".").pop()?.toLowerCase() || "";
      const text = ["txt", "html", "htm", "csv", "xml"].includes(ext) ? await file.text() : null;

      await supabase.from("rag_reference_files").insert({
        document_id: activeDocumentId,
        uploaded_by: user.id,
        source_type: "file",
        filename: file.name,
        file_type: ext,
        file_size_bytes: file.size,
        extracted_text: text,
        extraction_status: text ? "ready" : "pending",
      });
    }

    const { data: refs } = await supabase.from("rag_reference_files").select("*").eq("document_id", activeDocumentId);
    if (refs) setReferences(refs);
    if (refInputRef.current) refInputRef.current.value = "";
  }, [activeDocumentId, setReferences]);

  // URL 크롤링
  const handleUrlAdd = useCallback(async () => {
    if (!urlInput.trim() || !activeDocumentId) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.from("rag_reference_files").insert({
      document_id: activeDocumentId,
      uploaded_by: user.id,
      source_type: "url",
      filename: new URL(urlInput).hostname,
      file_type: "url",
      source_url: urlInput,
      extraction_status: "pending",
    });

    setUrlInput("");
    const { data: refs } = await supabase.from("rag_reference_files").select("*").eq("document_id", activeDocumentId);
    if (refs) setReferences(refs);
  }, [urlInput, activeDocumentId, setReferences]);

  // 버전 다운로드
  const downloadVersion = useCallback((ver: { version_label: string; html_content: string }) => {
    const blob = new Blob([ver.html_content], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${documents.find((d) => d.id === activeDocumentId)?.name ?? "document"}_${ver.version_label}.html`;
    a.click();
    URL.revokeObjectURL(url);
  }, [documents, activeDocumentId]);

  const completedSections = sections.filter((s) => (s.char_count ?? 0) > 50).length;
  const totalSections = sections.length;
  const progressPct = totalSections > 0 ? Math.round((completedSections / totalSections) * 100) : 0;

  return (
    <div className="w-[280px] bg-zinc-900 border-r border-zinc-800 flex flex-col overflow-hidden shrink-0">
      {/* Header */}
      <div className="p-3 border-b border-zinc-800 flex items-center justify-between">
        <span className="text-sm font-bold text-zinc-200">📂 문서RAG</span>
        <span className="text-[10px] bg-blue-600 text-white px-2 py-0.5 rounded-full font-bold">Beta</span>
      </div>

      {/* 원본 문서 */}
      <div className="p-3 border-b border-zinc-800">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] text-zinc-500 font-bold uppercase">원본 문서</span>
          <button onClick={() => htmlInputRef.current?.click()} className="text-[10px] bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded hover:bg-zinc-700">
            {uploading ? <Loader2 size={10} className="animate-spin" /> : <><Plus size={10} className="inline" /> 새 문서</>}
          </button>
        </div>
        <input ref={htmlInputRef} type="file" accept=".html,.htm,.css,.png,.jpg,.gif" multiple onChange={handleHtmlUpload} className="hidden" />

        <div className="space-y-1">
          {documents.map((doc) => (
            <button
              key={doc.id}
              onClick={() => setActiveDocument(doc.id)}
              className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-left text-xs ${activeDocumentId === doc.id ? "bg-blue-600 text-white" : "text-zinc-400 hover:bg-zinc-800"}`}
            >
              <FileText size={12} />
              <span className="truncate flex-1">{doc.name}</span>
            </button>
          ))}
          {documents.length === 0 && (
            <div className="text-center text-zinc-600 text-[10px] py-4">
              HTML 파일을 업로드하세요
            </div>
          )}
        </div>
      </div>

      {/* 참조 자료 */}
      <div className="p-3 border-b border-zinc-800">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] text-zinc-500 font-bold uppercase">참조 자료</span>
          <button onClick={() => refInputRef.current?.click()} disabled={!activeDocumentId} className="text-[10px] bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded hover:bg-zinc-700 disabled:opacity-30">
            <Upload size={10} className="inline" /> 추가
          </button>
        </div>
        <input ref={refInputRef} type="file" accept=".hwp,.hwpx,.pdf,.doc,.docx,.xls,.xlsx,.pptx,.txt,.csv,.html" multiple onChange={handleRefUpload} className="hidden" />

        {/* URL 입력 */}
        {activeDocumentId && (
          <div className="flex gap-1 mb-2">
            <input
              type="text"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              placeholder="URL 입력..."
              className="flex-1 bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-[10px] text-zinc-300 outline-none"
              onKeyDown={(e) => e.key === "Enter" && handleUrlAdd()}
            />
            <button onClick={handleUrlAdd} className="bg-zinc-800 border border-zinc-700 rounded px-2 text-zinc-400 hover:bg-zinc-700">
              <Globe size={10} />
            </button>
          </div>
        )}

        <div className="space-y-1 max-h-32 overflow-y-auto">
          {references.map((ref) => (
            <div key={ref.id} className="flex items-center gap-2 px-2 py-1 rounded text-[10px] text-zinc-400">
              <span>{ref.source_type === "url" ? "🌐" : "📋"}</span>
              <span className="truncate flex-1">{ref.filename ?? ref.source_url}</span>
              <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold ${
                ref.extraction_status === "ready" ? "bg-green-900 text-green-300" :
                ref.extraction_status === "pending" || ref.extraction_status === "processing" ? "bg-yellow-900 text-yellow-300" :
                "bg-red-900 text-red-300"
              }`}>
                {ref.extraction_status === "ready" ? "완료" : ref.extraction_status === "pending" ? "대기" : ref.extraction_status === "processing" ? "분석중" : "오류"}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* 버전 이력 */}
      <div className="flex-1 overflow-y-auto p-3 border-b border-zinc-800">
        <span className="text-[10px] text-zinc-500 font-bold uppercase">버전 이력</span>
        <div className="mt-2 space-y-1">
          {versions.map((ver, i) => (
            <div key={ver.id} className={`flex items-center gap-1.5 px-2 py-1 rounded text-[10px] ${i === 0 ? "text-blue-400 font-bold" : "text-zinc-500"}`}>
              <span className="min-w-[28px] font-bold">{ver.version_label}</span>
              <span className="flex-1 text-zinc-600">{new Date(ver.created_at).toLocaleString("ko-KR", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })}</span>
              <button onClick={() => downloadVersion(ver)} className="text-zinc-600 hover:text-zinc-300" title="다운로드"><Download size={10} /></button>
              {i > 0 && <button className="text-zinc-600 hover:text-zinc-300" title="비교"><Search size={10} /></button>}
            </div>
          ))}
        </div>
      </div>

      {/* 진행률 */}
      <div className="p-3">
        <div className="flex justify-between text-[10px] text-zinc-500 mb-1">
          <span>섹션 진행률</span>
          <span className="text-blue-400 font-bold">{completedSections}/{totalSections} 완료</span>
        </div>
        <div className="h-1 bg-zinc-800 rounded overflow-hidden">
          <div className="h-full bg-gradient-to-r from-blue-600 to-purple-600 rounded transition-all" style={{ width: `${progressPct}%` }} />
        </div>
      </div>
    </div>
  );
}
