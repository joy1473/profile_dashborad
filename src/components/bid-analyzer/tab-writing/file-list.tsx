'use client';

import { useBidAnalyzerStore } from '@/store/bid-analyzer-store';
import { FileText, Upload, Download, Loader2, Terminal, AlertTriangle } from 'lucide-react';
import { useCallback, useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import type { MappingRow } from '@/types/bid-analyzer';
import { generateHwpx } from '@/lib/hwpx-writer';
// HWP→HWPX 변환은 lazy import (빌드 에러 방지)
const loadHwpConverter = () => import('@/lib/hwp-to-hwpx').then(m => m.convertHwpToHwpx);

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
  const [isHwpOutput, setIsHwpOutput] = useState(false);
  const [convertScriptUrl, setConvertScriptUrl] = useState<string | null>(null);

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

  const generateTimestamp = () => {
    const now = new Date();
    return now.getFullYear().toString() +
      String(now.getMonth() + 1).padStart(2, '0') +
      String(now.getDate()).padStart(2, '0') +
      String(now.getHours()).padStart(2, '0') +
      String(now.getMinutes()).padStart(2, '0') +
      String(now.getSeconds()).padStart(2, '0');
  };

  const handleGenerate = useCallback(async () => {
    if (!selectedFileForWriting || !mappingData) return;

    const file = uploadedFiles.find((f) => f.id === selectedFileForWriting);
    if (!file || !file.model) {
      alert('문서 모델이 없습니다. 탭1에서 먼저 파일을 분석해주세요.');
      return;
    }

    setGenerationStatus('generating');
    setConvertScriptUrl(null);

    try {
      const ts = generateTimestamp();
      const baseName = file.name.replace(/\.[^.]+$/, '');

      if (file.type === 'html') {
        // HTML → 매핑 데이터로 텍스트 교체 → HTML 다운로드
        let html = await file.blob.text();
        for (const row of mappingData) {
          const key = String(row['Key'] || '').trim();
          const value = String(row['Value'] || '').trim();
          if (key && value) {
            html = html.split(key).join(value);
          }
        }
        const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        setResultUrl(url);
        setResultName(`${baseName}_${ts}.html`);
        setIsHwpOutput(false);

      } else if (file.type === 'hwpx') {
        // HWPX → XML 수정 → HWPX 다운로드
        const blob = await generateHwpx(file.blob, mappingData);
        const url = URL.createObjectURL(blob);
        setResultUrl(url);
        setResultName(`${baseName}_${ts}.hwpx`);
        setIsHwpOutput(false);

      } else if (file.type === 'hwp') {
        // HWP → 내부적으로 HWPX 변환 → XML 수정 → HWPX로 다운로드
        // + 로컬 HWP 변환 스크립트 제공
        const convertHwpToHwpx = await loadHwpConverter();
        const hwpxBlob = await convertHwpToHwpx(file.blob);
        const modifiedBlob = await generateHwpx(hwpxBlob, mappingData);

        const url = URL.createObjectURL(modifiedBlob);
        setResultUrl(url);
        setResultName(`${baseName}_${ts}.hwpx`);
        setIsHwpOutput(true);

        // 로컬 변환 스크립트 생성
        const scriptContent = generateConvertScript(baseName, ts);
        const scriptBlob = new Blob([scriptContent], { type: 'text/plain; charset=utf-8' });
        setConvertScriptUrl(URL.createObjectURL(scriptBlob));

      } else {
        // 기타 포맷: 원본 그대로
        const url = URL.createObjectURL(file.blob);
        setResultUrl(url);
        setResultName(`${baseName}_${ts}.${file.type}`);
        setIsHwpOutput(false);
      }

      setGenerationStatus('done');
    } catch (err) {
      console.error('파일 생성 오류:', err);
      alert(`파일 생성 오류: ${err instanceof Error ? err.message : '알 수 없는 오류'}`);
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

        {/* HWP 파일 선택 시 안내 */}
        {selectedFileForWriting && uploadedFiles.find(f => f.id === selectedFileForWriting)?.type === 'hwp' && (
          <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg mb-3 text-xs text-amber-800">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">HWP 파일 → HWPX로 변환 후 다운로드됩니다</p>
              <p className="mt-1">다운로드된 HWPX를 한글에서 열어 HWP로 저장할 수 있습니다.</p>
              <p>또는 함께 제공되는 <b>변환 스크립트</b>를 실행하면 자동으로 HWP로 변환됩니다.</p>
            </div>
          </div>
        )}

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

        {/* 결과: HWPX 다운로드 */}
        {resultUrl && (
          <div className="mt-3 space-y-2">
            <a
              href={resultUrl}
              download={resultName}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 w-fit"
            >
              <Download className="w-4 h-4" /> {resultName}
            </a>

            {/* HWP 원본인 경우: 변환 안내 + 스크립트 */}
            {isHwpOutput && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-800 space-y-2">
                <p className="font-bold">📋 HWPX → HWP 변환 방법 (택1)</p>

                <div className="pl-3 border-l-2 border-blue-300">
                  <p className="font-semibold">방법 1: 한글에서 직접 변환</p>
                  <p>1. 다운로드한 .hwpx 파일을 한글에서 열기</p>
                  <p>2. 파일 → 다른 이름으로 저장 → HWP 선택</p>
                </div>

                <div className="pl-3 border-l-2 border-blue-300">
                  <p className="font-semibold">방법 2: 자동 변환 스크립트 실행</p>
                  <p>1. 아래 스크립트를 다운로드</p>
                  <p>2. .hwpx 파일과 같은 폴더에 저장</p>
                  <p>3. 더블클릭으로 실행 (한글 프로그램 필요)</p>
                </div>

                {convertScriptUrl && (
                  <a
                    href={convertScriptUrl}
                    download="hwpx_to_hwp_변환.py"
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded text-xs hover:bg-blue-700 w-fit"
                  >
                    <Terminal className="w-3 h-3" /> 변환 스크립트 다운로드 (.py)
                  </a>
                )}
              </div>
            )}
          </div>
        )}

        {/* 원본 다운로드 (디버그) */}
        {selectedFileForWriting && (
          <button
            onClick={() => {
              const file = uploadedFiles.find((f) => f.id === selectedFileForWriting);
              if (!file) return;
              const url = URL.createObjectURL(file.blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `원본_${file.name}`;
              a.click();
              URL.revokeObjectURL(url);
            }}
            className="flex items-center gap-2 mt-2 px-4 py-2 bg-gray-500 text-white rounded-lg text-xs hover:bg-gray-600 w-fit"
          >
            <Download className="w-3 h-3" /> 원본 그대로 다운로드
          </button>
        )}
      </div>
    </div>
  );
}

/** 로컬 HWPX→HWP 변환 Python 스크립트 생성 */
function generateConvertScript(baseName: string, ts: string): string {
  return `# -*- coding: utf-8 -*-
"""
HWPX → HWP 자동 변환 스크립트
이 스크립트를 다운로드한 HWPX 파일과 같은 폴더에 저장 후 실행하세요.
한글 프로그램(한글 2020 이상)이 설치되어 있어야 합니다.

사용법:
  python hwpx_to_hwp_변환.py

또는 더블클릭으로 실행
"""
import os, sys, time, glob

try:
    from pyhwpx import Hwp
except ImportError:
    try:
        import win32com.client
    except ImportError:
        print("오류: pyhwpx 또는 pywin32가 필요합니다.")
        print("설치: pip install pyhwpx")
        input("Enter를 눌러 종료...")
        sys.exit(1)

def convert_hwpx_to_hwp():
    # 현재 폴더에서 HWPX 파일 찾기
    script_dir = os.path.dirname(os.path.abspath(__file__))
    hwpx_files = glob.glob(os.path.join(script_dir, "*.hwpx"))

    if not hwpx_files:
        print("오류: 현재 폴더에 .hwpx 파일이 없습니다.")
        print(f"폴더: {script_dir}")
        input("Enter를 눌러 종료...")
        return

    print(f"발견된 HWPX 파일: {len(hwpx_files)}개")
    for f in hwpx_files:
        print(f"  - {os.path.basename(f)}")

    try:
        hwp = Hwp(visible=True)
    except:
        hwp_obj = win32com.client.Dispatch('HWPFrame.HwpObject')
        hwp_obj.RegisterModule('FilePathCheckDLL', 'FilePathCheckerModule')
        hwp_obj.XHwpWindows.Item(0).Visible = True

        class HwpWrapper:
            def __init__(self, obj):
                self.hwp = obj
            def open(self, path):
                self.hwp.Open(path)
            def save_as(self, path, fmt='HWP'):
                self.hwp.SaveAs(path, fmt)
            def quit(self):
                self.hwp.Quit()

        hwp = HwpWrapper(hwp_obj)

    for hwpx_path in hwpx_files:
        hwp_path = hwpx_path.replace('.hwpx', '.hwp')
        print(f"\\n변환 중: {os.path.basename(hwpx_path)} → {os.path.basename(hwp_path)}")

        hwp.open(hwpx_path)
        time.sleep(2)
        hwp.save_as(hwp_path, 'HWP')
        print(f"✅ 완료: {os.path.basename(hwp_path)}")

    hwp.quit()
    print(f"\\n🎉 모든 변환 완료! ({len(hwpx_files)}개 파일)")
    input("Enter를 눌러 종료...")

if __name__ == "__main__":
    convert_hwpx_to_hwp()
`;
}
