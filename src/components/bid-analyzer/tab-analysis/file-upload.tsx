'use client';

import { useCallback, useRef } from 'react';
import { Upload, FileText } from 'lucide-react';
import { useBidAnalyzerStore } from '@/store/bid-analyzer-store';
import { getFileType } from '@/types/bid-analyzer';
import { parseHwpx } from '@/lib/hwpx-parser';
import { v4 as uuid } from 'uuid';

const ACCEPTED = '.hwpx,.hwp,.docx,.doc,.xlsx,.xls,.pdf';

export function FileUpload() {
  const inputRef = useRef<HTMLInputElement>(null);
  const { addFile, setDocumentModel, setParsingDocument } = useBidAnalyzerStore();

  const handleFile = useCallback(async (file: File) => {
    const fileType = getFileType(file.name);
    if (!fileType) {
      alert('지원하지 않는 파일 형식입니다.');
      return;
    }

    if (fileType === 'hwp') {
      alert('HWP(바이너리) 파일은 지원하지 않습니다.\n한글에서 HWPX 형식으로 다시 저장해주세요.\n(파일 → 다른 이름으로 저장 → HWPX)');
      return;
    }

    const uploaded: import('@/types/bid-analyzer').UploadedFile = {
      id: uuid(),
      name: file.name,
      type: fileType,
      size: file.size,
      blob: file,
      uploadedAt: new Date(),
    };
    addFile(uploaded);

    // Parse document
    setParsingDocument(true);
    try {
      if (fileType === 'hwpx') {
        const model = await parseHwpx(file, file.name);
        setDocumentModel(model);
        uploaded.model = model;
      }
      // TODO: other file types
    } catch (err) {
      console.error('문서 파싱 오류:', err);
      alert('문서 파싱 중 오류가 발생했습니다.');
    } finally {
      setParsingDocument(false);
    }
  }, [addFile, setDocumentModel, setParsingDocument]);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const onChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  }, [handleFile]);

  return (
    <div
      onDrop={onDrop}
      onDragOver={(e) => e.preventDefault()}
      className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-400 hover:bg-blue-50/50 transition-colors cursor-pointer"
      onClick={() => inputRef.current?.click()}
    >
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED}
        onChange={onChange}
        className="hidden"
      />
      <Upload className="w-8 h-8 mx-auto mb-2 text-gray-400" />
      <p className="text-sm font-medium text-gray-700">
        파일을 드래그하거나 클릭하여 업로드
      </p>
      <p className="text-xs text-gray-500 mt-1">
        HWPX, DOCX, XLSX, PDF 지원 (HWP는 HWPX로 변환 필요)
      </p>
      <div className="flex items-center justify-center gap-2 mt-3">
        {['HWPX', 'DOCX', 'XLSX', 'PDF'].map((ext) => (
          <span key={ext} className="px-2 py-0.5 bg-gray-100 rounded text-xs text-gray-600">
            <FileText className="w-3 h-3 inline mr-0.5" />
            {ext}
          </span>
        ))}
      </div>
    </div>
  );
}
