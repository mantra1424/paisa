import { afterEach, describe, expect, it } from "vitest";
import { budgetLevel, goalInfo, invoiceStatus, invoiceTotals, monthKey, monthLabel, monthsLeft, nextInvoiceNumber, shiftMonth, spendByCategory, totals } from "@/lib/calculations";
import { DEFAULT_CURRENCY, formatINR, setCurrencyPrefs } from "@/lib/format";
import type { Goal, Invoice, Transaction } from "@/types";

const tx = (over: Partial<Transaction>): Transaction => ({
  id: Math.random().toString(36),
  type: "expense",
  amount: 100,
  categoryId: "food",
  date: "2026-11-10",
  note: "",
  method: "upi",
  ...over,
});

describe("months", () => {
  it("builds a YYYY-MM key from a date or ISO string", () => {
    expect(monthKey(new Date(2026, 0, 31))).toBe("2026-01");
    expect(monthKey("2026-11-19")).toBe("2026-11");
  });

  it("shifts across year boundaries", () => {
    expect(shiftMonth("2026-01", -1)).toBe("2025-12");
    expect(shiftMonth("2025-12", 1)).toBe("2026-01");
    expect(shiftMonth("2026-03", -14)).toBe("2025-01");
  });

  it("labels months", () => {
    expect(monthLabel("2026-11")).toBe("November 2026");
    expect(monthLabel("2026-11", "short")).toBe("Nov");
  });
});

describe("totals", () => {
  it("adds income and expenses separately", () => {
    const t = totals([tx({ type: "income", amount: 8000 }), tx({ amount: 250.5 }), tx({ amount: 49.5 })]);
    expect(t).toEqual({ income: 8000, expense: 300, net: 7700 });
  });

  it("is zero for no transactions", () => {
    expect(totals([])).toEqual({ income: 0, expense: 0, net: 0 });
  });
});

describe("spendByCategory", () => {
  it("only counts expenses in the given month", () => {
    const m = spendByCategory(
      [
        tx({ categoryId: "food", amount: 100 }),
        tx({ categoryId: "food", amount: 50 }),
        tx({ categoryId: "rent", amount: 3500 }),
        tx({ categoryId: "food", amount: 999, date: "2026-10-31" }),
        tx({ categoryId: "salary", type: "income", amount: 8000 }),
      ],
      "2026-11",
    );
    expect(Object.fromEntries(m)).toEqual({ food: 150, rent: 3500 });
  });
});

describe("budgetLevel", () => {
  it("warns from 80% and alerts above the limit", () => {
    expect(budgetLevel(0, 1000)).toBe("ok");
    expect(budgetLevel(799, 1000)).toBe("ok");
    expect(budgetLevel(800, 1000)).toBe("warn");
    expect(budgetLevel(1000, 1000)).toBe("warn");
    expect(budgetLevel(1001, 1000)).toBe("over");
  });
});

describe("goals", () => {
  const today = new Date(2026, 10, 20); // 20 Nov 2026
  const goal = (over: Partial<Goal>): Goal => ({ id: "g", name: "Laptop", target: 60000, saved: 22500, deadline: "2027-03-01", ...over });

  it("counts months left, at least 1 until the deadline passes", () => {
    expect(monthsLeft("2027-03-01", today)).toBe(4);
    expect(monthsLeft("2026-11-30", today)).toBe(1);
    expect(monthsLeft("2026-11-20", today)).toBe(1);
    expect(monthsLeft("2026-11-19", today)).toBe(0);
  });

  it("works out the monthly amount, rounded up", () => {
    const info = goalInfo(goal({}), today);
    expect(info.remaining).toBe(37500);
    expect(info.perMonth).toBe(9375);
    expect(info.status).toBe("active");
    expect(info.pct).toBeCloseTo(37.5);
    expect(goalInfo(goal({ target: 10000, saved: 0, deadline: "2027-02-20" }), today).perMonth).toBe(3334);
  });

  it("marks reached and overdue goals", () => {
    expect(goalInfo(goal({ saved: 60000 }), today)).toMatchObject({ status: "done", remaining: 0, pct: 100 });
    expect(goalInfo(goal({ saved: 70000 }), today).pct).toBe(100);
    expect(goalInfo(goal({ deadline: "2026-10-01" }), today)).toMatchObject({ status: "overdue", monthsLeft: 0 });
  });
});

describe("formatINR", () => {
  afterEach(() => setCurrencyPrefs(DEFAULT_CURRENCY, false));

  it("uses Indian digit grouping and shows paise only when present", () => {
    expect(formatINR(125000)).toBe("₹1,25,000");
    expect(formatINR(249.5)).toBe("₹249.50");
    expect(formatINR(0)).toBe("₹0");
  });

  it("switches to international grouping", () => {
    setCurrencyPrefs({ grouping: "international", paise: true }, false);
    expect(formatINR(1250000)).toBe("₹1,250,000");
  });

  it("rounds to whole rupees when paise are off", () => {
    setCurrencyPrefs({ grouping: "indian", paise: false }, false);
    expect(formatINR(249.5)).toBe("₹250");
    expect(formatINR(125000.25)).toBe("₹1,25,000");
  });
});

describe("invoices", () => {
  const today = new Date(2026, 10, 20);
  const inv = (over: Partial<Invoice>): Invoice => ({
    id: Math.random().toString(36),
    clientId: "c",
    number: "INV-0001",
    description: "Work",
    amount: 1000,
    issued: "2026-11-01",
    due: "2026-11-20",
    ...over,
  });

  it("is pending until the day after it's due, then overdue", () => {
    expect(invoiceStatus(inv({ due: "2026-11-20" }), today)).toBe("pending");
    expect(invoiceStatus(inv({ due: "2026-11-19" }), today)).toBe("overdue");
    expect(invoiceStatus(inv({ due: "2026-11-01", paidOn: "2026-11-05" }), today)).toBe("paid");
  });

  it("numbers invoices after the highest existing one", () => {
    expect(nextInvoiceNumber([])).toBe("INV-0001");
    expect(nextInvoiceNumber([inv({ number: "INV-0002" }), inv({ number: "INV-0009" }), inv({ number: "custom" })])).toBe("INV-0010");
  });

  it("totals what is owed, overdue and paid this month", () => {
    const t = invoiceTotals(
      [
        inv({ amount: 6500, due: "2026-11-10" }),
        inv({ amount: 9000, due: "2026-12-02" }),
        inv({ amount: 5500, paidOn: "2026-11-05" }),
        inv({ amount: 4000, paidOn: "2026-10-28" }),
      ],
      today,
    );
    expect(t).toEqual({ owed: 15500, overdue: 6500, paidThisMonth: 5500 });
  });
});
