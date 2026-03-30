/**
 * HWP HTML 바인딩 엔진 v2
 *
 * 접근: 케이비드 fill-v03.js 방식
 * 1. 템플릿(HWP HTML)에서 placeholder 텍스트를 스캔
 * 2. 내용 HTML에서 대응값 추출
 * 3. placeholder → 실제값 교체 (span.hrt 내부 텍스트만)
 */

export interface BindingField {
  id: string;
  label: string;
  value: string;
  placeholder?: string;     // 템플릿에서 찾은 원본 placeholder 텍스트
  status: 'pending' | 'bound' | 'error' | 'skipped';
}

export interface BindingResult {
  html: string;
  fields: BindingField[];
  stats: { total: number; bound: number; skipped: number; error: number };
}

/** &nbsp; → 공백, 연속공백 제거 */
function norm(s: string): string {
  return s.replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
}

/** 개행 → 공백 (HWP span은 단일 행) */
function sanitize(s: string): string {
  return s.replace(/\r?\n/g, ' ').replace(/\s{2,}/g, ' ').trim();
}

/**
 * 템플릿 HTML에서 모든 span.hrt 텍스트를 추출
 */
function extractAllSpans(html: string): { text: string; raw: string; pos: number }[] {
  const regex = /class="hrt[^"]*"[^>]*>([^<]*)<\/span>/g;
  const spans: { text: string; raw: string; pos: number }[] = [];
  let m;
  while ((m = regex.exec(html)) !== null) {
    const raw = m[1];
    const text = norm(raw);
    if (text.length > 0) {
      spans.push({ text, raw, pos: m.index });
    }
  }
  return spans;
}

/**
 * 내용 HTML에서 key-value 맵 추출 (th→td, label→value)
 */
export function extractContentMap(contentHtml: string): Map<string, string> {
  const doc = new DOMParser().parseFromString(contentHtml, 'text/html');
  const map = new Map<string, string>();

  // 1) table th-td 쌍
  doc.querySelectorAll('tr').forEach((tr) => {
    const ths = tr.querySelectorAll('th');
    const tds = tr.querySelectorAll('td');
    for (let i = 0; i < ths.length && i < tds.length; i++) {
      const label = ths[i].textContent?.trim() || '';
      const value = tds[i].textContent?.trim() || '';
      if (label && value) map.set(label, value);
    }
  });

  // 2) h2/h3 다음 본문 텍스트
  doc.querySelectorAll('h1.chapter, h2.section, h3.sub').forEach((h) => {
    const label = h.textContent?.trim().replace(/^\d+\.\s*/, '') || '';
    let content = '';
    let sib = h.nextElementSibling;
    while (sib && !['H1','H2','H3'].includes(sib.tagName)) {
      content += (sib.textContent?.trim() || '') + ' ';
      sib = sib.nextElementSibling;
    }
    if (label && content.trim().length > 10) {
      map.set(label, content.trim().slice(0, 1000));
    }
  });

  // 3) .lv1 strong → 뒤 텍스트
  doc.querySelectorAll('.lv1').forEach((el) => {
    const strong = el.querySelector('strong');
    if (strong) {
      const label = strong.textContent?.trim().replace(/^\(|\)$/g, '') || '';
      const value = el.textContent?.trim().replace(/^[❍]\s*/, '') || '';
      if (label && value.length > 10) map.set(label, value);
    }
  });

  return map;
}

/**
 * HWP 양식의 placeholder → 내용 HTML의 키 매핑 테이블
 * key: placeholder 텍스트의 핵심 키워드
 * value: 내용 HTML에서 찾을 label 후보들
 */
const PLACEHOLDER_MAP: [string, string[]][] = [
  // 요약 섹션 placeholders
  ['수요기업명 기재', ['기관명', '주관기관', '수요기업']],
  ['공급기업명 기재', ['기관명', '참여기관', '공급기업']],
  ['주요역할 기재', ['주요역할', '주요 역할']],
  ['추진목표(교육목표) 기재', ['추진목표', '최종 목표', '사업의 목적']],
  ['추진내용별 세부 목표를 간략히 기재', ['세부 목표', '세부목표']],
  ['역량 및 전문성 기재', ['수행 역량', '사업수행능력', '수행능력']],
  ['정량성과 및 정성적 성과목표 기술', ['성과목표', '성과 지표', '정량 지표']],
  ['진단 결과 반영(안) 기재', ['역량진단', 'KSA', '역량진단·컨설팅']],
  ['교육과정 운영방안 기재', ['교육과정 운영', '교육 체계', '교육과정 체계']],
  ['AX 추진을 위한 기본(안)을 기재', ['AX 실행계획', '검증컨설팅', 'PoC']],
  ['전략 검증(PoC) 방안을 기재', ['PoC 과제', 'PoC 범위', 'PoC 설계']],
  ['성과조사 방안, 홍보활동 등 기재', ['사후관리', '성과 관리', '후속 확장']],
  ['가치 창출 노력 정도 기재', ['사회적 가치', '대중소 상생']],
  ['개인정보보호 관리방안 기재', ['개인정보보호', '데이터 보안', '비식별화']],

  // 본문 섹션 placeholders
  ['사업 참여 및 AX 추진 배경', ['사업 추진 배경', '산업 환경의 변화', '컨소시엄 구성 배경']],
  ['공급기업과의 매칭 배경', ['컨소시엄 구성 배경', '컨소시엄의 강점']],
  ['핵심 목적, 목표, 해결과제를 기재', ['사업의 목적', '목적 및 필요성']],
  ['기술개발 범위를 핵심기술', ['사업의 범위']],
  ['수요기업의 사업 소개', ['주관기관(수요기업) 현황', '세솔의 현황']],
  ['공급기업의 사업 소개', ['참여기관(공급기업) 현황', '천강']],
  ['선정되어야 하는 필요성, 타당성', ['컨소시엄의 강점', '주관기관(수요기업) 강점']],
  ['공급기업의 강점 기재', ['참여기관(공급기업) 강점', 'GrowFit']],
  ['최종 목표를 기술', ['추진목표', '최종 목표']],
  ['교육프로그램 목표, 교육 대상', ['교육과정 체계', '전사교육', '핵심역량교육']],
  ['실행계획 수립 및 과제 검증', ['AX 실행계획 수립', '검증컨설팅', 'UNIST']],
  ['사업 수행 주체와 참여조직', ['사업추진체계', '추진체계도', '추진조직']],
  ['품질 관리계획 및 산출물 관리', ['품질관리 계획', '품질관리']],
  ['산업 파급효과', ['기대효과', '산업 파급', '정량적 기대효과']],
];

/**
 * span 내 텍스트를 교체 (첫 매칭만)
 */
function replaceSpanText(html: string, searchText: string, newText: string): { html: string; found: boolean } {
  const escaped = searchText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  // &nbsp;를 유연하게 매칭
  const flexPattern = escaped.replace(/\\ /g, '(?:&nbsp;|\\s| )');
  const regex = new RegExp(
    `(<span class="hrt[^"]*"[^>]*>)([^<]*?${flexPattern}[^<]*?)(</span>)`,
    ''
  );
  const match = html.match(regex);
  if (!match) return { html, found: false };
  const newHtml = html.replace(regex, match[1] + sanitize(newText) + match[3]);
  return { html: newHtml, found: true };
}

/**
 * 메인 바인딩 함수
 */
export function bindFields(templateHtml: string, fields: BindingField[]): BindingResult {
  let html = templateHtml;
  const updatedFields: BindingField[] = [];
  let bound = 0, skipped = 0, error = 0;

  for (const field of fields) {
    const f = { ...field };

    if (!f.value || f.value === '※ 추후보완') {
      f.status = 'skipped'; skipped++;
      updatedFields.push(f); continue;
    }

    const safeValue = sanitize(f.value);
    let found = false;

    // placeholder가 지정되어 있으면 직접 교체
    if (f.placeholder) {
      const r = replaceSpanText(html, f.placeholder, safeValue);
      if (r.found) { html = r.html; found = true; }
    }

    // label로 교체 시도
    if (!found) {
      const r = replaceSpanText(html, f.label, safeValue);
      if (r.found) { html = r.html; found = true; }
    }

    f.status = found ? 'bound' : 'error';
    if (found) bound++; else error++;
    updatedFields.push(f);
  }

  return { html, fields: updatedFields, stats: { total: fields.length, bound, skipped, error } };
}

/**
 * 자동 바인딩: 템플릿 placeholder 스캔 → 내용 매핑 → 필드 생성
 */
export function autoGenerateFields(
  templateHtml: string,
  contentHtml: string
): BindingField[] {
  const contentMap = extractContentMap(contentHtml);
  const fields: BindingField[] = [];
  let idx = 0;

  // 1) PLACEHOLDER_MAP 기반 매핑
  for (const [placeholder, contentKeys] of PLACEHOLDER_MAP) {
    // 템플릿에 이 placeholder가 있는지 확인
    const normPlaceholder = norm(placeholder);
    // &nbsp; 유연 체크
    const flexPattern = normPlaceholder.replace(/ /g, '(?:&nbsp;|\\s| )');
    const checkRegex = new RegExp(flexPattern);
    if (!checkRegex.test(templateHtml.replace(/&nbsp;/g, ' ')) && !templateHtml.includes(placeholder)) {
      continue;
    }

    // 내용에서 값 찾기
    let value = '';
    for (const key of contentKeys) {
      // 정확한 키 매칭
      if (contentMap.has(key)) {
        value = contentMap.get(key)!;
        break;
      }
      // 부분 매칭
      for (const [k, v] of contentMap) {
        if (k.includes(key) || key.includes(k)) {
          value = v;
          break;
        }
      }
      if (value) break;
    }

    if (value) {
      fields.push({
        id: `field-${idx++}`,
        label: contentKeys[0],
        value: value.slice(0, 500),
        placeholder,
        status: 'pending',
      });
    }
  }

  // 2) 내용 HTML의 table th-td 중 아직 매핑 안 된 것
  const usedLabels = new Set(fields.map(f => f.label));
  const doc = new DOMParser().parseFromString(contentHtml, 'text/html');
  doc.querySelectorAll('tr').forEach((tr) => {
    const ths = tr.querySelectorAll('th');
    const tds = tr.querySelectorAll('td');
    for (let i = 0; i < ths.length && i < tds.length; i++) {
      const label = ths[i].textContent?.trim() || '';
      const value = tds[i].textContent?.trim() || '';
      if (label && value && !usedLabels.has(label) && value !== '※ 추후보완') {
        fields.push({
          id: `field-${idx++}`,
          label,
          value,
          status: 'pending',
        });
        usedLabels.add(label);
      }
    }
  });

  return fields;
}

/**
 * 추출 (하위호환)
 */
export function extractFieldsFromContent(contentHtml: string): BindingField[] {
  const map = extractContentMap(contentHtml);
  const fields: BindingField[] = [];
  let idx = 0;
  for (const [label, value] of map) {
    if (value && value !== '※ 추후보완') {
      fields.push({ id: `field-${idx++}`, label, value, status: 'pending' });
    }
  }
  return fields;
}
