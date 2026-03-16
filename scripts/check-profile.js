const fs = require("fs");
const { createClient } = require("@supabase/supabase-js");

fs.readFileSync(".env.local", "utf8").split("\n").forEach((l) => {
  l = l.trim();
  if (!l || l.startsWith("#")) return;
  const i = l.indexOf("=");
  if (i === -1) return;
  process.env[l.slice(0, i).trim()] = l.slice(i + 1).trim();
});

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function check() {
  // Check profiles
  const { data: profiles, error: pErr } = await sb.from("profiles").select("*");
  console.log("=== profiles ===");
  console.log(pErr ? "Error: " + pErr.message : JSON.stringify(profiles, null, 2));

  // Check activities
  const { data: activities, error: aErr } = await sb.from("activities").select("*").limit(5);
  console.log("\n=== activities (last 5) ===");
  console.log(aErr ? "Error: " + aErr.message : JSON.stringify(activities, null, 2));

  // Check daily_metrics
  const { data: metrics, error: mErr } = await sb.from("daily_metrics").select("*").limit(3);
  console.log("\n=== daily_metrics (first 3) ===");
  console.log(mErr ? "Error: " + mErr.message : JSON.stringify(metrics, null, 2));

  process.exit(0);
}
check();
