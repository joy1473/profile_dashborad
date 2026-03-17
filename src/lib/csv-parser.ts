import Papa from "papaparse";
import { supabase } from "./supabase";
import type { ParsedData } from "@/types/report";

const BUCKET = "issue-attachments";
const MAX_ROWS = 1000;

export interface ParseWarning {
  type: "empty" | "truncated";
  message: string;
}

export function parseCSV(text: string, fileName: string): { data: ParsedData; warning?: ParseWarning } {
  const result = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: true,
    dynamicTyping: false,
  });

  const headers = result.meta.fields ?? [];
  const totalRows = result.data.length;

  if (totalRows === 0) {
    return {
      data: { headers, rows: [], fileName },
      warning: { type: "empty", message: "파일에 데이터가 없습니다" },
    };
  }

  const rows = result.data.slice(0, MAX_ROWS).map((row) => {
    const mapped: Record<string, string | number> = {};
    for (const key of headers) {
      const val = row[key]?.trim() ?? "";
      const num = Number(val.replace(/,/g, ""));
      mapped[key] = val !== "" && !isNaN(num) ? num : val;
    }
    return mapped;
  });

  const warning = totalRows > MAX_ROWS
    ? { type: "truncated" as const, message: `${totalRows.toLocaleString()}행 중 처음 ${MAX_ROWS}행만 표시됩니다` }
    : undefined;

  return { data: { headers, rows, fileName }, warning };
}

export function parseJSON(text: string, fileName: string): { data: ParsedData; warning?: ParseWarning } {
  const parsed = JSON.parse(text);
  const arr = Array.isArray(parsed) ? parsed : [parsed];
  const totalRows = arr.length;

  if (totalRows === 0) {
    return {
      data: { headers: [], rows: [], fileName },
      warning: { type: "empty", message: "파일에 데이터가 없습니다" },
    };
  }

  const sliced = arr.slice(0, MAX_ROWS);
  const headers = sliced.length > 0 ? Object.keys(sliced[0]) : [];
  const rows = sliced.map((item) => {
    const mapped: Record<string, string | number> = {};
    for (const key of headers) {
      const val = item[key];
      mapped[key] = typeof val === "number" ? val : String(val ?? "");
    }
    return mapped;
  });

  const warning = totalRows > MAX_ROWS
    ? { type: "truncated" as const, message: `${totalRows.toLocaleString()}행 중 처음 ${MAX_ROWS}행만 표시됩니다` }
    : undefined;

  return { data: { headers, rows, fileName }, warning };
}

export async function parseAttachmentFile(
  filePath: string,
  fileName: string,
  contentType: string,
): Promise<{ data: ParsedData; warning?: ParseWarning }> {
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .download(filePath);

  if (error || !data) throw new Error("파일 다운로드 실패");

  const text = await data.text();

  const result = contentType.includes("json") || fileName.endsWith(".json")
    ? parseJSON(text, fileName)
    : parseCSV(text, fileName);

  return { data: result.data, warning: result.warning };
}

export function isParsableFile(contentType: string, fileName: string): boolean {
  return (
    contentType.includes("csv") ||
    contentType.includes("json") ||
    contentType.includes("text/plain") ||
    fileName.endsWith(".csv") ||
    fileName.endsWith(".json") ||
    fileName.endsWith(".txt")
  );
}
