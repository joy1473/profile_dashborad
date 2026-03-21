/**
 * HWP(바이너리) 파서 — cfb(OLE) + pako(zlib) 기반
 * BodyText/SectionN 스트림에서 PARA_TEXT 레코드를 직접 추출
 */
import CFB from 'cfb';
import pako from 'pako';
import type { DocumentModel, DocumentPosition, DocumentSection, DocumentElement } from '@/types/bid-analyzer';

const HWPTAG_PARA_TEXT = 67;

/** HWP BodyText 레코드에서 텍스트 추출 */
function extractTextsFromBody(bodyData: Uint8Array): string[] {
  const texts: string[] = [];
  const view = new DataView(bodyData.buffer, bodyData.byteOffset, bodyData.byteLength);
  let pos = 0;

  while (pos + 4 <= bodyData.length) {
    const headerVal = view.getUint32(pos, true);
    const tagId = headerVal & 0x3FF;
    let size = (headerVal >> 20) & 0xFFF;
    pos += 4;

    if (size === 0xFFF) {
      if (pos + 4 <= bodyData.length) {
        size = view.getUint32(pos, true);
        pos += 4;
      } else break;
    }

    if (pos + size > bodyData.length) break;

    if (tagId === HWPTAG_PARA_TEXT) {
      const chars: string[] = [];
      let j = 0;
      while (j + 1 < size) {
        const code = view.getUint16(pos + j, true);
        if (code === 0) break;
        if (code < 32) {
          if (code === 13) chars.push('\n');
          else if ([1,2,3,4,5,6,7,8,9,10,11,12,14,15,16,17,18,19,20,21,22,23,24].includes(code)) {
            j += 16; continue;
          }
        } else {
          chars.push(String.fromCharCode(code));
        }
        j += 2;
      }
      if (chars.length > 0) {
        const text = chars.join('').trim();
        if (text) texts.push(text);
      }
    }

    pos += size;
    if (size === 0 && tagId === 0) break;
  }

  return texts;
}

export async function parseHwp(file: File | Blob, fileName: string): Promise<DocumentModel> {
  const arrayBuffer = await file.arrayBuffer();
  const data = new Uint8Array(arrayBuffer);

  const cfb = CFB.read(data, { type: 'array' });

  // FileHeader
  const headerEntry = CFB.find(cfb, '/FileHeader');
  if (!headerEntry?.content) throw new Error('HWP FileHeader를 찾을 수 없습니다.');
  const headerBytes = new Uint8Array(headerEntry.content as unknown as ArrayBuffer);
  const isCompressed = (headerBytes[36] & 1) !== 0;
  const isDistribution = (headerBytes[36] & 0x10) !== 0;

  const positionMap = new Map<string, DocumentPosition>();
  const sections: DocumentSection[] = [];
  let html = '<div class="hwpx-document">';

  html += `<style>
    .hwpx-document { font-family: 'Malgun Gothic', sans-serif; font-size: 10pt; line-height: 1.8; padding: 20px; background: white; }
    .hwpx-para { margin: 4px 0; }
    .hwpx-table { width: 100%; border-collapse: collapse; margin: 8px 0; }
    .hwpx-table td { border: 1px solid #999; padding: 4px 8px; vertical-align: top; font-size: 9pt; }
    .hwpx-run { cursor: default; }
    .hwpx-run.selected { background: #FFEB3B; outline: 2px solid #FF9800; }
    .hwpx-run.drag-selected { background: #C8E6C9; outline: 2px solid #4CAF50; }
    .hwpx-run:hover { background: rgba(66, 133, 244, 0.1); }
    .edit-mode .hwpx-run { cursor: text; }
    .hwp-notice { background: #FFF3CD; border: 1px solid #FFEEBA; border-radius: 8px; padding: 12px; margin: 12px 0; font-size: 9pt; color: #856404; }
    .hwp-badge { display: inline-block; background: #E3F2FD; color: #1565C0; font-size: 8pt; padding: 2px 8px; border-radius: 4px; margin-bottom: 8px; }
  </style>`;

  html += '<span class="hwp-badge">HWP 파일</span>';

  let totalParagraphs = 0;

  if (!isDistribution) {
    // 일반 HWP: BodyText/SectionN 직접 파싱
    let sectionIdx = 0;

    while (true) {
      const streamPath = `/BodyText/Section${sectionIdx}`;
      const entry = CFB.find(cfb, streamPath);
      if (!entry?.content) break;

      let bodyData = new Uint8Array(entry.content as unknown as ArrayBuffer);

      if (isCompressed) {
        try {
          bodyData = pako.inflateRaw(bodyData);
        } catch {
          sectionIdx++;
          continue;
        }
      }

      const texts = extractTextsFromBody(bodyData);
      const elements: DocumentElement[] = [];

      html += `<div class="hwpx-section" data-section="${sectionIdx}">`;

      if (sectionIdx > 0) {
        html += `<hr style="margin:16px 0;border:1px solid #ddd;">`;
      }

      for (let pi = 0; pi < texts.length; pi++) {
        const text = texts[pi];
        const domId = `hwp-s${sectionIdx}-p${pi}`;
        const pos: DocumentPosition = {
          fileType: 'hwp',
          sectionIndex: sectionIdx,
          paragraphIndex: pi,
          runIndex: 0,
          charOffset: 0,
          charLength: text.length,
          domElementId: domId,
        };
        positionMap.set(domId, pos);

        html += `<p class="hwpx-para"><span id="${domId}" class="hwpx-run" data-pos-id="${domId}">${escapeHtml(text)}</span></p>`;

        elements.push({
          type: 'paragraph',
          position: pos,
          content: text,
          style: { color: '#000000', fontSize: 10, bold: false, italic: false },
        });
        totalParagraphs++;
      }

      html += '</div>';
      sections.push({ index: sectionIdx, name: `Section${sectionIdx}`, elements });
      sectionIdx++;
    }
  }

  // BodyText 파싱 실패 또는 배포용 → PrvText fallback
  if (totalParagraphs === 0) {
    const prvTextEntry = CFB.find(cfb, '/PrvText');
    if (prvTextEntry?.content) {
      const prvBytes = new Uint8Array(prvTextEntry.content as unknown as ArrayBuffer);
      const decoder = new TextDecoder('utf-16le');
      const prvText = decoder.decode(prvBytes);
      const lines = prvText.split(/\r?\n/).filter(l => l.trim());
      const elements: DocumentElement[] = [];

      html += '<div class="hwpx-section" data-section="0">';

      for (let pi = 0; pi < lines.length; pi++) {
        const line = lines[pi].replace(/<>/g, '').replace(/<([^>]+)>/g, '$1').trim();
        if (!line) continue;

        const domId = `hwp-s0-p${pi}`;
        const pos: DocumentPosition = {
          fileType: 'hwp',
          sectionIndex: 0,
          paragraphIndex: pi,
          runIndex: 0,
          charOffset: 0,
          charLength: line.length,
          domElementId: domId,
        };
        positionMap.set(domId, pos);

        html += `<p class="hwpx-para"><span id="${domId}" class="hwpx-run" data-pos-id="${domId}">${escapeHtml(line)}</span></p>`;
        elements.push({
          type: 'paragraph', position: pos, content: line,
          style: { color: '#000000', fontSize: 10, bold: false, italic: false },
        });
        totalParagraphs++;
      }

      html += '</div>';
      sections.push({ index: 0, name: 'PrvText', elements });
    }

    if (isDistribution) {
      html += '<div class="hwp-notice">⚠️ 배포용(DRM) HWP — 미리보기 텍스트만 표시됩니다.<br>전체 내용: 한글 → 파일 → 다른 이름으로 저장 → HWPX</div>';
    }
  } else {
    html += `<div class="hwp-notice" style="background:#E8F5E9;border-color:#C8E6C9;color:#2E7D32;">✅ HWP 본문 전체 추출 완료 — ${sections.length}개 섹션, ${totalParagraphs}개 문단</div>`;
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
