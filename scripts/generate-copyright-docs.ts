/**
 * SW저작권 등록용 소스코드 + 프로그램 설명서 생성
 * 실행: npx tsx scripts/generate-copyright-docs.ts
 *
 * 출력:
 *   - copyright-source-first30.txt (첫 30페이지 분량)
 *   - copyright-source-last30.txt  (마지막 30페이지 분량)
 *   - program-description.txt      (프로그램 설명서)
 */
import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join, relative } from 'path';

const SRC_DIR = join(__dirname, '..', 'src');
const OUT_DIR = join(__dirname, '..', 'docs');

// 한 페이지 ≈ 50줄 기준 (A4, 10pt 고정폭)
const LINES_PER_PAGE = 50;
const PAGES = 30;
const LINES_LIMIT = LINES_PER_PAGE * PAGES; // 1500줄

// 재귀적으로 모든 .ts/.tsx 파일 수집
function collectFiles(dir: string): string[] {
  const results: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      results.push(...collectFiles(full));
    } else if (/\.(ts|tsx)$/.test(entry)) {
      results.push(full);
    }
  }
  return results.sort();
}

// 민감 정보 마스킹
function maskSecrets(content: string): string {
  return content
    .replace(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]*/g, '[JWT_TOKEN_MASKED]')
    .replace(/neo4j\+s:\/\/[^\s'"]+/g, '[NEO4J_URI_MASKED]')
    .replace(/BC7EU[^\s'"]+/g, '[PASSWORD_MASKED]')
    .replace(/(api[_-]?key|secret|password|token)\s*[:=]\s*['"][^'"]+['"]/gi, '$1: "[MASKED]"');
}

function main() {
  // docs 폴더 생성
  try { readdirSync(OUT_DIR); } catch { require('fs').mkdirSync(OUT_DIR, { recursive: true }); }

  const files = collectFiles(SRC_DIR);
  console.log(`소스 파일: ${files.length}개`);

  // 전체 소스코드를 하나로 합침 (파일 경로 포함)
  const allLines: string[] = [];
  for (const file of files) {
    const rel = relative(join(__dirname, '..'), file).replace(/\\/g, '/');
    const content = readFileSync(file, 'utf-8');
    const masked = maskSecrets(content);

    allLines.push(`${'='.repeat(70)}`);
    allLines.push(`// 파일: ${rel}`);
    allLines.push(`${'='.repeat(70)}`);
    allLines.push(...masked.split('\n'));
    allLines.push(''); // 파일 간 구분
  }

  console.log(`총 줄 수: ${allLines.length}`);

  // 첫 30페이지 (1500줄)
  const first30 = allLines.slice(0, LINES_LIMIT).join('\n');
  writeFileSync(join(OUT_DIR, 'copyright-source-first30.txt'), first30, 'utf-8');
  console.log(`첫 30페이지: ${Math.min(allLines.length, LINES_LIMIT)}줄 → docs/copyright-source-first30.txt`);

  // 마지막 30페이지 (1500줄)
  const last30 = allLines.slice(-LINES_LIMIT).join('\n');
  writeFileSync(join(OUT_DIR, 'copyright-source-last30.txt'), last30, 'utf-8');
  console.log(`마지막 30페이지: ${Math.min(allLines.length, LINES_LIMIT)}줄 → docs/copyright-source-last30.txt`);

  // 프로그램 설명서
  const description = generateDescription(files);
  writeFileSync(join(OUT_DIR, 'program-description.txt'), description, 'utf-8');
  console.log(`프로그램 설명서 → docs/program-description.txt`);

  console.log('\n✅ 완료! docs/ 폴더에서 확인하세요.');
}

function generateDescription(files: string[]): string {
  const totalLines = files.reduce((sum, f) => sum + readFileSync(f, 'utf-8').split('\n').length, 0);

  return `
================================================================================
                          프로그램 설명서
                   SW저작권 등록 신청용 (한국저작권위원회)
================================================================================

1. 프로그램명
   SaaS Dashboard

2. 프로그램 유형
   웹 애플리케이션 (SaaS)

3. 창작 완성일
   2026년 3월 25일

4. 프로그램 개요
   팀 협업을 위한 통합 관리 대시보드입니다.
   일정 관리, 화상회의, 칸반 보드, 입찰문서 분석, QR 명함,
   SW 역량 프로필 관리 등 7개 핵심 모듈로 구성됩니다.

5. 개발 환경
   - 언어: TypeScript 5.x
   - 프레임워크: Next.js 16.1 (App Router)
   - UI: React 19, Tailwind CSS 4
   - 데이터베이스: Supabase (PostgreSQL), Neo4j Aura (그래프DB)
   - 인증: 카카오 OAuth 2.0
   - 배포: Vercel
   - 기타: Jitsi Meet (화상회의), G6 AntV (그래프 시각화),
           Recharts (차트), JSZip (문서 처리)

6. 프로그램 규모
   - 소스 파일 수: ${files.length}개
   - 총 코드 라인: ${totalLines.toLocaleString()}줄
   - 주요 디렉토리: src/app/, src/components/, src/lib/, src/types/

7. 기능 설명

   7.1 일정 관리 (Dashboard)
       - 월별 캘린더 뷰 + 리스트 뷰
       - 일정 CRUD (생성, 조회, 수정, 삭제)
       - 화상회의 연동 (회의 일정에 참여 링크 포함)
       - 오늘/이번주 일정 사이드바
       - 일정 생성 시 전체 사용자 알림 발송

   7.2 화상회의 (Settings → 회의)
       - Jitsi Meet 임베드 (영상/음성/화면공유)
       - 회의방 생성 및 관리
       - 카카오톡 초대 공유
       - 초대 링크 복사
       - 대기방 / 회의 종료 분리

   7.3 칸반 보드 (Board)
       - 드래그앤드롭 칸반 보드 (할일/진행/검토/완료)
       - 캘린더 뷰, 내 할일 뷰
       - 이슈 CRUD + 우선순위/라벨/담당자/마감일
       - 첨부파일, 하위작업, 연결 이슈
       - 실시간 동기화 (Supabase Realtime)

   7.4 입찰문서 분석 (Analytics)
       - HWP/HWPX/PDF/DOCX 문서 파싱
       - 텍스트 영역 선택 → Key-Value 매핑
       - 매핑 데이터 엑셀 내보내기/가져오기
       - HWPX 파일 자동 값 채우기 및 다운로드

   7.5 QR 명함 (QR Cards)
       - 디지털 명함 프로필 CRUD
       - QR 코드 자동 생성
       - vCard 다운로드
       - 공개 프로필 페이지 (/u/[uniqueId])

   7.6 SW 역량 프로필 (Graph)
       - Neo4j 그래프 데이터베이스 기반
       - G6 (AntV) 시각화 엔진
       - 8가지 노드 타입: 사람, 스킬, 프로젝트, 교육,
         자격증, 문서, 역할, 도구
       - 프로필 추가/수정/삭제
       - 전체 팀원 / 내 프로필 토글
       - 학위, 성별, 나이, 한줄 소개

   7.7 사용자 관리 (Users)
       - 역할 기반 접근 제어 (admin/user/viewer)
       - 사용자 상태 관리 (active/inactive)
       - 관리자 전용 프로필 편집

8. 인증 체계
   - 카카오 OAuth 2.0 소셜 로그인
   - Supabase Auth (JWT 세션)
   - CSRF 토큰 검증
   - Row Level Security (RLS) 정책

9. 보안 조치
   - DOMPurify HTML 살균 (XSS 방지)
   - 보안 헤더 (X-Frame-Options, CSP 등)
   - 환경변수 기반 비밀 관리
   - HTTPS/TLS 암호화 전송
   - 개인정보처리방침 페이지

10. 특이사항
    - PWA 지원 (모바일 홈 화면 추가)
    - 다크 모드 지원
    - 반응형 디자인 (모바일/태블릿/데스크톱)
    - 한국어(ko) 전용 인터페이스

================================================================================
                          조이텍 © 2005-2026
================================================================================
`.trim();
}

main();
