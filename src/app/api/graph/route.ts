import { NextResponse } from "next/server";
import { withOptionalAuth } from "@/lib/api-auth";
import { getDriver } from "@/lib/neo4j";
import { createClient } from "@supabase/supabase-js";
import type { GraphData, GraphNode, GraphLink } from "@/types/graph";

async function buildGraphFromSupabase(): Promise<GraphData> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return { nodes: [], links: [] };

  const supabase = createClient(url, key);

  const [issuesRes, profilesRes] = await Promise.all([
    supabase.from("issues").select("id, title, status, priority, assignee_id, assignee_name, labels, user_id"),
    supabase.from("profiles").select("id, name, email, role"),
  ]);

  const issues = issuesRes.data ?? [];
  const profiles = profilesRes.data ?? [];

  const nodes: GraphNode[] = [];
  const links: GraphLink[] = [];
  const labelSet = new Set<string>();

  // User nodes
  for (const p of profiles) {
    nodes.push({
      id: p.id,
      name: p.name ?? p.email ?? p.id,
      type: "user",
      meta: { email: p.email, role: p.role },
    });
  }

  // Issue nodes + links
  for (const issue of issues) {
    nodes.push({
      id: issue.id,
      name: issue.title,
      type: "issue",
      meta: { status: issue.status, priority: issue.priority },
    });

    // ASSIGNED_TO
    if (issue.assignee_id) {
      links.push({ source: issue.assignee_id, target: issue.id, type: "ASSIGNED_TO" });
    }

    // CREATED_BY
    if (issue.user_id) {
      links.push({ source: issue.id, target: issue.user_id, type: "CREATED_BY" });
    }

    // LABELED_WITH
    for (const label of issue.labels ?? []) {
      const labelId = `label-${label}`;
      if (!labelSet.has(label)) {
        labelSet.add(label);
        nodes.push({ id: labelId, name: label, type: "label", meta: {} });
      }
      links.push({ source: issue.id, target: labelId, type: "LABELED_WITH" });
    }
  }

  // Filter out links that reference non-existent nodes
  const nodeIds = new Set(nodes.map((n) => n.id));
  const validLinks = links.filter((l) => nodeIds.has(l.source) && nodeIds.has(l.target));

  return { nodes, links: validLinks };
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const GET = withOptionalAuth(async (_request, _ctx) => {
  const driver = getDriver();

  if (!driver) {
    // No Neo4j — build graph from Supabase data
    const data = await buildGraphFromSupabase();
    return NextResponse.json(data);
  }

  const dbSession = driver.session();
  try {
    const result = await dbSession.run(`
      MATCH (n)
      OPTIONAL MATCH (n)-[r]->(m)
      RETURN n, labels(n) AS nLabels, r, type(r) AS rType, m, labels(m) AS mLabels
    `);

    const nodesMap = new Map<string, GraphNode>();
    const links: GraphLink[] = [];

    function getNodeId(node: any): string {
      return node.properties.id ?? node.properties.name ?? `neo4j-${node.identity.toString()}`;
    }

    for (const record of result.records) {
      const n = record.get("n");
      const nLabels = record.get("nLabels") as string[];
      if (n) {
        const nId = getNodeId(n);
        if (!nodesMap.has(nId)) {
          nodesMap.set(nId, {
            id: nId,
            name: n.properties.name ?? n.properties.title ?? nId,
            type: nLabels[0]?.toLowerCase() as GraphNode["type"],
            meta: { ...n.properties },
          });
        }
      }

      const m = record.get("m");
      const mLabels = record.get("mLabels") as string[] | null;
      if (m && mLabels) {
        const mId = getNodeId(m);
        if (!nodesMap.has(mId)) {
          nodesMap.set(mId, {
            id: mId,
            name: m.properties.name ?? m.properties.title ?? mId,
            type: mLabels[0]?.toLowerCase() as GraphNode["type"],
            meta: { ...m.properties },
          });
        }
      }

      const rType = record.get("rType") as string | null;
      if (rType && n && m) {
        links.push({
          source: getNodeId(n),
          target: getNodeId(m),
          type: rType as GraphLink["type"],
        });
      }
    }

    const data: GraphData = {
      nodes: Array.from(nodesMap.values()),
      links,
    };

    return NextResponse.json(data);
  } catch (error) {
    console.error("Neo4j query failed, falling back to Supabase:", error);
    const data = await buildGraphFromSupabase();
    return NextResponse.json(data);
  } finally {
    await dbSession.close();
  }
});
