"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { formatINR, toISODate } from "@/lib/format";
import { ComingSoon, PageHeader } from "@/components/page-header";

/**
 * Day 1 dashboard: proves the database and demo data work.
 * Charts and budget widgets come in Week 2.
 */
export default function DashboardPage() {
  const stats = useLiveQuery(async () => {
    const month = toISODate(new Date()).slice(0, 7);
    const thisMonth = await db.transactions.where("date").startsWith(month).toArray();
    const income = thisMonth.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
    const spent = thisMonth.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);
    return { total: await db.transactions.count(), income, spent };
  });

  const cards = [
    { label: "Income this month", value: stats ? formatINR(stats.income) : "…", tone: "text-income" },
    { label: "Spent this month", value: stats ? formatINR(stats.spent) : "…", tone: "text-expense" },
    { label: "Saved this month", value: stats ? formatINR(stats.income - stats.spent) : "…", tone: "text-ink" },
    { label: "Transactions stored", value: stats ? String(stats.total) : "…", tone: "text-ink" },
  ];

  return (
    <>
      <PageHeader title="Dashboard" subtitle="Your money at a glance. Everything stays on this device." />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
        {cards.map((c) => (
          <div key={c.label} className="rounded-xl border border-border bg-surface p-4">
            <p className="text-xs font-medium text-muted md:text-sm">{c.label}</p>
            <p className={`mt-2 text-xl font-bold tabular-nums md:text-2xl ${c.tone}`}>{c.value}</p>
          </div>
        ))}
      </div>
      <div className="mt-6">
        <ComingSoon
          day="Week 2 (Day 8–9)"
          items={["Spending by category (donut chart)", "Income vs spending, last 6 months (bar chart)", "Recent transactions"]}
        />
      </div>
    </>
  );
}
