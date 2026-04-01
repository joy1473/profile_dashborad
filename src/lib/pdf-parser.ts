/**
 * PDF 파서: 텍스트 추출 + 페이지 이미지 렌더링 (OCR용)
 * - pdfjs-dist로 텍스트 레이어 추출
 * - 텍스트가 없는(스캔) 페이지는 canvas로 이미지화
 * - DocumentModel 생성
 */

import type { DocumentModel, DocumentElement, DocumentPosition } from "@/types/bid-analyzer";

// pdfjs-dist dynamic import (클라이언트 사이드에서만)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let pdfjsLib: any = null;

async function getPdfjs() {
  if (pdfjsLib) return pdfjsLib;
  pdfjsLib = await import("pdfjs-dist");
  // worker: public 폴더에서 로드 (CDN CORS 문제 회피)
  pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
  return pdfjsLib;
}

export interface PdfPageResult {
  pageNumber: number;
  text: string;
  hasText: boolean;      // 텍스트 레이어 존재 여부
  imageDataUrl?: string; // 스캔 페이지용 이미지
}

/**
 * PDF → 페이지별 텍스트 + 이미지 추출
 */
export async function extractPdfPages(
  file: File | Blob,
  options?: { dpi?: number; maxPages?: number }
): Promise<PdfPageResult[]> {
  const pdfjs = await getPdfjs();
  const arrayBuffer = await file.arrayBuffer();
  const doc = await pdfjs.getDocument({ data: arrayBuffer }).promise;

  const dpi = options?.dpi ?? 150;
  const maxPages = options?.maxPages ?? 50;
  const pageCount = Math.min(doc.numPages, maxPages);
  const results: PdfPageResult[] = [];

  for (let i = 1; i <= pageCount; i++) {
    const page = await doc.getPage(i);

    // 텍스트 추출
    const textContent = await page.getTextContent();
    const text = textContent.items
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((item: any) => (item.str ?? ""))
      .join(" ")
      .trim();

    const hasText = text.length > 20; // 20자 미만이면 스캔 페이지로 판단

    let imageDataUrl: string | undefined;

    // 텍스트가 없는(스캔) 페이지 → canvas 렌더링
    if (!hasText) {
      const viewport = page.getViewport({ scale: dpi / 72 });
      const canvas = document.createElement("canvas");
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const ctx = canvas.getContext("2d")!;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await page.render({ canvasContext: ctx, viewport } as any).promise;
      imageDataUrl = canvas.toDataURL("image/png", 0.85);
      canvas.remove();
    }

    results.push({ pageNumber: i, text, hasText, imageDataUrl });
  }

  return results;
}

/**
 * PDF → DocumentModel (기존 파이프라인 호환)
 */
export async function parsePdf(file: File, fileName: string): Promise<DocumentModel> {
  let pages: PdfPageResult[];
  try {
    pages = await extractPdfPages(file);
  } catch (err) {
    console.error("PDF 추출 실패:", err);
    throw new Error(`PDF 파싱 실패: ${err instanceof Error ? err.message : String(err)}`);
  }
  if (pages.length === 0) {
    throw new Error("PDF에서 페이지를 추출할 수 없습니다.");
  }

  const positionMap = new Map<string, DocumentPosition>();
  const sections: DocumentElement[] = [];
  const htmlParts: string[] = [];

  htmlParts.push(`<div style="font-family:'맑은 고딕',sans-serif;padding:20px;max-width:800px;margin:0 auto;">`);

  for (const page of pages) {
    const pageId = `pdf-page-${page.pageNumber}`;

    // 페이지 구분선
    htmlParts.push(`<div id="${pageId}" style="margin-bottom:24px;padding-bottom:16px;border-bottom:1px solid #ddd;">`);
    htmlParts.push(`<div style="font-size:10px;color:#999;margin-bottom:8px;">— Page ${page.pageNumber} —</div>`);

    if (page.hasText && page.text) {
      // 텍스트 기반 페이지
      const lines = page.text.split(/\n|\r\n/);
      lines.forEach((line, lineIdx) => {
        if (!line.trim()) return;
        const domId = `${pageId}-p${lineIdx}`;
        htmlParts.push(`<p id="${domId}" data-pos-id="${domId}" style="margin:4px 0;font-size:11px;line-height:1.6;">${escapeHtml(line)}</p>`);

        const pos: DocumentPosition = {
          fileType: "pdf",
          sectionIndex: 0,
          paragraphIndex: lineIdx,
          runIndex: 0,
          charOffset: 0,
          charLength: line.length,
          pageNumber: page.pageNumber,
          domElementId: domId,
        };
        positionMap.set(domId, pos);

        sections.push({
          type: "paragraph",
          text: line,
          content: line,
          domId,
          position: pos,
        });
      });
    }

    if (page.imageDataUrl) {
      // 스캔(이미지) 페이지
      const imgDomId = `${pageId}-img`;
      htmlParts.push(`<div id="${imgDomId}" data-pos-id="${imgDomId}" style="margin:8px 0;text-align:center;">`);
      htmlParts.push(`<img src="${page.imageDataUrl}" alt="Page ${page.pageNumber}" style="max-width:100%;border:1px solid #eee;border-radius:4px;" />`);
      htmlParts.push(`<div style="font-size:9px;color:#f59e0b;margin-top:4px;">&#9888; 이미지 페이지 — AI OCR 추출 필요</div>`);
      htmlParts.push(`</div>`);

      const pos: DocumentPosition = {
        fileType: "pdf",
        sectionIndex: 0,
        paragraphIndex: 0,
        runIndex: 0,
        charOffset: 0,
        charLength: 0,
        pageNumber: page.pageNumber,
        domElementId: imgDomId,
      };
      positionMap.set(imgDomId, pos);

      sections.push({
        type: "image",
        text: `[이미지] Page ${page.pageNumber}`,
        content: `[이미지] Page ${page.pageNumber}`,
        domId: imgDomId,
        position: pos,
        imageDataUrl: page.imageDataUrl,
      });
    }

    htmlParts.push(`</div>`);
  }

  htmlParts.push(`</div>`);

  // 스캔 페이지 요약
  const scanPages = pages.filter((p) => !p.hasText);
  if (scanPages.length > 0) {
    htmlParts.unshift(
      `<div style="background:#fef3c7;border:1px solid #f59e0b;border-radius:8px;padding:12px;margin-bottom:16px;font-size:12px;">` +
      `<strong>&#9888; 스캔 페이지 ${scanPages.length}개 감지</strong> ` +
      `(Page ${scanPages.map((p) => p.pageNumber).join(", ")}) ` +
      `— "AI OCR 추출" 버튼으로 텍스트를 추출하세요.` +
      `</div>`
    );
  }

  return {
    fileName,
    renderedHtml: htmlParts.join("\n"),
    positionMap,
    sections,
  };
}

/**
 * AI OCR: 이미지 → key-value 추출 (Anthropic Claude Vision API)
 */
export async function ocrExtractKeyValues(
  imageDataUrl: string,
  pageNumber: number
): Promise<{ key: string; value: string; confidence: number }[]> {
  try {
    const res = await fetch("/api/ocr-extract", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ imageDataUrl, pageNumber }),
    });
    if (!res.ok) throw new Error(`OCR API error: ${res.status}`);
    const data = await res.json();
    return data.pairs ?? [];
  } catch (err) {
    console.error("OCR extraction failed:", err);
    return [];
  }
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
