import { describe, expect, it } from "vitest";
import { importTransactions, parseCSV, toCSV, transactionsToCSV } from "@/lib/csv";
import type { Category, Transaction } from "@/types";

const cats: Category[] = [
  { id: "food", name: "Food & Dining", type: "expense", color: "#eb6834" },
  { id: "freelance", name: "Freelance", type: "income", color: "#2a78d6" },
];
const header = "date,type,amount,category,method,note";

describe("parseCSV", () => {
  it("handles quotes, escaped quotes, commas and newlines inside fields", () => {
    expect(parseCSV('a,"b, c","say ""hi""","line1\nline2"\r\n1,2,3,4')).toEqual([
      ["a", "b, c", 'say "hi"', "line1\nline2"],
      ["1", "2", "3", "4"],
    ]);
  });

  it("ignores a byte-order mark and blank lines", () => {
    expect(parseCSV("﻿a,b\n\n1,2\n")).toEqual([
      ["a", "b"],
      ["1", "2"],
    ]);
  });
});

describe("toCSV", () => {
  it("quotes when needed and blocks spreadsheet formulas", () => {
    expect(toCSV([["plain", 'has "quote"', "a,b", "=SUM(A1)", 42]])).toBe(`plain,"has ""quote""","a,b",'=SUM(A1),42`);
  });
});

describe("export then import", () => {
  it("round-trips transactions without losing data", () => {
    const txs: Transaction[] = [
      { id: "1", type: "expense", amount: 249.5, categoryId: "food", date: "2026-11-02", note: 'Lunch, "biryani"', method: "card" },
      { id: "2", type: "income", amount: 15000, categoryId: "freelance", date: "2026-11-05", note: "-advance", method: "bank" },
    ];
    const csv = transactionsToCSV(txs, new Map(cats.map((c) => [c.id, c])));
    const result = importTransactions(csv, cats);
    expect(result.skipped).toEqual([]);
    expect(result.newCategories).toEqual([]);
    const withoutId = (t: Transaction) => ({ ...t, id: "" });
    expect(result.transactions.map(withoutId)).toEqual(txs.map(withoutId));
  });
});

describe("importTransactions", () => {
  it("accepts DD/MM/YYYY, ₹ and commas in amounts, and method aliases", () => {
    const { transactions } = importTransactions(`${header}\n05/11/2026,income,"₹2,500",freelance,NEFT,Logo`, cats);
    expect(transactions[0]).toMatchObject({ date: "2026-11-05", amount: 2500, categoryId: "freelance", method: "bank", note: "Logo" });
  });

  it("creates unknown categories once and reuses them", () => {
    const { transactions, newCategories } = importTransactions(`${header}\n2026-11-01,expense,100,Gym,upi,\n2026-11-02,expense,200,gym,cash,`, cats);
    expect(newCategories).toHaveLength(1);
    expect(newCategories[0]).toMatchObject({ name: "Gym", type: "expense" });
    expect(transactions.every((t) => t.categoryId === newCategories[0].id)).toBe(true);
  });

  it("skips bad rows with the line number and reason", () => {
    const { transactions, skipped } = importTransactions(
      `${header}\n31/02/2026,expense,100,Food & Dining,upi,\n2026-11-01,refund,50,Food & Dining,upi,\n2026-11-01,expense,-5,Food & Dining,upi,\n2026-11-01,expense,10,Food & Dining,upi,ok`,
      cats,
    );
    expect(transactions).toHaveLength(1);
    expect(skipped.map((s) => s.line)).toEqual([2, 3, 4]);
    expect(skipped[0].reason).toMatch(/bad date/);
    expect(skipped[1].reason).toMatch(/type/);
    expect(skipped[2].reason).toMatch(/amount/);
  });

  it("rejects a file without the required columns", () => {
    expect(() => importTransactions("foo,bar\n1,2", cats)).toThrow(/Missing columns: date, type, amount, category/);
    expect(() => importTransactions("", cats)).toThrow(/empty/);
  });
});
