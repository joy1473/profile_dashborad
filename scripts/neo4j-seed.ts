/**
 * Neo4j Seed Script
 * Syncs existing Supabase issues and profiles to Neo4j.
 * Usage: npx tsx scripts/neo4j-seed.ts
 */
import { createClient } from "@supabase/supabase-js";
import neo4j from "neo4j-driver";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const neo4jUri = process.env.NEO4J_URI;
const neo4jUser = process.env.NEO4J_USERNAME;
const neo4jPassword = process.env.NEO4J_PASSWORD;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY");
  process.exit(1);
}
if (!neo4jUri || !neo4jUser || !neo4jPassword) {
  console.error("Missing NEO4J_URI, NEO4J_USERNAME, or NEO4J_PASSWORD");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);
const driver = neo4j.driver(neo4jUri, neo4j.auth.basic(neo4jUser, neo4jPassword));

async function seed() {
  const session = driver.session();

  try {
    // 1. Fetch all profiles
    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("id, name, email, role");
    if (profilesError) throw profilesError;

    // 2. Create User nodes
    for (const p of profiles ?? []) {
      await session.run(
        `MERGE (u:User {id: $id}) SET u.name = $name, u.email = $email, u.role = $role`,
        { id: p.id, name: p.name, email: p.email ?? "", role: p.role },
      );
    }
    console.log(`Seeded ${profiles?.length ?? 0} User nodes`);

    // 3. Fetch all issues
    const { data: issues, error: issuesError } = await supabase
      .from("issues")
      .select("*");
    if (issuesError) throw issuesError;

    // 4. Create Issue nodes + relationships
    const labelSet = new Set<string>();
    for (const issue of issues ?? []) {
      await session.run(
        `MERGE (i:Issue {id: $id})
         SET i.title = $title, i.status = $status, i.priority = $priority`,
        { id: issue.id, title: issue.title, status: issue.status, priority: issue.priority },
      );

      if (issue.assignee_id) {
        await session.run(
          `MATCH (i:Issue {id: $issueId}), (u:User {id: $userId})
           MERGE (i)-[:ASSIGNED_TO]->(u)`,
          { issueId: issue.id, userId: issue.assignee_id },
        );
      }

      for (const label of issue.labels ?? []) {
        labelSet.add(label);
        await session.run(
          `MERGE (l:Label {name: $name})
           WITH l
           MATCH (i:Issue {id: $issueId})
           MERGE (i)-[:LABELED_WITH]->(l)`,
          { name: label, issueId: issue.id },
        );
      }
    }

    console.log(`Seeded ${issues?.length ?? 0} Issue nodes`);
    console.log(`Seeded ${labelSet.size} Label nodes`);
    console.log("Done!");
  } finally {
    await session.close();
    await driver.close();
  }
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
