import type { ReportTemplate, ParsedData, FieldMatchResult } from "@/types/report";

export function matchFields(
  template: ReportTemplate,
  parsed: ParsedData,
): FieldMatchResult {
  const matched: FieldMatchResult["matched"] = [];
  const missing: FieldMatchResult["missing"] = [];

  const headersLower = parsed.headers.map((h) => h.toLowerCase().trim());

  for (const field of template.requiredFields) {
    const keyLower = field.key.toLowerCase();

    // 1. 정확 매칭
    let idx = headersLower.indexOf(keyLower);

    // 2. 포함 매칭
    if (idx === -1) {
      idx = headersLower.findIndex((h) => h.includes(keyLower) || keyLower.includes(h));
    }

    // 3. label 매칭 (한글)
    if (idx === -1) {
      idx = parsed.headers.findIndex(
        (h) => h.trim() === field.label || h.trim().includes(field.label),
      );
    }

    if (idx !== -1) {
      matched.push({ field, column: parsed.headers[idx] });
    } else {
      missing.push(field);
    }
  }

  return { matched, missing };
}

/** 매칭 결과에 따라 파싱 데이터를 template key로 리매핑 */
export function remapData(
  parsed: ParsedData,
  matchResult: FieldMatchResult,
): Record<string, string | number>[] {
  return parsed.rows.map((row) => {
    const mapped: Record<string, string | number> = { ...row };
    for (const { field, column } of matchResult.matched) {
      if (column !== field.key && row[column] !== undefined) {
        mapped[field.key] = row[column];
      }
    }
    return mapped;
  });
}
