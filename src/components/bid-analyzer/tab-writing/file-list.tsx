'use client';

import { useBidAnalyzerStore } from '@/store/bid-analyzer-store';
import { FileText, Upload, Download, Loader2 } from 'lucide-react';
import { useCallback, useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import type { MappingRow } from '@/types/bid-analyzer';
import { generateHwpx } from '@/lib/hwpx-writer';

export function WritingTab() {
  const {
    uploadedFiles,
    selectedFileForWriting, setSelectedFileForWriting,
    mappingData, setMappingData,
    generationStatus, setGenerationStatus,
  } = useBidAnalyzerStore();

  const excelRef = useRef<HTMLInputElement>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [resultName, setResultName] = useState('');

  const handleExcelUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      const data = ev.target?.result;
      const wb = XLSX.read(data, { type: 'array' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<MappingRow>(ws);
      setMappingData(rows);
    };
    reader.readAsArrayBuffer(file);
  }, [setMappingData]);

  const handleGenerate = useCallback(async () => {
    if (!selectedFileForWriting || !mappingData) return;

    const file = uploadedFiles.find((f) => f.id === selectedFileForWriting);
    if (!file || !file.model) {
      alert('문서 모델이 없습니다. 탭1에서 먼저 파일을 분석해주세요.');
      return;
    }

    setGenerationStatus('generating');
    try {
      if (file.type === 'hwpx') {
        const blob = await generateHwpx(file.blob, mappingData);
        const now = new Date();
        const ts = now.getFullYear().toString() +
          String(now.getMonth() + 1).padStart(2, '0') +
          String(now.getDate()).padStart(2, '0') +
          String(now.getHours()).padStart(2, '0') +
          String(now.getMinutes()).padStart(2, '0') +
          String(now.getSeconds()).padStart(2, '0');

        const baseName = file.name.replace(/\.[^.]+$/, '');
        const ext = file.name.split('.').pop();
        const newName = `${baseName}_${ts}.${ext}`;

        const url = URL.createObjectURL(blob);
        setResultUrl(url);
        setResultName(newName);
        setGenerationStatus('done');
      }
    } catch (err) {
      console.error('파일 생성 오류:', err);
      setGenerationStatus('error');
    }
  }, [selectedFileForWriting, mappingData, uploadedFiles, setGenerationStatus]);

  return (
    <div className="space-y-4">
      {/* Step 1: 파일 선택 */}
      <div className="bg-white rounded-lg border p-4">
        <h3 className="text-sm font-bold text-gray-700 mb-3">1. 원본 파일 선택</h3>
        {uploadedFiles.length === 0 ? (
          <p className="text-sm text-gray-500">탭1에서 먼저 파일을 업로드해주세요.</p>
        ) : (
          <div className="space-y-2">
            {uploadedFiles.map((f) => (
              <label
                key={f.id}
                className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                  selectedFileForWriting === f.id ? 'border-blue-500 bg-blue-50' : 'hover:bg-gray-50'
                }`}
              >
                <input
                  type="radio"
                  name="fileSelect"
                  checked={selectedFileForWriting === f.id}
                  onChange={() => setSelectedFileForWriting(f.id)}
                />
                <FileText className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="text-sm font-medium">{f.name}</p>
                  <p className="text-xs text-gray-500">
                    {(f.size / 1024).toFixed(1)}KB · {f.type.toUpperCase()}
                  </p>
                </div>
              </label>
            ))}
          </div>
        )}
      </div>

      {/* Step 2: 엑셀 매핑 업로드 */}
      <div className="bg-white rounded-lg border p-4">
        <h3 className="text-sm font-bold text-gray-700 mb-3">2. 매핑 엑셀 업로드</h3>
        <input
          ref={excelRef}
          type="file"
          accept=".xlsx,.xls"
          onChange={handleExcelUpload}
          className="hidden"
        />
        <button
          onClick={() => excelRef.current?.click()}
          className="flex items-center gap-2 px-4 py-2 border rounded-lg text-sm hover:bg-gray-50"
        >
          <Upload className="w-4 h-4" />
          엑셀 파일 선택
        </button>
        {mappingData && (
          <p className="text-xs text-green-600 mt-2">
            {mappingData.length}개 매핑 항목 로드됨
          </p>
        )}
      </div>

      {/* Step 3: 생성 */}
      <div className="bg-white rounded-lg border p-4">
        <h3 className="text-sm font-bold text-gray-700 mb-3">3. 파일 생성</h3>
        <button
          onClick={handleGenerate}
          disabled={!selectedFileForWriting || !mappingData || generationStatus === 'generating'}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {generationStatus === 'generating' ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> 생성 중...</>
          ) : (
            <><FileText className="w-4 h-4" /> 파일 생성</>
          )}
        </button>

        {resultUrl && (
          <a
            href={resultUrl}
            download={resultName}
            className="flex items-center gap-2 mt-3 px-4 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 w-fit"
          >
            <Download className="w-4 h-4" /> {resultName}
          </a>
        )}
      </div>
    </div>
  );
}
