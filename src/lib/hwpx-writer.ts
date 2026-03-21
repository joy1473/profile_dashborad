import JSZip from 'jszip';
import type { MappingRow } from '@/types/bid-analyzer';

/**
 * HWPX 파일 수정 — Value 위치에 값 매핑
 *
 * 전략: Key 텍스트를 찾아서 그 Key가 포함된 `<hp:t>` 내에서
 * Key 부분은 유지하고 나머지(기존 value)를 새 Value로 교체하거나,
 * Key 텍스트 다음 문단의 전체 내용을 Value로 교체
 *
 * HWP→HWPX 변환 파일: 각 문단이 개별 <hp:p><hp:run><hp:t>이므로
 * 문단 단위 텍스트 매칭으로 처리
 */
export async function generateHwpx(
  originalBlob: Blob,
  mappingData: MappingRow[],
): Promise<Blob> {
  const arrayBuffer = await originalBlob.arrayBuffer();
  const origBytes = new Uint8Array(arrayBuffer);

  // HWPX ZIP인지 확인
  const isHwpx = origBytes[0] === 0x50 && origBytes[1] === 0x4B; // PK
  if (!isHwpx) {
    // HWP→HWPX 변환된 파일 처리
    return processConvertedHwpx(originalBlob, mappingData);
  }

  // 원본 HWPX 파일 처리 (바이너리 패치)
  return patchOriginalHwpx(origBytes, mappingData, originalBlob);
}

/**
 * HWP→HWPX 변환된 파일 처리
 * 구조가 단순(문단별 <hp:t>)하므로 텍스트 직접 매칭
 */
async function processConvertedHwpx(
  blob: Blob,
  mappingData: MappingRow[],
): Promise<Blob> {
  const zip = await JSZip.loadAsync(await blob.arrayBuffer());

  // 매핑 데이터에서 Key→Value 쌍 수집
  const kvPairs: { key: string; value: string; sectionIndex: number }[] = [];
  for (const row of mappingData) {
    const key = String(row['Key'] || '').trim();
    const value = String(row['Value'] || '').trim();
    if (!key || !value) continue;

    let sectionIndex = 0;
    try {
      if (row['ValuePosition']) {
        const pos = JSON.parse(String(row['ValuePosition']));
        sectionIndex = pos.sectionIndex ?? 0;
      }
    } catch { /* default 0 */ }

    kvPairs.push({ key, value, sectionIndex });
  }

  // 섹션별로 XML 수정
  const sectionGroups = new Map<number, typeof kvPairs>();
  for (const kv of kvPairs) {
    if (!sectionGroups.has(kv.sectionIndex)) sectionGroups.set(kv.sectionIndex, []);
    sectionGroups.get(kv.sectionIndex)!.push(kv);
  }

  for (const [secIdx, pairs] of sectionGroups) {
    const path = `Contents/section${secIdx}.xml`;
    const file = zip.file(path);
    if (!file) continue;

    let xml = await file.async('string');

    // 모든 <hp:t>...</hp:t> 태그를 파싱
    const tagPattern = /<hp:t>([\s\S]*?)<\/hp:t>/g;
    const allTags: { match: string; text: string; index: number }[] = [];
    let m;
    while ((m = tagPattern.exec(xml)) !== null) {
      allTags.push({ match: m[0], text: m[1], index: m.index });
    }

    for (const { key, value } of pairs) {
      // Key 텍스트가 포함된 <hp:t> 태그를 찾기
      const keyTagIdx = allTags.findIndex(t => t.text.includes(key));
      if (keyTagIdx === -1) continue;

      const keyTag = allTags[keyTagIdx];

      // Case 1: Key와 Value가 같은 <hp:t> 안에 있음
      // 예: <hp:t>과제명    XR 풀스택...</hp:t>
      // → Key 부분 유지하고 나머지를 Value로 교체
      if (keyTag.text.includes(key) && keyTag.text.length > key.length + 2) {
        // Key 뒤의 내용을 Value로 교체
        const keyPos = keyTag.text.indexOf(key);
        const beforeKey = keyTag.text.substring(0, keyPos);
        const newText = beforeKey + key + '\t' + value;
        xml = xml.replace(keyTag.match, `<hp:t>${newText}</hp:t>`);
        // allTags 업데이트
        allTags[keyTagIdx] = { ...keyTag, match: `<hp:t>${newText}</hp:t>`, text: newText };
        continue;
      }

      // Case 2: Key와 Value가 다른 <hp:t>에 있음
      // Key 다음 <hp:t>를 찾아서 전체 교체
      if (keyTagIdx + 1 < allTags.length) {
        const valueTag = allTags[keyTagIdx + 1];
        const newMatch = `<hp:t>${value}</hp:t>`;
        xml = xml.replace(valueTag.match, newMatch);
        allTags[keyTagIdx + 1] = { ...valueTag, match: newMatch, text: value };
      }
    }

    zip.file(path, xml, { createFolders: false });
  }

  return await zip.generateAsync({ type: 'blob' });
}

/**
 * 원본 HWPX 파일 바이너리 패치
 */
async function patchOriginalHwpx(
  origBytes: Uint8Array,
  mappingData: MappingRow[],
  originalBlob: Blob,
): Promise<Blob> {
  const zip = await JSZip.loadAsync(origBytes);

  // 매핑 데이터에서 Value 위치와 새 Value 수집
  const replacements = new Map<number, { key: string; value: string }[]>();
  for (const row of mappingData) {
    const key = String(row['Key'] || '').trim();
    const value = String(row['Value'] || '').trim();
    if (!key || !value) continue;

    let sectionIndex = 0;
    try {
      if (row['ValuePosition']) {
        const pos = JSON.parse(String(row['ValuePosition']));
        sectionIndex = pos.sectionIndex ?? 0;
      }
    } catch { /* default 0 */ }

    if (!replacements.has(sectionIndex)) replacements.set(sectionIndex, []);
    replacements.get(sectionIndex)!.push({ key, value });
  }

  if (replacements.size === 0) return originalBlob;

  // 섹션 XML 수정
  let modified = false;
  for (const [secIdx, pairs] of replacements) {
    const path = `Contents/section${secIdx}.xml`;
    const file = zip.file(path);
    if (!file) continue;

    let xml = await file.async('string');

    for (const { key, value } of pairs) {
      const safeKey = escapeRegex(key);

      // Key 태그 뒤의 다음 <hp:t> 내용을 Value로 교체
      const pattern = new RegExp(
        `(<hp:t>${safeKey}</hp:t>` +
        `[\\s\\S]*?` +
        `<hp:t>)([\\s\\S]*?)(</hp:t>)`,
      );

      if (pattern.test(xml)) {
        xml = xml.replace(pattern, `$1${escapeXml(value)}$3`);
        modified = true;
      }
    }

    if (modified) {
      zip.file(path, xml, { createFolders: false });
    }
  }

  if (!modified) return originalBlob;

  // 바이너리 패치 방식 대신 JSZip 재패킹 (HWP→HWPX 변환 파일에는 문제 없음)
  return await zip.generateAsync({ type: 'blob' });
}

function escapeXml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
