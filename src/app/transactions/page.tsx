"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeftRight, ChevronLeft, ChevronRight, Pencil, Plus, Search, Trash2, X } from "lucide-react";
import { db } from "@/lib/db";
import { formatDate, formatINR } from "@/lib/format";
import { totals } from "@/lib/calculations";
import { useCategories, useCategoryMap, useTransactions } from "@/hooks/use-data";
import { PageHeader } from "@/components/page-header";
import { METHOD_LABELS, TransactionForm } from "@/components/transaction-form";
import { Button, Card, ConfirmDialog, EmptyState, Modal, inputClass } from "@/components/ui";
import type { Transaction } from "@/types";

const PAGE_SIZE = 15;
type Sort = "date-desc" | "date-asc" | "amount-desc" | "amount-asc";

const EMPTY_FILTERS = { q: "", type: "", category: "", method: "", from: "", to: "" };

export default function TransactionsPage() {
  const transactions = useTransactions();
  const categories = useCategories();
  const catMap = useCategoryMap(categories);

  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [sort, setSort] = useState<Sort>("date-desc");
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<Transaction | "new" | null>(null);
  const [deleting, setDeleting] = useState<Transaction | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  // Keyboard shortcuts: N = new transaction, / = search.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const el = e.target as HTMLElement;
      if (el.closest("input, textarea, select, dialog") || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === "n" || e.key === "N") {
        e.preventDefault();
        setEditing("new");
      } else if (e.key === "/") {
        e.preventDefault();
        searchRef.current?.focus();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const filtered = useMemo(() => {
    if (!transactions) return [];
    const q = filters.q.trim().toLowerCase();
    const out = transactions.filter(
      (t) =>
        (!filters.type || t.type === filters.type) &&
        (!filters.category || t.categoryId === filters.category) &&
        (!filters.method || t.method === filters.method) &&
        (!filters.from || t.date >= filters.from) &&
        (!filters.to || t.date <= filters.to) &&
        (!q || t.note.toLowerCase().includes(q) || (catMap.get(t.categoryId)?.name.toLowerCase().includes(q) ?? false)),
    );
    const [key, dir] = sort.split("-") as ["date" | "amount", "asc" | "desc"];
    const sign = dir === "asc" ? 1 : -1;
    return out.sort((a, b) => {
      const d = key === "date" ? a.date.localeCompare(b.date) : a.amount - b.amount;
      return d !== 0 ? d * sign : b.id.localeCompare(a.id);
    });
  }, [transactions, filters, sort, catMap]);

  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const current = Math.min(page, pages);
  const visible = filtered.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);
  const sum = totals(filtered);
  const hasFilters = Object.values(filters).some(Boolean);

  function update<K extends keyof typeof EMPTY_FILTERS>(key: K, value: string) {
    setFilters((f) => {
      const next = { ...f, [key]: value };
      // A category from the other type would hide everything, so drop it.
      if (key === "type" && value && next.category && catMap.get(next.category)?.type !== value) next.category = "";
      return next;
    });
    setPage(1);
  }

  if (!transactions || !categories) return <p className="text-sm text-muted">Loading…</p>;

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <PageHeader title="Transactions" subtitle="Every rupee in and out." />
        <Button onClick={() => setEditing("new")} aria-keyshortcuts="n">
          <Plus size={16} /> Add transaction
        </Button>
      </div>

      {/* Filters */}
      <Card className="mb-4 p-4">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
          <div className="relative col-span-2 md:col-span-3 xl:col-span-2">
            <Search size={16} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted" />
            <input
              ref={searchRef}
              type="search"
              aria-label="Search notes and categories"
              placeholder="Search notes…  ( / )"
              value={filters.q}
              onChange={(e) => update("q", e.target.value)}
              className={`${inputClass} pl-9`}
            />
          </div>
          <select aria-label="Type" value={filters.type} onChange={(e) => update("type", e.target.value)} className={inputClass}>
            <option value="">All types</option>
            <option value="income">Income</option>
            <option value="expense">Expense</option>
          </select>
          <select aria-label="Category" value={filters.category} onChange={(e) => update("category", e.target.value)} className={inputClass}>
            <option value="">All categories</option>
            {categories
              .filter((c) => !filters.type || c.type === filters.type)
              .map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
          </select>
          <select aria-label="Payment method" value={filters.method} onChange={(e) => update("method", e.target.value)} className={inputClass}>
            <option value="">All methods</option>
            {Object.entries(METHOD_LABELS).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
          <select aria-label="Sort by" value={sort} onChange={(e) => (setSort(e.target.value as Sort), setPage(1))} className={inputClass}>
            <option value="date-desc">Newest first</option>
            <option value="date-asc">Oldest first</option>
            <option value="amount-desc">Highest amount</option>
            <option value="amount-asc">Lowest amount</option>
          </select>
          <label className="col-span-1 text-xs text-muted xl:col-span-1">
            From
            <input type="date" aria-label="From date" value={filters.from} max={filters.to || undefined} onChange={(e) => update("from", e.target.value)} className={`${inputClass} mt-1`} />
          </label>
          <label className="col-span-1 text-xs text-muted xl:col-span-1">
            To
            <input type="date" aria-label="To date" value={filters.to} min={filters.from || undefined} onChange={(e) => update("to", e.target.value)} className={`${inputClass} mt-1`} />
          </label>
          {hasFilters && (
            <div className="col-span-2 flex items-end md:col-span-1">
              <Button variant="ghost" onClick={() => (setFilters(EMPTY_FILTERS), setPage(1))}>
                <X size={16} /> Clear filters
              </Button>
            </div>
          )}
        </div>
      </Card>

      {/* Totals for the current filter */}
      <div className="mb-4 flex flex-wrap gap-x-6 gap-y-1 text-sm">
        <span className="text-ink-2">
          <strong className="text-ink">{filtered.length}</strong> {filtered.length === 1 ? "transaction" : "transactions"}
        </span>
        <span className="text-ink-2">
          In <strong className="text-income tabular-nums">{formatINR(sum.income)}</strong>
        </span>
        <span className="text-ink-2">
          Out <strong className="text-expense tabular-nums">{formatINR(sum.expense)}</strong>
        </span>
      </div>

      {transactions.length === 0 ? (
        <EmptyState
          icon={<ArrowLeftRight size={22} />}
          title="No transactions yet"
          text="Add your first income or expense, or load demo data from Settings."
          action={
            <Button onClick={() => setEditing("new")}>
              <Plus size={16} /> Add transaction
            </Button>
          }
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Search size={22} />}
          title="Nothing matches these filters"
          text="Try a different search or clear the filters."
          action={
            <Button variant="secondary" onClick={() => (setFilters(EMPTY_FILTERS), setPage(1))}>
              Clear filters
            </Button>
          }
        />
      ) : (
        <Card>
          <ul className="divide-y divide-border">
            {visible.map((t) => {
              const cat = catMap.get(t.categoryId);
              return (
                <li key={t.id} className="flex items-center gap-3 px-4 py-3">
                  <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: cat?.color ?? "#999" }} aria-hidden />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{t.note || cat?.name || "Uncategorised"}</p>
                    <p className="truncate text-xs text-muted">
                      {cat?.name ?? "Uncategorised"} · {formatDate(t.date)} · {METHOD_LABELS[t.method]}
                    </p>
                  </div>
                  <p className={`shrink-0 text-sm font-semibold tabular-nums ${t.type === "income" ? "text-income" : "text-ink"}`}>
                    {t.type === "income" ? "+" : "−"}
                    {formatINR(t.amount)}
                  </p>
                  <div className="flex shrink-0">
                    <Button variant="ghost" size="icon" aria-label={`Edit ${t.note || "transaction"}`} onClick={() => setEditing(t)}>
                      <Pencil size={16} />
                    </Button>
                    <Button variant="ghost" size="icon" aria-label={`Delete ${t.note || "transaction"}`} onClick={() => setDeleting(t)}>
                      <Trash2 size={16} />
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
          {pages > 1 && (
            <nav aria-label="Pagination" className="flex items-center justify-between gap-2 border-t border-border px-4 py-3">
              <Button variant="secondary" size="sm" disabled={current === 1} onClick={() => setPage(current - 1)}>
                <ChevronLeft size={14} /> Previous
              </Button>
              <span className="text-xs text-muted">
                Page {current} of {pages}
              </span>
              <Button variant="secondary" size="sm" disabled={current === pages} onClick={() => setPage(current + 1)}>
                Next <ChevronRight size={14} />
              </Button>
            </nav>
          )}
        </Card>
      )}

      <Modal open={editing !== null} onClose={() => setEditing(null)} title={editing === "new" ? "Add transaction" : "Edit transaction"}>
        {editing !== null && (
          <TransactionForm categories={categories} initial={editing === "new" ? undefined : editing} onDone={() => setEditing(null)} />
        )}
      </Modal>

      <ConfirmDialog
        open={deleting !== null}
        title="Delete transaction?"
        message={
          deleting && (
            <>
              <strong className="text-ink">{deleting.note || catMap.get(deleting.categoryId)?.name}</strong> for {formatINR(deleting.amount)} on{" "}
              {formatDate(deleting.date)} will be removed. This can&apos;t be undone.
            </>
          )
        }
        onConfirm={async () => {
          if (deleting) await db.transactions.delete(deleting.id);
        }}
        onClose={() => setDeleting(null)}
      />
    </>
  );
}
