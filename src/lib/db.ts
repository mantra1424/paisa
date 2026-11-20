import Dexie, { type EntityTable } from "dexie";
import type { Budget, Category, Client, Goal, Invoice, Transaction } from "@/types";

/**
 * All data lives in the browser (IndexedDB), so the app needs no backend,
 * no account and no API keys.
 */
export const db = new Dexie("paisa") as Dexie & {
  transactions: EntityTable<Transaction, "id">;
  categories: EntityTable<Category, "id">;
  budgets: EntityTable<Budget, "id">;
  goals: EntityTable<Goal, "id">;
  clients: EntityTable<Client, "id">;
  invoices: EntityTable<Invoice, "id">;
};

db.version(1).stores({
  transactions: "id, type, categoryId, date, method",
  categories: "id, type",
  budgets: "id, categoryId, month",
  goals: "id, deadline",
});

// v2: freelance clients and invoices.
db.version(2).stores({
  clients: "id, name",
  invoices: "id, clientId, due, paidOn",
});

/** Every table, for actions that touch all data (demo load, reset). */
export const allTables = () => [db.transactions, db.categories, db.budgets, db.goals, db.clients, db.invoices];

export { newId } from "./id";
