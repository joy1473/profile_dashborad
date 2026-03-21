/**
 * HWP → HWPX 변환 (브라우저용)
 * @ssabrojs/hwpxjs의 HwpConverter 사용
 *
 * 주의: 텍스트 기반 변환이므로 서식(표, 이미지 등)은 보존되지 않음.
 * 완전한 서식 보존이 필요하면 한글 프로그램(COM)에서 직접 변환 필요.
 */

export async function convertHwpToHwpx(hwpBlob: Blob): Promise<Blob> {
  // cfb(OLE) + pako(zlib) + JSZip으로 HWP 본문 추출 → HWPX 구조 생성
  const CFB = (await import('cfb')).default;
  const pako = (await import('pako')).default;
  const JSZip = (await import('jszip')).default;

  const arrayBuffer = await hwpBlob.arrayBuffer();
  const data = new Uint8Array(arrayBuffer);
  const cfb = CFB.read(data, { type: 'array' });

  // FileHeader
  const headerEntry = CFB.find(cfb, '/FileHeader');
  if (!headerEntry?.content) throw new Error('HWP FileHeader 없음');
  const headerBytes = new Uint8Array(headerEntry.content as unknown as ArrayBuffer);
  const isCompressed = (headerBytes[36] & 1) !== 0;

  // BodyText에서 텍스트 추출
  const allTexts: string[][] = [];
  let sectionIdx = 0;
  while (true) {
    const entry = CFB.find(cfb, `/BodyText/Section${sectionIdx}`);
    if (!entry?.content) break;

    let bodyData = new Uint8Array(entry.content as unknown as ArrayBuffer);
    if (isCompressed) {
      try { bodyData = pako.inflateRaw(bodyData); } catch { sectionIdx++; continue; }
    }

    const texts = extractTexts(bodyData);
    allTexts.push(texts);
    sectionIdx++;
  }

  if (allTexts.length === 0 || allTexts.every(s => s.length === 0)) {
    throw new Error('HWP에서 텍스트를 추출할 수 없습니다. 배포용(DRM) 파일일 수 있습니다.');
  }

  // 최소 HWPX 구조 생성
  const zip = new JSZip();

  // mimetype (STORED — JSZip에서는 compression 옵션으로)
  zip.file('mimetype', 'application/hwp+zip', { compression: 'STORE' });

  // version.xml
  zip.file('version.xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes" ?><hv:HCFVersion xmlns:hv="http://www.hancom.co.kr/hwpml/2011/version" tagetApplication="WORDPROCESSOR" major="5" minor="1" micro="1" buildNumber="0"/>');

  // header.xml (최소)
  zip.file('Contents/header.xml', generateMinimalHeader());

  // section XML
  for (let i = 0; i < allTexts.length; i++) {
    zip.file(`Contents/section${i}.xml`, generateSectionXml(allTexts[i]));
  }

  // content.hpf (manifest)
  zip.file('Contents/content.hpf', generateContentHpf(allTexts.length));

  // settings.xml
  zip.file('settings.xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes" ?><ha:HWPApplicationSetting xmlns:ha="http://www.hancom.co.kr/hwpml/2011/app"/>');

  // META-INF
  zip.file('META-INF/container.xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes" ?><ocf:container xmlns:ocf="urn:oasis:names:tc:opendocument:xmlns:container"><ocf:rootfiles><ocf:rootfile full-path="Contents/content.hpf" media-type="application/hwpml-package+xml"/></ocf:rootfiles></ocf:container>');
  zip.file('META-INF/manifest.xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes" ?><odf:manifest xmlns:odf="urn:oasis:names:tc:opendocument:xmlns:manifest:1.0"/>');

  const blob = await zip.generateAsync({ type: 'blob' });
  return blob;
}

function extractTexts(bodyData: Uint8Array): string[] {
  const texts: string[] = [];
  const view = new DataView(bodyData.buffer, bodyData.byteOffset, bodyData.byteLength);
  let pos = 0;

  while (pos + 4 <= bodyData.length) {
    const headerVal = view.getUint32(pos, true);
    const tagId = headerVal & 0x3FF;
    let size = (headerVal >> 20) & 0xFFF;
    pos += 4;
    if (size === 0xFFF) {
      if (pos + 4 <= bodyData.length) { size = view.getUint32(pos, true); pos += 4; }
      else break;
    }
    if (pos + size > bodyData.length) break;

    if (tagId === 67) { // PARA_TEXT
      const chars: string[] = [];
      let j = 0;
      while (j + 1 < size) {
        const code = view.getUint16(pos + j, true);
        if (code === 0) break;
        if (code < 32) {
          if (code === 13) chars.push('\n');
          else if ([1,2,3,4,5,6,7,8,9,10,11,12,14,15,16,17,18,19,20,21,22,23,24].includes(code)) { j += 16; continue; }
        } else {
          chars.push(String.fromCharCode(code));
        }
        j += 2;
      }
      const text = chars.join('').trim();
      if (text) texts.push(text);
    }
    pos += size;
    if (size === 0 && tagId === 0) break;
  }
  return texts;
}

function escapeXml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function generateMinimalHeader(): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes" ?><hh:head xmlns:hh="http://www.hancom.co.kr/hwpml/2011/head"><hh:charProperties itemCnt="1"><hh:charPr id="0" height="1000" textColor="#000000" shadeColor="none" useFontSpace="0" useKerning="0" symMark="NONE" borderFillIDRef="1"><hh:fontRef hangul="0" latin="0" hanja="0" japanese="0" other="0" symbol="0" user="0"/><hh:ratio hangul="100" latin="100" hanja="100" japanese="100" other="100" symbol="100" user="100"/><hh:spacing hangul="0" latin="0" hanja="0" japanese="0" other="0" symbol="0" user="0"/><hh:relSz hangul="100" latin="100" hanja="100" japanese="100" other="100" symbol="100" user="100"/><hh:offset hangul="0" latin="0" hanja="0" japanese="0" other="0" symbol="0" user="0"/></hh:charPr></hh:charProperties><hh:paraProperties itemCnt="1"><hh:paraPr id="0" align="JUSTIFY"><hh:margin indent="0" left="0" right="0" prev="0" next="0"/><hh:lineSp type="PERCENT" value="160"/></hh:paraPr></hh:paraProperties><hh:borderFillProperties itemCnt="1"><hh:borderFill id="1" threeD="0" shadow="0" slash="NONE" backSlash="NONE" brokenCurve="NONE" countRotate="0"><hh:slash/><hh:backSlash/><hh:leftBorder type="NONE" width="0.12 mm" color="#000000"/><hh:rightBorder type="NONE" width="0.12 mm" color="#000000"/><hh:topBorder type="NONE" width="0.12 mm" color="#000000"/><hh:bottomBorder type="NONE" width="0.12 mm" color="#000000"/><hh:diagonal type="NONE" width="0.12 mm" color="#000000"/></hh:borderFill></hh:borderFillProperties><hh:fontfaces><hh:fontface lang="HANGUL"><hh:font id="0" face="맑은 고딕" type="TTF"/></hh:fontface><hh:fontface lang="LATIN"><hh:font id="0" face="맑은 고딕" type="TTF"/></hh:fontface><hh:fontface lang="HANJA"><hh:font id="0" face="맑은 고딕" type="TTF"/></hh:fontface></hh:fontfaces></hh:head>`;
}

function generateSectionXml(texts: string[]): string {
  let xml = `<?xml version="1.0" encoding="UTF-8" standalone="yes" ?><hs:sec xmlns:ha="http://www.hancom.co.kr/hwpml/2011/app" xmlns:hp="http://www.hancom.co.kr/hwpml/2011/paragraph" xmlns:hs="http://www.hancom.co.kr/hwpml/2011/section" xmlns:hc="http://www.hancom.co.kr/hwpml/2011/core" xmlns:hh="http://www.hancom.co.kr/hwpml/2011/head">`;

  for (const text of texts) {
    xml += `<hp:p paraPrIDRef="0" styleIDRef="0"><hp:run charPrIDRef="0"><hp:t>${escapeXml(text)}</hp:t></hp:run></hp:p>`;
  }

  xml += '</hs:sec>';
  return xml;
}

function generateContentHpf(sectionCount: number): string {
  let manifest = '';
  let spine = '';
  manifest += '<opf:item id="header" href="Contents/header.xml" media-type="application/xml"/>';
  spine += '<opf:itemref idref="header" linear="yes"/>';
  for (let i = 0; i < sectionCount; i++) {
    manifest += `<opf:item id="section${i}" href="Contents/section${i}.xml" media-type="application/xml"/>`;
    spine += `<opf:itemref idref="section${i}" linear="yes"/>`;
  }

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes" ?><opf:package xmlns:opf="http://www.idpf.org/2007/opf/" version="" unique-identifier="" id=""><opf:metadata><opf:language>ko</opf:language></opf:metadata><opf:manifest>${manifest}</opf:manifest><opf:spine>${spine}</opf:spine></opf:package>`;
}
