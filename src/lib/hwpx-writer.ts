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
      // Key 텍스트가 정확히 일치하는 <hp:t> 태그를 찾기
      const keyTagIdx = allTags.findIndex(t => t.text.trim() === key.trim());

      if (keyTagIdx !== -1 && keyTagIdx + 1 < allTags.length) {
        // Case A: Key와 Value가 별도 <hp:t>에 있음 (가장 일반적)
        // Key 다음 <hp:t>의 내용을 Value로 완전 교체
        const valueTag = allTags[keyTagIdx + 1];

        // 줄바꿈이 있는 value → 여러 <hp:p> 문단으로 분할
        const valueXml = valueToHwpxParagraphs(value);
        const newMatch = valueXml;

        // 기존 valueTag를 새 내용으로 교체
        // valueTag가 속한 <hp:p>...</hp:p> 전체를 교체하여 잔류 방지
        const pStartPattern = new RegExp(
          `<hp:p[^>]*>[\\s\\S]*?${escapeRegex(valueTag.match)}[\\s\\S]*?</hp:p>`
        );
        const pMatch = xml.match(pStartPattern);
        if (pMatch) {
          xml = xml.replace(pMatch[0], valueXml);
        } else {
          xml = xml.replace(valueTag.match, `<hp:t>${escapeXml(value)}</hp:t>`);
        }
        continue;
      }

      // Case B: Key가 다른 텍스트 안에 포함됨 (부분 매칭)
      const partialIdx = allTags.findIndex(t => t.text.includes(key));
      if (partialIdx !== -1) {
        const tag = allTags[partialIdx];
        // Key 이후 내용을 Value로 교체
        const keyEndPos = tag.text.indexOf(key) + key.length;
        const newText = tag.text.substring(0, keyEndPos);

        // 같은 문단의 나머지 내용 제거하고, Value를 다음 문단으로 추가
        const valueXml = valueToHwpxParagraphs(value);

        // 기존 태그를 Key만 남기고, 바로 뒤에 Value 문단 삽입
        const tagEndInXml = xml.indexOf(tag.match) + tag.match.length;
        // 현재 </hp:p> 찾기
        const pEndIdx = xml.indexOf('</hp:p>', tagEndInXml);
        if (pEndIdx !== -1) {
          const beforeReplace = xml.substring(0, xml.indexOf(tag.match));
          const afterReplace = xml.substring(pEndIdx + '</hp:p>'.length);
          xml = beforeReplace + `<hp:t>${escapeXml(newText)}</hp:t></hp:run></hp:p>` + valueXml + afterReplace;
        }
      }
    }

    // allTags 재구축 (다음 섹션 처리를 위해)
    // 이미 pairs 처리 완료했으므로 불필요

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

/** Value 텍스트를 HWPX 문단 XML로 변환 (줄바꿈 → 별도 <hp:p>) */
function valueToHwpxParagraphs(value: string): string {
  const lines = value.split('\n').filter(l => l.trim());
  if (lines.length === 0) return '<hp:p paraPrIDRef="0" styleIDRef="0"><hp:run charPrIDRef="0"><hp:t> </hp:t></hp:run></hp:p>';

  return lines.map(line =>
    `<hp:p paraPrIDRef="0" styleIDRef="0"><hp:run charPrIDRef="0"><hp:t>${escapeXml(line.trim())}</hp:t></hp:run></hp:p>`
  ).join('');
}

function escapeXml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
