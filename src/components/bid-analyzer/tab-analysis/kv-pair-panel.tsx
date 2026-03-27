'use client';

import { useState } from 'react';
import { useBidAnalyzerStore } from '@/store/bid-analyzer-store';
import { Key, Type, Trash2, Download, Tag, Check, Printer } from 'lucide-react';
import { v4 as uuid } from 'uuid';
import * as XLSX from 'xlsx';

export function KvPairPanel() {
  const {
    pendingSelection, setPendingSelection,
    kvPairs, addKvPair, removeKvPair, updateKvPair,
    editMode, documentModel,
  } = useBidAnalyzerStore();

  const [editingValueId, setEditingValueId] = useState<string | null>(null);
  const [editingValueText, setEditingValueText] = useState('');

  const handleDesignate = (role: 'key' | 'value') => {
    if (!pendingSelection) return;

    const incompletePair = kvPairs.find(
      (p) => (role === 'value' && p.value === '') || (role === 'key' && p.key === '')
    );

    if (incompletePair && role === 'value') {
      updateKvPair(incompletePair.id, {
        value: pendingSelection.text,
        valuePosition: pendingSelection.position,
      });
    } else if (incompletePair && role === 'key') {
      updateKvPair(incompletePair.id, {
        key: pendingSelection.text,
        keyPosition: pendingSelection.position,
      });
    } else {
      const newPair = {
        id: uuid(),
        key: role === 'key' ? pendingSelection.text : '',
        keyPosition: pendingSelection.position,
        value: role === 'value' ? pendingSelection.text : '',
        valuePosition: pendingSelection.position,
        colorType: 'black' as const,
      };
      addKvPair(newPair);
    }

    setPendingSelection(null);
  };

  // Value 직접 입력 시작
  const startEditValue = (pairId: string, currentValue: string) => {
    setEditingValueId(pairId);
    setEditingValueText(currentValue);
  };

  // Value 입력 확정
  const confirmEditValue = (pairId: string) => {
    updateKvPair(pairId, { value: editingValueText });
    setEditingValueId(null);
    setEditingValueText('');
  };

  // iframe에 매핑 적용 → 변경된 HTML 다운로드
  const applyAndDownload = () => {
    if (!documentModel || documentModel.fileType !== 'html') {
      alert('HTML 문서가 필요합니다.');
      return;
    }

    // iframe에서 현재 HTML 가져오기
    const iframe = document.querySelector('iframe[title="문서 미리보기"]') as HTMLIFrameElement;
    const iframeDoc = iframe?.contentDocument;
    if (!iframeDoc) {
      alert('문서를 찾을 수 없습니다.');
      return;
    }

    // 매핑 적용: domElementId로 요소 찾아서 Value 삽입
    let changeCount = 0;
    for (const pair of kvPairs) {
      if (!pair.value || pair.value === '(빈 칸)' || pair.value === '(미지정)') continue;

      const domId = pair.valuePosition?.domElementId;
      if (domId && domId !== 'click' && domId !== 'selection' && domId !== 'manual') {
        const el = iframeDoc.getElementById(domId);
        if (el) {
          const innerSpan = el.querySelector('span');
          if (innerSpan) {
            innerSpan.textContent = pair.value;
          } else {
            el.textContent = pair.value;
          }
          changeCount++;
        }
      }
    }

    if (changeCount === 0) {
      alert('적용할 항목이 없습니다. Value를 입력하고 빈 칸의 위치를 Value로 지정해주세요.');
      return;
    }

    // 변경된 HTML 다운로드
    const html = '<!DOCTYPE html>' + iframeDoc.documentElement.outerHTML;
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    a.href = url;
    a.download = `${documentModel.fileName.replace(/\.[^.]+$/, '')}_완성_${ts}.html`;
    a.click();
    URL.revokeObjectURL(url);

    alert(`${changeCount}건 적용 완료! HTML 파일이 다운로드됩니다.`);
  };

  // 브라우저 인쇄 (PDF 저장 가능)
  const printDocument = () => {
    const iframe = document.querySelector('iframe[title="문서 미리보기"]') as HTMLIFrameElement;
    iframe?.contentWindow?.print();
  };

  const exportToExcel = () => {
    const data = kvPairs.map((p, i) => ({
      'No': i + 1,
      'Key': p.key,
      'Value': p.value,
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
      <div className="flex items-center justify-between p-3 border-b bg-gray-50">
        <h3 className="text-sm font-bold text-gray-700">
          <Tag className="w-4 h-4 inline mr-1" />
          Key-Value 매핑 ({kvPairs.length})
        </h3>
        <div className="flex gap-1">
          {kvPairs.length > 0 && (
            <>
              <button onClick={exportToExcel} className="flex items-center gap-1 px-2 py-1 bg-gray-500 text-white text-[10px] rounded hover:bg-gray-600" title="엑셀 백업">
                <Download className="w-3 h-3" /> 엑셀
              </button>
              <button onClick={printDocument} className="flex items-center gap-1 px-2 py-1 bg-gray-500 text-white text-[10px] rounded hover:bg-gray-600" title="인쇄/PDF">
                <Printer className="w-3 h-3" /> 인쇄
              </button>
            </>
          )}
        </div>
      </div>

      {/* Selection popup */}
      {pendingSelection && editMode && (
        <div className="p-3 bg-yellow-50 border-b border-yellow-200">
          <p className="text-xs text-gray-600 mb-1">선택된 텍스트:</p>
          <p className="text-sm font-medium text-gray-900 mb-2 truncate">
            &quot;{pendingSelection.text.slice(0, 50)}&quot;
          </p>
          <div className="flex gap-2">
            <button onClick={() => handleDesignate('key')} className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 bg-blue-600 text-white text-xs rounded hover:bg-blue-700">
              <Key className="w-3 h-3" /> Key 지정
            </button>
            <button onClick={() => handleDesignate('value')} className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 bg-orange-500 text-white text-xs rounded hover:bg-orange-600">
              <Type className="w-3 h-3" /> Value 위치
            </button>
          </div>
        </div>
      )}

      {/* KV Pair list */}
      <div className="flex-1 overflow-auto p-2 space-y-2">
        {kvPairs.length === 0 ? (
          <div className="text-center py-8 text-gray-400 text-xs whitespace-pre-line">
            {editMode
              ? '1. 텍스트 클릭 → Key 지정\n2. 빈 칸 클릭 → Value 위치\n3. Value 값 직접 입력\n4. 적용+다운로드'
              : '편집 모드를 활성화하세요'}
          </div>
        ) : (
          kvPairs.map((pair, i) => (
            <div key={pair.id} className="border rounded-lg p-2 bg-white hover:shadow-sm">
              <div className="flex items-start justify-between">
                <span className="text-xs text-gray-400">#{i + 1}</span>
                <button onClick={() => removeKvPair(pair.id)} className="text-gray-300 hover:text-red-500">
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
              <div className="mt-1">
                <div className="flex items-start gap-1">
                  <span className="px-1 py-0.5 bg-blue-100 text-blue-700 text-[10px] font-bold rounded shrink-0">K</span>
                  <span className="text-xs text-gray-800 break-all">{pair.key || '(미지정)'}</span>
                </div>
                <div className="flex items-start gap-1 mt-1">
                  <span className="px-1 py-0.5 bg-orange-100 text-orange-700 text-[10px] font-bold rounded shrink-0">V</span>
                  {editingValueId === pair.id ? (
                    <div className="flex-1 flex gap-1">
                      <input
                        type="text"
                        value={editingValueText}
                        onChange={(e) => setEditingValueText(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && confirmEditValue(pair.id)}
                        className="flex-1 border border-orange-300 rounded px-1 py-0.5 text-xs outline-none focus:border-orange-500"
                        autoFocus
                      />
                      <button onClick={() => confirmEditValue(pair.id)} className="text-green-600 hover:text-green-800">
                        <Check className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <span
                      className="text-xs text-gray-600 break-all cursor-pointer hover:bg-orange-50 rounded px-1"
                      onClick={() => startEditValue(pair.id, pair.value)}
                      title="클릭하여 Value 입력"
                    >
                      {pair.value || <span className="text-orange-400 italic">클릭하여 입력...</span>}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* 적용 + 다운로드 버튼 */}
      {kvPairs.length > 0 && kvPairs.some((p) => p.value && p.value !== '(빈 칸)') && (
        <div className="p-2 border-t bg-gray-50">
          <button
            onClick={applyAndDownload}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-green-600 text-white text-xs font-bold rounded hover:bg-green-700"
          >
            <Check className="w-4 h-4" /> 적용 + HTML 다운로드
          </button>
        </div>
      )}
    </div>
  );
}
