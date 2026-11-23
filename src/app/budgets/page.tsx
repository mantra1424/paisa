"use client";

import { useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { AlertTriangle, ChevronLeft, ChevronRight, Copy, Pencil, PiggyBank, Plus, Trash2 } from "lucide-react";
import { db, newId } from "@/lib/db";
import { formatINR } from "@/lib/format";
import { budgetLevel, monthKey, monthLabel, shiftMonth, spendByCategory } from "@/lib/calculations";
import { useCategories, useCategoryMap, useTransactions } from "@/hooks/use-data";
import { PageHeader } from "@/components/page-header";
import { Button, Card, ConfirmDialog, EmptyState, Field, Modal, ProgressBar, inputClass } from "@/components/ui";
import type { Budget, Category } from "@/types";

export default function BudgetsPage() {
  const thisMonth = monthKey();
  const [month, setMonth] = useState(thisMonth);
  const [editing, setEditing] = useState<Budget | "new" | null>(null);
  const [deleting, setDeleting] = useState<Budget | null>(null);

  const categories = useCategories();
  const catMap = useCategoryMap(categories);
  const transactions = useTransactions();
  const allBudgets = useLiveQuery(() => db.budgets.toArray());

  const budgets = useMemo(() => (allBudgets ?? []).filter((b) => b.month === month), [allBudgets, month]);
  const previous = useMemo(() => (allBudgets ?? []).filter((b) => b.month === shiftMonth(month, -1)), [allBudgets, month]);
  const spend = useMemo(() => spendByCategory(transactions ?? [], month), [transactions, month]);

  if (!categories || !transactions || !allBudgets) return <p className="text-sm text-muted">Loading…</p>;

  const rows = budgets
    .map((b) => ({ budget: b, category: catMap.get(b.categoryId), spent: spend.get(b.categoryId) ?? 0 }))
    .sort((a, b) => b.spent / b.budget.limit - a.spent / a.budget.limit);
  const totalLimit = rows.reduce((s, r) => s + r.budget.limit, 0);
  const totalSpent = rows.reduce((s, r) => s + r.spent, 0);
  const over = rows.filter((r) => budgetLevel(r.spent, r.budget.limit) === "over");
  const warn = rows.filter((r) => budgetLevel(r.spent, r.budget.limit) === "warn");
  const unbudgeted = [...spend.entries()]
    .filter(([id]) => !budgets.some((b) => b.categoryId === id))
    .map(([id, amount]) => ({ category: catMap.get(id), amount }))
    .sort((a, b) => b.amount - a.amount);
  const expenseCats = categories.filter((c) => c.type === "expense");
  const available = expenseCats.filter((c) => !budgets.some((b) => b.categoryId === c.id));

  async function copyLastMonth() {
    await db.budgets.bulkAdd(
      previous.filter((p) => !budgets.some((b) => b.categoryId === p.categoryId)).map((p) => ({ ...p, id: newId(), month })),
    );
  }

  return (
    <>
      <PageHeader
        title="Budgets"
        subtitle="Set a monthly limit for each spending category."
        action={
          available.length > 0 && (
            <Button onClick={() => setEditing("new")}>
              <Plus size={16} /> Add budget
            </Button>
          )
        }
      />

      {/* Month switcher */}
      <div className="mb-5 flex items-center justify-between gap-2 sm:justify-start">
        <Button variant="secondary" size="icon" aria-label="Previous month" onClick={() => setMonth(shiftMonth(month, -1))}>
          <ChevronLeft size={18} />
        </Button>
        <p className="min-w-40 text-center font-semibold" aria-live="polite">
          {monthLabel(month)}
        </p>
        <Button variant="secondary" size="icon" aria-label="Next month" onClick={() => setMonth(shiftMonth(month, 1))}>
          <ChevronRight size={18} />
        </Button>
        {month !== thisMonth && (
          <Button variant="ghost" size="sm" onClick={() => setMonth(thisMonth)} className="hidden sm:inline-flex">
            Back to this month
          </Button>
        )}
      </div>

      {rows.length === 0 ? (
        <EmptyState
          icon={<PiggyBank size={22} />}
          title={`No budgets for ${monthLabel(month)}`}
          text={
            previous.length > 0
              ? `You had ${previous.length} budgets last month. Copy them over or start fresh.`
              : "Pick a category and set how much you want to spend on it this month."
          }
          action={
            <div className="flex flex-wrap justify-center gap-2">
              {previous.length > 0 && (
                <Button variant="secondary" onClick={copyLastMonth}>
                  <Copy size={16} /> Copy last month
                </Button>
              )}
              <Button onClick={() => setEditing("new")}>
                <Plus size={16} /> Add budget
              </Button>
            </div>
          }
        />
      ) : (
        <>
          {/* Summary */}
          <div className="mb-4 grid grid-cols-3 gap-2 sm:gap-3">
            <Stat label="Budgeted" value={formatINR(totalLimit)} />
            <Stat label="Spent" value={formatINR(totalSpent)} tone={totalSpent > totalLimit ? "text-danger" : "text-ink"} />
            <Stat
              label={totalSpent > totalLimit ? "Over by" : "Left to spend"}
              value={formatINR(Math.abs(totalLimit - totalSpent))}
              tone={totalSpent > totalLimit ? "text-danger" : "text-income"}
            />
          </div>

          {(over.length > 0 || warn.length > 0) && (
            <div role="alert" className="mb-4 flex gap-3 rounded-xl border border-warn/40 bg-warn/10 p-4 text-sm">
              <AlertTriangle size={18} className="mt-0.5 shrink-0 text-warn" />
              <p>
                {over.length > 0 && (
                  <>
                    <strong>Over budget:</strong> {over.map((r) => r.category?.name).join(", ")}.{" "}
                  </>
                )}
                {warn.length > 0 && (
                  <>
                    <strong>Nearly there (80%+):</strong> {warn.map((r) => r.category?.name).join(", ")}.
                  </>
                )}
              </p>
            </div>
          )}

          <div className="grid gap-3 lg:grid-cols-2">
            {rows.map(({ budget, category, spent }) => {
              const level = budgetLevel(spent, budget.limit);
              const pct = (spent / budget.limit) * 100;
              return (
                <Card key={budget.id} className="p-4">
                  <div className="flex items-start gap-3">
                    <span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: category?.color }} aria-hidden />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold">{category?.name ?? "Deleted category"}</p>
                      <p className="text-sm text-ink-2 tabular-nums">
                        {formatINR(spent)} of {formatINR(budget.limit)}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${
                        level === "over" ? "bg-danger/10 text-danger" : level === "warn" ? "bg-warn/15 text-warn" : "bg-income/10 text-income"
                      }`}
                    >
                      {Math.round(pct)}%
                    </span>
                    <div className="-my-1 flex shrink-0">
                      <Button variant="ghost" size="icon" aria-label={`Edit ${category?.name} budget`} onClick={() => setEditing(budget)}>
                        <Pencil size={16} />
                      </Button>
                      <Button variant="ghost" size="icon" aria-label={`Delete ${category?.name} budget`} onClick={() => setDeleting(budget)}>
                        <Trash2 size={16} />
                      </Button>
                    </div>
                  </div>
                  <div className="mt-3" role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100} aria-label={`${category?.name} budget used`}>
                    <ProgressBar value={pct} tone={level} />
                  </div>
                  <p className={`mt-2 text-xs ${level === "over" ? "font-semibold text-danger" : level === "warn" ? "text-warn" : "text-muted"}`}>
                    {level === "over"
                      ? `Over budget by ${formatINR(spent - budget.limit)}`
                      : level === "warn"
                        ? `Careful: only ${formatINR(budget.limit - spent)} left`
                        : `${formatINR(budget.limit - spent)} left`}
                  </p>
                </Card>
              );
            })}
          </div>
        </>
      )}

      {unbudgeted.length > 0 && (
        <section className="mt-6">
          <h2 className="mb-2 text-sm font-semibold text-ink-2">Spending without a budget</h2>
          <Card>
            <ul className="divide-y divide-border">
              {unbudgeted.map(({ category, amount }) => (
                <li key={category?.id ?? "none"} className="flex items-center gap-3 px-4 py-2.5 text-sm">
                  <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: category?.color }} aria-hidden />
                  <span className="min-w-0 flex-1 truncate">{category?.name ?? "Uncategorised"}</span>
                  <span className="tabular-nums text-ink-2">{formatINR(amount)}</span>
                </li>
              ))}
            </ul>
          </Card>
        </section>
      )}

      <Modal open={editing !== null} onClose={() => setEditing(null)} title={editing === "new" ? `New budget · ${monthLabel(month)}` : "Edit budget"}>
        {editing !== null && (
          <BudgetForm
            month={month}
            initial={editing === "new" ? undefined : editing}
            categories={editing === "new" ? available : expenseCats}
            onDone={() => setEditing(null)}
          />
        )}
      </Modal>

      <ConfirmDialog
        open={deleting !== null}
        title="Delete budget?"
        message={deleting && `The ${catMap.get(deleting.categoryId)?.name} budget for ${monthLabel(deleting.month)} will be removed. Your transactions stay as they are.`}
        onConfirm={async () => {
          if (deleting) await db.budgets.delete(deleting.id);
        }}
        onClose={() => setDeleting(null)}
      />
    </>
  );
}

function Stat({ label, value, tone = "text-ink" }: { label: string; value: string; tone?: string }) {
  return (
    <Card className="min-w-0 p-3 sm:p-4">
      <p className="truncate text-xs font-medium text-muted">{label}</p>
      <p className={`mt-1 truncate font-serif text-lg font-semibold tabular-nums sm:text-2xl ${tone}`}>{value}</p>
    </Card>
  );
}

function BudgetForm({
  month,
  initial,
  categories,
  onDone,
}: {
  month: string;
  initial?: Budget;
  categories: Category[];
  onDone: () => void;
}) {
  const [categoryId, setCategoryId] = useState(initial?.categoryId ?? categories[0]?.id ?? "");
  const [limit, setLimit] = useState(initial ? String(initial.limit) : "");
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const value = Number(limit);
    if (!limit || !Number.isFinite(value) || value <= 0) return setError("Enter a limit above ₹0");
    if (value > 10_000_000) return setError("That's more than ₹1 crore. Check the amount");
    if (!categoryId) return setError("Pick a category");
    await db.budgets.put({ id: initial?.id ?? newId(), categoryId, month: initial?.month ?? month, limit: Math.round(value) });
    onDone();
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      <Field label="Category" htmlFor="b-category">
        <select id="b-category" value={categoryId} onChange={(e) => setCategoryId(e.target.value)} disabled={!!initial} className={inputClass}>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Monthly limit (₹)" htmlFor="b-limit" error={error}>
        <input
          id="b-limit"
          type="number"
          inputMode="numeric"
          min="1"
          step="1"
          data-autofocus
          value={limit}
          onChange={(e) => (setLimit(e.target.value), setError(""))}
          aria-invalid={!!error}
          className={inputClass}
        />
      </Field>
      <div className="flex justify-end gap-2 pt-2">
        <Button variant="secondary" onClick={onDone}>
          Cancel
        </Button>
        <Button type="submit">{initial ? "Save changes" : "Add budget"}</Button>
      </div>
    </form>
  );
}
