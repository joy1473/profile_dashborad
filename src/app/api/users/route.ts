import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api-auth";
import { supabase } from "@/lib/supabase";

const VALID_ROLES = ["admin", "user", "viewer"];
const VALID_STATUSES = ["active", "inactive"];

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

  const isSelf = user?.id === userId;

  // role/status 변경은 admin만 가능
  if (role || status) {
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { data: currentProfile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (currentProfile?.role !== "admin") {
      return NextResponse.json({ error: "권한이 없습니다" }, { status: 403 });
    }
  }

  // name 변경은 본인 또는 admin
  if (name && !isSelf) {
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { data: currentProfile } = await supabase
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

  const { data, error } = await supabase
    .from("profiles")
    .update(updates)
    .eq("id", userId)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
});
