import { NextResponse } from "next/server";
import { withOptionalAuth } from "@/lib/api-auth";
import { getDriver } from "@/lib/neo4j";
import type { GraphData, GraphNode, GraphLink } from "@/types/graph";

const NODE_TYPE_MAP: Record<string, GraphNode["type"]> = {
  Person: "person", Skill: "skill", Project: "project",
  Education: "education", Certificate: "certificate",
  Document: "document", Role: "role", Tool: "tool",
};

// GET: 전체 프로필 그래프 조회
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const GET = withOptionalAuth(async (_request, _ctx) => {
  const driver = getDriver();
  if (!driver) {
    return NextResponse.json({ nodes: [], links: [] });
  }

  const session = driver.session();
  try {
    const result = await session.run(`
      MATCH (n)
      OPTIONAL MATCH (n)-[r]->(m)
      RETURN n, labels(n) AS nLabels, r, type(r) AS rType, m, labels(m) AS mLabels
    `);

    const nodesMap = new Map<string, GraphNode>();
    const links: GraphLink[] = [];

    function processNode(node: any, labels: string[]): string {
      const id = node.elementId ?? node.identity?.toString() ?? "";
      if (!nodesMap.has(id)) {
        const label = labels[0] ?? "unknown";
        nodesMap.set(id, {
          id,
          name: node.properties.name ?? node.properties.title ?? id,
          type: NODE_TYPE_MAP[label] ?? "skill",
          meta: { ...node.properties },
        });
      }
      return id;
    }

    for (const record of result.records) {
      const n = record.get("n");
      const nLabels = record.get("nLabels") as string[];
      if (n) processNode(n, nLabels);

      const m = record.get("m");
      const mLabels = record.get("mLabels") as string[] | null;
      if (m && mLabels) processNode(m, mLabels);

      const rType = record.get("rType") as string | null;
      if (rType && n && m) {
        const sourceId = n.elementId ?? n.identity?.toString();
        const targetId = m.elementId ?? m.identity?.toString();
        links.push({ source: sourceId, target: targetId, type: rType as GraphLink["type"] });
      }
    }

    return NextResponse.json({ nodes: Array.from(nodesMap.values()), links });
  } catch (error) {
    console.error("Neo4j query failed:", error);
    return NextResponse.json({ nodes: [], links: [] });
  } finally {
    await session.close();
  }
});

// POST: 노드 추가 및 관계 생성
export const POST = withOptionalAuth(async (request) => {
  const driver = getDriver();
  if (!driver) {
    return NextResponse.json({ error: "Neo4j not configured" }, { status: 500 });
  }

  const body = await request.json();
  const { action, data } = body;
  const session = driver.session();

  try {
    switch (action) {
      case "ensurePerson": {
        const { userId, name, email, avatarUrl } = data;
        await session.run(
          `MERGE (p:Person {userId: $userId})
           SET p.name = $name, p.email = $email, p.avatarUrl = $avatarUrl`,
          { userId, name, email: email ?? "", avatarUrl: avatarUrl ?? "" }
        );
        return NextResponse.json({ ok: true });
      }

      case "updatePerson": {
        const { userId, degree, gender, age, bio } = data;
        await session.run(
          `MATCH (p:Person {userId: $userId})
           SET p.degree = $degree, p.gender = $gender, p.age = toInteger($age), p.bio = $bio`,
          { userId, degree: degree ?? "", gender: gender ?? "", age: age ?? 0, bio: bio ?? "" }
        );
        return NextResponse.json({ ok: true });
      }

      case "addSkill": {
        // 사용자에게 스킬 연결
        const { userId, skillName, category, level } = data;
        await session.run(
          `MERGE (p:Person {userId: $userId})
           MERGE (s:Skill {name: $skillName})
           SET s.category = $category, s.level = $level
           MERGE (p)-[:HAS_SKILL]->(s)`,
          { userId, skillName, category: category ?? "", level: level ?? "medium" }
        );
        return NextResponse.json({ ok: true });
      }

      case "addProject": {
        const { userId, name, type, tech, status, description } = data;
        await session.run(
          `MERGE (p:Person {userId: $userId})
           MERGE (proj:Project {name: $name})
           SET proj.type = $type, proj.tech = $tech, proj.status = $status, proj.description = $description
           MERGE (p)-[:WORKED_ON]->(proj)`,
          { userId, name, type: type ?? "", tech: tech ?? "", status: status ?? "active", description: description ?? "" }
        );
        return NextResponse.json({ ok: true });
      }

      case "addEducation": {
        const { userId, name, provider, date, category, hours } = data;
        await session.run(
          `MERGE (p:Person {userId: $userId})
           MERGE (e:Education {name: $name})
           SET e.provider = $provider, e.date = $date, e.category = $category, e.hours = $hours
           MERGE (p)-[:COMPLETED]->(e)`,
          { userId, name, provider: provider ?? "", date: date ?? "", category: category ?? "", hours: hours ?? 0 }
        );
        return NextResponse.json({ ok: true });
      }

      case "addCertificate": {
        const { userId, name, issuer, date, category } = data;
        await session.run(
          `MERGE (p:Person {userId: $userId})
           MERGE (c:Certificate {name: $name})
           SET c.issuer = $issuer, c.date = $date, c.category = $category
           MERGE (p)-[:EARNED]->(c)`,
          { userId, name, issuer: issuer ?? "", date: date ?? "", category: category ?? "" }
        );
        return NextResponse.json({ ok: true });
      }

      case "addDocument": {
        const { userId, name, type, date, description } = data;
        await session.run(
          `MERGE (p:Person {userId: $userId})
           MERGE (d:Document {name: $name})
           SET d.type = $type, d.date = $date, d.description = $description
           MERGE (p)-[:AUTHORED]->(d)`,
          { userId, name, type: type ?? "", date: date ?? "", description: description ?? "" }
        );
        return NextResponse.json({ ok: true });
      }

      case "addRole": {
        const { userId, name, department } = data;
        await session.run(
          `MERGE (p:Person {userId: $userId})
           MERGE (r:Role {name: $name})
           SET r.department = $department
           MERGE (p)-[:HAS_ROLE]->(r)`,
          { userId, name, department: department ?? "" }
        );
        return NextResponse.json({ ok: true });
      }

      case "addTool": {
        const { userId, name, category, description } = data;
        await session.run(
          `MERGE (p:Person {userId: $userId})
           MERGE (t:Tool {name: $name})
           SET t.category = $category, t.description = $description
           MERGE (p)-[:USES_TOOL]->(t)`,
          { userId, name, category: category ?? "", description: description ?? "" }
        );
        return NextResponse.json({ ok: true });
      }

      case "removeRelation": {
        // 관계 삭제
        const { userId, targetName, targetLabel, relType } = data;
        await session.run(
          `MATCH (p:Person {userId: $userId})-[r:${relType}]->(t:${targetLabel} {name: $targetName})
           DELETE r`,
          { userId, targetName }
        );
        return NextResponse.json({ ok: true });
      }

      default:
        return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }
  } catch (error: any) {
    console.error("Neo4j mutation failed:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  } finally {
    await session.close();
  }
});
