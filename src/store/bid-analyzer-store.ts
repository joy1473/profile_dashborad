import { create } from 'zustand';
import type {
  UploadedFile,
  DocumentModel,
  TextSelection,
  KeyValuePair,
  MappingRow,
} from '@/types/bid-analyzer';

interface BidAnalyzerState {
  // Tab
  activeTab: 'analysis' | 'writing';
  setActiveTab: (tab: 'analysis' | 'writing') => void;

  // Files
  uploadedFiles: UploadedFile[];
  currentFileIndex: number | null;
  addFile: (file: UploadedFile) => void;
  setCurrentFile: (index: number) => void;
  removeFile: (id: string) => void;

  // Document model
  documentModel: DocumentModel | null;
  isParsingDocument: boolean;
  setDocumentModel: (model: DocumentModel | null) => void;
  setParsingDocument: (v: boolean) => void;

  // Selection mode
  editMode: boolean;
  toggleEditMode: () => void;
  pendingSelection: TextSelection | null;
  setPendingSelection: (s: TextSelection | null) => void;

  // Key-Value pairs
  kvPairs: KeyValuePair[];
  addKvPair: (pair: KeyValuePair) => void;
  removeKvPair: (id: string) => void;
  updateKvPair: (id: string, updates: Partial<KeyValuePair>) => void;
  clearKvPairs: () => void;

  // Tab 2 - Writing
  selectedFileForWriting: string | null;
  setSelectedFileForWriting: (id: string | null) => void;
  mappingData: MappingRow[] | null;
  setMappingData: (data: MappingRow[] | null) => void;
  generationStatus: 'idle' | 'generating' | 'done' | 'error';
  setGenerationStatus: (s: 'idle' | 'generating' | 'done' | 'error') => void;
  generatedFileUrl: string | null;
  setGeneratedFileUrl: (url: string | null) => void;
}

export const useBidAnalyzerStore = create<BidAnalyzerState>((set) => ({
  activeTab: 'analysis',
  setActiveTab: (tab) => set({ activeTab: tab }),

  uploadedFiles: [],
  currentFileIndex: null,
  addFile: (file) =>
    set((s) => ({
      uploadedFiles: [...s.uploadedFiles, file],
      currentFileIndex: s.uploadedFiles.length,
    })),
  setCurrentFile: (index) => set({ currentFileIndex: index }),
  removeFile: (id) =>
    set((s) => ({
      uploadedFiles: s.uploadedFiles.filter((f) => f.id !== id),
    })),

  documentModel: null,
  isParsingDocument: false,
  setDocumentModel: (model) => set({ documentModel: model }),
  setParsingDocument: (v) => set({ isParsingDocument: v }),

  editMode: false,
  toggleEditMode: () => set((s) => ({ editMode: !s.editMode })),
  pendingSelection: null,
  setPendingSelection: (s) => set({ pendingSelection: s }),

  kvPairs: [],
  addKvPair: (pair) => set((s) => ({ kvPairs: [...s.kvPairs, pair] })),
  removeKvPair: (id) =>
    set((s) => ({ kvPairs: s.kvPairs.filter((p) => p.id !== id) })),
  updateKvPair: (id, updates) =>
    set((s) => ({
      kvPairs: s.kvPairs.map((p) => (p.id === id ? { ...p, ...updates } : p)),
    })),
  clearKvPairs: () => set({ kvPairs: [] }),

  selectedFileForWriting: null,
  setSelectedFileForWriting: (id) => set({ selectedFileForWriting: id }),
  mappingData: null,
  setMappingData: (data) => set({ mappingData: data }),
  generationStatus: 'idle',
  setGenerationStatus: (s) => set({ generationStatus: s }),
  generatedFileUrl: null,
  setGeneratedFileUrl: (url) => set({ generatedFileUrl: url }),
}));
