'use client';

import { useCallback, useRef, useEffect } from 'react';
import { useBidAnalyzerStore } from '@/store/bid-analyzer-store';
import type { TextSelection, DocumentPosition } from '@/types/bid-analyzer';
import { v4 as uuid } from 'uuid';

export function DocumentViewer() {
  const { documentModel, editMode, setPendingSelection, isParsingDocument } = useBidAnalyzerStore();
  const wrapperRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  // HTML 삽입
  useEffect(() => {
    if (contentRef.current && documentModel?.renderedHtml) {
      contentRef.current.innerHTML = documentModel.renderedHtml;
    }
  }, [documentModel?.renderedHtml]);

  // 브라우저 기본 텍스트 선택(Selection API) 기반
  useEffect(() => {
    const content = contentRef.current;
    if (!content) return;

    const clearHighlights = () => {
      content.querySelectorAll('.selected').forEach((el) => el.classList.remove('selected'));
      content.querySelectorAll('.drag-selected').forEach((el) => el.classList.remove('drag-selected'));
    };

    const onMouseUp = () => {
      if (!editMode) return;

      const sel = window.getSelection();
      if (!sel || sel.isCollapsed) {
        // 클릭만 한 경우 — 클릭한 요소가 data-pos-id를 가지고 있으면 단일 선택
        return;
      }

      const range = sel.getRangeAt(0);
      if (!content.contains(range.commonAncestorContainer)) return;

      // 선택 범위 내의 모든 [data-pos-id] 요소 수집
      const allSpans = Array.from(content.querySelectorAll('[data-pos-id]'));
      const selectedSpans: HTMLElement[] = [];

      for (const span of allSpans) {
        if (sel.containsNode(span, true)) {
          selectedSpans.push(span as HTMLElement);
        }
      }

      if (selectedSpans.length === 0) return;

      // 이전 하이라이트 해제
      clearHighlights();

      // 선택된 요소들 하이라이트
      const texts: string[] = [];
      for (const span of selectedSpans) {
        span.classList.add('drag-selected');
        texts.push(span.textContent || '');
      }

      // Position 생성
      const firstPosId = selectedSpans[0].getAttribute('data-pos-id');
      const lastPosId = selectedSpans[selectedSpans.length - 1].getAttribute('data-pos-id');
      if (!firstPosId || !documentModel) return;

      const position = documentModel.positionMap.get(firstPosId);
      if (!position) return;

      const rangePosition: DocumentPosition = {
        ...position,
        charLength: texts.join('').length,
        domElementId: selectedSpans.length === 1
          ? firstPosId
          : `${firstPosId}~${lastPosId || firstPosId}`,
      };

      const selection: TextSelection = {
        id: uuid(),
        text: texts.join('').trim() || '(빈 영역)',
        position: rangePosition,
      };

      setPendingSelection(selection);

      // 브라우저 선택 해제 (하이라이트는 유지)
      sel.removeAllRanges();
    };

    // 클릭 (단일 요소 선택)
    const onClick = (e: MouseEvent) => {
      if (!editMode) return;

      // 텍스트 드래그 중이면 무시 (mouseup에서 처리)
      const sel = window.getSelection();
      if (sel && !sel.isCollapsed) return;

      const target = (e.target as HTMLElement).closest('[data-pos-id]') as HTMLElement | null;
      if (!target || !documentModel) return;

      const posId = target.getAttribute('data-pos-id');
      if (!posId) return;
      const pos = documentModel.positionMap.get(posId);
      if (!pos) return;

      clearHighlights();
      target.classList.add('selected');

      setPendingSelection({
        id: uuid(),
        text: target.textContent?.trim() || '(빈 셀)',
        position: pos,
      });
    };

    content.addEventListener('mouseup', onMouseUp);
    content.addEventListener('click', onClick);

    return () => {
      content.removeEventListener('mouseup', onMouseUp);
      content.removeEventListener('click', onClick);
    };
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
      ref={wrapperRef}
      className={`border rounded-lg overflow-auto bg-white shadow-inner ${editMode ? 'edit-mode ring-2 ring-blue-400' : ''}`}
      style={{ maxHeight: 'calc(100vh - 300px)' }}
    >
      <div ref={contentRef} />
    </div>
  );
}
