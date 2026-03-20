import JSZip from 'jszip';
import { XMLParser } from 'fast-xml-parser';
import type {
  DocumentModel,
  DocumentSection,
  DocumentElement,
  DocumentPosition,
  CharStyle,
} from '@/types/bid-analyzer';
import { isBlueColor } from '@/types/bid-analyzer';

const xmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  textNodeName: '#text',
  isArray: (name) => {
    const arrayTags = ['hp:p', 'hp:run', 'hp:tbl', 'hp:tr', 'hp:tc', 'hp:subList', 'hp:ctrl', 'hh:charPr'];
    return arrayTags.includes(name);
  },
});

// Parse charPr styles from header.xml
function parseCharStyles(headerXml: string): Map<string, CharStyle> {
  const styles = new Map<string, CharStyle>();
  const parsed = xmlParser.parse(headerXml);

  const charProps =
    parsed?.['hh:head']?.['hh:charProperties']?.['hh:charPr'] ||
    parsed?.['head']?.['charProperties']?.['charPr'] ||
    [];

  const arr = Array.isArray(charProps) ? charProps : [charProps];
  for (const cp of arr) {
    if (!cp) continue;
    const id = String(cp['@_id'] ?? '');
    const textColor = String(cp['@_textColor'] ?? '#000000');
    const height = Number(cp['@_height'] ?? 1000);

    styles.set(id, {
      id,
      textColor,
      height,
      isBlue: isBlueColor(textColor),
    });
  }

  return styles;
}

interface RunInfo {
  charPrIdRef: string;
  text: string;
  textColor: string;
  isBlue: boolean;
}

// Extract runs from a paragraph element
function extractRuns(para: Record<string, unknown>, charStyles: Map<string, CharStyle>): RunInfo[] {
  const runs: RunInfo[] = [];
  const runList = para['hp:run'];
  if (!runList) return runs;

  const arr = Array.isArray(runList) ? runList : [runList];
  for (const run of arr) {
    if (!run) continue;
    const charPrIdRef = String((run as Record<string, unknown>)['@_charPrIDRef'] ?? '0');
    const t = (run as Record<string, unknown>)['hp:t'];
    const text = typeof t === 'string' ? t : typeof t === 'object' && t ? String((t as Record<string, string>)['#text'] ?? '') : '';

    if (!text) continue;

    const style = charStyles.get(charPrIdRef);
    runs.push({
      charPrIdRef,
      text,
      textColor: style?.textColor ?? '#000000',
      isBlue: style?.isBlue ?? false,
    });
  }
  return runs;
}

// Check if current position is inside a table
function isInsideTable(context: { inTable: boolean }): boolean {
  return context.inTable;
}

// Build HTML from section XML
function buildSectionHtml(
  sectionXml: string,
  sectionIndex: number,
  charStyles: Map<string, CharStyle>,
  positionMap: Map<string, DocumentPosition>,
  elements: DocumentElement[],
): string {
  const parsed = xmlParser.parse(sectionXml);
  const sec = parsed?.['hs:sec'] || parsed?.['sec'] || {};
  const paragraphs = sec['hp:p'] || [];
  const paraArr = Array.isArray(paragraphs) ? paragraphs : [paragraphs];

  let html = `<div class="hwpx-section" data-section="${sectionIndex}">`;
  let paraIndex = 0;
  let tableIndex = 0;

  for (const para of paraArr) {
    if (!para) continue;

    // Check if paragraph contains a table
    // Tables can be in: hp:run > hp:tbl, hp:run > hp:ctrl > hp:tbl, or directly
    const runs = para['hp:run'];
    const runArr = Array.isArray(runs) ? runs : runs ? [runs] : [];

    let hasTable = false;

    // Deep search for tables within runs
    function findTables(obj: unknown): Record<string, unknown>[] {
      const tables: Record<string, unknown>[] = [];
      if (!obj || typeof obj !== 'object') return tables;
      const o = obj as Record<string, unknown>;
      if (o['hp:tbl']) {
        const t = o['hp:tbl'];
        const tArr = Array.isArray(t) ? t : [t];
        for (const tb of tArr) {
          if (tb) tables.push(tb as Record<string, unknown>);
        }
      }
      // Check nested ctrl
      if (o['hp:ctrl']) {
        const ctrl = o['hp:ctrl'];
        const ctrlArr = Array.isArray(ctrl) ? ctrl : [ctrl];
        for (const c of ctrlArr) {
          tables.push(...findTables(c));
        }
      }
      return tables;
    }

    for (const run of runArr) {
      if (!run) continue;
      const tables = findTables(run);
      for (const tbl of tables) {
        hasTable = true;
        html += buildTableHtml(tbl, sectionIndex, tableIndex, charStyles, positionMap, elements);
        tableIndex++;
      }
    }

    if (!hasTable) {
      // Regular paragraph
      const runInfos = extractRuns(para as Record<string, unknown>, charStyles);
      if (runInfos.length > 0) {
        html += `<p class="hwpx-para" data-para="${paraIndex}">`;
        let runIndex = 0;
        for (const ri of runInfos) {
          const domId = `s${sectionIndex}-p${paraIndex}-r${runIndex}`;
          const colorClass = ri.isBlue ? 'hwpx-blue' : 'hwpx-black';
          const pos: DocumentPosition = {
            fileType: 'hwpx',
            sectionIndex,
            paragraphIndex: paraIndex,
            runIndex,
            charOffset: 0,
            charLength: ri.text.length,
            charPrIdRef: ri.charPrIdRef,
            textColor: ri.textColor,
            domElementId: domId,
          };
          positionMap.set(domId, pos);

          html += `<span id="${domId}" class="hwpx-run ${colorClass}" data-pos-id="${domId}" style="color:${ri.textColor}">${escapeHtml(ri.text)}</span>`;

          elements.push({
            type: 'paragraph',
            position: pos,
            content: ri.text,
            style: {
              color: ri.textColor,
              fontSize: 10,
              bold: false,
              italic: ri.isBlue,
            },
          });
          runIndex++;
        }
        html += '</p>';
      }
    }
    paraIndex++;
  }

  html += '</div>';
  return html;
}

// Build table HTML
function buildTableHtml(
  tbl: Record<string, unknown>,
  sectionIndex: number,
  tableIndex: number,
  charStyles: Map<string, CharStyle>,
  positionMap: Map<string, DocumentPosition>,
  elements: DocumentElement[],
): string {
  let html = `<table class="hwpx-table" data-table="${tableIndex}" border="1" cellpadding="4" cellspacing="0">`;

  const rows = (tbl as Record<string, unknown>)['hp:tr'];
  const rowArr = Array.isArray(rows) ? rows : rows ? [rows] : [];

  let rowIndex = 0;
  for (const row of rowArr) {
    if (!row) continue;
    html += '<tr>';

    const cells = (row as Record<string, unknown>)['hp:tc'];
    const cellArr = Array.isArray(cells) ? cells : cells ? [cells] : [];

    let colIndex = 0;
    for (const cell of cellArr) {
      if (!cell) continue;

      // Get cell span info — hp:cellSpan has colSpan/rowSpan
      const cellSpan = (cell as Record<string, unknown>)['hp:cellSpan'] as Record<string, unknown> | undefined;
      const colspan = Number(cellSpan?.['@_colSpan'] ?? 1);
      const rowspan = Number(cellSpan?.['@_rowSpan'] ?? 1);

      html += `<td${colspan > 1 ? ` colspan="${colspan}"` : ''}${rowspan > 1 ? ` rowspan="${rowspan}"` : ''}>`;

      // Cell paragraphs — HWPX uses hp:tc > hp:subList > hp:p > hp:run
      // subList can be array, collect all paragraphs
      const subLists = (cell as Record<string, unknown>)['hp:subList'];
      const subListArr = Array.isArray(subLists) ? subLists : subLists ? [subLists] : [];
      let allCellParas: unknown[] = [];
      for (const sl of subListArr) {
        const slObj = sl as Record<string, unknown>;
        const ps = slObj?.['hp:p'];
        const psArr = Array.isArray(ps) ? ps : ps ? [ps] : [];
        allCellParas.push(...psArr);
      }
      // Fallback: direct hp:p under hp:tc
      if (allCellParas.length === 0) {
        const directP = (cell as Record<string, unknown>)['hp:p'];
        allCellParas = Array.isArray(directP) ? directP : directP ? [directP] : [];
      }
      const cellParaArr = allCellParas;

      let cellHasContent = false;
      for (const cp of cellParaArr) {
        if (!cp) continue;
        const cellRuns = extractRuns(cp as Record<string, unknown>, charStyles);
        for (let ri = 0; ri < cellRuns.length; ri++) {
          cellHasContent = true;
          const run = cellRuns[ri];
          const domId = `s${sectionIndex}-t${tableIndex}-r${rowIndex}-c${colIndex}-run${ri}`;
          const colorClass = run.isBlue ? 'hwpx-blue' : 'hwpx-black';

          const pos: DocumentPosition = {
            fileType: 'hwpx',
            sectionIndex,
            tableIndex,
            rowIndex,
            colIndex,
            paragraphIndex: 0,
            runIndex: ri,
            charOffset: 0,
            charLength: run.text.length,
            charPrIdRef: run.charPrIdRef,
            textColor: run.textColor,
            domElementId: domId,
          };
          positionMap.set(domId, pos);

          html += `<span id="${domId}" class="hwpx-run ${colorClass}" data-pos-id="${domId}" style="color:${run.textColor}">${escapeHtml(run.text)}</span>`;

          elements.push({
            type: 'table',
            position: pos,
            content: run.text,
            style: {
              color: run.textColor,
              fontSize: 10,
              bold: false,
              italic: run.isBlue,
            },
          });
        }
      }

      // 빈 셀에도 클릭 가능한 placeholder 추가
      if (!cellHasContent) {
        const domId = `s${sectionIndex}-t${tableIndex}-r${rowIndex}-c${colIndex}-empty`;
        const pos: DocumentPosition = {
          fileType: 'hwpx',
          sectionIndex,
          tableIndex,
          rowIndex,
          colIndex,
          paragraphIndex: 0,
          runIndex: 0,
          charOffset: 0,
          charLength: 0,
          domElementId: domId,
        };
        positionMap.set(domId, pos);
        html += `<span id="${domId}" class="hwpx-run hwpx-empty" data-pos-id="${domId}">&nbsp;</span>`;
        elements.push({
          type: 'table',
          position: pos,
          content: '',
          style: { color: '#999', fontSize: 10, bold: false, italic: false },
        });
      }

      html += '</td>';
      colIndex++;
    }
    html += '</tr>';
    rowIndex++;
  }

  html += '</table>';
  return html;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// Main parser
export async function parseHwpx(file: File | Blob, fileName: string): Promise<DocumentModel> {
  const zip = await JSZip.loadAsync(file);

  // Parse header.xml for char styles
  const headerFile = zip.file('Contents/header.xml');
  if (!headerFile) throw new Error('header.xml not found in HWPX');
  const headerXml = await headerFile.async('string');
  const charStyles = parseCharStyles(headerXml);

  // Find section files
  const sectionFiles: { name: string; index: number }[] = [];
  zip.forEach((path) => {
    const match = path.match(/Contents\/section(\d+)\.xml/);
    if (match) {
      sectionFiles.push({ name: path, index: parseInt(match[1]) });
    }
  });
  sectionFiles.sort((a, b) => a.index - b.index);

  const positionMap = new Map<string, DocumentPosition>();
  const sections: DocumentSection[] = [];
  let fullHtml = '<div class="hwpx-document">';

  fullHtml += `<style>
    .hwpx-document { font-family: 'Malgun Gothic', sans-serif; font-size: 10pt; line-height: 1.6; padding: 20px; background: white; }
    .hwpx-section { margin-bottom: 20px; }
    .hwpx-para { margin: 4px 0; }
    .hwpx-table { width: 100%; border-collapse: collapse; margin: 8px 0; }
    .hwpx-table td { border: 1px solid #999; padding: 4px 8px; vertical-align: top; font-size: 9pt; }
    .hwpx-run { cursor: default; }
    .hwpx-blue { color: #3366FF; font-style: italic; }
    .hwpx-black { color: #000000; }
    .hwpx-run.selected { background: #FFEB3B; outline: 2px solid #FF9800; }
    .hwpx-run:hover { background: rgba(66, 133, 244, 0.1); }
    .hwpx-empty { display: inline-block; min-width: 40px; min-height: 16px; }
    .edit-mode .hwpx-run { cursor: text; }
    .edit-mode .hwpx-blue:hover { background: rgba(51, 102, 255, 0.15); }
    .edit-mode .hwpx-empty:hover { background: rgba(255, 152, 0, 0.15); outline: 1px dashed #FF9800; }
    .hwpx-run.drag-selected { background: #C8E6C9; outline: 2px solid #4CAF50; }
  </style>`;

  for (const sf of sectionFiles) {
    const sectionFile = zip.file(sf.name);
    if (!sectionFile) continue;
    const sectionXml = await sectionFile.async('string');

    const elements: DocumentElement[] = [];
    const sectionHtml = buildSectionHtml(sectionXml, sf.index, charStyles, positionMap, elements);

    sections.push({
      index: sf.index,
      name: sf.name,
      elements,
    });

    fullHtml += sectionHtml;
  }

  fullHtml += '</div>';

  return {
    fileName,
    fileType: 'hwpx',
    originalBlob: file instanceof Blob ? file : new Blob([file]),
    sections,
    charStyles,
    renderedHtml: fullHtml,
    positionMap,
  };
}
