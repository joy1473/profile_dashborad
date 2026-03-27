"use client";

import { useEffect, useCallback } from "react";
import { useRagStore } from "@/store/rag-store";
import { supabase } from "@/lib/supabase";
import { RagSidebar } from "./rag-sidebar";
import { RagPreview } from "./rag-preview";
import { RagChat } from "./rag-chat";
import type { RagDocument } from "@/types/rag";

export function RagWorkspace() {
  const { setDocuments, activeDocumentId, setActiveDocument, setVersions, setSections, setReferences } = useRagStore();

  // 문서 목록 로드
  const fetchDocuments = useCallback(async () => {
    const { data } = await supabase
      .from("rag_documents")
      .select("*")
      .order("updated_at", { ascending: false });
    if (data) setDocuments(data as RagDocument[]);
  }, [setDocuments]);

  // 문서 선택 시 버전/섹션/참조 로드
  const loadDocument = useCallback(async (docId: string) => {
    const [versionsRes, refsRes] = await Promise.all([
      supabase.from("rag_versions").select("*").eq("document_id", docId).order("version_number", { ascending: false }),
      supabase.from("rag_reference_files").select("*").eq("document_id", docId).order("created_at", { ascending: true }),
    ]);

    const versions = versionsRes.data ?? [];
    setVersions(versions);
    setReferences(refsRes.data ?? []);

    if (versions.length > 0) {
      const latest = versions[0];
      setActiveDocument(docId, latest.id, latest.html_content);

      const { data: sections } = await supabase
        .from("rag_sections")
        .select("*")
        .eq("version_id", latest.id)
        .order("section_index", { ascending: true });
      if (sections) setSections(sections);
    }
  }, [setActiveDocument, setVersions, setSections, setReferences]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  useEffect(() => {
    if (activeDocumentId) loadDocument(activeDocumentId);
  }, [activeDocumentId, loadDocument]);

  return (
    <div className="flex h-[calc(100vh-5rem)] -m-6 overflow-hidden">
      {/* 왼쪽 패널 */}
      <RagSidebar onRefresh={fetchDocuments} />

      {/* 중앙 미리보기 */}
      <RagPreview />

      {/* 우측 채팅 */}
      <RagChat />
    </div>
  );
}
