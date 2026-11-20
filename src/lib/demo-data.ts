import { db, newId } from "./db";
import { toISODate } from "./format";
import type { Budget, Category, Goal, PaymentMethod, Transaction } from "@/types";

export const DEFAULT_CATEGORIES: Category[] = [
  { id: "salary", name: "Stipend / Salary", type: "income", color: "#1baf7a" },
  { id: "freelance", name: "Freelance", type: "income", color: "#2a78d6" },
  { id: "food", name: "Food & Dining", type: "expense", color: "#eb6834" },
  { id: "transport", name: "Transport", type: "expense", color: "#eda100" },
  { id: "rent", name: "Rent & Bills", type: "expense", color: "#6250d6" },
  { id: "shopping", name: "Shopping", type: "expense", color: "#e87ba4" },
  { id: "education", name: "Education", type: "expense", color: "#008300" },
  { id: "fun", name: "Entertainment", type: "expense", color: "#e34948" },
];

// Small deterministic random so the demo looks the same on every load.
function seeded(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

/** Six months of realistic student + freelancer transactions, ending today. */
export function buildDemoData(today = new Date()) {
  const rand = seeded(42);
  const pick = <T,>(xs: T[]) => xs[Math.floor(rand() * xs.length)];
  const methods: PaymentMethod[] = ["upi", "upi", "upi", "card", "cash"];
  const tx: Transaction[] = [];

  const spend: Record<string, { notes: string[]; min: number; max: number; perMonth: number }> = {
    food: { notes: ["Canteen", "Swiggy order", "Chai & snacks", "Dinner with friends"], min: 60, max: 650, perMonth: 10 },
    transport: { notes: ["Auto", "Bus pass", "Petrol", "Ola ride"], min: 30, max: 450, perMonth: 6 },
    shopping: { notes: ["Amazon", "T-shirt", "Stationery"], min: 150, max: 1800, perMonth: 2 },
    education: { notes: ["Course on Udemy", "Books", "Exam fee"], min: 300, max: 1500, perMonth: 1 },
    fun: { notes: ["Movie", "Netflix", "Cricket turf"], min: 150, max: 600, perMonth: 2 },
  };

  for (let back = 5; back >= 0; back--) {
    const month = new Date(today.getFullYear(), today.getMonth() - back, 1);
    const lastDay = back === 0 ? today.getDate() : new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
    const day = (n: number) => toISODate(new Date(month.getFullYear(), month.getMonth(), Math.min(n, lastDay)));

    tx.push({ id: newId(), type: "income", amount: 8000, categoryId: "salary", date: day(1), note: "Monthly stipend", method: "bank" });
    if (rand() > 0.3) {
      tx.push({ id: newId(), type: "income", amount: Math.round((4000 + rand() * 11000) / 500) * 500, categoryId: "freelance", date: day(5 + Math.floor(rand() * 20)), note: "Client project payment", method: "upi" });
    }
    tx.push({ id: newId(), type: "expense", amount: 3500, categoryId: "rent", date: day(3), note: "PG rent share", method: "upi" });

    for (const [categoryId, c] of Object.entries(spend)) {
      for (let i = 0; i < c.perMonth; i++) {
        tx.push({
          id: newId(),
          type: "expense",
          amount: Math.round(c.min + rand() * (c.max - c.min)),
          categoryId,
          date: day(1 + Math.floor(rand() * 28)),
          note: pick(c.notes),
          method: pick(methods),
        });
      }
    }
  }

  const thisMonth = toISODate(today).slice(0, 7);
  const budgets: Budget[] = [
    { id: newId(), categoryId: "food", month: thisMonth, limit: 3500 },
    { id: newId(), categoryId: "transport", month: thisMonth, limit: 1500 },
    { id: newId(), categoryId: "shopping", month: thisMonth, limit: 2000 },
    { id: newId(), categoryId: "fun", month: thisMonth, limit: 1000 },
  ];

  const goals: Goal[] = [
    { id: newId(), name: "New laptop", target: 60000, saved: 22500, deadline: toISODate(new Date(today.getFullYear(), today.getMonth() + 4, 1)) },
    { id: newId(), name: "Emergency fund", target: 25000, saved: 9000, deadline: toISODate(new Date(today.getFullYear(), today.getMonth() + 8, 1)) },
  ];

  return { transactions: tx, categories: DEFAULT_CATEGORIES, budgets, goals };
}

/** Fill the database with demo data the first time the app opens. */
export async function seedIfEmpty(): Promise<void> {
  if ((await db.categories.count()) > 0) return;
  await loadDemoData();
}

/** Replace everything with fresh demo data. */
export async function loadDemoData(): Promise<void> {
  const data = buildDemoData();
  await db.transaction("rw", [db.transactions, db.categories, db.budgets, db.goals], async () => {
    await Promise.all([db.transactions.clear(), db.categories.clear(), db.budgets.clear(), db.goals.clear()]);
    await db.categories.bulkAdd(data.categories);
    await db.transactions.bulkAdd(data.transactions);
    await db.budgets.bulkAdd(data.budgets);
    await db.goals.bulkAdd(data.goals);
  });
}

/** Wipe every transaction, budget and goal, and go back to the default categories. */
export async function resetAllData(): Promise<void> {
  await db.transaction("rw", [db.transactions, db.categories, db.budgets, db.goals], async () => {
    await Promise.all([db.transactions.clear(), db.categories.clear(), db.budgets.clear(), db.goals.clear()]);
    await db.categories.bulkAdd(DEFAULT_CATEGORIES);
  });
}
