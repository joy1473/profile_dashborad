/**
 * HWP HTML 바인딩 엔진 v3 — 좌표 기반 공간 검색
 *
 * 1. HWP HTML의 모든 span.hrt를 문서 순서대로 스캔
 * 2. 채팅 입력을 파싱하여 context + key + value 추출
 * 3. context 근처의 key를 찾고, 그 옆 빈칸에 value 삽입
 */

// ── 타입 ──

export interface SpanInfo {
  text: string;       // 정규화된 텍스트 (&nbsp;→공백)
  raw: string;        // 원본 텍스트
  pos: number;        // HTML 내 span 시작 위치
  end: number;        // span 끝 위치
  full: string;       // 전체 <span>...</span> 문자열
  isEmpty: boolean;   // 빈칸/placeholder 여부
}

export interface ChatCommand {
  type: 'value' | 'table' | 'text' | 'replace';
  context?: string;   // "참여기관", "주관기관" 등
  key: string;        // "기관명", "대표자" 등
  value: string;      // 채울 값
  rows?: string[][];  // @표 일 때 행 데이터
}

export interface BindingResult {
  html: string;
  log: string[];
  stats: { success: number; fail: number };
}

// ── 유틸 ──

function norm(s: string): string {
  return s.replace(/&nbsp;/g, ' ').replace(/\s+/g, '').trim();
}

function normSpace(s: string): string {
  return s.replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
}

function sanitize(s: string): string {
  return s.replace(/\r?\n/g, ' ').replace(/\s{2,}/g, ' ').trim();
}

const PLACEHOLDERS = ['❍ --', '⦁❍ --', '❍--', '기재', '기입', '기술'];

function isPlaceholder(text: string): boolean {
  const t = norm(text);
  if (t.length === 0) return true;
  if (t === '--' || t === '❍--' || t === '⦁❍--') return true;
  return PLACEHOLDERS.some(p => norm(p) === t);
}

// ── 1. 스팬 추출 ──

export function extractSpans(html: string): SpanInfo[] {
  const regex = /<span class="hrt[^"]*"[^>]*>(.*?)<\/span>/g;
  const spans: SpanInfo[] = [];
  let m;
  while ((m = regex.exec(html)) !== null) {
    const raw = m[1];
    const text = normSpace(raw);
    spans.push({
      text,
      raw,
      pos: m.index,
      end: m.index + m[0].length,
      full: m[0],
      isEmpty: isPlaceholder(text) || text.length === 0,
    });
  }
  return spans;
}

// ── 2. 빈 div 추출 (값이 들어갈 수 있는 빈 영역) ──

interface EmptyCell {
  pos: number;
  end: number;
  full: string;
  parentPos: number;  // 부모 hce/hls의 위치
}

function findEmptyCells(html: string): EmptyCell[] {
  // height:..mm;width:..mm;"></div> 패턴 (빈 div)
  const regex = /(height:\d+\.?\d*mm;width:\d+\.?\d*mm;">)(<\/div>)/g;
  const cells: EmptyCell[] = [];
  let m;
  while ((m = regex.exec(html)) !== null) {
    cells.push({
      pos: m.index,
      end: m.index + m[0].length,
      full: m[0],
      parentPos: m.index,
    });
  }
  return cells;
}

// ── 3. 채팅 입력 파싱 ──

export function parseChatInput(input: string): ChatCommand[] {
  const lines = input.split('\n').map(l => l.trim()).filter(l => l);
  const commands: ChatCommand[] = [];

  // @표 명령
  if (lines[0].startsWith('@표')) {
    const location = lines[0].replace('@표', '').trim();
    const rows: string[][] = [];
    for (let i = 1; i < lines.length; i++) {
      const cells = lines[i].split('|').map(c => c.trim()).filter(c => c);
      if (cells.length >= 2) rows.push(cells);
    }
    if (rows.length > 0) {
      commands.push({ type: 'table', key: location, value: '', rows });
    }
    return commands;
  }

  // @서술 명령
  if (lines[0].startsWith('@서술')) {
    const location = lines[0].replace('@서술', '').trim();
    const text = lines.slice(1).join('\n');
    commands.push({ type: 'text', key: location, value: text });
    return commands;
  }

  // A → B 교체
  const arrowMatch = input.match(/^(.+?)\s*(?:→|->|=>)\s*(.+)$/);
  if (arrowMatch && !input.includes('\n')) {
    const search = arrowMatch[1].replace(/^["'"]+|["'"]+$/g, '').trim();
    const replace = arrowMatch[2].replace(/^["'"]+|["'"]+$/g, '').trim();
    commands.push({ type: 'replace', key: search, value: replace });
    return commands;
  }

  // key: value (여러 줄 지원)
  for (const line of lines) {
    const kvMatch = line.match(/^(.+?)\s*[:：]\s*(.+)$/);
    if (kvMatch) {
      const fullKey = kvMatch[1].trim();
      const value = kvMatch[2].trim();

      // context + key 분리: "참여기관 기관명" → context="참여기관", key="기관명"
      const parts = fullKey.split(/\s+/);
      if (parts.length >= 2) {
        commands.push({
          type: 'value',
          context: parts.slice(0, -1).join(' '),
          key: parts[parts.length - 1],
          value,
        });
      } else {
        commands.push({ type: 'value', key: fullKey, value });
      }
    }
  }

  return commands;
}

// ── 4. 스팬 검색: context 근처의 key 찾기 ──

function findTargetSpan(
  spans: SpanInfo[],
  key: string,
  context?: string
): SpanInfo | null {
  const normKey = norm(key);

  // key를 포함하는 모든 span 후보
  const candidates = spans.filter(s => {
    const ns = norm(s.text);
    return ns.includes(normKey) || normKey.includes(ns);
  });

  if (candidates.length === 0) return null;
  if (candidates.length === 1 || !context) return candidates[0];

  // context가 있으면, context span 바로 뒤에 있는 key를 선택
  const normCtx = norm(context);
  const contextSpans = spans.filter(s => norm(s.text).includes(normCtx));

  if (contextSpans.length === 0) return candidates[0];

  // 각 candidate에 대해 가장 가까운 context span과의 거리 계산
  let best: SpanInfo | null = null;
  let bestDist = Infinity;

  for (const cand of candidates) {
    for (const ctx of contextSpans) {
      // context보다 뒤에 있는 key만 (같은 섹션)
      const dist = cand.pos - ctx.pos;
      if (dist > 0 && dist < bestDist) {
        bestDist = dist;
        best = cand;
      }
    }
  }

  return best || candidates[0];
}

// ── 5. 값 셀 찾기: label span 다음의 빈 영역 ──

function findValuePosition(
  html: string,
  spans: SpanInfo[],
  labelSpan: SpanInfo
): { start: number; end: number; type: 'span' | 'empty' } | null {
  // labelSpan 이후의 span들을 순회
  const afterSpans = spans.filter(s => s.pos > labelSpan.pos);

  // 1) 바로 다음 span이 비어있거나 placeholder면 → 그 span 교체
  for (const next of afterSpans.slice(0, 5)) {
    if (next.isEmpty) {
      return { start: next.pos, end: next.end, type: 'span' };
    }
    // 값이 이미 들어있는 span (이전 바인딩 결과) → 교체 대상
    if (next.text.length > 0 && !next.text.includes('작성') && !next.text.includes('기재')) {
      // 이 span이 다른 라벨이면 스킵
      const normText = norm(next.text);
      const labelKeywords = ['성명', '부서', '전화', '번호', '주소', '핸드폰', '이메일',
        '기관명', '대표자', '설립', '직원', '사업', '홈페이지', '매출', '직위'];
      if (labelKeywords.some(k => normText.includes(k))) continue;

      // 값 span으로 간주
      return { start: next.pos, end: next.end, type: 'span' };
    }
  }

  // 2) labelSpan 뒤의 빈 div 찾기
  const afterHtml = html.slice(labelSpan.end, labelSpan.end + 1000);
  const emptyDiv = afterHtml.match(/(height:\d+\.?\d*mm;width:\d+\.?\d*mm;">)(<\/div>)/);
  if (emptyDiv) {
    const absPos = labelSpan.end + (emptyDiv.index || 0);
    return {
      start: absPos,
      end: absPos + emptyDiv[0].length,
      type: 'empty',
    };
  }

  return null;
}

// ── 6. 명령 실행 ──

export function executeCommands(html: string, commands: ChatCommand[]): BindingResult {
  let result = html;
  const log: string[] = [];
  let success = 0, fail = 0;

  for (const cmd of commands) {
    switch (cmd.type) {
      case 'value': {
        const spans = extractSpans(result);
        const target = findTargetSpan(spans, cmd.key, cmd.context);

        if (!target) {
          log.push(`❌ "${cmd.context ? cmd.context + ' ' : ''}${cmd.key}" 라벨을 찾을 수 없습니다`);
          fail++;
          break;
        }

        const valuePos = findValuePosition(result, spans, target);
        if (!valuePos) {
          log.push(`❌ "${cmd.key}" 라벨은 찾았으나 값을 넣을 빈칸이 없습니다`);
          fail++;
          break;
        }

        const safeValue = sanitize(cmd.value);

        if (valuePos.type === 'span') {
          // 기존 span의 텍스트만 교체
          const oldSpan = result.slice(valuePos.start, valuePos.end);
          const newSpan = oldSpan.replace(/>([^<]*)<\/span>$/, `>${safeValue}</span>`);
          result = result.slice(0, valuePos.start) + newSpan + result.slice(valuePos.end);
        } else {
          // 빈 div에 span 삽입
          const oldStr = result.slice(valuePos.start, valuePos.end);
          const insertPoint = oldStr.indexOf('">') + 2;
          const newStr = oldStr.slice(0, insertPoint) +
            `<span class="hrt">${safeValue}</span>` +
            oldStr.slice(insertPoint);
          result = result.slice(0, valuePos.start) + newStr + result.slice(valuePos.end);
        }

        const ctx = cmd.context ? `${cmd.context} ` : '';
        log.push(`✅ ${ctx}${cmd.key} → "${safeValue.slice(0, 40)}${safeValue.length > 40 ? '...' : ''}"`);
        success++;
        break;
      }

      case 'replace': {
        // &nbsp; 유연 매칭
        const searchNorm = cmd.key;
        const flexPattern = searchNorm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/ /g, '(?:&nbsp;|\\s| )');
        const regex = new RegExp(flexPattern);

        if (regex.test(result)) {
          result = result.replace(regex, cmd.value);
          log.push(`✅ 교체: "${cmd.key.slice(0, 30)}..." → "${cmd.value.slice(0, 30)}..."`);
          success++;
        } else {
          // span 내부에서 검색
          const spanRegex = /<span[^>]*>([^<]*)<\/span>/g;
          let found = false;
          result = result.replace(spanRegex, (match, text) => {
            const plain = text.replace(/&nbsp;/g, ' ');
            if (plain.includes(cmd.key) && !found) {
              found = true;
              return match.replace(text, text.replace(/&nbsp;/g, ' ').replace(cmd.key, cmd.value));
            }
            return match;
          });
          if (found) {
            log.push(`✅ span 내 교체: "${cmd.key.slice(0, 30)}..."`);
            success++;
          } else {
            log.push(`❌ "${cmd.key.slice(0, 30)}..." 텍스트를 찾을 수 없습니다`);
            fail++;
          }
        }
        break;
      }

      case 'table': {
        // @표: 위치 찾기 → ❍ -- 교체
        const spans = extractSpans(result);
        const normKey = norm(cmd.key);

        // 위치 키워드 근처의 ❍ -- 찾기
        let targetEmpty: SpanInfo | null = null;

        if (normKey) {
          const locationSpan = spans.find(s => norm(s.text).includes(normKey));
          if (locationSpan) {
            const afterSpans = spans.filter(s => s.pos > locationSpan.pos && s.isEmpty);
            targetEmpty = afterSpans[0] || null;
          }
        }

        if (!targetEmpty) {
          // 첫 번째 ❍ -- 찾기
          targetEmpty = spans.find(s => norm(s.text).startsWith('❍')) || null;
        }

        if (!targetEmpty || !cmd.rows) {
          log.push(`❌ "@표 ${cmd.key}" 삽입 위치를 찾을 수 없습니다`);
          fail++;
          break;
        }

        // 표 HTML 생성
        const tableHtml = cmd.rows.map(row => {
          if (row.length === 2) {
            return `<strong>${row[0]}</strong>: ${row[1]}`;
          } else if (row.length === 4) {
            return `<strong>${row[0]}</strong>: ${row[1]}  |  <strong>${row[2]}</strong>: ${row[3]}`;
          }
          return row.join(' | ');
        }).join('  ');

        const oldSpan = targetEmpty.full;
        const newSpan = oldSpan.replace(targetEmpty.raw, tableHtml);
        result = result.replace(oldSpan, newSpan);

        log.push(`✅ @표 "${cmd.key}" → ${cmd.rows.length}행 삽입`);
        success++;
        break;
      }

      case 'text': {
        // @서술: 위치 찾기 → ❍ -- 교체
        const spans = extractSpans(result);
        const normKey = norm(cmd.key);

        let targetEmpty: SpanInfo | null = null;
        if (normKey) {
          const locationSpan = spans.find(s => norm(s.text).includes(normKey));
          if (locationSpan) {
            const afterSpans = spans.filter(s => s.pos > locationSpan.pos && s.isEmpty);
            targetEmpty = afterSpans[0] || null;
          }
        }

        if (!targetEmpty) {
          log.push(`❌ "@서술 ${cmd.key}" 삽입 위치를 찾을 수 없습니다`);
          fail++;
          break;
        }

        const safeText = sanitize(cmd.value);
        const oldSpan = targetEmpty.full;
        const newSpan = oldSpan.replace(targetEmpty.raw, safeText);
        result = result.replace(oldSpan, newSpan);

        log.push(`✅ @서술 "${cmd.key}" → ${safeText.length}자 삽입`);
        success++;
        break;
      }
    }
  }

  return { html: result, log, stats: { success, fail } };
}

// ── 7. 문서 요약 (업로드 시) ──

export function summarizeTemplate(html: string): string {
  const spans = extractSpans(html);
  const pages = html.split(/class="hpa"/).length - 1;
  const emptyCount = spans.filter(s => s.isEmpty).length;
  const textSpans = spans.filter(s => !s.isEmpty && s.text.length > 2);

  // 주요 라벨 추출
  const labels = textSpans
    .filter(s => {
      const t = norm(s.text);
      return t.length < 20 && !t.includes('--') && !t.includes('***');
    })
    .map(s => s.text)
    .slice(0, 50);

  // placeholder 목록
  const placeholders = textSpans
    .filter(s => s.text.includes('기재') || s.text.includes('기술') || s.text.includes('기입'))
    .map(s => s.text.slice(0, 50));

  return [
    `📄 문서 분석 완료`,
    `• ${pages}페이지, ${spans.length}개 텍스트 영역`,
    `• ${emptyCount}개 빈칸/placeholder 발견`,
    `• ${placeholders.length}개 "기재" 항목`,
    ``,
    `💡 사용법:`,
    `• 값 대입: "과제명 : ㅇㅇㅇ"`,
    `• 컨텍스트: "참여기관 기관명 : (주)천강"`,
    `• 여러 줄: 줄바꿈으로 구분`,
    `• 교체: "A → B"`,
    `• 표 삽입: "@표 위치명" + key|value`,
    `• 서술: "@서술 위치명" + 텍스트`,
  ].join('\n');
}

// 하위호환
export interface BindingField {
  id: string; label: string; value: string; status: string;
  placeholder?: string; keyword?: string; domId?: string;
  position?: { page: number; context: string };
}

export function extractFieldsFromContent(contentHtml: string): BindingField[] { return []; }
export function bindFields(templateHtml: string, fields: BindingField[]): { html: string; fields: BindingField[]; stats: { total: number; bound: number; skipped: number; error: number } } {
  return { html: templateHtml, fields, stats: { total: 0, bound: 0, skipped: 0, error: 0 } };
}
export function autoGenerateFields(): BindingField[] { return []; }
