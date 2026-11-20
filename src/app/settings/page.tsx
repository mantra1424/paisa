"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { Check, Download, Laptop, Moon, Pencil, Plus, RotateCcw, Sparkles, Sun, Trash2, Upload } from "lucide-react";
import { db, newId } from "@/lib/db";
import { loadDemoData, resetAllData } from "@/lib/demo-data";
import { CATEGORY_COLORS, CSV_HEADERS, downloadFile, importTransactions, transactionsToCSV } from "@/lib/csv";
import { getCurrencyPrefs, setCurrencyPrefs, toISODate, type CurrencyPrefs } from "@/lib/format";
import { THEME_EVENT, getThemePref, setThemePref, type ThemePref } from "@/lib/theme";
import { useCategories, useCategoryMap } from "@/hooks/use-data";
import { PageHeader } from "@/components/page-header";
import { Button, Card, ConfirmDialog, Field, Modal, inputClass } from "@/components/ui";
import type { Category, TxType } from "@/types";

export default function SettingsPage() {
  return (
    <>
      <PageHeader title="Settings" subtitle="Theme, categories and your data." />
      <div className="grid gap-4 xl:grid-cols-2">
        <div className="space-y-4">
          <Appearance />
          <CurrencyFormat />
          <DataSection />
        </div>
        <Categories />
      </div>
    </>
  );
}

function Section({ title, text, children }: { title: string; text?: string; children: ReactNode }) {
  return (
    <Card className="p-4 md:p-5">
      <h2 className="font-semibold">{title}</h2>
      {text && <p className="mt-1 text-sm text-ink-2">{text}</p>}
      <div className="mt-4">{children}</div>
    </Card>
  );
}

/* ---------- Appearance ---------- */

function Appearance() {
  const [pref, setPref] = useState<ThemePref | null>(null);

  useEffect(() => {
    const sync = () => setPref(getThemePref());
    sync();
    window.addEventListener(THEME_EVENT, sync);
    return () => window.removeEventListener(THEME_EVENT, sync);
  }, []);

  const options: { value: ThemePref; label: string; icon: ReactNode }[] = [
    { value: "light", label: "Light", icon: <Sun size={16} /> },
    { value: "dark", label: "Dark", icon: <Moon size={16} /> },
    { value: "system", label: "System", icon: <Laptop size={16} /> },
  ];

  return (
    <Section title="Appearance" text="System follows your phone or computer setting.">
      <div role="radiogroup" aria-label="Theme" className="grid grid-cols-3 gap-1 rounded-lg bg-bg p-1">
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={pref === o.value}
            onClick={() => setThemePref(o.value)}
            className={`flex items-center justify-center gap-2 rounded-md py-2 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-brand ${
              pref === o.value ? "bg-surface text-ink shadow-sm" : "text-muted hover:text-ink"
            }`}
          >
            {o.icon} {o.label}
          </button>
        ))}
      </div>
    </Section>
  );
}

/* ---------- Currency format ---------- */

function Segmented<T extends string | boolean>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { value: T; label: string; example: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div>
      <p id={`seg-${label}`} className="mb-1.5 text-sm font-medium">
        {label}
      </p>
      <div role="radiogroup" aria-labelledby={`seg-${label}`} className="grid grid-cols-2 gap-1 rounded-lg bg-bg p-1">
        {options.map((o) => (
          <button
            key={String(o.value)}
            type="button"
            role="radio"
            aria-checked={value === o.value}
            onClick={() => onChange(o.value)}
            className={`rounded-md px-2 py-2 text-sm focus-visible:outline-2 focus-visible:outline-brand ${
              value === o.value ? "bg-surface font-semibold text-ink shadow-sm" : "text-muted hover:text-ink"
            }`}
          >
            {o.label} <span className="block text-xs font-normal tabular-nums text-muted sm:inline">{o.example}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function CurrencyFormat() {
  const [prefs, setPrefs] = useState<CurrencyPrefs>(getCurrencyPrefs);

  function update(next: CurrencyPrefs) {
    setPrefs(next);
    setCurrencyPrefs(next);
  }

  return (
    <Section title="Currency format" text="How amounts in rupees are shown across the app.">
      <div className="space-y-4">
        <Segmented
          label="Digit grouping"
          value={prefs.grouping}
          onChange={(grouping) => update({ ...prefs, grouping })}
          options={[
            { value: "indian", label: "Indian", example: "₹1,25,000" },
            { value: "international", label: "International", example: "₹125,000" },
          ]}
        />
        <Segmented
          label="Paise"
          value={prefs.paise}
          onChange={(paise) => update({ ...prefs, paise })}
          options={[
            { value: true, label: "Show", example: "₹249.50" },
            { value: false, label: "Round", example: "₹250" },
          ]}
        />
      </div>
    </Section>
  );
}

/* ---------- Import / export / reset ---------- */

type Notice = { tone: "ok" | "error"; text: ReactNode } | null;

function DataSection() {
  const counts = useLiveQuery(async () => ({
    transactions: await db.transactions.count(),
    budgets: await db.budgets.count(),
    goals: await db.goals.count(),
    invoices: await db.invoices.count(),
  }));
  const categories = useCategories();
  const catMap = useCategoryMap(categories);
  const fileRef = useRef<HTMLInputElement>(null);
  const [notice, setNotice] = useState<Notice>(null);
  const [confirm, setConfirm] = useState<"demo" | "reset" | null>(null);
  const [busy, setBusy] = useState(false);

  async function exportCSV() {
    const txs = await db.transactions.toArray();
    downloadFile(`paisa-transactions-${toISODate(new Date())}.csv`, transactionsToCSV(txs, catMap));
    setNotice({ tone: "ok", text: `Exported ${txs.length} transactions.` });
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.size > 5_000_000) return setNotice({ tone: "error", text: "That file is over 5 MB. Split it into smaller files." });
    setBusy(true);
    try {
      const result = importTransactions(await file.text(), categories ?? []);
      if (result.transactions.length === 0) {
        setNotice({ tone: "error", text: <ImportSummary result={result} /> });
        return;
      }
      await db.transaction("rw", [db.transactions, db.categories], async () => {
        await db.categories.bulkAdd(result.newCategories);
        await db.transactions.bulkAdd(result.transactions);
      });
      setNotice({ tone: "ok", text: <ImportSummary result={result} /> });
    } catch (err) {
      setNotice({ tone: "error", text: err instanceof Error ? err.message : "Couldn't read that file." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Section title="Your data" text="Everything is stored only in this browser. Export a CSV to back it up or move it to another device.">
      {counts && (
        <p className="mb-4 text-sm text-ink-2">
          {counts.transactions} transactions · {counts.budgets} budgets · {counts.goals} goals · {counts.invoices} invoices
        </p>
      )}
      <div className="grid gap-2 sm:grid-cols-2">
        <Button variant="secondary" onClick={exportCSV} disabled={!counts?.transactions}>
          <Download size={16} /> Export CSV
        </Button>
        <Button variant="secondary" onClick={() => fileRef.current?.click()} disabled={busy}>
          <Upload size={16} /> {busy ? "Importing…" : "Import CSV"}
        </Button>
        <Button variant="secondary" onClick={() => setConfirm("demo")}>
          <Sparkles size={16} /> Load demo data
        </Button>
        <Button variant="secondary" onClick={() => setConfirm("reset")} className="text-danger!">
          <RotateCcw size={16} /> Reset all data
        </Button>
      </div>
      <input ref={fileRef} type="file" accept=".csv,text/csv" className="hidden" onChange={onFile} aria-label="CSV file to import" />
      <p className="mt-3 text-xs text-muted">
        Import format: a header row <code className="rounded bg-bg px-1">{CSV_HEADERS.join(",")}</code>. Dates as YYYY-MM-DD or DD/MM/YYYY. New
        categories are created automatically.
      </p>

      {notice && (
        <div
          role={notice.tone === "error" ? "alert" : "status"}
          className={`mt-4 rounded-lg p-3 text-sm ${notice.tone === "ok" ? "bg-income/10 text-income" : "bg-danger/10 text-danger"}`}
        >
          {notice.text}
        </div>
      )}

      <ConfirmDialog
        open={confirm === "demo"}
        title="Load demo data?"
        message="This replaces everything on this device with six months of sample transactions, budgets, goals, clients and invoices."
        confirmLabel="Replace with demo data"
        onConfirm={async () => {
          await loadDemoData();
          setNotice({ tone: "ok", text: "Demo data loaded." });
        }}
        onClose={() => setConfirm(null)}
      />
      <ConfirmDialog
        open={confirm === "reset"}
        title="Reset all data?"
        message="Every transaction, budget, goal, client and invoice on this device will be deleted, and categories go back to the defaults. Export a CSV first if you want a backup. This can't be undone."
        confirmLabel="Delete everything"
        onConfirm={async () => {
          await resetAllData();
          setNotice({ tone: "ok", text: "All data deleted. You're starting fresh." });
        }}
        onClose={() => setConfirm(null)}
      />
    </Section>
  );
}

function ImportSummary({ result }: { result: ReturnType<typeof importTransactions> }) {
  const { transactions, newCategories, skipped } = result;
  return (
    <>
      <p className="font-semibold">
        {transactions.length > 0 ? `Imported ${transactions.length} transactions.` : "Nothing was imported."}
        {newCategories.length > 0 && ` Added ${newCategories.length} new ${newCategories.length === 1 ? "category" : "categories"}.`}
      </p>
      {skipped.length > 0 && (
        <>
          <p className="mt-1">Skipped {skipped.length} rows:</p>
          <ul className="mt-1 list-inside list-disc text-xs">
            {skipped.slice(0, 5).map((s) => (
              <li key={s.line}>
                Line {s.line}: {s.reason}
              </li>
            ))}
            {skipped.length > 5 && <li>…and {skipped.length - 5} more</li>}
          </ul>
        </>
      )}
    </>
  );
}

/* ---------- Categories ---------- */

function Categories() {
  const categories = useCategories();
  const usage = useLiveQuery(async () => {
    const out = new Map<string, number>();
    await db.transactions.each((t) => out.set(t.categoryId, (out.get(t.categoryId) ?? 0) + 1));
    return out;
  });
  const [editing, setEditing] = useState<Category | TxType | null>(null);
  const [deleting, setDeleting] = useState<Category | null>(null);

  if (!categories || !usage) return null;

  return (
    <Section title="Categories" text="Rename, recolour or add categories. Deleting one moves its transactions to another category.">
      {(["expense", "income"] as const).map((type) => (
        <div key={type} className="mb-5 last:mb-0">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-ink-2 capitalize">{type}</h3>
            <Button variant="ghost" size="sm" onClick={() => setEditing(type)}>
              <Plus size={14} /> Add
            </Button>
          </div>
          <ul className="divide-y divide-border rounded-lg border border-border">
            {categories
              .filter((c) => c.type === type)
              .map((c) => (
                <li key={c.id} className="flex items-center gap-3 py-1.5 pr-1.5 pl-3">
                  <span className="h-3 w-3 shrink-0 rounded-full" style={{ background: c.color }} aria-hidden />
                  <span className="min-w-0 flex-1 truncate text-sm">{c.name}</span>
                  <span className="shrink-0 text-xs text-muted tabular-nums">{usage.get(c.id) ?? 0}</span>
                  <Button variant="ghost" size="icon" aria-label={`Edit ${c.name}`} onClick={() => setEditing(c)}>
                    <Pencil size={15} />
                  </Button>
                  <Button variant="ghost" size="icon" aria-label={`Delete ${c.name}`} onClick={() => setDeleting(c)}>
                    <Trash2 size={15} />
                  </Button>
                </li>
              ))}
          </ul>
        </div>
      ))}

      <Modal
        open={editing !== null}
        onClose={() => setEditing(null)}
        title={typeof editing === "string" ? `New ${editing} category` : "Edit category"}
      >
        {editing !== null && (
          <CategoryForm
            initial={typeof editing === "string" ? undefined : editing}
            type={typeof editing === "string" ? editing : editing.type}
            existing={categories}
            onDone={() => setEditing(null)}
          />
        )}
      </Modal>

      <Modal open={deleting !== null} onClose={() => setDeleting(null)} title={deleting ? `Delete “${deleting.name}”?` : ""}>
        {deleting && (
          <DeleteCategory
            category={deleting}
            used={usage.get(deleting.id) ?? 0}
            others={categories.filter((c) => c.type === deleting.type && c.id !== deleting.id)}
            onDone={() => setDeleting(null)}
          />
        )}
      </Modal>
    </Section>
  );
}

function CategoryForm({ initial, type, existing, onDone }: { initial?: Category; type: TxType; existing: Category[]; onDone: () => void }) {
  const [name, setName] = useState(initial?.name ?? "");
  const [color, setColor] = useState(initial?.color ?? CATEGORY_COLORS[existing.length % CATEGORY_COLORS.length]);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const n = name.trim();
    if (!n) return setError("Give it a name");
    if (n.length > 30) return setError("Keep it under 30 characters");
    if (existing.some((c) => c.type === type && c.id !== initial?.id && c.name.toLowerCase() === n.toLowerCase()))
      return setError(`You already have an ${type} category called “${n}”`);
    await db.categories.put({ id: initial?.id ?? newId(), name: n, type, color });
    onDone();
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      <Field label="Name" htmlFor="c-name" error={error}>
        <input id="c-name" data-autofocus maxLength={30} value={name} onChange={(e) => (setName(e.target.value), setError(""))} className={inputClass} />
      </Field>
      <fieldset>
        <legend className="mb-1.5 text-sm font-medium">Colour</legend>
        <div className="flex flex-wrap gap-2">
          {CATEGORY_COLORS.map((c) => (
            <label key={c} className="relative cursor-pointer">
              <input type="radio" name="color" value={c} checked={color === c} onChange={() => setColor(c)} className="peer sr-only" aria-label={c} />
              <span
                className="flex h-9 w-9 items-center justify-center rounded-full text-white ring-offset-2 ring-offset-surface peer-checked:ring-2 peer-checked:ring-ink peer-focus-visible:ring-2 peer-focus-visible:ring-brand"
                style={{ background: c }}
              >
                {color === c && <Check size={16} />}
              </span>
            </label>
          ))}
        </div>
      </fieldset>
      <div className="flex justify-end gap-2 pt-2">
        <Button variant="secondary" onClick={onDone}>
          Cancel
        </Button>
        <Button type="submit">{initial ? "Save changes" : "Add category"}</Button>
      </div>
    </form>
  );
}

function DeleteCategory({ category, used, others, onDone }: { category: Category; used: number; others: Category[]; onDone: () => void }) {
  const [target, setTarget] = useState(others[0]?.id ?? "");
  const budgets = useLiveQuery(() => db.budgets.where("categoryId").equals(category.id).count());
  const blocked = used > 0 && others.length === 0;

  async function remove() {
    await db.transaction("rw", [db.transactions, db.budgets, db.categories], async () => {
      if (used > 0) await db.transactions.where("categoryId").equals(category.id).modify({ categoryId: target });
      // Budgets don't merge cleanly, so they're removed with the category.
      await db.budgets.where("categoryId").equals(category.id).delete();
      await db.categories.delete(category.id);
    });
    onDone();
  }

  return (
    <div className="space-y-4 text-sm text-ink-2">
      {blocked ? (
        <p>
          {used} transactions use this category, and it&apos;s your only {category.type} category. Add another {category.type} category first so
          they have somewhere to go.
        </p>
      ) : used > 0 ? (
        <Field label={`Move its ${used} ${used === 1 ? "transaction" : "transactions"} to`} htmlFor="c-move">
          <select id="c-move" value={target} onChange={(e) => setTarget(e.target.value)} className={inputClass}>
            {others.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </Field>
      ) : (
        <p>No transactions use this category.</p>
      )}
      {!!budgets && !blocked && (
        <p>
          Its {budgets} {budgets === 1 ? "budget" : "budgets"} will be deleted too.
        </p>
      )}
      <div className="flex justify-end gap-2 pt-2">
        <Button variant="secondary" onClick={onDone}>
          {blocked ? "OK" : "Cancel"}
        </Button>
        {!blocked && (
          <Button variant="danger" onClick={remove}>
            Delete category
          </Button>
        )}
      </div>
    </div>
  );
}
