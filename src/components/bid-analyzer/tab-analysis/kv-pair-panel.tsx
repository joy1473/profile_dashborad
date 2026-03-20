'use client';

import { useBidAnalyzerStore } from '@/store/bid-analyzer-store';
import { Key, Type, Trash2, Download, Tag } from 'lucide-react';
import { v4 as uuid } from 'uuid';
import * as XLSX from 'xlsx';

export function KvPairPanel() {
  const {
    pendingSelection, setPendingSelection,
    kvPairs, addKvPair, removeKvPair, updateKvPair,
    editMode,
  } = useBidAnalyzerStore();

  // Handle designating selection as Key or Value
  const handleDesignate = (role: 'key' | 'value') => {
    if (!pendingSelection) return;

    // Find the latest incomplete pair (has key but no value, or vice versa)
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
      // Create new pair
      const newPair = {
        id: uuid(),
        key: role === 'key' ? pendingSelection.text : '',
        keyPosition: role === 'key' ? pendingSelection.position : pendingSelection.position,
        value: role === 'value' ? pendingSelection.text : '',
        valuePosition: role === 'value' ? pendingSelection.position : pendingSelection.position,
        colorType: pendingSelection.position.textColor?.toLowerCase().includes('33') ? 'blue' as const : 'black' as const,
      };
      addKvPair(newPair);
    }

    setPendingSelection(null);
    // Clear ALL DOM selections (selected + drag-selected)
    document.querySelectorAll('.selected').forEach((el) => {
      el.classList.remove('selected');
    });
    document.querySelectorAll('.drag-selected').forEach((el) => {
      el.classList.remove('drag-selected');
    });
  };

  const exportToExcel = () => {
    const data = kvPairs.map((p, i) => ({
      'No': i + 1,
      'Key': p.key,
      'Value': p.value,
      'Color': p.colorType || '',
      'ContentType': p.contentType || 'text',
      'Location': p.keyPosition.tableIndex !== undefined
        ? `표${p.keyPosition.tableIndex} (${p.keyPosition.rowIndex},${p.keyPosition.colIndex})`
        : `문단${p.keyPosition.paragraphIndex}`,
      'Section': `section${p.keyPosition.sectionIndex}`,
      'KeyPosition': JSON.stringify(p.keyPosition),
      'ValuePosition': JSON.stringify(p.valuePosition),
      'Notes': p.notes || '',
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
        {kvPairs.length > 0 && (
          <button
            onClick={exportToExcel}
            className="flex items-center gap-1 px-2 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700"
          >
            <Download className="w-3 h-3" /> 엑셀 저장
          </button>
        )}
      </div>

      {/* Selection popup */}
      {pendingSelection && editMode && (
        <div className="p-3 bg-yellow-50 border-b border-yellow-200">
          <p className="text-xs text-gray-600 mb-1">선택된 텍스트:</p>
          <p className="text-sm font-medium text-gray-900 mb-2 truncate">
            &quot;{pendingSelection.text.slice(0, 50)}&quot;
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => handleDesignate('key')}
              className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
            >
              <Key className="w-3 h-3" /> Key 지정
            </button>
            <button
              onClick={() => handleDesignate('value')}
              className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 bg-orange-500 text-white text-xs rounded hover:bg-orange-600"
            >
              <Type className="w-3 h-3" /> Value 지정
            </button>
          </div>
        </div>
      )}

      {/* KV Pair list */}
      <div className="flex-1 overflow-auto p-2 space-y-2">
        {kvPairs.length === 0 ? (
          <div className="text-center py-8 text-gray-400 text-sm">
            {editMode
              ? '문서에서 텍스트를 클릭하여\nKey/Value를 지정하세요'
              : '편집 모드를 활성화하세요'}
          </div>
        ) : (
          kvPairs.map((pair, i) => (
            <div key={pair.id} className="border rounded-lg p-2 bg-white hover:shadow-sm">
              <div className="flex items-start justify-between">
                <span className="text-xs text-gray-400">#{i + 1}</span>
                <button
                  onClick={() => removeKvPair(pair.id)}
                  className="text-gray-300 hover:text-red-500"
                >
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
                  <span className="text-xs text-gray-600 break-all">{pair.value || '(미지정)'}</span>
                </div>
              </div>
              {pair.colorType && (
                <span className={`inline-block mt-1 px-1 py-0.5 text-[10px] rounded ${
                  pair.colorType === 'blue' ? 'bg-blue-50 text-blue-600' : 'bg-gray-100 text-gray-600'
                }`}>
                  {pair.colorType === 'blue' ? '입력영역' : '양식고정'}
                </span>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
