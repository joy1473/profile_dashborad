'use client';

import { useCallback, useRef, useState } from 'react';
import { useBidAnalyzerStore } from '@/store/bid-analyzer-store';
import type { TextSelection, DocumentPosition } from '@/types/bid-analyzer';
import { v4 as uuid } from 'uuid';

export function DocumentViewer() {
  const { documentModel, editMode, setPendingSelection, isParsingDocument } = useBidAnalyzerStore();
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<HTMLElement | null>(null);

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
    if (!documentModel || !containerRef.current) return null;

    const allSpans = Array.from(containerRef.current.querySelectorAll('.hwpx-run'));
    const startIdx = allSpans.indexOf(startEl);
    const endIdx = allSpans.indexOf(endEl);
    if (startIdx === -1 || endIdx === -1) return null;

    const fromIdx = Math.min(startIdx, endIdx);
    const toIdx = Math.max(startIdx, endIdx);
    const selected = allSpans.slice(fromIdx, toIdx + 1);

    // 이전 drag-selected 해제
    containerRef.current.querySelectorAll('.drag-selected').forEach((el) => {
      el.classList.remove('drag-selected');
    });

    // 범위 내 모든 요소에 drag-selected 클래스 추가
    const texts: string[] = [];
    for (const span of selected) {
      span.classList.add('drag-selected');
      texts.push(span.textContent || '');
    }

    // 첫 번째 요소의 위치를 기준으로
    const firstPosId = selected[0].getAttribute('data-pos-id');
    if (!firstPosId) return null;
    const position = documentModel.positionMap.get(firstPosId);
    if (!position) return null;

    // 범위 위치 정보에 마지막 요소까지 포함
    const lastPosId = selected[selected.length - 1].getAttribute('data-pos-id');
    const lastPos = lastPosId ? documentModel.positionMap.get(lastPosId) : null;

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

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (!editMode) return;
    const target = (e.target as HTMLElement).closest('.hwpx-run') as HTMLElement | null;
    if (!target) return;

    setIsDragging(true);
    dragStartRef.current = target;
  }, [editMode]);

  const handleMouseUp = useCallback((e: React.MouseEvent) => {
    if (!editMode || !isDragging) return;
    setIsDragging(false);

    const target = (e.target as HTMLElement).closest('.hwpx-run') as HTMLElement | null;
    if (!target) {
      dragStartRef.current = null;
      return;
    }

    // 이전 selected 해제
    containerRef.current?.querySelectorAll('.selected').forEach((el) => {
      el.classList.remove('selected');
    });

    let selection: TextSelection | null = null;

    if (dragStartRef.current === target) {
      // 클릭 (같은 요소에서 시작/끝)
      target.classList.add('selected');
      selection = createSelection(target);
    } else if (dragStartRef.current) {
      // 드래그 범위 선택
      selection = collectDragRange(dragStartRef.current, target);
    }

    dragStartRef.current = null;

    if (selection) {
      setPendingSelection(selection);
    }
  }, [editMode, isDragging, createSelection, collectDragRange, setPendingSelection]);

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
      className={`border rounded-lg overflow-auto bg-white shadow-inner select-none ${editMode ? 'edit-mode ring-2 ring-blue-400' : ''}`}
      style={{ maxHeight: 'calc(100vh - 300px)' }}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      dangerouslySetInnerHTML={{ __html: documentModel.renderedHtml }}
    />
  );
}
