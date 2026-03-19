"use client";

import { useState } from "react";
import { Plus, Link2, ExternalLink, Trash2 } from "lucide-react";
import type { IssueLink } from "@/types/link";
import { createLink, deleteLink, extractDomain } from "@/lib/links";

interface LinkSectionProps {
  issueId: string;
  links: IssueLink[];
  onLinksChange: (links: IssueLink[]) => void;
}

export function LinkSection({ issueId, links, onLinksChange }: LinkSectionProps) {
  const [newUrl, setNewUrl] = useState("");
  const [newLabel, setNewLabel] = useState("");

  async function handleAdd() {
    if (!newUrl.trim()) return;
    let url = newUrl.trim();
    if (!/^https?:\/\//i.test(url)) url = "https://" + url;
    const link = await createLink(issueId, url, newLabel);
    onLinksChange([link, ...links]);
    setNewUrl("");
    setNewLabel("");
  }

  async function handleDelete(id: string) {
    await deleteLink(id);
    onLinksChange(links.filter((l) => l.id !== id));
  }

  const inputClass = "rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm text-zinc-900 focus:border-blue-500 focus:outline-none dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-50";

  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">링크</label>

      <div className="mb-2 flex gap-1.5">
        <input type="text" value={newUrl} onChange={(e) => setNewUrl(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAdd(); } }} placeholder="https://example.com" className={`flex-1 ${inputClass}`} />
        <input type="text" value={newLabel} onChange={(e) => setNewLabel(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAdd(); } }} placeholder="표시명 (선택)" className={`w-28 ${inputClass}`} />
        <button type="button" onClick={handleAdd} disabled={!newUrl.trim()} className="flex items-center rounded-lg bg-blue-600 px-2.5 py-1.5 text-sm text-white hover:bg-blue-700 disabled:opacity-50">
          <Plus size={14} />
        </button>
      </div>

      {links.length > 0 && (
        <div className="space-y-1">
          {links.map((link) => (
            <div key={link.id} className="flex items-center gap-2 rounded-lg border border-zinc-200 px-3 py-1.5 text-sm dark:border-zinc-700">
              <Link2 size={14} className="shrink-0 text-zinc-400" />
              <a href={link.url} target="_blank" rel="noopener noreferrer" className="flex min-w-0 flex-1 items-center gap-1 text-blue-600 hover:text-blue-800 hover:underline dark:text-blue-400 dark:hover:text-blue-300">
                <span className="truncate">{link.label || extractDomain(link.url)}</span>
                <ExternalLink size={12} className="shrink-0" />
              </a>
              <span className="shrink-0 truncate text-xs text-zinc-400 max-w-[120px]">{extractDomain(link.url)}</span>
              <button type="button" onClick={() => handleDelete(link.id)} className="shrink-0 rounded p-0.5 text-zinc-400 hover:bg-zinc-100 hover:text-red-600 dark:hover:bg-zinc-800 dark:hover:text-red-400" aria-label="링크 삭제">
                <Trash2 size={12} />
              </button>
            </div>
          ))}
        </div>
      )}

      {links.length === 0 && <p className="text-xs text-zinc-400">등록된 링크가 없습니다</p>}
    </div>
  );
}
