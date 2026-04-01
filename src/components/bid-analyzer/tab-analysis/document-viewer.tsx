'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import DOMPurify from 'dompurify';
import { useBidAnalyzerStore } from '@/store/bid-analyzer-store';
import type { TextSelection, DocumentPosition, DocumentElement } from '@/types/bid-analyzer';
import { v4 as uuid } from 'uuid';
import { ocrExtractKeyValues } from '@/lib/pdf-parser';

export function DocumentViewer() {
  const { documentModel, editMode, setPendingSelection, isParsingDocument, addKvPair } = useBidAnalyzerStore();
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrResults, setOcrResults] = useState<{ page: number; pairs: { key: string; value: string; confidence: number }[] }[]>([]);
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

      // 하이라이트 없음 (원본 보존)

      const range = sel.getRangeAt(0);
      const container = range.commonAncestorContainer;
      const el = container.nodeType === 3 ? container.parentElement : container as HTMLElement;
      if (!el) return;

      const elId = ensureId(el);
      // 하이라이트 없음

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

      // 하이라이트 없음 (원본 보존)
      // 하이라이트 없음

      // innerText는 <br>, 블록 요소의 줄바꿈을 \n으로 반환 (개행 보존)
      const text = clickTarget.innerText?.trim() || '';

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
          cellRef: clickTarget.innerHTML,
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

  // PDF 이미지 페이지 감지 (hooks 전에 계산 — 조건부 return 이전)
  const imageElements = documentModel
    ? (documentModel.sections as DocumentElement[]).filter((el) => el.type === 'image' && el.imageDataUrl)
    : [];
  const hasScanPages = imageElements.length > 0;

  // OCR 실행 (hook은 항상 호출되어야 함)
  const runOcr = useCallback(async () => {
    if (!hasScanPages) return;
    setOcrLoading(true);
    setOcrResults([]);
    const results: { page: number; pairs: { key: string; value: string; confidence: number }[] }[] = [];

    for (const el of imageElements) {
      if (!el.imageDataUrl) continue;
      const pageNum = el.position?.pageNumber ?? 0;
      try {
        const pairs = await ocrExtractKeyValues(el.imageDataUrl, pageNum);
        results.push({ page: pageNum, pairs });
      } catch (err) {
        console.error(`OCR page ${pageNum} failed:`, err);
        results.push({ page: pageNum, pairs: [] });
      }
    }

    setOcrResults(results);
    setOcrLoading(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasScanPages, documentModel]);

  // OCR 결과를 KV 패널에 추가
  const addOcrToKv = useCallback(() => {
    for (const r of ocrResults) {
      for (const pair of r.pairs) {
        if (!pair.key) continue;
        const dummyPos: DocumentPosition = {
          fileType: 'pdf',
          sectionIndex: 0,
          paragraphIndex: 0,
          runIndex: 0,
          charOffset: 0,
          charLength: 0,
          pageNumber: r.page,
          domElementId: `ocr-p${r.page}-${uuid().slice(0, 6)}`,
        };
        addKvPair({
          id: uuid(),
          key: pair.key,
          keyPosition: dummyPos,
          value: pair.value,
          valuePosition: dummyPos,
          contentType: 'text',
          notes: `OCR p${r.page} (${Math.round(pair.confidence * 100)}%)`,
        });
      }
    }
  }, [ocrResults, addKvPair]);

  const totalOcrPairs = ocrResults.reduce((s, r) => s + r.pairs.length, 0);

  // --- 조건부 early return (모든 hooks 이후) ---
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
            style.textContent = `td:hover, th:hover { cursor: pointer; }`;
            style.setAttribute('data-edit-style', 'true');
            iframeDoc.head.appendChild(style);
          }}
        />
      </div>
    );
  }

  return (
    <div>
      {/* OCR 컨트롤 패널 */}
      {hasScanPages && (
        <div className="mb-3 rounded-lg border border-amber-300 bg-amber-50 p-3 dark:border-amber-700 dark:bg-amber-950/30">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-amber-800 dark:text-amber-300">
                &#9888; 스캔 페이지 {imageElements.length}개 감지
              </p>
              <p className="text-[10px] text-amber-600 dark:text-amber-400">
                이미지 기반 페이지에서 AI가 표/양식/텍스트를 자동 추출합니다.
              </p>
            </div>
            <div className="flex gap-2">
              {ocrResults.length > 0 && totalOcrPairs > 0 && (
                <button
                  onClick={addOcrToKv}
                  className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700"
                >
                  KV에 추가 ({totalOcrPairs}쌍)
                </button>
              )}
              <button
                onClick={runOcr}
                disabled={ocrLoading}
                className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
              >
                {ocrLoading ? '추출 중...' : 'AI OCR 추출'}
              </button>
            </div>
          </div>

          {/* OCR 결과 미리보기 */}
          {ocrResults.length > 0 && (
            <div className="mt-3 max-h-48 overflow-y-auto rounded border border-amber-200 bg-white p-2 dark:border-amber-800 dark:bg-zinc-900">
              {ocrResults.map((r) => (
                <div key={r.page} className="mb-2">
                  <p className="text-[10px] font-bold text-zinc-500">Page {r.page} ({r.pairs.length}쌍)</p>
                  {r.pairs.length === 0 && (
                    <p className="text-[10px] text-zinc-400">추출된 항목 없음</p>
                  )}
                  <div className="space-y-0.5">
                    {r.pairs.map((p, i) => (
                      <div key={i} className="flex gap-2 text-[10px]">
                        <span className="shrink-0 font-medium text-indigo-700 dark:text-indigo-400">{p.key}</span>
                        <span className="text-zinc-500">:</span>
                        <span className="text-zinc-700 dark:text-zinc-300">{p.value || '(빈값)'}</span>
                        <span className="ml-auto text-zinc-400">{Math.round(p.confidence * 100)}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div
        ref={wrapperRef}
        className={`border rounded-lg overflow-auto bg-white shadow-inner ${editMode ? 'edit-mode ring-2 ring-blue-400' : ''}`}
        style={{ maxHeight: 'calc(100vh - 300px)' }}
      >
        <div ref={contentRef} />
      </div>
    </div>
  );
}
