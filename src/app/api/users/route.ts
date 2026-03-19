import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { withAuth } from "@/lib/api-auth";

const VALID_ROLES = ["admin", "user", "viewer"];
const VALID_STATUSES = ["active", "inactive"];

function createServiceSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return null;
  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export const PATCH = withAuth(async (request, { user }) => {
  const body = await request.json();
  const { userId, name, role, status } = body;

  if (!userId) {
    return NextResponse.json({ error: "userId is required" }, { status: 400 });
  }

  // 입력값 검증
  if (role && !VALID_ROLES.includes(role)) {
    return NextResponse.json({ error: "Invalid role" }, { status: 400 });
  }
  if (status && !VALID_STATUSES.includes(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const serviceSupabase = createServiceSupabase();
  if (!serviceSupabase) {
    return NextResponse.json({ error: "Server not configured" }, { status: 503 });
  }

  const isSelf = user.id === userId;
  const needsAdmin = !!(role || status || (name && !isSelf));

  // admin 권한 확인 (한 번만)
  if (needsAdmin) {
    const { data: currentProfile } = await serviceSupabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (currentProfile?.role !== "admin") {
      return NextResponse.json({ error: "권한이 없습니다" }, { status: 403 });
    }
  }

  // 업데이트할 필드 구성
  const updates: Record<string, string> = {};
  if (name !== undefined) updates.name = name;
  if (role !== undefined) updates.role = role;
  if (status !== undefined) updates.status = status;

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  const { data, error } = await serviceSupabase
    .from("profiles")
    .update(updates)
    .eq("id", userId)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: "업데이트에 실패했습니다" }, { status: 500 });
  }

  return NextResponse.json(data);
});
