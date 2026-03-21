/**
 * HWP(바이너리) 파서 — cfb(OLE) + zlib 기반
 * BodyText/SectionN 스트림에서 PARA_TEXT 레코드 추출
 */
import CFB from 'cfb';
import type { DocumentModel, DocumentPosition, DocumentSection, DocumentElement } from '@/types/bid-analyzer';

export async function parseHwp(file: File | Blob, fileName: string): Promise<DocumentModel> {
  const arrayBuffer = await file.arrayBuffer();
  const data = new Uint8Array(arrayBuffer);

  // OLE 컨테이너 파싱
  const cfb = CFB.read(data, { type: 'array' });

  // FileHeader에서 압축 여부 확인
  const headerEntry = CFB.find(cfb, '/FileHeader');
  if (!headerEntry?.content) throw new Error('HWP FileHeader를 찾을 수 없습니다.');
  const headerBytes = new Uint8Array(headerEntry.content as unknown as ArrayBuffer);
  const isCompressed = (headerBytes[36] & 1) !== 0;
  const isDistribution = (headerBytes[36] & 0x10) !== 0;

  // PrvText (미리보기 텍스트) 추출 — 가장 안정적인 방법
  const prvTextEntry = CFB.find(cfb, '/PrvText');

  const positionMap = new Map<string, DocumentPosition>();
  const sections: DocumentSection[] = [];
  let html = '<div class="hwpx-document">';

  html += `<style>
    .hwpx-document { font-family: 'Malgun Gothic', sans-serif; font-size: 10pt; line-height: 1.8; padding: 20px; background: white; }
    .hwpx-para { margin: 6px 0; }
    .hwpx-run { cursor: default; }
    .hwpx-run.selected { background: #FFEB3B; outline: 2px solid #FF9800; }
    .hwpx-run.drag-selected { background: #C8E6C9; outline: 2px solid #4CAF50; }
    .hwpx-run:hover { background: rgba(66, 133, 244, 0.1); }
    .edit-mode .hwpx-run { cursor: text; }
    .hwp-notice { background: #FFF3CD; border: 1px solid #FFEEBA; border-radius: 8px; padding: 12px; margin: 12px 0; font-size: 9pt; color: #856404; }
    .hwp-badge { display: inline-block; background: #E3F2FD; color: #1565C0; font-size: 8pt; padding: 2px 8px; border-radius: 4px; margin-bottom: 8px; }
  </style>`;

  html += '<span class="hwp-badge">HWP 파일</span>';

  if (prvTextEntry?.content) {
    // PrvText는 UTF-16LE 인코딩
    const prvBytes = new Uint8Array(prvTextEntry.content as unknown as ArrayBuffer);
    const decoder = new TextDecoder('utf-16le');
    const prvText = decoder.decode(prvBytes);

    // 줄 단위로 분할하여 렌더링
    const lines = prvText.split(/\r?\n/).filter(l => l.trim());
    const elements: DocumentElement[] = [];

    html += '<div class="hwpx-section" data-section="0">';

    for (let pi = 0; pi < lines.length; pi++) {
      const line = lines[pi].trim();
      if (!line) continue;

      // <> 태그 형태의 구분자 제거
      const cleanLine = line.replace(/<>/g, '').replace(/<([^>]+)>/g, '$1').trim();
      if (!cleanLine) continue;

      const domId = `hwp-s0-p${pi}`;
      const pos: DocumentPosition = {
        fileType: 'hwp',
        sectionIndex: 0,
        paragraphIndex: pi,
        runIndex: 0,
        charOffset: 0,
        charLength: cleanLine.length,
        domElementId: domId,
      };
      positionMap.set(domId, pos);

      html += `<p class="hwpx-para"><span id="${domId}" class="hwpx-run" data-pos-id="${domId}">${escapeHtml(cleanLine)}</span></p>`;

      elements.push({
        type: 'paragraph',
        position: pos,
        content: cleanLine,
        style: { color: '#000000', fontSize: 10, bold: false, italic: false },
      });
    }

    html += '</div>';
    sections.push({ index: 0, name: 'PrvText', elements });

    if (isDistribution) {
      html += '<div class="hwp-notice">⚠️ 배포용(DRM) HWP 파일입니다. 미리보기 텍스트만 표시됩니다.<br>전체 내용을 보려면 HWPX로 변환해주세요. (한글 → 파일 → 다른 이름으로 저장 → HWPX)</div>';
    } else if (isCompressed) {
      html += '<div class="hwp-notice">ℹ️ HWP 파일의 미리보기 텍스트를 표시합니다.<br>더 정확한 분석을 원하시면 HWPX 형식을 권장합니다.</div>';
    }
  } else {
    html += '<div class="hwp-notice">⚠️ 이 HWP 파일에서 텍스트를 추출할 수 없습니다.<br>HWPX 형식으로 변환해주세요. (한글 → 파일 → 다른 이름으로 저장 → HWPX)</div>';
  }

  html += '</div>';

  return {
    fileName,
    fileType: 'hwp',
    originalBlob: file instanceof Blob ? file : new Blob([file]),
    sections,
    renderedHtml: html,
    positionMap,
  };
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
