import { supabase } from "./supabase";
import type { CardProfile } from "@/types/card-profile";

const USE_MOCK = !process.env.NEXT_PUBLIC_SUPABASE_URL;

export function generateVCard(profile: CardProfile): string {
  // iOS는 N 필드 필수 — 없으면 ORG가 이름 자리에 표시됨
  const nameParts = profile.name.trim().split(/\s+/);
  const lastName = nameParts[0] || "";
  const firstName = nameParts.slice(1).join(" ") || "";
  const lines = [
    "BEGIN:VCARD",
    "VERSION:3.0",
    `N:${lastName};${firstName};;;`,
    `FN:${profile.name}`,
  ];
  if (profile.company) lines.push(`ORG:${profile.company}`);
  if (profile.job_title || profile.position) {
    const title = [profile.job_title, profile.position].filter(Boolean).join(" / ");
    lines.push(`TITLE:${title}`);
  }
  if (profile.role) lines.push(`ROLE:${profile.role}`);
  lines.push(`EMAIL:${profile.email}`);
  lines.push(`TEL;TYPE=CELL:${profile.phone}`);
  for (const url of profile.websites ?? []) {
    if (url) lines.push(`URL:${url}`);
  }
  lines.push("END:VCARD");
  return lines.join("\r\n");
}

export function generateUniqueId(name: string): string {
  const base = name.replace(/\s+/g, "").toLowerCase();
  const rand = crypto.randomUUID().substring(0, 8);
  return `${base}-${rand}`;
}

// ── Supabase CRUD ──

function mapRow(row: Record<string, unknown>): CardProfile {
  return {
    id: row.id as string,
    user_id: (row.user_id as string) ?? "",
    unique_id: row.unique_id as string,
    name: row.name as string,
    company: (row.company as string) ?? "",
    job_title: (row.job_title as string) ?? "",
    position: (row.position as string) ?? "",
    role: (row.role as string) ?? "",
    email: row.email as string,
    phone: row.phone as string,
    websites: (row.websites as string[]) ?? [],
    image: (row.image as string) ?? undefined,
    created_at: (row.created_at as string) ?? "",
    updated_at: (row.updated_at as string) ?? "",
  };
}

export async function fetchCardProfiles(): Promise<CardProfile[]> {
  if (USE_MOCK) return [];

  const { data, error } = await supabase
    .from("card_profiles")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) return [];
  return (data ?? []).map(mapRow);
}

export async function fetchCardProfileByUniqueId(uniqueId: string): Promise<CardProfile | null> {
  if (USE_MOCK) return null;

  const { data, error } = await supabase
    .from("card_profiles")
    .select("*")
    .eq("unique_id", uniqueId)
    .single();

  if (error || !data) return null;
  return mapRow(data);
}

export async function createCardProfile(
  input: Omit<CardProfile, "id" | "created_at" | "updated_at">
): Promise<CardProfile> {
  const { data, error } = await supabase
    .from("card_profiles")
    .insert({
      user_id: input.user_id || null,
      unique_id: input.unique_id,
      name: input.name,
      company: input.company || "",
      job_title: input.job_title || "",
      position: input.position || "",
      role: input.role || "",
      email: input.email,
      phone: input.phone,
      websites: input.websites,
      image: input.image || null,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return mapRow(data);
}

export async function deleteCardProfile(id: string): Promise<void> {
  const { error } = await supabase
    .from("card_profiles")
    .delete()
    .eq("id", id);

  if (error) throw new Error(error.message);
}
