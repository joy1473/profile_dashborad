'use client';

import { useCallback, useRef, useEffect, useState } from 'react';
import { useBidAnalyzerStore } from '@/store/bid-analyzer-store';
import type { TextSelection, DocumentPosition } from '@/types/bid-analyzer';
import { v4 as uuid } from 'uuid';

export function DocumentViewer() {
  const { documentModel, editMode, setPendingSelection, isParsingDocument } = useBidAnalyzerStore();
  const wrapperRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const dragStartRef = useRef<HTMLElement | null>(null);

  // HTML이 변경될 때 contentRef에 직접 삽입
  useEffect(() => {
    if (contentRef.current && documentModel?.renderedHtml) {
      contentRef.current.innerHTML = documentModel.renderedHtml;
    }
  }, [documentModel?.renderedHtml]);

  // 단일 요소에서 선택 생성
  const createSelection = useCallback((el: HTMLElement): TextSelection | null => {
    if (!documentModel) return null;
    const posId = el.getAttribute('data-pos-id');
    if (!posId) return null;
    const position = documentModel.positionMap.get(posId);
    if (!position) return null;
    return {
      id: uuid(),
      text: el.textContent?.trim() || '(빈 셀)',
      position,
    };
  }, [documentModel]);

  // 드래그 범위 내 모든 요소 수집
  const collectDragRange = useCallback((startEl: HTMLElement, endEl: HTMLElement): TextSelection | null => {
    if (!documentModel || !contentRef.current) return null;
    const allSpans = Array.from(contentRef.current.querySelectorAll('[data-pos-id]'));
    const startIdx = allSpans.indexOf(startEl);
    const endIdx = allSpans.indexOf(endEl);
    if (startIdx === -1 || endIdx === -1) return null;

    const fromIdx = Math.min(startIdx, endIdx);
    const toIdx = Math.max(startIdx, endIdx);
    const selected = allSpans.slice(fromIdx, toIdx + 1);

    // 이전 drag-selected 해제
    contentRef.current.querySelectorAll('.drag-selected').forEach((el) => el.classList.remove('drag-selected'));

    const texts: string[] = [];
    for (const span of selected) {
      span.classList.add('drag-selected');
      texts.push(span.textContent || '');
    }

    const firstPosId = selected[0].getAttribute('data-pos-id');
    if (!firstPosId) return null;
    const position = documentModel.positionMap.get(firstPosId);
    if (!position) return null;

    const lastPosId = selected[selected.length - 1].getAttribute('data-pos-id');
    const rangePosition: DocumentPosition = {
      ...position,
      charLength: texts.join('').length,
      domElementId: `${firstPosId}~${lastPosId || firstPosId}`,
    };

    return {
      id: uuid(),
      text: texts.join('').trim() || '(빈 영역)',
      position: rangePosition,
    };
  }, [documentModel]);

  // 네이티브 이벤트 핸들러 — React synthetic event 대신 직접 addEventListener
  useEffect(() => {
    const content = contentRef.current;
    if (!content) return;

    const findTarget = (e: MouseEvent): HTMLElement | null => {
      return (e.target as HTMLElement).closest('[data-pos-id]') as HTMLElement | null;
    };

    const onMouseDown = (e: MouseEvent) => {
      if (!editMode) return;
      const target = findTarget(e);
      if (!target) return;
      e.preventDefault(); // 텍스트 선택 방지
      dragStartRef.current = target;
    };

    const clearAllSelections = () => {
      content.querySelectorAll('.selected').forEach((el) => el.classList.remove('selected'));
      content.querySelectorAll('.drag-selected').forEach((el) => el.classList.remove('drag-selected'));
    };

    const onMouseUp = (e: MouseEvent) => {
      if (!editMode || !dragStartRef.current) return;

      const target = findTarget(e);
      if (!target) {
        dragStartRef.current = null;
        return;
      }

      // 이전 선택 전체 해제 (selected + drag-selected)
      clearAllSelections();

      let selection: TextSelection | null = null;

      if (dragStartRef.current === target) {
        // 클릭 (같은 요소)
        target.classList.add('selected');
        selection = createSelection(target);
      } else {
        // 드래그 범위
        selection = collectDragRange(dragStartRef.current, target);
      }

      dragStartRef.current = null;

      if (selection) {
        setPendingSelection(selection);
      }
    };

    content.addEventListener('mousedown', onMouseDown);
    content.addEventListener('mouseup', onMouseUp);

    return () => {
      content.removeEventListener('mousedown', onMouseDown);
      content.removeEventListener('mouseup', onMouseUp);
    };
  }, [editMode, documentModel, createSelection, collectDragRange, setPendingSelection]);

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
      style={{ maxHeight: 'calc(100vh - 300px)', userSelect: editMode ? 'none' : 'auto' }}
    >
      <div ref={contentRef} />
    </div>
  );
}
