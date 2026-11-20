import type { Goal, Transaction } from "@/types";
import { toISODate } from "./format";

/** "2026-11-19" or a Date -> "2026-11" */
export function monthKey(d: Date | string = new Date()): string {
  return (typeof d === "string" ? d : toISODate(d)).slice(0, 7);
}

/** shiftMonth("2026-01", -1) -> "2025-12" */
export function shiftMonth(key: string, by: number): string {
  const [y, m] = key.split("-").map(Number);
  return monthKey(new Date(y, m - 1 + by, 1));
}

/** "2026-11" -> "November 2026" (long) or "Nov" (short) */
export function monthLabel(key: string, style: "long" | "short" = "long"): string {
  const [y, m] = key.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("en-IN", style === "long" ? { month: "long", year: "numeric" } : { month: "short" });
}

export function totals(txs: Transaction[]) {
  let income = 0;
  let expense = 0;
  for (const t of txs) {
    if (t.type === "income") income += t.amount;
    else expense += t.amount;
  }
  return { income, expense, net: income - expense };
}

/** Expense total per category for one month. */
export function spendByCategory(txs: Transaction[], month: string): Map<string, number> {
  const out = new Map<string, number>();
  for (const t of txs) {
    if (t.type !== "expense" || !t.date.startsWith(month)) continue;
    out.set(t.categoryId, (out.get(t.categoryId) ?? 0) + t.amount);
  }
  return out;
}

export type BudgetLevel = "ok" | "warn" | "over";

/** Warning from 80% of the limit, alert once it's exceeded. */
export function budgetLevel(spent: number, limit: number): BudgetLevel {
  if (spent > limit) return "over";
  if (spent >= limit * 0.8) return "warn";
  return "ok";
}

/** Whole calendar months left before the deadline, counting the current one. 0 when it's past. */
export function monthsLeft(deadline: string, today = new Date()): number {
  const [y, m, d] = deadline.split("-").map(Number);
  const end = new Date(y, m - 1, d);
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  if (end < start) return 0;
  const months = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
  return Math.max(1, months);
}

export type GoalStatus = "done" | "overdue" | "active";

export function goalInfo(goal: Goal, today = new Date()) {
  const remaining = Math.max(0, goal.target - goal.saved);
  const pct = goal.target > 0 ? Math.min(100, (goal.saved / goal.target) * 100) : 0;
  const left = monthsLeft(goal.deadline, today);
  const status: GoalStatus = remaining === 0 ? "done" : left === 0 ? "overdue" : "active";
  const perMonth = status === "active" ? Math.ceil(remaining / left) : remaining;
  return { remaining, pct, monthsLeft: left, status, perMonth };
}
