/**
 * Neo4j SW 역량 프로필 스키마 시드
 * 실행: npx tsx scripts/neo4j-profile-seed.ts
 */
import neo4j from 'neo4j-driver';
import { readFileSync } from 'fs';

// .env.local 수동 파싱
const envContent = readFileSync('.env.local', 'utf-8');
const env: Record<string, string> = {};
for (const line of envContent.split('\n')) {
  const [key, ...rest] = line.split('=');
  if (key?.trim()) env[key.trim()] = rest.join('=').trim();
}

const driver = neo4j.driver(
  env.NEO4J_URI,
  neo4j.auth.basic(env.NEO4J_USERNAME, env.NEO4J_PASSWORD)
);

async function seed() {
  const session = driver.session();

  try {
    // 기존 데이터 정리
    await session.run('MATCH (n) DETACH DELETE n');
    console.log('기존 데이터 삭제 완료');

    // 인덱스 생성
    await session.run('CREATE INDEX IF NOT EXISTS FOR (p:Person) ON (p.userId)');
    await session.run('CREATE INDEX IF NOT EXISTS FOR (s:Skill) ON (s.name)');
    await session.run('CREATE INDEX IF NOT EXISTS FOR (p:Project) ON (p.name)');
    await session.run('CREATE INDEX IF NOT EXISTS FOR (e:Education) ON (e.name)');
    await session.run('CREATE INDEX IF NOT EXISTS FOR (c:Certificate) ON (c.name)');
    await session.run('CREATE INDEX IF NOT EXISTS FOR (d:Document) ON (d.name)');
    await session.run('CREATE INDEX IF NOT EXISTS FOR (r:Role) ON (r.name)');
    await session.run('CREATE INDEX IF NOT EXISTS FOR (t:Tool) ON (t.name)');
    console.log('인덱스 생성 완료');

    // 스킬 카테고리 & 샘플 데이터
    const skillCategories = {
      'AI/ML': [
        { name: 'AI Agent 개발', level: 'high' },
        { name: 'Prompt Engineering', level: 'high' },
        { name: 'LLM 활용', level: 'high' },
        { name: 'RAG 시스템', level: 'medium' },
        { name: 'Machine Learning', level: 'medium' },
        { name: 'Computer Vision', level: 'low' },
      ],
      '프로그래밍': [
        { name: 'TypeScript', level: 'high' },
        { name: 'JavaScript', level: 'high' },
        { name: 'Python', level: 'high' },
        { name: 'React/Next.js', level: 'high' },
        { name: 'Node.js', level: 'high' },
        { name: 'SQL', level: 'medium' },
        { name: 'Neo4j/Cypher', level: 'medium' },
        { name: 'HTML/CSS', level: 'high' },
      ],
      '디자인': [
        { name: 'UI/UX 설계', level: 'medium' },
        { name: 'Figma', level: 'medium' },
        { name: 'Design System', level: 'medium' },
        { name: '와이어프레임', level: 'high' },
        { name: '프로토타이핑', level: 'medium' },
      ],
      '기획/관리': [
        { name: '프로젝트 관리', level: 'high' },
        { name: '요구사항 분석', level: 'high' },
        { name: '사업계획서', level: 'high' },
        { name: '제안서 작성', level: 'high' },
        { name: 'Agile/Scrum', level: 'medium' },
        { name: '서비스 기획', level: 'high' },
      ],
      '인프라/DevOps': [
        { name: 'Vercel', level: 'high' },
        { name: 'Supabase', level: 'high' },
        { name: 'Docker', level: 'medium' },
        { name: 'CI/CD', level: 'medium' },
        { name: 'AWS', level: 'low' },
      ],
      '산업/도메인': [
        { name: '입찰/조달', level: 'high' },
        { name: 'SaaS 개발', level: 'high' },
        { name: '공공 SI', level: 'medium' },
        { name: '디지털전환(DX)', level: 'high' },
        { name: '스마트팩토리', level: 'medium' },
      ],
    };

    // 스킬 노드 생성
    for (const [category, skills] of Object.entries(skillCategories)) {
      for (const skill of skills) {
        await session.run(
          `MERGE (s:Skill {name: $name})
           SET s.category = $category, s.level = $level`,
          { name: skill.name, category, level: skill.level }
        );
      }
    }
    console.log('스킬 노드 생성 완료');

    // 샘플 프로젝트
    const projects = [
      { name: 'SaaS Dashboard', type: 'webapp', tech: 'Next.js, Supabase, Neo4j', status: 'active', description: '팀 협업 대시보드' },
      { name: '입찰문서 분석기', type: 'tool', tech: 'Python, AI', status: 'active', description: '공공입찰 문서 자동 분석' },
      { name: 'QR 명함 시스템', type: 'webapp', tech: 'Next.js, QR Code', status: 'completed', description: '디지털 명함 + QR 공유' },
      { name: '화상회의 시스템', type: 'webapp', tech: 'Jitsi Meet, WebRTC', status: 'active', description: '팀 화상회의' },
    ];

    for (const p of projects) {
      await session.run(
        `MERGE (p:Project {name: $name})
         SET p.type = $type, p.tech = $tech, p.status = $status, p.description = $description`,
        p
      );
    }
    console.log('프로젝트 노드 생성 완료');

    // 샘플 교육
    const educations = [
      { name: 'AI Agent 실무 교육', provider: 'Claude Code', date: '2026-03', category: 'AI/ML', hours: 40 },
      { name: 'Prompt Engineering 마스터', provider: 'Online', date: '2025-12', category: 'AI/ML', hours: 20 },
      { name: 'Next.js 풀스택 개발', provider: 'Vercel', date: '2025-10', category: '프로그래밍', hours: 30 },
      { name: 'Neo4j 그래프 DB', provider: 'Neo4j Academy', date: '2026-01', category: '프로그래밍', hours: 16 },
    ];

    for (const e of educations) {
      await session.run(
        `MERGE (e:Education {name: $name})
         SET e.provider = $provider, e.date = $date, e.category = $category, e.hours = $hours`,
        e
      );
    }
    console.log('교육 노드 생성 완료');

    // 샘플 자격증/인증
    const certificates = [
      { name: 'Claude Code Certified', issuer: 'Anthropic', date: '2026-03', category: 'AI/ML' },
      { name: '정보처리기사', issuer: '한국산업인력공단', date: '2020-06', category: '프로그래밍' },
    ];

    for (const c of certificates) {
      await session.run(
        `MERGE (c:Certificate {name: $name})
         SET c.issuer = $issuer, c.date = $date, c.category = $category`,
        c
      );
    }
    console.log('자격증 노드 생성 완료');

    // 샘플 문서
    const documents = [
      { name: '2026 혁신바우처 사업계획서', type: 'proposal', date: '2026-03', description: '산업맞춤형 혁신바우처 지원사업' },
      { name: 'SaaS Dashboard 설계서', type: 'design', date: '2026-02', description: '시스템 아키텍처 및 DB 설계' },
    ];

    for (const d of documents) {
      await session.run(
        `MERGE (d:Document {name: $name})
         SET d.type = $type, d.date = $date, d.description = $description`,
        d
      );
    }
    console.log('문서 노드 생성 완료');

    // 샘플 도구
    const tools = [
      { name: 'Claude Code', category: 'AI', description: 'AI 코딩 어시스턴트' },
      { name: 'VS Code', category: 'IDE', description: '코드 에디터' },
      { name: 'Figma', category: '디자인', description: 'UI/UX 디자인 도구' },
      { name: 'GitHub', category: '협업', description: '소스코드 관리' },
      { name: 'Supabase', category: 'BaaS', description: '백엔드 서비스' },
      { name: 'Vercel', category: '배포', description: '프론트엔드 배포' },
    ];

    for (const t of tools) {
      await session.run(
        `MERGE (t:Tool {name: $name})
         SET t.category = $category, t.description = $description`,
        t
      );
    }
    console.log('도구 노드 생성 완료');

    // 역할
    const roles = [
      { name: 'Full-Stack Developer', department: '개발팀' },
      { name: 'AI Engineer', department: '개발팀' },
      { name: 'Project Manager', department: '기획팀' },
      { name: 'UI/UX Designer', department: '디자인팀' },
      { name: 'Technical Writer', department: '기획팀' },
    ];

    for (const r of roles) {
      await session.run(
        `MERGE (r:Role {name: $name})
         SET r.department = $department`,
        r
      );
    }
    console.log('역할 노드 생성 완료');

    console.log('\n✅ Neo4j 시드 완료!');
    console.log('사용자가 로그인하면 Person 노드가 자동 생성되고');
    console.log('프로필 페이지에서 스킬/프로젝트/교육 등을 연결할 수 있습니다.');

  } finally {
    await session.close();
    await driver.close();
  }
}

seed().catch(console.error);
