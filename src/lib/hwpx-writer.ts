import JSZip from 'jszip';
import type { MappingRow } from '@/types/bid-analyzer';

/**
 * HWPX 파일의 XML 내 텍스트를 매핑 데이터 기반으로 교체하고 새 파일 생성
 * HWPX = ZIP(application/hwp+zip) 형식
 * - mimetype 파일: STORED(무압축) 유지 필수
 * - XML 파일: DEFLATED(압축)
 */
export async function generateHwpx(
  originalBlob: Blob,
  mappingData: MappingRow[],
): Promise<Blob> {
  // 원본 ZIP 로드
  const zip = await JSZip.loadAsync(originalBlob);

  // 섹션별로 교체할 항목 그룹핑
  const replacements = new Map<number, { key: string; value: string }[]>();

  for (const row of mappingData) {
    const valueText = String(row['Value'] || '').trim();
    const keyText = String(row['Key'] || '').trim();
    if (!keyText || !valueText) continue;

    // ValuePosition에서 sectionIndex 추출
    let sectionIndex = 0;
    try {
      if (row['ValuePosition']) {
        const pos = JSON.parse(String(row['ValuePosition']));
        sectionIndex = pos.sectionIndex ?? 0;
      }
    } catch {
      // default section 0
    }

    if (!replacements.has(sectionIndex)) {
      replacements.set(sectionIndex, []);
    }
    replacements.get(sectionIndex)!.push({ key: keyText, value: valueText });
  }

  // 각 섹션 XML에서 텍스트 교체
  for (const [sectionIdx, items] of replacements) {
    const sectionPath = `Contents/section${sectionIdx}.xml`;
    const sectionFile = zip.file(sectionPath);
    if (!sectionFile) continue;

    let xml = await sectionFile.async('string');

    for (const { key, value } of items) {
      // XML 내에서 <hp:t>KEY_TEXT</hp:t> 패턴을 찾아 교체
      // XML 특수문자 이스케이프된 형태도 고려
      const escapedKey = escapeXml(key);

      // 방법 1: <hp:t> 태그 내 정확한 텍스트 매칭
      const tagPattern = new RegExp(
        `(<hp:t>)${escapeRegex(escapedKey)}(</hp:t>)`,
        'g'
      );
      if (tagPattern.test(xml)) {
        xml = xml.replace(tagPattern, `$1${escapeXml(value)}$2`);
      } else {
        // 방법 2: 일반 텍스트 교체 (fallback)
        xml = xml.replace(escapedKey, escapeXml(value));
      }
    }

    // 섹션 XML 업데이트 (DEFLATED 압축 유지)
    zip.file(sectionPath, xml, { compression: 'DEFLATE' });
  }

  // mimetype 파일은 STORED로 유지 (HWPX 필수)
  const mimetypeContent = await zip.file('mimetype')?.async('string');
  if (mimetypeContent) {
    zip.file('mimetype', mimetypeContent, {
      compression: 'STORE',
    });
  }

  // 새 ZIP 생성 — HWPX 호환 옵션
  const newBlob = await zip.generateAsync({
    type: 'blob',
    mimeType: 'application/hwp+zip',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  });

  return newBlob;
}

function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
