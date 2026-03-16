"use client";

import { Download } from "lucide-react";
import type { ChartData } from "@/types";

interface ExportButtonProps {
  data: ChartData[];
  filename?: string;
}

export function ExportButton({ data, filename = "analytics" }: ExportButtonProps) {
  const handleExport = () => {
    if (data.length === 0) return;

    const headers = Object.keys(data[0]);
    const rows = data.map((row) =>
      headers.map((h) => String(row[h] ?? "")).join(",")
    );
    const csv = "\uFEFF" + [headers.join(","), ...rows].join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${filename}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <button
      onClick={handleExport}
      className="rounded-lg border border-zinc-200 p-1.5 text-zinc-500 hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
      data-testid="export-csv"
      title="CSV 내보내기"
    >
      <Download size={14} />
    </button>
  );
}
