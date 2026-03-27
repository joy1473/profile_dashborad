import { create } from "zustand";
import type { RagDocument, RagVersion, RagSection, RagReferenceFile, RagChatMessage } from "@/types/rag";

interface RagStore {
  // Document
  documents: RagDocument[];
  activeDocumentId: string | null;
  activeVersionId: string | null;
  currentHtml: string | null;
  sections: RagSection[];
  setDocuments: (docs: RagDocument[]) => void;
  setActiveDocument: (id: string | null, versionId?: string | null, html?: string | null) => void;
  setSections: (sections: RagSection[]) => void;

  // Editing
  selectedSectionId: string | null;
  selectSection: (id: string | null) => void;
  undoStack: string[];
  pushUndo: (html: string) => void;
  popUndo: () => string | undefined;
  updateHtml: (html: string) => void;

  // Versions
  versions: RagVersion[];
  setVersions: (versions: RagVersion[]) => void;

  // References
  references: RagReferenceFile[];
  selectedReferenceIds: string[];
  setReferences: (refs: RagReferenceFile[]) => void;
  toggleReference: (id: string) => void;

  // Chat
  chatMessages: RagChatMessage[];
  streamingContent: string;
  isStreaming: boolean;
  sessionId: string | null;
  appendMessage: (msg: RagChatMessage) => void;
  setChatMessages: (msgs: RagChatMessage[]) => void;
  setStreaming: (content: string, isStreaming: boolean) => void;
  setSessionId: (id: string | null) => void;

  // UI
  viewMode: "edit" | "diff" | "preview";
  setViewMode: (mode: "edit" | "diff" | "preview") => void;
  uploadProgress: Record<string, number>;
  setUploadProgress: (fileId: string, pct: number) => void;
}

export const useRagStore = create<RagStore>((set, get) => ({
  // Document
  documents: [],
  activeDocumentId: null,
  activeVersionId: null,
  currentHtml: null,
  sections: [],
  setDocuments: (documents) => set({ documents }),
  setActiveDocument: (id, versionId, html) => set({
    activeDocumentId: id,
    activeVersionId: versionId ?? null,
    currentHtml: html ?? null,
    selectedSectionId: null,
    chatMessages: [],
    undoStack: [],
  }),
  setSections: (sections) => set({ sections }),

  // Editing
  selectedSectionId: null,
  selectSection: (id) => set({ selectedSectionId: id }),
  undoStack: [],
  pushUndo: (html) => set((s) => ({ undoStack: [...s.undoStack.slice(-19), html] })),
  popUndo: () => {
    const stack = get().undoStack;
    if (stack.length === 0) return undefined;
    const last = stack[stack.length - 1];
    set({ undoStack: stack.slice(0, -1), currentHtml: last });
    return last;
  },
  updateHtml: (html) => set({ currentHtml: html }),

  // Versions
  versions: [],
  setVersions: (versions) => set({ versions }),

  // References
  references: [],
  selectedReferenceIds: [],
  setReferences: (references) => set({
    references,
    selectedReferenceIds: references.filter((r) => r.extraction_status === "ready").map((r) => r.id),
  }),
  toggleReference: (id) => set((s) => ({
    selectedReferenceIds: s.selectedReferenceIds.includes(id)
      ? s.selectedReferenceIds.filter((rid) => rid !== id)
      : [...s.selectedReferenceIds, id],
  })),

  // Chat
  chatMessages: [],
  streamingContent: "",
  isStreaming: false,
  sessionId: null,
  appendMessage: (msg) => set((s) => ({ chatMessages: [...s.chatMessages, msg] })),
  setChatMessages: (msgs) => set({ chatMessages: msgs }),
  setStreaming: (content, isStreaming) => set({ streamingContent: content, isStreaming }),
  setSessionId: (id) => set({ sessionId: id }),

  // UI
  viewMode: "edit",
  setViewMode: (viewMode) => set({ viewMode }),
  uploadProgress: {},
  setUploadProgress: (fileId, pct) => set((s) => ({
    uploadProgress: { ...s.uploadProgress, [fileId]: pct },
  })),
}));
