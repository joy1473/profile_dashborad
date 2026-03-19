import { supabase } from "./supabase";
import type { CardProfile } from "@/types/card-profile";

const USE_MOCK = !process.env.NEXT_PUBLIC_SUPABASE_URL;

export function generateVCard(profile: CardProfile): string {
  const lines = [
    "BEGIN:VCARD",
    "VERSION:3.0",
    `FN:${profile.name}`,
    `EMAIL:${profile.email}`,
    `TEL;TYPE=CELL:${profile.phone}`,
  ];
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
