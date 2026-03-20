import JSZip from 'jszip';
import type { MappingRow } from '@/types/bid-analyzer';

/**
 * HWPX 파일 수정 — 원본 ZIP 구조 완전 보존
 *
 * HWPX 규격:
 * 1. mimetype: 첫 번째 엔트리, STORED(무압축)
 * 2. version.xml, PrvImage.png: STORED
 * 3. 나머지 XML: DEFLATED
 * 4. 폴더 엔트리(Contents/, META-INF/ 등) 없음
 * 5. 파일 순서 원본과 동일
 */

const STORED_FILES = new Set(['mimetype', 'version.xml', 'Preview/PrvImage.png']);

export async function generateHwpx(
  originalBlob: Blob,
  mappingData: MappingRow[],
): Promise<Blob> {
  const arrayBuffer = await originalBlob.arrayBuffer();
  const zip = await JSZip.loadAsync(arrayBuffer);

  // 섹션별 교체 항목 수집
  const replacements = new Map<number, { key: string; value: string }[]>();
  for (const row of mappingData) {
    const valueText = String(row['Value'] || '').trim();
    const keyText = String(row['Key'] || '').trim();
    if (!keyText || !valueText) continue;

    let sectionIndex = 0;
    try {
      if (row['ValuePosition']) {
        const pos = JSON.parse(String(row['ValuePosition']));
        sectionIndex = pos.sectionIndex ?? 0;
      }
    } catch { /* default 0 */ }

    if (!replacements.has(sectionIndex)) {
      replacements.set(sectionIndex, []);
    }
    replacements.get(sectionIndex)!.push({ key: keyText, value: valueText });
  }

  // XML 교체 (원본 zip 객체를 직접 수정)
  for (const [sectionIdx, items] of replacements) {
    const sectionPath = `Contents/section${sectionIdx}.xml`;
    const sectionFile = zip.file(sectionPath);
    if (!sectionFile) continue;

    let xml = await sectionFile.async('string');

    for (const { key, value } of items) {
      const escapedKey = escapeXml(key);
      const escapedValue = escapeXml(value);

      // <hp:t> 태그 내 텍스트 교체
      const pattern = new RegExp(
        `(<hp:t>)(${escapeRegex(escapedKey)})(</hp:t>)`, 'g'
      );
      if (pattern.test(xml)) {
        xml = xml.replace(
          new RegExp(`(<hp:t>)(${escapeRegex(escapedKey)})(</hp:t>)`, 'g'),
          `$1${escapedValue}$3`
        );
      } else {
        // fallback
        xml = xml.replace(new RegExp(escapeRegex(key), 'g'), escapeXml(value));
      }
    }

    // 수정된 XML을 zip에 다시 저장 (임시)
    zip.file(sectionPath, xml);
  }

  // 새 ZIP 생성 — 원본 구조 완전 복제
  const newZip = new JSZip();

  // 원본 파일 순서 유지 (폴더 제외, 파일만)
  const fileList: string[] = [];
  zip.forEach((path, entry) => {
    if (!entry.dir) fileList.push(path);
  });

  for (const filePath of fileList) {
    const fileObj = zip.file(filePath);
    if (!fileObj) continue;
    const data = await fileObj.async('uint8array');
    const isStored = STORED_FILES.has(filePath);

    newZip.file(filePath, data, {
      compression: isStored ? 'STORE' : 'DEFLATE',
      compressionOptions: isStored ? undefined : { level: 6 },
      createFolders: false, // 폴더 엔트리 생성 안 함
    });
  }

  return await newZip.generateAsync({
    type: 'blob',
  });
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
