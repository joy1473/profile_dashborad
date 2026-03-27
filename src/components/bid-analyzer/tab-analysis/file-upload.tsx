'use client';

import { useCallback, useRef } from 'react';
import { Upload, FileText } from 'lucide-react';
import { useBidAnalyzerStore } from '@/store/bid-analyzer-store';
import { getFileType } from '@/types/bid-analyzer';
import { parseHwpx } from '@/lib/hwpx-parser';
import { parseHwp } from '@/lib/hwp-parser';
import { v4 as uuid } from 'uuid';
import type { DocumentModel, DocumentPosition } from '@/types/bid-analyzer';

const ACCEPTED = '.html,.htm,.css,.png,.jpg,.jpeg,.gif,.hwpx,.hwp,.docx,.doc,.xlsx,.xls,.pdf';

export function FileUpload() {
  const inputRef = useRef<HTMLInputElement>(null);
  const { addFile, setDocumentModel, setParsingDocument } = useBidAnalyzerStore();

  const handleFiles = useCallback(async (fileList: FileList) => {
    const files = Array.from(fileList);
    const htmlFile = files.find((f) => f.name.endsWith('.html') || f.name.endsWith('.htm'));

    if (htmlFile) {
      // HTML + CSS + 이미지 통합 처리
      setParsingDocument(true);
      try {
        let htmlContent = await htmlFile.text();

        // CSS 파일 인라인
        const cssFiles = files.filter((f) => f.name.endsWith('.css'));
        for (const cssFile of cssFiles) {
          const cssText = await cssFile.text();
          const cssName = cssFile.name;
          // link 태그 교체
          const linkRegex = new RegExp(`<link[^>]*href=["']${cssName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}["'][^>]*>`, 'gi');
          if (linkRegex.test(htmlContent)) {
            htmlContent = htmlContent.replace(linkRegex, `<style>${cssText}</style>`);
          } else {
            htmlContent = htmlContent.replace('</head>', `<style>${cssText}</style></head>`);
          }
        }

        // 이미지 파일 base64 인라인
        const imgFiles = files.filter((f) => /\.(png|jpg|jpeg|gif|bmp|svg|webp)$/i.test(f.name));
        for (const imgFile of imgFiles) {
          if (imgFile.size > 5 * 1024 * 1024) continue;
          const arrayBuffer = await imgFile.arrayBuffer();
          const bytes = new Uint8Array(arrayBuffer);
          let binary = '';
          for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
          const base64 = btoa(binary);
          const mimeType = imgFile.type || `image/${imgFile.name.split('.').pop()?.toLowerCase()}`;
          const dataUri = `data:${mimeType};base64,${base64}`;
          htmlContent = htmlContent.split(imgFile.name).join(dataUri);
          const encoded = encodeURIComponent(imgFile.name);
          if (encoded !== imgFile.name) {
            htmlContent = htmlContent.split(encoded).join(dataUri);
          }
        }

        // 모든 td/th/span에 고유 ID 부여 (편집모드 선택 + 매핑 적용에 필요)
        const tmpDoc = new DOMParser().parseFromString(htmlContent, 'text/html');
        let idIdx = 0;
        tmpDoc.querySelectorAll('td, th').forEach((el) => {
          if (!el.id) el.id = 'cell-' + (idIdx++);
        });
        const renderedHtml = '<!DOCTYPE html>' + tmpDoc.documentElement.outerHTML;

        const positionMap = new Map<string, DocumentPosition>();

        const model: DocumentModel = {
          fileName: htmlFile.name,
          fileType: 'html',
          originalBlob: new Blob([htmlContent], { type: 'text/html' }),
          sections: [],
          renderedHtml,
          positionMap,
        };

        const uploaded = {
          id: uuid(),
          name: htmlFile.name,
          type: 'html' as const,
          size: htmlFile.size,
          blob: new Blob([htmlContent], { type: 'text/html' }),
          uploadedAt: new Date(),
          model,
        };

        addFile(uploaded);
        setDocumentModel(model);
      } catch (err) {
        console.error('HTML 파싱 오류:', err);
        alert('HTML 파싱 중 오류가 발생했습니다.');
      } finally {
        setParsingDocument(false);
      }
      return;
    }

    // 기존 HWP/HWPX 처리
    const file = files[0];
    if (!file) return;

    const fileType = getFileType(file.name);
    if (!fileType) {
      alert('지원하지 않는 파일 형식입니다.');
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

    setParsingDocument(true);
    try {
      if (fileType === 'hwpx') {
        const model = await parseHwpx(file, file.name);
        setDocumentModel(model);
        uploaded.model = model;
      } else if (fileType === 'hwp') {
        const model = await parseHwp(file, file.name);
        setDocumentModel(model);
        uploaded.model = model;
      }
    } catch (err) {
      console.error('문서 파싱 오류:', err);
      alert('문서 파싱 중 오류가 발생했습니다.');
    } finally {
      setParsingDocument(false);
    }
  }, [addFile, setDocumentModel, setParsingDocument]);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files.length > 0) handleFiles(e.dataTransfer.files);
  }, [handleFiles]);

  const onChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) handleFiles(e.target.files);
  }, [handleFiles]);

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
        multiple
        onChange={onChange}
        className="hidden"
      />
      <Upload className="w-8 h-8 mx-auto mb-2 text-gray-400" />
      <p className="text-sm font-medium text-gray-700">
        파일을 드래그하거나 클릭하여 업로드
      </p>
      <p className="text-xs text-gray-500 mt-1">
        HTML+CSS+이미지 (한글 변환 문서), HWP, HWPX 지원
      </p>
      <div className="flex items-center justify-center gap-2 mt-3">
        {['HTML', 'HWP', 'HWPX'].map((ext) => (
          <span key={ext} className="px-2 py-0.5 bg-gray-100 rounded text-xs text-gray-600">
            <FileText className="w-3 h-3 inline mr-0.5" />
            {ext}
          </span>
        ))}
      </div>
    </div>
  );
}
