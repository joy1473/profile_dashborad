"use client";

import { Plus, Trash2 } from "lucide-react";

export interface ColumnDef {
  key: string;
  label: string;
  type: "text" | "number";
  width?: string;
  readOnly?: boolean;
}

interface DynamicRowsProps {
  columns: ColumnDef[];
  rows: Record<string, string | number>[];
  onChange: (rows: Record<string, string | number>[]) => void;
  showTotal?: { label: string; sumKey: string };
  autoCalc?: { qtyKey: string; priceKey: string; amountKey: string };
}

export function DynamicRows({ columns, rows, onChange, showTotal, autoCalc }: DynamicRowsProps) {
  function handleChange(rowIdx: number, key: string, value: string) {
    const updated = [...rows];
    const col = columns.find((c) => c.key === key);
    updated[rowIdx] = {
      ...updated[rowIdx],
      [key]: col?.type === "number" ? (value === "" ? 0 : Number(value)) : value,
    };

    if (autoCalc && (key === autoCalc.qtyKey || key === autoCalc.priceKey)) {
      const qty = Number(updated[rowIdx][autoCalc.qtyKey]) || 0;
      const price = Number(updated[rowIdx][autoCalc.priceKey]) || 0;
      updated[rowIdx][autoCalc.amountKey] = qty * price;
    }

    onChange(updated);
  }

  function addRow() {
    const empty: Record<string, string | number> = {};
    for (const col of columns) {
      empty[col.key] = col.type === "number" ? 0 : "";
    }
    if (autoCalc) {
      empty[autoCalc.qtyKey] = 1;
    }
    onChange([...rows, empty]);
  }

  function removeRow(idx: number) {
    if (rows.length <= 1) return;
    onChange(rows.filter((_, i) => i !== idx));
  }

  const total = showTotal
    ? rows.reduce((sum, r) => sum + (Number(r[showTotal.sumKey]) || 0), 0)
    : 0;

  return (
    <div className="space-y-2">
      <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-700">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-200 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900">
              <th className="w-8 px-2 py-2 text-center text-zinc-400">#</th>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className="px-2 py-2 text-left text-xs font-medium text-zinc-500"
                  style={col.width ? { width: col.width } : undefined}
                >
                  {col.label}
                </th>
              ))}
              <th className="w-10" />
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} className="border-b border-zinc-100 dark:border-zinc-800">
                <td className="px-2 py-1 text-center text-xs text-zinc-400">{i + 1}</td>
                {columns.map((col) => (
                  <td key={col.key} className="px-1 py-1">
                    <input
                      type={col.type === "number" ? "number" : "text"}
                      value={row[col.key] ?? ""}
                      onChange={(e) => handleChange(i, col.key, e.target.value)}
                      readOnly={col.readOnly}
                      className={`w-full rounded border border-zinc-200 px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 ${
                        col.readOnly ? "bg-zinc-50 text-zinc-500 dark:bg-zinc-800" : ""
                      } ${col.type === "number" ? "text-right" : ""}`}
                    />
                  </td>
                ))}
                <td className="px-1 py-1">
                  <button
                    onClick={() => removeRow(i)}
                    disabled={rows.length <= 1}
                    className="rounded p-1 text-zinc-400 hover:text-red-500 disabled:opacity-30"
                  >
                    <Trash2 size={14} />
                  </button>
                </td>
              </tr>
            ))}
            {showTotal && (
              <tr className="bg-zinc-50 font-medium dark:bg-zinc-900">
                <td colSpan={columns.length} className="px-2 py-2 text-right text-sm text-zinc-600 dark:text-zinc-300">
                  {showTotal.label}
                </td>
                <td className="px-2 py-2 text-right text-sm text-zinc-900 dark:text-zinc-50">
                  {total.toLocaleString()}
                </td>
                <td />
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <button
        onClick={addRow}
        className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700"
      >
        <Plus size={12} /> 행 추가
      </button>
    </div>
  );
}
