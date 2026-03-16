import { getDriver } from "./neo4j";
import type { Issue } from "@/types/issue";

async function runCypher(query: string, params: Record<string, unknown>): Promise<void> {
  const driver = getDriver();
  if (!driver) return;

  const session = driver.session();
  try {
    await session.run(query, params);
  } catch (error) {
    console.error("Neo4j sync failed:", error);
  } finally {
    await session.close();
  }
}

export async function syncIssueCreate(issue: Issue): Promise<void> {
  await runCypher(
    `MERGE (i:Issue {id: $id})
     SET i.title = $title, i.status = $status, i.priority = $priority,
         i.created_at = $created_at
     WITH i
     FOREACH (_ IN CASE WHEN $assignee_id IS NOT NULL THEN [1] ELSE [] END |
       MERGE (u:User {id: $assignee_id})
       ON CREATE SET u.name = $assignee_name
       MERGE (i)-[:ASSIGNED_TO]->(u)
     )
     WITH i
     UNWIND CASE WHEN size($labels) > 0 THEN $labels ELSE [null] END AS labelName
     WITH i, labelName WHERE labelName IS NOT NULL
     MERGE (l:Label {name: labelName})
     MERGE (i)-[:LABELED_WITH]->(l)`,
    {
      id: issue.id,
      title: issue.title,
      status: issue.status,
      priority: issue.priority,
      created_at: issue.created_at,
      assignee_id: issue.assignee_id,
      assignee_name: issue.assignee_name ?? "Unknown",
      labels: issue.labels ?? [],
    },
  );
}

export async function syncIssueUpdate(issue: Issue): Promise<void> {
  await runCypher(
    `MATCH (i:Issue {id: $id})
     SET i.title = $title, i.status = $status, i.priority = $priority
     WITH i
     OPTIONAL MATCH (i)-[ra:ASSIGNED_TO]->()
     DELETE ra
     WITH i
     OPTIONAL MATCH (i)-[rl:LABELED_WITH]->()
     DELETE rl
     WITH i
     FOREACH (_ IN CASE WHEN $assignee_id IS NOT NULL THEN [1] ELSE [] END |
       MERGE (u:User {id: $assignee_id})
       ON CREATE SET u.name = $assignee_name
       MERGE (i)-[:ASSIGNED_TO]->(u)
     )
     WITH i
     UNWIND CASE WHEN size($labels) > 0 THEN $labels ELSE [null] END AS labelName
     WITH i, labelName WHERE labelName IS NOT NULL
     MERGE (l:Label {name: labelName})
     MERGE (i)-[:LABELED_WITH]->(l)`,
    {
      id: issue.id,
      title: issue.title,
      status: issue.status,
      priority: issue.priority,
      assignee_id: issue.assignee_id,
      assignee_name: issue.assignee_name ?? "Unknown",
      labels: issue.labels ?? [],
    },
  );
}

export async function syncIssueDelete(issueId: string): Promise<void> {
  await runCypher(
    `MATCH (i:Issue {id: $id}) DETACH DELETE i`,
    { id: issueId },
  );
}
