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
 * HWP 양식 placeholder 키워드 → 내용 필드 매핑
 * HWP 양식에서 흔히 사용하는 placeholder 텍스트 목록
 */
const HWP_PLACEHOLDERS: Record<string, string[]> = {
  '과제명': ['과제명', '과 제 명', '과제 명'],
  '기관명': ['기관명', '기 관 명', '기관 명', '수요기업명 기재', '공급기업명 기재'],
  '대표자': ['대표자', '대표자 성명', '대표자성명'],
  '사업자등록번호': ['사업자등록번호', '사업자등록번'],
  '주소': ['주소', '주 소', '본사주소'],
  '설립일': ['설립일', '설립연월일', '설립 연월일'],
  '전화': ['전화', '대표전화', '사무실전화'],
  '핸드폰': ['핸드폰', '연락처'],
  '이메일': ['E-mail', 'E-Mail', '이메일'],
  '산업분야': ['산업분야'],
  'AI기술분류': ['AI기술분류'],
  '사업기간': ['사업수행기간', '사업기간'],
  '정부지원금': ['정부지원금'],
  '민간부담금': ['민간부담금'],
  '총괄책임자': ['총괄책임자'],
  '과제책임자': ['과제책임자'],
  '실무책임자': ['실무책임자'],
  '직원수': ['직원수', '종업원수'],
  '홈페이지': ['홈페이지'],
};

/** 문자열 정규화: &nbsp; 공백 제거 후 비교용 */
function normalize(s: string): string {
  return s.replace(/&nbsp;/g, ' ').replace(/\s+/g, '').trim();
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
            // HWP placeholder 키워드 매핑
            const normalLabel = normalize(label);
            const matchedKeywords: string[] = [];
            for (const [, keywords] of Object.entries(HWP_PLACEHOLDERS)) {
              if (keywords.some(k => normalize(k) === normalLabel || normalLabel.includes(normalize(k)))) {
                matchedKeywords.push(...keywords);
              }
            }

            fields.push({
              id: `field-${idx++}`,
              label,
              value,
              keyword: matchedKeywords[0] || undefined,
              status: 'pending',
            });
          }
        }
      }
    });
  });

  // 2) lv1/lv2/lv3 서술형 텍스트
  doc.querySelectorAll('.lv1, .lv2').forEach((el) => {
    const text = el.textContent?.trim() || '';
    if (text.length > 20) {
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

  // 3) body-section / summary-section 내 h2, h3 + 다음 형제 텍스트
  doc.querySelectorAll('h2.section, h3.sub').forEach((heading) => {
    const label = heading.textContent?.trim() || '';
    let content = '';
    let sibling = heading.nextElementSibling;
    while (sibling && !['H1','H2','H3'].includes(sibling.tagName)) {
      content += (sibling.textContent?.trim() || '') + ' ';
      sibling = sibling.nextElementSibling;
    }
    content = content.trim();
    if (label && content.length > 30) {
      fields.push({
        id: `field-${idx++}`,
        label: label.replace(/^\d+\.\s*/, ''),
        value: content.slice(0, 500),
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

/** 개행 제거 — HWP span은 한 줄이므로 개행 삽입하면 레이아웃이 깨짐 */
function sanitizeValue(v: string): string {
  return v.replace(/\r?\n/g, ' ').replace(/\s{2,}/g, ' ').trim();
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

    const safeValue = sanitizeValue(f.value);
    let found = false;

    // 1차: domId로 시도
    if (f.domId) {
      const result = fillById(html, f.domId, safeValue);
      if (result.found) {
        html = result.html;
        found = true;
      }
    }

    // 2차: keyword로 시도
    if (!found && f.keyword) {
      const result = replaceInSpan(html, f.keyword, safeValue);
      if (result.found) {
        html = result.html;
        found = true;
      }
    }

    // 3차: label을 keyword로 시도 (placeholder 텍스트 교체)
    if (!found) {
      const result = replaceInSpan(html, f.label, safeValue);
      if (result.found) {
        html = result.html;
        found = true;
      }
    }

    // 4차: &nbsp; 무시 fuzzy 매칭 — HWP HTML의 "과 &nbsp;제 &nbsp;명" 같은 패턴
    if (!found) {
      const normalLabel = normalize(f.label);
      // 모든 span.hrt에서 정규화된 텍스트로 검색
      const spanRegex = /<span class="hrt[^"]*"[^>]*>([^<]*)<\/span>/g;
      let spanMatch;
      while ((spanMatch = spanRegex.exec(html)) !== null) {
        const spanText = spanMatch[1];
        const normalSpan = normalize(spanText);
        if (normalSpan.includes(normalLabel) || normalLabel.includes(normalSpan)) {
          // 이 span 다음에 오는 빈 span 또는 같은 셀의 값 영역에 값 삽입
          const afterPos = spanMatch.index + spanMatch[0].length;
          const afterHtml = html.slice(afterPos, afterPos + 500);

          // 빈 hls div 찾기 (값이 들어갈 위치)
          const emptyHls = afterHtml.match(/(height:\d+\.?\d*mm;width:\d+\.?\d*mm;">)(<\/div>)/);
          if (emptyHls) {
            const oldStr = emptyHls[0];
            const newStr = emptyHls[1] + `<span class="hrt">${safeValue}</span>` + emptyHls[2];
            html = html.slice(0, afterPos) + afterHtml.replace(oldStr, newStr) + html.slice(afterPos + 500);
            found = true;
            break;
          }

          // 빈 span 찾기
          const emptySpan = afterHtml.match(/<span class="hrt[^"]*"[^>]*><\/span>/);
          if (emptySpan) {
            const oldStr = emptySpan[0];
            const newStr = oldStr.replace('></span>', `>${safeValue}</span>`);
            html = html.slice(0, afterPos) + afterHtml.replace(oldStr, newStr) + html.slice(afterPos + 500);
            found = true;
            break;
          }
        }
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
