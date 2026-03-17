"use client";

import { useState } from "react";
import { ArrowUpDown } from "lucide-react";

interface DataTableProps {
  columns: string[];
  data: Record<string, string | number>[];
}

export function DataTable({ columns, data }: DataTableProps) {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortAsc, setSortAsc] = useState(true);

  if (data.length === 0) return null;

  const displayCols = columns.length > 0 ? columns : Object.keys(data[0] ?? {});

  function handleSort(col: string) {
    if (sortKey === col) {
      setSortAsc(!sortAsc);
    } else {
      setSortKey(col);
      setSortAsc(true);
    }
  }

  const sorted = sortKey
    ? [...data].sort((a, b) => {
        const va = a[sortKey] ?? "";
        const vb = b[sortKey] ?? "";
        if (typeof va === "number" && typeof vb === "number") {
          return sortAsc ? va - vb : vb - va;
        }
        return sortAsc
          ? String(va).localeCompare(String(vb))
          : String(vb).localeCompare(String(va));
      })
    : data;

  return (
    <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900">
            {displayCols.map((col) => (
              <th
                key={col}
                onClick={() => handleSort(col)}
                className="cursor-pointer px-3 py-2 text-left font-medium text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 select-none"
              >
                <span className="inline-flex items-center gap-1">
                  {col}
                  <ArrowUpDown size={12} className={sortKey === col ? "text-blue-500" : "text-zinc-300"} />
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.slice(0, 100).map((row, i) => (
            <tr
              key={i}
              className="border-b border-zinc-100 last:border-0 dark:border-zinc-800"
            >
              {displayCols.map((col) => (
                <td key={col} className="px-3 py-2 text-zinc-700 dark:text-zinc-300">
                  {row[col] ?? "-"}
                </td>
              ))}
            </tr>
          ))}
          {sorted.length > 100 && (
            <tr>
              <td colSpan={displayCols.length} className="px-3 py-2 text-center text-xs text-zinc-400">
                ...외 {sorted.length - 100}개 행
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
