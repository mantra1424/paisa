"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useLiveQuery } from "dexie-react-hooks";
import { ArrowRight, PieChart as PieIcon, Plus } from "lucide-react";
import { db } from "@/lib/db";
import { formatDate, formatINR } from "@/lib/format";
import { budgetLevel, goalInfo, monthKey, monthLabel, shiftMonth, spendByCategory, totals } from "@/lib/calculations";
import { useCategories, useCategoryMap, useTransactions } from "@/hooks/use-data";
import { PageHeader } from "@/components/page-header";
import { CategoryDonut, MonthlyBars } from "@/components/dashboard-charts";
import { TransactionForm } from "@/components/transaction-form";
import { Button, Card, Modal, ProgressBar } from "@/components/ui";

export default function DashboardPage() {
  const transactions = useTransactions();
  const categories = useCategories();
  const catMap = useCategoryMap(categories);
  const budgets = useLiveQuery(() => db.budgets.where("month").equals(monthKey()).toArray());
  const goals = useLiveQuery(() => db.goals.toArray());
  const [adding, setAdding] = useState(false);

  const month = monthKey();
  const data = useMemo(() => {
    const txs = transactions ?? [];
    const now = totals(txs.filter((t) => t.date.startsWith(month)));
    const months = Array.from({ length: 6 }, (_, i) => shiftMonth(month, i - 5)).map((m) => {
      const t = totals(txs.filter((x) => x.date.startsWith(m)));
      return { month: monthLabel(m, "short"), income: t.income, expense: t.expense };
    });
    const spend = spendByCategory(txs, month);
    const byCategory = [...spend.entries()]
      .map(([id, value]) => ({ name: catMap.get(id)?.name ?? "Uncategorised", color: catMap.get(id)?.color ?? "#999", value }))
      .sort((a, b) => b.value - a.value);
    const recent = [...txs].sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id)).slice(0, 5);
    return { now, months, spend, byCategory, recent };
  }, [transactions, catMap, month]);

  if (!transactions || !categories || !budgets || !goals) return <p className="text-sm text-muted">Loading…</p>;

  const { now, months, spend, byCategory, recent } = data;
  const rate = now.income > 0 ? Math.round((now.net / now.income) * 100) : null;
  const cards = [
    { label: "Income this month", value: formatINR(now.income), tone: "text-income" },
    { label: "Spent this month", value: formatINR(now.expense), tone: "text-expense" },
    { label: "Saved this month", value: formatINR(now.net), tone: now.net < 0 ? "text-danger" : "text-ink" },
    { label: "Savings rate", value: rate === null ? "–" : `${rate}%`, tone: rate !== null && rate < 0 ? "text-danger" : "text-ink" },
  ];
  const budgetRows = budgets
    .map((b) => ({ b, spent: spend.get(b.categoryId) ?? 0, cat: catMap.get(b.categoryId) }))
    .sort((x, y) => y.spent / y.b.limit - x.spent / x.b.limit)
    .slice(0, 4);
  const activeGoals = goals.filter((g) => goalInfo(g).status !== "done").slice(0, 3);

  return (
    <>
      <PageHeader
        title="Dashboard"
        subtitle={`${monthLabel(month)} at a glance. Everything stays on this device.`}
        action={
          <Button onClick={() => setAdding(true)}>
            <Plus size={16} /> Add transaction
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-4">
        {cards.map((c) => (
          <Card key={c.label} className="min-w-0 p-4">
            <p className="truncate text-xs font-medium text-muted md:text-sm">{c.label}</p>
            <p className={`mt-2 truncate text-xl font-bold tabular-nums md:text-2xl ${c.tone}`}>{c.value}</p>
          </Card>
        ))}
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-5">
        <Card className="min-w-0 p-4 lg:col-span-3">
          <h2 className="mb-3 font-semibold">Income vs spending</h2>
          <MonthlyBars data={months} />
        </Card>
        <Card className="min-w-0 p-4 lg:col-span-2">
          <h2 className="mb-3 font-semibold">Where it went this month</h2>
          {byCategory.length > 0 ? (
            <CategoryDonut data={byCategory} total={now.expense} />
          ) : (
            <div className="flex h-48 flex-col items-center justify-center text-center text-sm text-muted">
              <PieIcon size={28} className="mb-2" />
              No spending recorded this month yet.
            </div>
          )}
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-5">
        <Card className="min-w-0 lg:col-span-3">
          <div className="flex items-center justify-between px-4 pt-4 pb-2">
            <h2 className="font-semibold">Recent transactions</h2>
            <SeeAll href="/transactions" />
          </div>
          {recent.length === 0 ? (
            <p className="px-4 pb-6 text-sm text-muted">Nothing yet. Add your first transaction to get started.</p>
          ) : (
            <ul className="divide-y divide-border">
              {recent.map((t) => {
                const cat = catMap.get(t.categoryId);
                return (
                  <li key={t.id} className="flex items-center gap-3 px-4 py-3">
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: cat?.color }} aria-hidden />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{t.note || cat?.name}</p>
                      <p className="truncate text-xs text-muted">
                        {cat?.name} · {formatDate(t.date)}
                      </p>
                    </div>
                    <p className={`shrink-0 text-sm font-semibold tabular-nums ${t.type === "income" ? "text-income" : ""}`}>
                      {t.type === "income" ? "+" : "−"}
                      {formatINR(t.amount)}
                    </p>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        <div className="min-w-0 space-y-4 lg:col-span-2">
          <Card className="p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-semibold">Budgets</h2>
              <SeeAll href="/budgets" />
            </div>
            {budgetRows.length === 0 ? (
              <p className="text-sm text-muted">No budgets for this month yet.</p>
            ) : (
              <ul className="space-y-3">
                {budgetRows.map(({ b, spent, cat }) => {
                  const level = budgetLevel(spent, b.limit);
                  return (
                    <li key={b.id}>
                      <div className="mb-1 flex justify-between gap-2 text-sm">
                        <span className="truncate">{cat?.name}</span>
                        <span className={`shrink-0 tabular-nums ${level === "over" ? "font-semibold text-danger" : "text-ink-2"}`}>
                          {formatINR(spent)} / {formatINR(b.limit)}
                        </span>
                      </div>
                      <ProgressBar value={(spent / b.limit) * 100} tone={level} />
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>

          <Card className="p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-semibold">Savings goals</h2>
              <SeeAll href="/goals" />
            </div>
            {activeGoals.length === 0 ? (
              <p className="text-sm text-muted">No goals in progress.</p>
            ) : (
              <ul className="space-y-3">
                {activeGoals.map((g) => {
                  const info = goalInfo(g);
                  return (
                    <li key={g.id}>
                      <div className="mb-1 flex justify-between gap-2 text-sm">
                        <span className="truncate">{g.name}</span>
                        <span className="shrink-0 text-ink-2 tabular-nums">{Math.round(info.pct)}%</span>
                      </div>
                      <ProgressBar value={info.pct} tone="brand" />
                      {info.status === "active" && <p className="mt-1 text-xs text-muted">{formatINR(info.perMonth)}/month to stay on track</p>}
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>
        </div>
      </div>

      <Modal open={adding} onClose={() => setAdding(false)} title="Add transaction">
        {adding && <TransactionForm categories={categories} onDone={() => setAdding(false)} />}
      </Modal>
    </>
  );
}

function SeeAll({ href }: { href: string }) {
  return (
    <Link href={href} className="flex items-center gap-1 rounded text-xs font-semibold text-brand hover:underline focus-visible:outline-2 focus-visible:outline-brand">
      See all <ArrowRight size={12} />
    </Link>
  );
}
