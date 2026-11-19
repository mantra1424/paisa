import Dexie, { type EntityTable } from "dexie";
import type { Budget, Category, Goal, Transaction } from "@/types";

/**
 * All data lives in the browser (IndexedDB), so the app needs no backend,
 * no account and no API keys.
 */
export const db = new Dexie("paisa") as Dexie & {
  transactions: EntityTable<Transaction, "id">;
  categories: EntityTable<Category, "id">;
  budgets: EntityTable<Budget, "id">;
  goals: EntityTable<Goal, "id">;
};

db.version(1).stores({
  transactions: "id, type, categoryId, date, method",
  categories: "id, type",
  budgets: "id, categoryId, month",
  goals: "id, deadline",
});

export function newId(): string {
  return crypto.randomUUID();
}
