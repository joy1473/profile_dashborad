'use client';

import { useRef, useEffect } from 'react';
import DOMPurify from 'dompurify';
import { useBidAnalyzerStore } from '@/store/bid-analyzer-store';
import type { TextSelection, DocumentPosition } from '@/types/bid-analyzer';
import { v4 as uuid } from 'uuid';

export function DocumentViewer() {
  const { documentModel, editMode, setPendingSelection, isParsingDocument } = useBidAnalyzerStore();
  const wrapperRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // HTML 삽입
  useEffect(() => {
    if (documentModel?.fileType === 'html') {
      // HTML 파일은 iframe으로 렌더링 (원본 서식 100% 보존)
      return;
    }
    if (contentRef.current && documentModel?.renderedHtml) {
      contentRef.current.innerHTML = DOMPurify.sanitize(documentModel.renderedHtml, { ADD_ATTR: ['data-pos-id'] });
    }
  }, [documentModel?.renderedHtml, documentModel?.fileType]);

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

  // HTML iframe에 편집모드 이벤트 바인딩 (editMode 변경 시 갱신)
  // 주의: 모든 useEffect는 조건부 return 이전에 위치해야 함 (React hooks 규칙)
  useEffect(() => {
    if (!documentModel || documentModel.fileType !== 'html') return;
    const iframeDoc = iframeRef.current?.contentDocument;
    if (!iframeDoc) return;

    // 요소에 고유 ID 부여 (없으면 생성)
    const ensureId = (el: HTMLElement): string => {
      if (!el.id) {
        el.id = 'kv-' + uuid().slice(0, 8);
      }
      return el.id;
    };

    const onMouseUp = () => {
      if (!editMode) return;
      const sel = iframeDoc.getSelection();
      if (!sel || sel.isCollapsed) return;

      const selectedText = sel.toString().trim();

      iframeDoc.querySelectorAll('.selected, .drag-selected').forEach((el) => el.classList.remove('selected', 'drag-selected'));

      const range = sel.getRangeAt(0);
      const container = range.commonAncestorContainer;
      const el = container.nodeType === 3 ? container.parentElement : container as HTMLElement;
      if (!el) return;

      const elId = ensureId(el);
      el.classList.add('drag-selected');

      setPendingSelection({
        id: uuid(),
        text: selectedText || '(빈 영역)',
        position: {
          fileType: 'html',
          sectionIndex: 0,
          paragraphIndex: 0,
          runIndex: 0,
          charOffset: 0,
          charLength: selectedText.length,
          domElementId: elId,
        },
      });
      sel.removeAllRanges();
    };

    const onClick = (e: MouseEvent) => {
      if (!editMode) return;
      const sel = iframeDoc.getSelection();
      if (sel && !sel.isCollapsed) return;

      const target = e.target as HTMLElement;
      const cell = target.closest('td, th') as HTMLElement | null;
      const clickTarget = cell || target;

      const targetId = ensureId(clickTarget);

      iframeDoc.querySelectorAll('.selected, .drag-selected').forEach((el) => el.classList.remove('selected', 'drag-selected'));
      clickTarget.classList.add('selected');

      const text = clickTarget.textContent?.trim() || '';
      // innerHTML을 저장하여 나중에 정확한 위치 교체에 사용
      const innerHtml = clickTarget.innerHTML;

      setPendingSelection({
        id: uuid(),
        text: text || '(빈 칸)',
        position: {
          fileType: 'html',
          sectionIndex: 0,
          paragraphIndex: 0,
          runIndex: 0,
          charOffset: 0,
          charLength: text.length,
          domElementId: targetId,
          cellRef: innerHtml, // 셀의 innerHTML 저장
        },
      });
    };

    iframeDoc.addEventListener('mouseup', onMouseUp);
    iframeDoc.addEventListener('click', onClick);
    return () => {
      iframeDoc.removeEventListener('mouseup', onMouseUp);
      iframeDoc.removeEventListener('click', onClick);
    };
  }, [editMode, documentModel, setPendingSelection]);

  // --- 조건부 early return (모든 useEffect 이후) ---
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

  // HTML 파일은 iframe으로 렌더링
  if (documentModel.fileType === 'html') {
    return (
      <div
        ref={wrapperRef}
        className={`border rounded-lg overflow-hidden bg-white shadow-inner ${editMode ? 'edit-mode ring-2 ring-blue-400' : ''}`}
        style={{ height: 'calc(100vh - 300px)' }}
      >
        <iframe
          ref={iframeRef}
          srcDoc={documentModel.renderedHtml}
          className="w-full h-full border-0"
          sandbox="allow-same-origin allow-scripts"
          title="문서 미리보기"
          onLoad={() => {
            const iframeDoc = iframeRef.current?.contentDocument;
            if (!iframeDoc) return;
            const style = iframeDoc.createElement('style');
            style.textContent = `
              [data-pos-id]:hover { background: rgba(59,130,246,0.1); cursor: pointer; }
              .selected { background: rgba(59,130,246,0.3) !important; outline: 2px solid #2563eb; }
              .drag-selected { background: rgba(34,197,94,0.2) !important; outline: 1px solid #16a34a; }
            `;
            iframeDoc.head.appendChild(style);
          }}
        />
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
