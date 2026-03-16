const fs = require("fs");
const neo4j = require("neo4j-driver");

// Load .env.local
fs.readFileSync(".env.local", "utf8").split("\n").forEach((l) => {
  l = l.trim();
  if (!l || l.startsWith("#")) return;
  const i = l.indexOf("=");
  if (i === -1) return;
  process.env[l.slice(0, i).trim()] = l.slice(i + 1).trim();
});

const driver = neo4j.driver(process.env.NEO4J_URI, neo4j.auth.basic(process.env.NEO4J_USERNAME, process.env.NEO4J_PASSWORD));

const users = [
  { id: "u1", name: "조은아", email: "joytec@naver.com", phone: "010-2648-6726", role: "admin" },
  { id: "u2", name: "박태준", email: "eybbye@gmail.com", phone: "010-6261-0970", role: "user" },
  { id: "u3", name: "신인숙", email: "ppeanut@naver.com", phone: "010-8653-0836", role: "user" },
  { id: "u4", name: "홍상진", email: "sjhong76@gmail.com", phone: "010-6211-9683", role: "user" },
];

const labels = ["버그", "기능", "개선", "긴급", "UI", "백엔드", "프론트엔드", "문서"];

const issues = [
  { id: "i1", title: "로그인 페이지 버그 수정", status: "done", priority: "high", assignee: "u1", labels: ["버그", "긴급"] },
  { id: "i2", title: "대시보드 차트 추가", status: "in_progress", priority: "medium", assignee: "u2", labels: ["기능", "프론트엔드"] },
  { id: "i3", title: "API 응답 속도 개선", status: "todo", priority: "high", assignee: "u3", labels: ["개선", "백엔드"] },
  { id: "i4", title: "사용자 프로필 페이지", status: "in_review", priority: "medium", assignee: "u4", labels: ["기능", "UI"] },
  { id: "i5", title: "알림 시스템 구현", status: "todo", priority: "low", assignee: "u1", labels: ["기능", "백엔드"] },
  { id: "i6", title: "모바일 반응형 수정", status: "in_progress", priority: "medium", assignee: "u2", labels: ["버그", "UI"] },
  { id: "i7", title: "테스트 커버리지 확대", status: "todo", priority: "low", assignee: "u3", labels: ["개선", "문서"] },
  { id: "i8", title: "배포 파이프라인 설정", status: "done", priority: "high", assignee: "u4", labels: ["개선", "백엔드"] },
];

async function seed() {
  const session = driver.session();
  try {
    await session.run("MATCH (n) DETACH DELETE n");
    console.log("Cleared existing Neo4j data");

    for (const u of users) {
      await session.run(
        "CREATE (u:User {id: $id, name: $name, email: $email, phone: $phone, role: $role})", u,
      );
    }
    console.log("Created " + users.length + " User nodes");

    for (const name of labels) {
      await session.run("CREATE (l:Label {name: $name})", { name });
    }
    console.log("Created " + labels.length + " Label nodes");

    for (const issue of issues) {
      await session.run(
        "CREATE (i:Issue {id: $id, title: $title, status: $status, priority: $priority})",
        { id: issue.id, title: issue.title, status: issue.status, priority: issue.priority },
      );
      await session.run(
        "MATCH (i:Issue {id: $issueId}), (u:User {id: $userId}) CREATE (i)-[:ASSIGNED_TO]->(u)",
        { issueId: issue.id, userId: issue.assignee },
      );
      for (const label of issue.labels) {
        await session.run(
          "MATCH (i:Issue {id: $issueId}), (l:Label {name: $name}) CREATE (i)-[:LABELED_WITH]->(l)",
          { issueId: issue.id, name: label },
        );
      }
    }
    console.log("Created " + issues.length + " Issue nodes with relationships");

    const result = await session.run("MATCH (n) RETURN labels(n)[0] AS type, count(n) AS cnt");
    console.log("\nNode summary:");
    for (const r of result.records) {
      console.log("  " + r.get("type") + ": " + r.get("cnt").toNumber());
    }
    const relResult = await session.run("MATCH ()-[r]->() RETURN type(r) AS type, count(r) AS cnt");
    console.log("Relationship summary:");
    for (const r of relResult.records) {
      console.log("  " + r.get("type") + ": " + r.get("cnt").toNumber());
    }
    console.log("\nDone!");
  } finally {
    await session.close();
    await driver.close();
  }
}

seed().catch((err) => { console.error("Seed failed:", err.message); driver.close(); });
