'use client';

import { useState, useRef, useEffect } from 'react';
import { useBidAnalyzerStore } from '@/store/bid-analyzer-store';
import { Key, Type, Trash2, Download, Check, Printer, X } from 'lucide-react';
import { v4 as uuid } from 'uuid';
import * as XLSX from 'xlsx';

export function KvPairPanel() {
  const {
    pendingSelection, setPendingSelection,
    kvPairs, addKvPair, removeKvPair, updateKvPair,
    editMode, documentModel,
  } = useBidAnalyzerStore();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // textarea 자동 높이 조절
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  }, [editingText]);

  const handleDesignate = (role: 'key' | 'value') => {
    if (!pendingSelection) return;

    const incompletePair = kvPairs.find(
      (p) => (role === 'value' && p.value === '') || (role === 'key' && p.key === '')
    );

    if (incompletePair && role === 'value') {
      updateKvPair(incompletePair.id, { value: pendingSelection.text, valuePosition: pendingSelection.position });
    } else if (incompletePair && role === 'key') {
      updateKvPair(incompletePair.id, { key: pendingSelection.text, keyPosition: pendingSelection.position });
    } else {
      addKvPair({
        id: uuid(),
        key: role === 'key' ? pendingSelection.text : '',
        keyPosition: pendingSelection.position,
        value: role === 'value' ? pendingSelection.text : '',
        valuePosition: pendingSelection.position,
        colorType: 'black' as const,
      });
    }
    setPendingSelection(null);
  };

  // 빈칸 전체 선택
  const selectAllEmpty = () => {
    const iframe = document.querySelector('iframe[title="문서 미리보기"]') as HTMLIFrameElement;
    const iframeDoc = iframe?.contentDocument;
    if (!iframeDoc) return;

    const allCells = iframeDoc.querySelectorAll('td, th');
    let count = 0;
    for (const cell of Array.from(allCells)) {
      const text = cell.textContent?.trim() || '';
      if (text === '' || text === '\u00a0') {
        const el = cell as HTMLElement;
        if (!el.id) el.id = 'kv-' + uuid().slice(0, 8);
        const exists = kvPairs.some((p) => p.valuePosition?.domElementId === el.id);
        if (!exists) {
          addKvPair({
            id: uuid(),
            key: '(빈칸)',
            keyPosition: { fileType: 'html', sectionIndex: 0, paragraphIndex: 0, runIndex: 0, charOffset: 0, charLength: 0, domElementId: el.id },
            value: '',
            valuePosition: { fileType: 'html', sectionIndex: 0, paragraphIndex: 0, runIndex: 0, charOffset: 0, charLength: 0, domElementId: el.id },
            colorType: 'black' as const,
          });
          count++;
        }
      }
    }
    alert(`빈 칸 ${count}개 추가됨`);
  };

  // Value 입력 시작
  const startEditValue = (pairId: string, currentValue: string) => {
    setEditingId(pairId);
    setEditingText(currentValue);
  };

  // Value 확정 (Focus Out 시)
  const confirmEditValue = () => {
    if (!editingId) return;
    updateKvPair(editingId, { value: editingText });
    setEditingId(null);
    setEditingText('');
  };

  // 적용 + 다운로드
  const applyAndDownload = () => {
    if (!documentModel) { alert('문서가 없습니다.'); return; }

    // PDF → 매핑 엑셀만 다운로드 (HTML 적용 불가)
    if (documentModel.fileType === 'pdf' || !documentModel.fileType) {
      exportToExcel();
      alert('PDF 문서는 직접 수정이 불가합니다.\n매핑 엑셀이 다운로드되었습니다.\n→ "입찰작성" 탭에서 매핑 결과 HTML 리포트를 생성하세요.');
      return;
    }

    if (documentModel.fileType !== 'html') { alert('HTML 문서가 필요합니다.'); return; }
    const iframe = document.querySelector('iframe[title="문서 미리보기"]') as HTMLIFrameElement;
    const iframeDoc = iframe?.contentDocument;
    if (!iframeDoc) { alert('문서를 찾을 수 없습니다.'); return; }

    let changeCount = 0;
    for (const pair of kvPairs) {
      if (!pair.value || pair.value === '(빈 칸)' || pair.value === '(미지정)') continue;
      const domId = pair.valuePosition?.domElementId;
      if (domId && domId !== 'click' && domId !== 'selection' && domId !== 'manual') {
        const el = iframeDoc.getElementById(domId);
        if (el) {
          const innerSpan = el.querySelector('span');
          if (innerSpan) { innerSpan.textContent = pair.value; } else { el.textContent = pair.value; }
          changeCount++;
        }
      }
    }

    if (changeCount === 0) { alert('적용할 항목이 없습니다.'); return; }

    iframeDoc.querySelectorAll('style[data-edit-style]').forEach((s) => s.remove());
    const html = '<!DOCTYPE html>' + iframeDoc.documentElement.outerHTML;
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    a.href = url; a.download = `${documentModel.fileName.replace(/\.[^.]+$/, '')}_완성_${ts}.html`; a.click();
    URL.revokeObjectURL(url);
    alert(`${changeCount}건 적용 완료!`);
  };

  const printDocument = () => {
    const iframe = document.querySelector('iframe[title="문서 미리보기"]') as HTMLIFrameElement;
    iframe?.contentWindow?.print();
  };

  const exportToExcel = () => {
    const data = kvPairs.map((p, i) => ({
      'No': i + 1, 'Key': p.key, 'Value': p.value,
      'ValuePosition': JSON.stringify(p.valuePosition),
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Key-Value 매핑');
    XLSX.writeFile(wb, `매핑표_${new Date().toISOString().replace(/[:.]/g, '-')}.xlsx`);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-2 border-b bg-gray-50">
        <span className="text-xs font-bold text-gray-700">Key-Value 매핑 ({kvPairs.length})</span>
        <div className="flex gap-1">
          {editMode && (
            <button onClick={selectAllEmpty} className="px-1.5 py-0.5 bg-purple-500 text-white text-[10px] rounded hover:bg-purple-600" title="빈칸 전체 선택">
              빈칸 전체
            </button>
          )}
          {kvPairs.length > 0 && (
            <>
              <button onClick={exportToExcel} className="px-1.5 py-0.5 bg-gray-500 text-white text-[10px] rounded hover:bg-gray-600">엑셀</button>
              <button onClick={printDocument} className="px-1.5 py-0.5 bg-gray-500 text-white text-[10px] rounded hover:bg-gray-600"><Printer className="w-3 h-3" /></button>
            </>
          )}
        </div>
      </div>

      {/* Selection popup */}
      {pendingSelection && editMode && (
        <div className="p-2 bg-yellow-50 border-b border-yellow-200">
          <p className="text-[11px] text-gray-600 mb-1">선택: <strong>{pendingSelection.text.slice(0, 40)}</strong></p>
          <div className="flex gap-1">
            <button onClick={() => handleDesignate('key')} className="flex-1 flex items-center justify-center gap-1 py-1 bg-blue-600 text-white text-[11px] rounded hover:bg-blue-700">
              <Key className="w-3 h-3" /> Key
            </button>
            <button onClick={() => handleDesignate('value')} className="flex-1 flex items-center justify-center gap-1 py-1 bg-orange-500 text-white text-[11px] rounded hover:bg-orange-600">
              <Type className="w-3 h-3" /> Value 위치
            </button>
          </div>
        </div>
      )}

      {/* 테이블 헤더 */}
      {kvPairs.length > 0 && (
        <div className="flex items-center px-2 py-1 border-b bg-gray-100 text-[11px] font-bold text-gray-500">
          <span className="w-6">#</span>
          <span className="flex-1">Key</span>
          <span className="flex-1">Value</span>
          <span className="w-5"></span>
        </div>
      )}

      {/* KV 리스트 */}
      <div className="flex-1 overflow-auto">
        {kvPairs.length === 0 ? (
          <div className="text-center py-6 text-gray-400 text-[11px] whitespace-pre-line px-2">
            {editMode
              ? '1. 텍스트 클릭 → Key\n2. 빈 칸 클릭 → Value 위치\n3. Value 직접 입력\n4. 적용+다운로드\n\n또는 "빈칸 전체" 버튼'
              : '편집 모드를 활성화하세요'}
          </div>
        ) : (
          kvPairs.map((pair, i) => (
            <div key={pair.id} className="flex items-start px-2 py-1.5 border-b border-gray-100 hover:bg-gray-50 text-[12px]">
              <span className="w-6 text-gray-400 shrink-0 pt-0.5">{i + 1}</span>

              {/* Key (읽기 전용) */}
              <span className="flex-1 text-gray-800 break-all pr-1 pt-0.5" title={pair.key}>
                {pair.key || <span className="text-gray-300 italic">Key...</span>}
              </span>

              {/* Value (클릭 시 입력, Focus Out 시 확정, Enter=개행) */}
              <span className="flex-1 pr-1">
                {editingId === pair.id ? (
                  <textarea
                    ref={textareaRef}
                    value={editingText}
                    onChange={(e) => setEditingText(e.target.value)}
                    onBlur={confirmEditValue}
                    className="w-full border border-orange-300 rounded px-1 py-0.5 text-[12px] outline-none focus:border-orange-500 resize-none overflow-hidden"
                    rows={1}
                    autoFocus
                  />
                ) : (
                  <span
                    className="block text-gray-600 break-all cursor-pointer hover:bg-orange-50 rounded px-1 py-0.5 min-h-[20px] whitespace-pre-wrap"
                    onClick={() => startEditValue(pair.id, pair.value)}
                    title="클릭하여 Value 입력"
                  >
                    {pair.value || <span className="text-orange-400 italic">입력...</span>}
                  </span>
                )}
              </span>

              {/* Delete */}
              <button onClick={() => removeKvPair(pair.id)} className="w-5 shrink-0 text-gray-300 hover:text-red-500 pt-0.5">
                <X className="w-3 h-3" />
              </button>
            </div>
          ))
        )}
      </div>

      {/* 적용 + 다운로드 */}
      {kvPairs.length > 0 && kvPairs.some((p) => p.value && p.value !== '(빈 칸)') && (
        <div className="p-2 border-t bg-gray-50">
          <button onClick={applyAndDownload} className="w-full flex items-center justify-center gap-1 py-1.5 bg-green-600 text-white text-[11px] font-bold rounded hover:bg-green-700">
            <Check className="w-3 h-3" /> 적용 + HTML 다운로드
          </button>
        </div>
      )}
    </div>
  );
}
