'use client';

import { useCallback, useRef } from 'react';
import { useBidAnalyzerStore } from '@/store/bid-analyzer-store';
import type { TextSelection } from '@/types/bid-analyzer';
import { v4 as uuid } from 'uuid';

export function DocumentViewer() {
  const { documentModel, editMode, setPendingSelection, isParsingDocument } = useBidAnalyzerStore();
  const containerRef = useRef<HTMLDivElement>(null);

  const handleClick = useCallback((e: React.MouseEvent) => {
    if (!editMode || !documentModel) return;

    const target = e.target as HTMLElement;
    const posId = target.getAttribute('data-pos-id');
    if (!posId) return;

    const position = documentModel.positionMap.get(posId);
    if (!position) return;

    // Toggle selection visual
    const isSelected = target.classList.contains('selected');
    if (isSelected) {
      target.classList.remove('selected');
      setPendingSelection(null);
      return;
    }

    // Clear previous selections
    containerRef.current?.querySelectorAll('.selected').forEach((el) => {
      el.classList.remove('selected');
    });

    // Select this element
    target.classList.add('selected');

    const selection: TextSelection = {
      id: uuid(),
      text: target.textContent || '',
      position,
    };
    setPendingSelection(selection);
  }, [editMode, documentModel, setPendingSelection]);

  if (isParsingDocument) {
    return (
      <div className="flex items-center justify-center h-64 bg-gray-50 rounded-lg">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-2" />
          <p className="text-sm text-gray-600">문서 분석 중...</p>
        </div>
      </div>
    );
  }

  if (!documentModel) {
    return (
      <div className="flex items-center justify-center h-64 bg-gray-50 rounded-lg">
        <p className="text-sm text-gray-500">파일을 업로드하면 여기에 문서가 표시됩니다</p>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`border rounded-lg overflow-auto bg-white shadow-inner ${editMode ? 'edit-mode ring-2 ring-blue-400' : ''}`}
      style={{ maxHeight: 'calc(100vh - 300px)' }}
      onClick={handleClick}
      dangerouslySetInnerHTML={{ __html: documentModel.renderedHtml }}
    />
  );
}
