'use client';

import { useBidAnalyzerStore } from '@/store/bid-analyzer-store';
import { FileUpload } from './tab-analysis/file-upload';
import { DocumentViewer } from './tab-analysis/document-viewer';
import { KvPairPanel } from './tab-analysis/kv-pair-panel';
import { WritingTab } from './tab-writing/file-list';
import { FileSearch, FileOutput, Edit3, Eye } from 'lucide-react';

export function AnalyzerTabs() {
  const { activeTab, setActiveTab, editMode, toggleEditMode, documentModel } = useBidAnalyzerStore();

  return (
    <div className="h-full flex flex-col">
      {/* Tab header */}
      <div className="flex items-center justify-between border-b bg-white px-4">
        <div className="flex">
          <button
            onClick={() => setActiveTab('analysis')}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'analysis'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <FileSearch className="w-4 h-4" />
            입찰문서 분석
          </button>
          <button
            onClick={() => setActiveTab('writing')}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'writing'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <FileOutput className="w-4 h-4" />
            입찰작성
          </button>
        </div>

        {/* Edit mode toggle (Tab 1 only) */}
        {activeTab === 'analysis' && documentModel && (
          <button
            onClick={toggleEditMode}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              editMode
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {editMode ? <Edit3 className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            {editMode ? '편집 모드 ON' : '편집 모드'}
          </button>
        )}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'analysis' ? (
          <div className="h-full flex">
            {/* Left: Document area */}
            <div className="flex-1 flex flex-col overflow-hidden p-4 space-y-4">
              <FileUpload />
              <div className="flex-1 overflow-hidden">
                <DocumentViewer />
              </div>
            </div>

            {/* Right: KV Panel */}
            <div className="w-80 border-l bg-gray-50 overflow-hidden flex flex-col">
              <KvPairPanel />
            </div>
          </div>
        ) : (
          <div className="p-4 max-w-2xl">
            <WritingTab />
          </div>
        )}
      </div>
    </div>
  );
}
