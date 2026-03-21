import JSZip from 'jszip';
import type { MappingRow } from '@/types/bid-analyzer';

/**
 * HWPX 파일 수정 — 원본 ZIP 바이너리 직접 패치
 *
 * 전략: ZIP을 재생성하지 않고, 원본 바이너리에서
 * 특정 섹션 XML의 compressed data만 교체한 후
 * 오프셋/크기/CRC만 업데이트
 *
 * 이렇게 하면 한글 프로그램이 감지하는 ZIP 구조 차이가 없음
 */
export async function generateHwpx(
  originalBlob: Blob,
  mappingData: MappingRow[],
): Promise<Blob> {
  const origBuffer = await originalBlob.arrayBuffer();
  const origBytes = new Uint8Array(origBuffer);

  // JSZip으로 원본 읽기 (XML 파싱 용도만)
  const zip = await JSZip.loadAsync(origBuffer);

  // 교체 항목 수집 — Value 위치의 기존 텍스트를 새 Value로 교체
  const replacements = new Map<number, { oldText: string; newText: string }[]>();
  for (const row of mappingData) {
    const newValue = String(row['Value'] || '').trim();
    if (!newValue) continue;

    // ValuePosition에서 기존 텍스트와 위치 추출
    let sectionIndex = 0;
    let oldText = '';

    try {
      if (row['ValuePosition']) {
        const pos = JSON.parse(String(row['ValuePosition']));
        sectionIndex = pos.sectionIndex ?? 0;
      }
    } catch { /* default 0 */ }

    // Key 텍스트는 라벨이고, Value 위치의 기존 내용을 교체해야 함
    // 엑셀에 기존 Value 텍스트가 별도로 없으므로,
    // Key(라벨)에 대응하는 Value 위치의 기존 텍스트 = 양식의 플레이스홀더
    // → Key 텍스트가 아닌, Value 열의 텍스트를 해당 위치에 넣어야 함
    //
    // 실제 동작: ValuePosition의 domElementId에서 파싱한 paragraphIndex를 기준으로
    // 해당 위치의 <hp:t> 태그 내용을 찾아 교체
    //
    // 하지만 양식 파일에서 Value 위치의 기존 텍스트를 알 수 없으므로,
    // Key 텍스트 자체가 양식에 있는 라벨이 아니라 "빈 칸" 또는 "플레이스홀더"일 수 있음
    //
    // 가장 안전한 방법: Key 컬럼의 텍스트를 찾아 교체하지 말고,
    // Key의 다음 <hp:t> 태그(= Value 위치)를 교체
    // 이를 위해 Key 텍스트를 앵커로 사용
    const keyText = String(row['Key'] || '').trim();
    if (!keyText) continue;

    oldText = keyText; // Key를 앵커로 사용하여 그 뒤의 Value 위치를 찾음

    if (!replacements.has(sectionIndex)) replacements.set(sectionIndex, []);
    replacements.get(sectionIndex)!.push({ oldText: keyText, newText: newValue });
  }

  if (replacements.size === 0) return originalBlob;

  // 수정이 필요한 파일별로 새 compressed data 생성
  interface PatchInfo {
    filename: string;
    newCompressed: Uint8Array;
    newUncompressedSize: number;
    newCrc32: number;
  }
  const patches: PatchInfo[] = [];

  for (const [sectionIdx, items] of replacements) {
    const filename = `Contents/section${sectionIdx}.xml`;
    const sectionFile = zip.file(filename);
    if (!sectionFile) continue;

    let xml = await sectionFile.async('string');

    for (const { oldText, newText } of items) {
      if (!oldText || !newText) continue;

      const safeKey = escapeRegex(oldText);

      // Key(라벨) 텍스트를 찾고, 그 뒤에 오는 다음 <hp:t>...</hp:t>의 내용을 Value로 교체
      // 패턴: <hp:t>KEY</hp:t> ... <hp:t>OLD_VALUE</hp:t>
      //   → <hp:t>KEY</hp:t> ... <hp:t>NEW_VALUE</hp:t>
      const afterKeyPattern = new RegExp(
        `(<hp:t>${safeKey}</hp:t>` +       // Key 태그 (유지)
        `(?:(?!</hp:t>).)*?` +              // Key와 Value 사이 내용 (최소 매칭)
        `<hp:t>)(.*?)(</hp:t>)`,            // 다음 <hp:t> = Value 위치
        's' // dotAll 모드
      );

      if (afterKeyPattern.test(xml)) {
        xml = xml.replace(afterKeyPattern, `$1${newText}$3`);
      }
    }

    const newData = new TextEncoder().encode(xml);
    const newCrc = crc32(newData);

    // DEFLATE 압축 — JSZip으로 개별 압축
    const tmpZip = new JSZip();
    tmpZip.file('tmp', newData, { compression: 'DEFLATE', compressionOptions: { level: 6 } });
    const tmpBuf = await tmpZip.generateAsync({ type: 'arraybuffer' });

    // 압축된 데이터 추출
    const tmpView = new DataView(tmpBuf);
    const fnameLen = tmpView.getUint16(26, true);
    const extraLen = tmpView.getUint16(28, true);
    const dataOffset = 30 + fnameLen + extraLen;
    const compSize = tmpView.getUint32(18, true);
    const newCompressed = new Uint8Array(tmpBuf, dataOffset, compSize);

    patches.push({
      filename,
      newCompressed,
      newUncompressedSize: newData.length,
      newCrc32: newCrc,
    });
  }

  // 원본 ZIP 바이너리에서 파일 엔트리 위치 파싱
  const entries = parseZipEntries(origBytes);

  // 새 ZIP 바이너리 빌드 (원본 기반, 패치 적용)
  return buildPatchedZip(origBytes, entries, patches);
}

interface ZipEntry {
  filename: string;
  localHeaderOffset: number;
  filenameLength: number;
  extraFieldLength: number;
  compressedSize: number;
  uncompressedSize: number;
  compressionMethod: number;
  crc32: number;
  dataOffset: number; // 실제 데이터 시작 위치
}

function parseZipEntries(data: Uint8Array): ZipEntry[] {
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  const entries: ZipEntry[] = [];

  // EOCD 찾기 (끝에서 검색)
  let eocdOffset = -1;
  for (let i = data.length - 22; i >= 0; i--) {
    if (view.getUint32(i, true) === 0x06054b50) {
      eocdOffset = i;
      break;
    }
  }
  if (eocdOffset === -1) throw new Error('EOCD not found');

  const cdOffset = view.getUint32(eocdOffset + 16, true);
  const cdEntries = view.getUint16(eocdOffset + 10, true);

  // Central Directory 파싱
  let pos = cdOffset;
  for (let i = 0; i < cdEntries; i++) {
    if (view.getUint32(pos, true) !== 0x02014b50) break;

    const compressionMethod = view.getUint16(pos + 10, true);
    const crc32val = view.getUint32(pos + 16, true);
    const compressedSize = view.getUint32(pos + 20, true);
    const uncompressedSize = view.getUint32(pos + 24, true);
    const filenameLength = view.getUint16(pos + 28, true);
    const extraLength = view.getUint16(pos + 30, true);
    const commentLength = view.getUint16(pos + 32, true);
    const localHeaderOffset = view.getUint32(pos + 42, true);

    const filenameBytes = data.slice(pos + 46, pos + 46 + filenameLength);
    const filename = new TextDecoder().decode(filenameBytes);

    // Local header에서 extra field length 읽기 (CD와 다를 수 있음)
    const localExtraLen = view.getUint16(localHeaderOffset + 28, true);
    const dataOffset = localHeaderOffset + 30 + filenameLength + localExtraLen;

    entries.push({
      filename,
      localHeaderOffset,
      filenameLength,
      extraFieldLength: localExtraLen,
      compressedSize,
      uncompressedSize,
      compressionMethod,
      crc32: crc32val,
      dataOffset,
    });

    pos += 46 + filenameLength + extraLength + commentLength;
  }

  return entries;
}

function buildPatchedZip(
  origData: Uint8Array,
  entries: ZipEntry[],
  patches: { filename: string; newCompressed: Uint8Array; newUncompressedSize: number; newCrc32: number }[],
): Blob {
  const patchMap = new Map(patches.map((p) => [p.filename, p]));

  // 새 ZIP 빌드: 각 엔트리를 순서대로 출력
  const parts: Uint8Array[] = [];
  const newOffsets: number[] = [];
  let currentOffset = 0;

  for (const entry of entries) {
    const patch = patchMap.get(entry.filename);

    // Local file header 복사 (30 + filename + extra)
    const headerSize = 30 + entry.filenameLength + entry.extraFieldLength;
    const header = new Uint8Array(origData.buffer, origData.byteOffset + entry.localHeaderOffset, headerSize);
    const headerCopy = new Uint8Array(header); // 복사본

    let compressedData: Uint8Array;

    if (patch) {
      // 패치 대상: 헤더의 CRC/크기 업데이트
      const hView = new DataView(headerCopy.buffer, headerCopy.byteOffset, headerCopy.byteLength);
      hView.setUint32(14, patch.newCrc32, true);
      hView.setUint32(18, patch.newCompressed.length, true);
      hView.setUint32(22, patch.newUncompressedSize, true);
      compressedData = patch.newCompressed;
    } else {
      // 원본 데이터 그대로
      compressedData = new Uint8Array(
        origData.buffer,
        origData.byteOffset + entry.dataOffset,
        entry.compressedSize,
      );
    }

    newOffsets.push(currentOffset);
    parts.push(headerCopy);
    parts.push(compressedData);
    currentOffset += headerCopy.length + compressedData.length;
  }

  // Central Directory 재구성
  const cdStart = currentOffset;
  const origView = new DataView(origData.buffer, origData.byteOffset, origData.byteLength);

  // EOCD 찾기
  let eocdOffset = -1;
  for (let i = origData.length - 22; i >= 0; i--) {
    if (origView.getUint32(i, true) === 0x06054b50) {
      eocdOffset = i;
      break;
    }
  }

  const origCdOffset = origView.getUint32(eocdOffset + 16, true);
  let cdPos = origCdOffset;

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    const patch = patchMap.get(entry.filename);

    // CD entry 크기
    const fnLen = origView.getUint16(cdPos + 28, true);
    const exLen = origView.getUint16(cdPos + 30, true);
    const cmLen = origView.getUint16(cdPos + 32, true);
    const cdEntrySize = 46 + fnLen + exLen + cmLen;

    // CD entry 복사
    const cdEntry = new Uint8Array(origData.buffer, origData.byteOffset + cdPos, cdEntrySize);
    const cdCopy = new Uint8Array(cdEntry);

    const cdView = new DataView(cdCopy.buffer, cdCopy.byteOffset, cdCopy.byteLength);

    // 오프셋 업데이트
    cdView.setUint32(42, newOffsets[i], true);

    // 패치 대상이면 CRC/크기도 업데이트
    if (patch) {
      cdView.setUint32(16, patch.newCrc32, true);
      cdView.setUint32(20, patch.newCompressed.length, true);
      cdView.setUint32(24, patch.newUncompressedSize, true);
    }

    parts.push(cdCopy);
    currentOffset += cdCopy.length;

    cdPos += cdEntrySize;
  }

  const cdSize = currentOffset - cdStart;

  // EOCD 복사 + 업데이트
  const eocdSize = origData.length - eocdOffset;
  const eocd = new Uint8Array(origData.buffer, origData.byteOffset + eocdOffset, eocdSize);
  const eocdCopy = new Uint8Array(eocd);
  const eocdView = new DataView(eocdCopy.buffer, eocdCopy.byteOffset, eocdCopy.byteLength);
  eocdView.setUint32(12, cdSize, true);
  eocdView.setUint32(16, cdStart, true);
  parts.push(eocdCopy);

  // 합치기
  const totalSize = parts.reduce((s, p) => s + p.length, 0);
  const result = new Uint8Array(totalSize);
  let pos = 0;
  for (const part of parts) {
    result.set(part, pos);
    pos += part.length;
  }

  return new Blob([result], { type: 'application/hwp+zip' });
}

function crc32(data: Uint8Array): number {
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < data.length; i++) {
    crc ^= data[i];
    for (let j = 0; j < 8; j++) crc = (crc >>> 1) ^ (crc & 1 ? 0xEDB88320 : 0);
  }
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

function escapeXml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
