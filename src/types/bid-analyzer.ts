// Bid Document Analyzer Types

export type FileType = 'hwpx' | 'hwp' | 'docx' | 'doc' | 'xlsx' | 'xls' | 'pdf' | 'html';
export type SupportedViewerType = 'hwpx' | 'docx' | 'xlsx' | 'pdf';

export interface DocumentPosition {
  fileType: FileType;
  sectionIndex: number;
  // Table context
  tableIndex?: number;
  rowIndex?: number;
  colIndex?: number;
  // Paragraph context
  paragraphIndex: number;
  runIndex: number;
  charOffset: number;
  charLength: number;
  // HWPX specific
  charPrIdRef?: string;
  textColor?: string;
  // XLSX specific
  sheetName?: string;
  cellRef?: string;
  // PDF specific
  pageNumber?: number;
  // DOM mapping
  domElementId: string;
}

export interface TextSelection {
  id: string;
  text: string;
  position: DocumentPosition;
  role?: 'key' | 'value';
}

export interface KeyValuePair {
  id: string;
  key: string;
  keyPosition: DocumentPosition;
  value: string;
  valuePosition: DocumentPosition;
  colorType?: 'black' | 'blue';
  contentType?: 'text' | 'amount' | 'table' | 'image' | 'description';
  notes?: string;
}

export interface CharStyle {
  id: string;
  textColor: string;
  height: number;
  fontRef?: string;
  isBlue: boolean;
}

export interface DocumentSection {
  index: number;
  name: string;
  elements: DocumentElement[];
}

export interface DocumentElement {
  type: 'paragraph' | 'table' | 'image';
  text?: string;
  domId?: string;
  position: DocumentPosition;
  content: string;
  children?: DocumentElement[];
  imageDataUrl?: string;       // 스캔 페이지 이미지 (base64)
  ocrPairs?: OcrKeyValue[];    // OCR 추출 결과
  ocrProcessed?: boolean;      // OCR 처리 완료 여부
  style?: {
    color: string;
    fontSize: number;
    bold: boolean;
    italic: boolean;
  };
}

export interface OcrKeyValue {
  key: string;
  value: string;
  confidence: number;         // 0.0 ~ 1.0
}

export interface DocumentModel {
  fileName: string;
  fileType?: FileType;
  originalBlob?: Blob;
  sections: DocumentSection[] | DocumentElement[];
  charStyles?: Map<string, CharStyle>;
  renderedHtml: string;
  positionMap: Map<string, DocumentPosition>;
}

export interface UploadedFile {
  id: string;
  name: string;
  type: FileType;
  size: number;
  blob: Blob;
  uploadedAt: Date;
  model?: DocumentModel;
}

export interface MappingRow {
  [key: string]: string | number | undefined;
  No?: number;
  Key?: string;
  Value?: string;
  Section?: string;
  Location?: string;
  KeyPosition?: string;
  ValuePosition?: string;
}

export const BLUE_COLORS = new Set([
  '#3366ff', '#0000ff', '#3366FF', '#0000FF',
  '#0070c0', '#0070C0', '#4472c4', '#4472C4',
]);

export function isBlueColor(color: string): boolean {
  if (BLUE_COLORS.has(color)) return true;
  const r = parseInt(color.slice(1, 3), 16);
  const g = parseInt(color.slice(3, 5), 16);
  const b = parseInt(color.slice(5, 7), 16);
  return b > 150 && r < 100 && g < 150;
}

export function getFileType(fileName: string): FileType | null {
  const ext = fileName.split('.').pop()?.toLowerCase();
  const map: Record<string, FileType> = {
    hwpx: 'hwpx', hwp: 'hwp', docx: 'docx', doc: 'doc',
    xlsx: 'xlsx', xls: 'xls', pdf: 'pdf', html: 'html', htm: 'html',
  };
  return map[ext || ''] || null;
}
