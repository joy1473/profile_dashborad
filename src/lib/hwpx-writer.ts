import JSZip from 'jszip';
import type { MappingRow } from '@/types/bid-analyzer';

/**
 * HWPX 파일 수정 — Python zipfile 호환 방식
 *
 * 문제: JSZip으로 재패킹하면 ZIP 헤더 버전, 압축률 등이 달라져
 * 한글 프로그램이 "변조" 감지.
 *
 * 해결: 원본 ZIP을 읽고 → XML만 수정 → Python의 zipfile 모듈처럼
 * 정확한 ZIP 구조로 재생성 (version=20, 원본 순서/압축 유지)
 */
export async function generateHwpx(
  originalBlob: Blob,
  mappingData: MappingRow[],
): Promise<Blob> {
  const arrayBuffer = await originalBlob.arrayBuffer();
  const zip = await JSZip.loadAsync(arrayBuffer);

  // 교체 항목 수집
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

    if (!replacements.has(sectionIndex)) replacements.set(sectionIndex, []);
    replacements.get(sectionIndex)!.push({ key: keyText, value: valueText });
  }

  // 수정할 파일 내용 맵
  const modifiedFiles = new Map<string, Uint8Array>();

  for (const [sectionIdx, items] of replacements) {
    const sectionPath = `Contents/section${sectionIdx}.xml`;
    const sectionFile = zip.file(sectionPath);
    if (!sectionFile) continue;

    let xml = await sectionFile.async('string');

    for (const { key, value } of items) {
      const escapedKey = escapeXml(key);
      const escapedValue = escapeXml(value);

      const pattern = new RegExp(`(<hp:t>)(${escapeRegex(escapedKey)})(</hp:t>)`, 'g');
      if (pattern.test(xml)) {
        xml = xml.replace(
          new RegExp(`(<hp:t>)(${escapeRegex(escapedKey)})(</hp:t>)`, 'g'),
          `$1${escapedValue}$3`
        );
      } else {
        xml = xml.replace(new RegExp(escapeRegex(key), 'g'), escapeXml(value));
      }
    }

    modifiedFiles.set(sectionPath, new TextEncoder().encode(xml));
  }

  // 수정된 파일이 없으면 원본 그대로 반환
  if (modifiedFiles.size === 0) return originalBlob;

  // 원본 ZIP 바이트 수준 재생성 (정확한 ZIP 구조)
  return await buildZip(zip, modifiedFiles);
}

/**
 * ZIP 수동 생성 — 한글 프로그램 호환
 * PKZIP 2.0 형식, mimetype은 STORED, 나머지 DEFLATED
 */
async function buildZip(
  zip: JSZip,
  modifiedFiles: Map<string, Uint8Array>,
): Promise<Blob> {
  const STORED_FILES = new Set(['mimetype', 'version.xml', 'Preview/PrvImage.png']);

  // 파일 목록 (폴더 제외)
  const files: string[] = [];
  zip.forEach((path, entry) => { if (!entry.dir) files.push(path); });

  // 각 파일의 데이터 준비
  interface FileEntry {
    path: string;
    data: Uint8Array;
    isStored: boolean;
  }

  const entries: FileEntry[] = [];
  for (const path of files) {
    const isStored = STORED_FILES.has(path);
    let data: Uint8Array;

    if (modifiedFiles.has(path)) {
      data = modifiedFiles.get(path)!;
    } else {
      data = await zip.file(path)!.async('uint8array');
    }

    entries.push({ path, data, isStored });
  }

  // 압축 처리
  const processedEntries: {
    path: string;
    uncompressedData: Uint8Array;
    compressedData: Uint8Array;
    isStored: boolean;
    crc32: number;
  }[] = [];

  for (const entry of entries) {
    const crc = crc32(entry.data);

    if (entry.isStored) {
      processedEntries.push({
        path: entry.path,
        uncompressedData: entry.data,
        compressedData: entry.data,
        isStored: true,
        crc32: crc,
      });
    } else {
      // DEFLATE 압축 — fflate 대신 원본 JSZip에서 이미 압축된 데이터 사용
      // 수정된 파일은 새로 압축 필요
      if (modifiedFiles.has(entry.path)) {
        // JSZip으로 개별 압축
        const tmpZip = new JSZip();
        tmpZip.file('tmp', entry.data, { compression: 'DEFLATE' });
        const tmpBuf = await tmpZip.generateAsync({ type: 'arraybuffer' });
        // tmpBuf에서 압축된 데이터 추출 (local file header 이후)
        const tmpView = new DataView(tmpBuf);
        const fnameLen = tmpView.getUint16(26, true);
        const extraLen = tmpView.getUint16(28, true);
        const dataOffset = 30 + fnameLen + extraLen;
        const compSize = tmpView.getUint32(18, true);
        const compressed = new Uint8Array(tmpBuf, dataOffset, compSize);
        processedEntries.push({
          path: entry.path,
          uncompressedData: entry.data,
          compressedData: compressed,
          isStored: false,
          crc32: crc,
        });
      } else {
        // 원본에서 압축된 데이터를 사용하고 싶지만 JSZip이 디코딩해버림
        // 다시 압축
        const tmpZip = new JSZip();
        tmpZip.file('tmp', entry.data, { compression: 'DEFLATE', compressionOptions: { level: 6 } });
        const tmpBuf = await tmpZip.generateAsync({ type: 'arraybuffer' });
        const tmpView = new DataView(tmpBuf);
        const fnameLen = tmpView.getUint16(26, true);
        const extraLen = tmpView.getUint16(28, true);
        const dataOffset = 30 + fnameLen + extraLen;
        const compSize = tmpView.getUint32(18, true);
        const compressed = new Uint8Array(tmpBuf, dataOffset, compSize);
        processedEntries.push({
          path: entry.path,
          uncompressedData: entry.data,
          compressedData: compressed,
          isStored: false,
          crc32: crc,
        });
      }
    }
  }

  // ZIP 바이너리 수동 생성
  const parts: Uint8Array[] = [];
  const centralDirectory: Uint8Array[] = [];
  let offset = 0;

  for (const entry of processedEntries) {
    const pathBytes = new TextEncoder().encode(entry.path);
    const compressionMethod = entry.isStored ? 0 : 8;
    const compressedSize = entry.compressedData.length;
    const uncompressedSize = entry.uncompressedData.length;

    // Local file header (30 bytes + filename)
    const localHeader = new ArrayBuffer(30);
    const lhView = new DataView(localHeader);
    lhView.setUint32(0, 0x04034b50, true);  // PK\x03\x04
    lhView.setUint16(4, 20, true);           // version needed: 2.0
    lhView.setUint16(6, 0, true);            // flags
    lhView.setUint16(8, compressionMethod, true);
    lhView.setUint16(10, 0, true);           // mod time
    lhView.setUint16(12, 0x0021, true);      // mod date
    lhView.setUint32(14, entry.crc32, true);
    lhView.setUint32(18, compressedSize, true);
    lhView.setUint32(22, uncompressedSize, true);
    lhView.setUint16(26, pathBytes.length, true);
    lhView.setUint16(28, 0, true);           // extra field length

    // Central directory entry
    const cdEntry = new ArrayBuffer(46);
    const cdView = new DataView(cdEntry);
    cdView.setUint32(0, 0x02014b50, true);   // PK\x01\x02
    cdView.setUint16(4, 20, true);           // version made by: 2.0
    cdView.setUint16(6, 20, true);           // version needed: 2.0
    cdView.setUint16(8, 0, true);            // flags
    cdView.setUint16(10, compressionMethod, true);
    cdView.setUint16(12, 0, true);           // mod time
    cdView.setUint16(14, 0x0021, true);      // mod date
    cdView.setUint32(16, entry.crc32, true);
    cdView.setUint32(20, compressedSize, true);
    cdView.setUint32(24, uncompressedSize, true);
    cdView.setUint16(28, pathBytes.length, true);
    cdView.setUint16(30, 0, true);           // extra field length
    cdView.setUint16(32, 0, true);           // comment length
    cdView.setUint16(34, 0, true);           // disk number
    cdView.setUint16(36, 0, true);           // internal attributes
    cdView.setUint32(38, 0, true);           // external attributes
    cdView.setUint32(42, offset, true);      // local header offset

    centralDirectory.push(new Uint8Array(cdEntry));
    centralDirectory.push(pathBytes);

    parts.push(new Uint8Array(localHeader));
    parts.push(pathBytes);
    parts.push(entry.compressedData);

    offset += 30 + pathBytes.length + compressedSize;
  }

  // Central directory
  const cdOffset = offset;
  let cdSize = 0;
  for (const part of centralDirectory) {
    parts.push(part);
    cdSize += part.length;
  }

  // End of central directory (22 bytes)
  const eocd = new ArrayBuffer(22);
  const eocdView = new DataView(eocd);
  eocdView.setUint32(0, 0x06054b50, true);  // PK\x05\x06
  eocdView.setUint16(4, 0, true);           // disk number
  eocdView.setUint16(6, 0, true);           // CD disk
  eocdView.setUint16(8, processedEntries.length, true);  // entries on disk
  eocdView.setUint16(10, processedEntries.length, true); // total entries
  eocdView.setUint32(12, cdSize, true);
  eocdView.setUint32(16, cdOffset, true);
  eocdView.setUint16(20, 0, true);          // comment length

  parts.push(new Uint8Array(eocd));

  // Combine
  const totalSize = parts.reduce((sum, p) => sum + p.length, 0);
  const result = new Uint8Array(totalSize);
  let pos = 0;
  for (const part of parts) {
    result.set(part, pos);
    pos += part.length;
  }

  return new Blob([result], { type: 'application/hwp+zip' });
}

// CRC32 계산
function crc32(data: Uint8Array): number {
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < data.length; i++) {
    crc ^= data[i];
    for (let j = 0; j < 8; j++) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xEDB88320 : 0);
    }
  }
  return (crc ^ 0xFFFFFFFF) >>> 0;
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
