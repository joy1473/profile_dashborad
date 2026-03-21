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

    // 모든 <hp:p>...</hp:p> 블록을 파싱
    const allParas: { full: string; texts: string[]; index: number }[] = [];
    const paraPattern = /<hp:p[^>]*>[\s\S]*?<\/hp:p>/g;
    let pm;
    while ((pm = paraPattern.exec(xml)) !== null) {
      // 이 문단 내의 모든 <hp:t> 텍스트 추출
      const texts: string[] = [];
      const tPattern = /<hp:t>([\s\S]*?)<\/hp:t>/g;
      let tm;
      while ((tm = tPattern.exec(pm[0])) !== null) {
        texts.push(tm[1]);
      }
      allParas.push({ full: pm[0], texts, index: pm.index });
    }

    for (const { key, value } of pairs) {
      // Key 텍스트를 포함하는 문단 찾기
      const keyParaIdx = allParas.findIndex(p =>
        p.texts.some(t => t.trim() === key.trim())
      );

      if (keyParaIdx !== -1 && keyParaIdx + 1 < allParas.length) {
        // Key 다음 문단 전체를 Value로 교체
        // 다음 문단의 모든 <hp:run>을 제거하고 Value 하나로 교체
        const valuePara = allParas[keyParaIdx + 1];
        const valueXml = valueToHwpxParagraphs(value);

        xml = xml.replace(valuePara.full, valueXml);

        // allParas 업데이트 (이후 매핑에 영향 방지)
        allParas[keyParaIdx + 1] = {
          ...valuePara,
          full: valueXml,
          texts: [value],
        };
        continue;
      }

      // Key가 정확히 일치하지 않으면 부분 포함으로 검색
      const partialParaIdx = allParas.findIndex(p =>
        p.texts.some(t => t.includes(key)) &&
        !p.texts.some(t => t.trim() === key.trim()) // 정확 매칭은 위에서 처리됨
      );

      if (partialParaIdx !== -1) {
        // Key가 포함된 문단에서 Key 부분만 남기고 나머지 제거 + Value 문단 추가
        const para = allParas[partialParaIdx];
        const keyOnlyPara = `<hp:p paraPrIDRef="0" styleIDRef="0"><hp:run charPrIDRef="0"><hp:t>${escapeXml(key)}</hp:t></hp:run></hp:p>`;
        const valueXml = valueToHwpxParagraphs(value);

        xml = xml.replace(para.full, keyOnlyPara + valueXml);
        allParas[partialParaIdx] = { ...para, full: keyOnlyPara + valueXml, texts: [key, value] };
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
