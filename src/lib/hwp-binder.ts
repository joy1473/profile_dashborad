/**
 * HWP HTML 바인딩 엔진
 * 케이비드 fill-by-mapping-v2.js + fill-v03.js 의 브라우저 버전
 *
 * 전략:
 * 1. HWP HTML(절대좌표 span.hrt) 구조를 유지하면서 텍스트만 교체
 * 2. 내용 HTML에서 key-value 자동 추출
 * 3. domElementId(kv-xxx, cell-xxx) 또는 키워드 매칭으로 위치 탐색
 */

export interface BindingField {
  id: string;
  label: string;          // 필드 라벨 (과제명, 기관명 등)
  value: string;          // 채울 값
  domId?: string;         // HWP HTML 내 요소 ID (kv-xxx)
  keyword?: string;       // 키워드 매칭 (span 텍스트 검색)
  status: 'pending' | 'bound' | 'error' | 'skipped';
  position?: { page: number; context: string };
}

export interface BindingResult {
  html: string;
  fields: BindingField[];
  stats: { total: number; bound: number; skipped: number; error: number };
}

/**
 * 내용 HTML에서 key-value 필드를 자동 추출
 */
export function extractFieldsFromContent(contentHtml: string): BindingField[] {
  const doc = new DOMParser().parseFromString(contentHtml, 'text/html');
  const fields: BindingField[] = [];
  let idx = 0;

  // 1) table에서 th-td 쌍 추출
  doc.querySelectorAll('table').forEach((table) => {
    table.querySelectorAll('tr').forEach((tr) => {
      const ths = tr.querySelectorAll('th');
      const tds = tr.querySelectorAll('td');
      if (ths.length > 0 && tds.length > 0) {
        for (let i = 0; i < ths.length && i < tds.length; i++) {
          const label = ths[i].textContent?.trim() || '';
          const value = tds[i].textContent?.trim() || '';
          if (label && value && value !== '※ 추후보완') {
            fields.push({
              id: `field-${idx++}`,
              label,
              value,
              status: 'pending',
            });
          }
        }
      }
    });
  });

  // 2) lv1/lv2/lv3 구조에서 서술형 텍스트 추출
  doc.querySelectorAll('.lv1, .lv2').forEach((el) => {
    const text = el.textContent?.trim() || '';
    if (text.length > 20) {
      // strong 태그가 있으면 그것을 label로
      const strong = el.querySelector('strong');
      const label = strong?.textContent?.trim() || text.slice(0, 30);
      fields.push({
        id: `field-${idx++}`,
        label: label.replace(/^[❍\-⦁•]\s*/, ''),
        value: text.replace(/^[❍\-⦁•]\s*/, ''),
        status: 'pending',
      });
    }
  });

  return fields;
}

/**
 * HWP HTML의 span.hrt에서 키워드를 찾아 텍스트 교체
 * (케이비드 fill-v03.js의 replaceInSpan 브라우저 버전)
 */
function replaceInSpan(html: string, keyword: string, newText: string): { html: string; found: boolean } {
  const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(
    `(<span class="hrt[^"]*"[^>]*>)([^<]*${escaped}[^<]*)(</span>)`,
    'g'
  );

  let found = false;
  let replaced = false;
  const result = html.replace(regex, (match, open, _text, close) => {
    found = true;
    if (replaced) return match;
    replaced = true;
    return open + newText + close;
  });

  return { html: result, found };
}

/**
 * HWP HTML에서 ID로 요소를 찾아 텍스트 채우기
 * (케이비드 fill-by-mapping-v2.js의 fillElement 브라우저 버전)
 */
function fillById(html: string, domId: string, value: string): { html: string; found: boolean } {
  // id="kv-xxx" 또는 id="cell-xxx" 로 된 요소 찾기
  const idRegex = new RegExp(`id="${domId}"[^>]*>`, 'g');
  const match = idRegex.exec(html);

  if (!match) return { html, found: false };

  // 해당 요소 뒤에 span.hrt가 있으면 그 텍스트 교체
  const afterId = html.slice(match.index);
  const spanMatch = afterId.match(/<span class="hrt[^"]*"[^>]*>([^<]*)<\/span>/);

  if (spanMatch) {
    const fullMatch = spanMatch[0];
    const newSpan = fullMatch.replace(spanMatch[1], value);
    const newHtml = html.slice(0, match.index) + afterId.replace(fullMatch, newSpan);
    return { html: newHtml, found: true };
  }

  // span이 없으면 빈 div에 텍스트 삽입
  // height:..mm;width:..mm;"></div> 패턴 찾기
  const emptyDivMatch = afterId.match(/(height:\d+\.?\d*mm;width:\d+\.?\d*mm;">)(<\/div>)/);
  if (emptyDivMatch) {
    const insertPoint = emptyDivMatch[0];
    const withText = emptyDivMatch[1] + `<span class="hrt">${value}</span>` + emptyDivMatch[2];
    const newHtml = html.slice(0, match.index) + afterId.replace(insertPoint, withText);
    return { html: newHtml, found: true };
  }

  return { html, found: false };
}

/**
 * 메인 바인딩 함수: 템플릿 HTML + 필드 목록 → 채워진 HTML
 */
export function bindFields(templateHtml: string, fields: BindingField[]): BindingResult {
  let html = templateHtml;
  const updatedFields: BindingField[] = [];
  let bound = 0, skipped = 0, error = 0;

  for (const field of fields) {
    const f = { ...field };

    if (!f.value || f.value === '※ 추후보완') {
      f.status = 'skipped';
      skipped++;
      updatedFields.push(f);
      continue;
    }

    let found = false;

    // 1차: domId로 시도
    if (f.domId) {
      const result = fillById(html, f.domId, f.value);
      if (result.found) {
        html = result.html;
        found = true;
      }
    }

    // 2차: keyword로 시도
    if (!found && f.keyword) {
      const result = replaceInSpan(html, f.keyword, f.value);
      if (result.found) {
        html = result.html;
        found = true;
      }
    }

    // 3차: label을 keyword로 시도 (placeholder 텍스트 교체)
    if (!found) {
      const result = replaceInSpan(html, f.label, f.value);
      if (result.found) {
        html = result.html;
        found = true;
      }
    }

    f.status = found ? 'bound' : 'error';
    if (found) bound++; else error++;
    updatedFields.push(f);
  }

  return {
    html,
    fields: updatedFields,
    stats: { total: fields.length, bound, skipped, error },
  };
}

/**
 * 간단 텍스트 교체 (simpleReplace 브라우저 버전)
 */
export function simpleReplace(html: string, search: string, replace: string): string {
  if (html.includes(search)) {
    return html.replace(search, replace);
  }
  return html;
}

/**
 * 두 HTML을 자동 매핑하여 바인딩
 */
export function autoBindHtmlToTemplate(
  templateHtml: string,
  contentHtml: string
): BindingResult {
  const fields = extractFieldsFromContent(contentHtml);
  return bindFields(templateHtml, fields);
}
