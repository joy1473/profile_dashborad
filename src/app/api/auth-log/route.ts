import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const ALLOWED_ACTIONS = ["login_success", "login_failure", "logout"];

export async function POST(request: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    return NextResponse.json({ ok: true });
  }

  try {
    const body = await request.json();
    const { action, target } = body;

    if (!action || !target) {
      return NextResponse.json({ error: "action and target required" }, { status: 400 });
    }

    // 허용된 action만 수락
    if (!ALLOWED_ACTIONS.includes(action)) {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    // target 길이 제한 (로그 스팸 방지)
    if (typeof target !== "string" || target.length > 200) {
      return NextResponse.json({ error: "Invalid target" }, { status: 400 });
    }

    const supabase = createClient(url, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    await supabase.from("activities").insert({
      user_id: null,
      user_name: "Anonymous",
      action,
      target,
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: true });
  }
}
