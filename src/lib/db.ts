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

// v3: the "bahi-khata" redesign gives the default categories an earthier palette.
// Only colours still at their old default are changed, so custom picks are kept.
const RECOLOUR: Record<string, [old: string, next: string]> = {
  salary: ["#1baf7a", "#2f7d55"],
  freelance: ["#2a78d6", "#2b6f8e"],
  food: ["#eb6834", "#d4880f"],
  transport: ["#eda100", "#6d5fa8"],
  rent: ["#6250d6", "#8a5a3b"],
  shopping: ["#e87ba4", "#c25a85"],
  education: ["#008300", "#3c7fb0"],
  fun: ["#e34948", "#9a5aa0"],
};
db.version(3)
  .stores({})
  .upgrade((tx) =>
    tx
      .table<Category, string>("categories")
      .toCollection()
      .modify((c) => {
        const r = RECOLOUR[c.id];
        if (r && c.color.toLowerCase() === r[0]) c.color = r[1];
      }),
  );

/** Every table, for actions that touch all data (demo load, reset). */
export const allTables = () => [db.transactions, db.categories, db.budgets, db.goals, db.clients, db.invoices];

export { newId } from "./id";
