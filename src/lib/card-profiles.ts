import type { CardProfile } from "@/types/card-profile";

export function generateVCard(profile: CardProfile): string {
  const lines = [
    "BEGIN:VCARD",
    "VERSION:3.0",
    `FN:${profile.name}`,
    `EMAIL:${profile.email}`,
    `TEL;TYPE=CELL:${profile.phone}`,
  ];
  if (profile.company) lines.push(`ORG:${profile.company}`);
  if (profile.position) lines.push(`TITLE:${profile.position}`);
  lines.push("END:VCARD");
  return lines.join("\r\n");
}

export function generateUniqueId(name: string): string {
  const base = name.replace(/\s+/g, "").toLowerCase();
  const rand = Math.random().toString(36).substring(2, 6);
  return `${base}-${rand}`;
}
