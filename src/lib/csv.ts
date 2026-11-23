import type { Category, PaymentMethod, Transaction, TxType } from "@/types";
import { newId } from "./id";

export const CSV_HEADERS = ["date", "type", "amount", "category", "method", "note"] as const;

export const CATEGORY_COLORS = ["#3c7fb0", "#2f7d55", "#d4880f", "#6d5fa8", "#8a5a3b", "#c25a85", "#2b6f8e", "#9a5aa0", "#5f7a3a", "#7a6f63"];

/* ---------- Writing ---------- */

function cell(v: string | number): string {
  if (typeof v === "number") return String(v);
  // Stop spreadsheet apps from running text as a formula (CSV injection).
  const safe = /^[=+\-@\t\r]/.test(v) ? `'${v}` : v;
  return /[",\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

export function toCSV(rows: (string | number)[][]): string {
  return rows.map((r) => r.map(cell).join(",")).join("\r\n");
}

export function transactionsToCSV(txs: Transaction[], categories: Map<string, Category>): string {
  const sorted = [...txs].sort((a, b) => a.date.localeCompare(b.date));
  return toCSV([
    [...CSV_HEADERS],
    ...sorted.map((t) => [t.date, t.type, t.amount, categories.get(t.categoryId)?.name ?? "Uncategorised", t.method, t.note]),
  ]);
}

/* ---------- Reading ---------- */

/** RFC 4180 parser: handles quoted fields, escaped quotes and newlines inside quotes. */
export function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  const src = text.replace(/^﻿/, "");

  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (quoted) {
      if (ch === '"' && src[i + 1] === '"') {
        field += '"';
        i++;
      } else if (ch === '"') quoted = false;
      else field += ch;
    } else if (ch === '"' && field === "") quoted = true;
    else if (ch === ",") {
      row.push(field);
      field = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && src[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else field += ch;
  }
  if (field !== "" || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((c) => c.trim() !== ""));
}

const METHOD_ALIASES: Record<string, PaymentMethod> = {
  upi: "upi",
  card: "card",
  "credit card": "card",
  "debit card": "card",
  cash: "cash",
  bank: "bank",
  "bank transfer": "bank",
  neft: "bank",
  imps: "bank",
};

function parseDate(raw: string): string | null {
  const s = raw.trim();
  let y: number, m: number, d: number;
  let match = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(s);
  if (match) [y, m, d] = [Number(match[1]), Number(match[2]), Number(match[3])];
  else if ((match = /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/.exec(s))) [d, m, y] = [Number(match[1]), Number(match[2]), Number(match[3])];
  else return null;
  const date = new Date(y, m - 1, d);
  if (date.getFullYear() !== y || date.getMonth() !== m - 1 || date.getDate() !== d) return null;
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

export interface ImportResult {
  transactions: Transaction[];
  newCategories: Category[];
  skipped: { line: number; reason: string }[];
}

/**
 * Turns CSV text into transactions. Categories are matched by name (any case);
 * unknown ones are created. Bad rows are skipped with a reason, never guessed.
 */
export function importTransactions(text: string, existing: Category[]): ImportResult {
  const rows = parseCSV(text);
  if (rows.length === 0) throw new Error("The file is empty.");

  const header = rows[0].map((h) => h.trim().toLowerCase());
  const col = Object.fromEntries(CSV_HEADERS.map((h) => [h, header.indexOf(h)])) as Record<(typeof CSV_HEADERS)[number], number>;
  const missing = (["date", "type", "amount", "category"] as const).filter((h) => col[h] === -1);
  if (missing.length) throw new Error(`Missing column${missing.length > 1 ? "s" : ""}: ${missing.join(", ")}. The first row must be: ${CSV_HEADERS.join(",")}`);

  const byName = new Map(existing.map((c) => [`${c.type}:${c.name.toLowerCase()}`, c]));
  const newCategories: Category[] = [];
  const transactions: Transaction[] = [];
  const skipped: ImportResult["skipped"] = [];

  rows.slice(1).forEach((r, i) => {
    const line = i + 2;
    const get = (k: keyof typeof col) => (col[k] >= 0 ? (r[col[k]] ?? "").trim() : "");

    const date = parseDate(get("date"));
    if (!date) return skipped.push({ line, reason: `bad date “${get("date")}” (use YYYY-MM-DD)` });

    const type = get("type").toLowerCase() as TxType;
    if (type !== "income" && type !== "expense") return skipped.push({ line, reason: `type must be income or expense, got “${get("type")}”` });

    const amount = Number(get("amount").replace(/[₹,\s]/g, ""));
    if (!Number.isFinite(amount) || amount <= 0) return skipped.push({ line, reason: `bad amount “${get("amount")}”` });

    const catName = get("category").replace(/^'/, "") || "Uncategorised";
    const key = `${type}:${catName.toLowerCase()}`;
    let category = byName.get(key);
    if (!category) {
      category = { id: newId(), name: catName.slice(0, 30), type, color: CATEGORY_COLORS[(existing.length + newCategories.length) % CATEGORY_COLORS.length] };
      byName.set(key, category);
      newCategories.push(category);
    }

    const method = METHOD_ALIASES[get("method").toLowerCase()] ?? "upi";
    transactions.push({
      id: newId(),
      type,
      amount: Math.round(amount * 100) / 100,
      categoryId: category.id,
      date,
      method,
      note: get("note").replace(/^'/, "").slice(0, 80),
    });
  });

  return { transactions, newCategories, skipped };
}

export function downloadFile(name: string, content: string, type = "text/csv;charset=utf-8") {
  const url = URL.createObjectURL(new Blob(["﻿", content], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
