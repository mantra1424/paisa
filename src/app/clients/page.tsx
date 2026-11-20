"use client";

import { useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { BadgeCheck, Briefcase, CircleDollarSign, FilePlus2, Pencil, Trash2, Undo2, UserPlus } from "lucide-react";
import { db, newId } from "@/lib/db";
import { formatDate, formatINR, toISODate } from "@/lib/format";
import { invoiceStatus, invoiceTotals, monthKey, monthLabel, nextInvoiceNumber, type InvoiceStatus } from "@/lib/calculations";
import { PageHeader } from "@/components/page-header";
import { METHOD_LABELS } from "@/components/transaction-form";
import { Button, Card, ConfirmDialog, EmptyState, Field, Modal, inputClass } from "@/components/ui";
import { useCategories } from "@/hooks/use-data";
import type { Category, Client, Invoice, PaymentMethod } from "@/types";

type Filter = "all" | "unpaid" | "overdue" | "paid";

const STATUS_STYLE: Record<InvoiceStatus, string> = {
  paid: "bg-income/10 text-income",
  overdue: "bg-danger/10 text-danger",
  pending: "bg-warn/15 text-warn",
};

export default function ClientsPage() {
  const clients = useLiveQuery(() => db.clients.toArray().then((cs) => cs.sort((a, b) => a.name.localeCompare(b.name))));
  const invoices = useLiveQuery(() => db.invoices.toArray());
  const categories = useCategories();
  const [filter, setFilter] = useState<Filter>("unpaid");
  const [editingInvoice, setEditingInvoice] = useState<Invoice | "new" | null>(null);
  const [editingClient, setEditingClient] = useState<Client | "new" | null>(null);
  const [paying, setPaying] = useState<Invoice | null>(null);
  const [unpaying, setUnpaying] = useState<Invoice | null>(null);
  const [deletingInvoice, setDeletingInvoice] = useState<Invoice | null>(null);
  const [deletingClient, setDeletingClient] = useState<Client | null>(null);

  const clientMap = useMemo(() => new Map((clients ?? []).map((c) => [c.id, c])), [clients]);

  if (!clients || !invoices || !categories) return <p className="text-sm text-muted">Loading…</p>;

  const sum = invoiceTotals(invoices);
  const rows = invoices
    .map((inv) => ({ inv, status: invoiceStatus(inv) }))
    .filter(({ status }) => filter === "all" || (filter === "unpaid" ? status !== "paid" : status === filter))
    .sort((a, b) => (a.status === "paid" ? b.inv.issued.localeCompare(a.inv.issued) : a.inv.due.localeCompare(b.inv.due)));
  const counts = {
    all: invoices.length,
    unpaid: invoices.filter((i) => !i.paidOn).length,
    overdue: invoices.filter((i) => invoiceStatus(i) === "overdue").length,
    paid: invoices.filter((i) => i.paidOn).length,
  };

  return (
    <>
      <PageHeader
        title="Clients & invoices"
        subtitle="Track freelance work and the money owed to you."
        action={
          clients.length > 0 && (
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" onClick={() => setEditingClient("new")}>
                <UserPlus size={16} /> Add client
              </Button>
              <Button onClick={() => setEditingInvoice("new")}>
                <FilePlus2 size={16} /> New invoice
              </Button>
            </div>
          )
        }
      />

      {clients.length === 0 ? (
        <EmptyState
          icon={<Briefcase size={22} />}
          title="No clients yet"
          text="Add the people or businesses you freelance for, then raise invoices and mark them paid. Payments go straight into your transactions."
          action={
            <Button onClick={() => setEditingClient("new")}>
              <UserPlus size={16} /> Add your first client
            </Button>
          }
        />
      ) : (
        <>
          <div className="mb-4 grid grid-cols-3 gap-2 sm:gap-3">
            <Stat label="Owed to you" value={formatINR(sum.owed)} />
            <Stat label="Overdue" value={formatINR(sum.overdue)} tone={sum.overdue > 0 ? "text-danger" : "text-ink"} />
            <Stat label={`Paid in ${monthLabel(monthKey(), "short")}`} value={formatINR(sum.paidThisMonth)} tone="text-income" />
          </div>

          <div className="grid gap-4 xl:grid-cols-3">
            <section className="min-w-0 xl:col-span-2" aria-labelledby="invoices-heading">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <h2 id="invoices-heading" className="font-semibold">
                  Invoices
                </h2>
                <div role="tablist" aria-label="Filter invoices" className="flex gap-1 rounded-lg bg-surface p-1 ring-1 ring-border">
                  {(["unpaid", "overdue", "paid", "all"] as const).map((f) => (
                    <button
                      key={f}
                      type="button"
                      role="tab"
                      aria-selected={filter === f}
                      onClick={() => setFilter(f)}
                      className={`rounded-md px-2.5 py-1 text-xs font-semibold capitalize focus-visible:outline-2 focus-visible:outline-brand ${
                        filter === f ? "bg-brand text-brand-ink" : "text-ink-2 hover:text-ink"
                      }`}
                    >
                      {f} <span className="tabular-nums opacity-80">{counts[f]}</span>
                    </button>
                  ))}
                </div>
              </div>

              {rows.length === 0 ? (
                <Card className="px-4 py-10 text-center text-sm text-ink-2">
                  {filter === "overdue" ? "Nothing overdue. Nice." : filter === "paid" ? "No paid invoices yet." : "No invoices here."}
                  {invoices.length === 0 && (
                    <div className="mt-4">
                      <Button onClick={() => setEditingInvoice("new")}>
                        <FilePlus2 size={16} /> Create your first invoice
                      </Button>
                    </div>
                  )}
                </Card>
              ) : (
                <Card>
                  <ul className="divide-y divide-border">
                    {rows.map(({ inv, status }) => {
                      const client = clientMap.get(inv.clientId);
                      return (
                        <li key={inv.id} className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3">
                          <div className="min-w-0 flex-1 basis-48">
                            <p className="truncate text-sm font-medium">
                              {client?.name ?? "Deleted client"} <span className="text-muted">· {inv.description}</span>
                            </p>
                            <p className="truncate text-xs text-muted">
                              {inv.number} ·{" "}
                              {status === "paid" && inv.paidOn ? `paid ${formatDate(inv.paidOn)}` : `due ${formatDate(inv.due)}`}
                            </p>
                          </div>
                          <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold capitalize ${STATUS_STYLE[status]}`}>{status}</span>
                          <p className="w-24 shrink-0 text-right text-sm font-semibold tabular-nums">{formatINR(inv.amount)}</p>
                          <div className="flex shrink-0 items-center">
                            {status === "paid" ? (
                              <Button variant="ghost" size="icon" aria-label={`Mark ${inv.number} unpaid`} title="Mark unpaid" onClick={() => setUnpaying(inv)}>
                                <Undo2 size={16} />
                              </Button>
                            ) : (
                              <Button variant="secondary" size="sm" onClick={() => setPaying(inv)} aria-label={`Mark ${inv.number} paid`}>
                                <BadgeCheck size={14} /> Paid
                              </Button>
                            )}
                            <Button variant="ghost" size="icon" aria-label={`Edit ${inv.number}`} onClick={() => setEditingInvoice(inv)}>
                              <Pencil size={16} />
                            </Button>
                            <Button variant="ghost" size="icon" aria-label={`Delete ${inv.number}`} onClick={() => setDeletingInvoice(inv)}>
                              <Trash2 size={16} />
                            </Button>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </Card>
              )}
            </section>

            <section className="min-w-0" aria-labelledby="clients-heading">
              <h2 id="clients-heading" className="mb-2 font-semibold">
                Clients
              </h2>
              <Card>
                <ul className="divide-y divide-border">
                  {clients.map((c) => {
                    const mine = invoices.filter((i) => i.clientId === c.id);
                    const billed = mine.reduce((s, i) => s + i.amount, 0);
                    const owed = mine.filter((i) => !i.paidOn).reduce((s, i) => s + i.amount, 0);
                    return (
                      <li key={c.id} className="flex items-center gap-2 py-2.5 pr-1.5 pl-4">
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{c.name}</p>
                          <p className="truncate text-xs text-muted">
                            {formatINR(billed)} billed{owed > 0 && <span className="text-warn"> · {formatINR(owed)} owed</span>}
                            {c.contact && ` · ${c.contact}`}
                          </p>
                        </div>
                        <Button variant="ghost" size="icon" aria-label={`Edit ${c.name}`} onClick={() => setEditingClient(c)}>
                          <Pencil size={15} />
                        </Button>
                        <Button variant="ghost" size="icon" aria-label={`Delete ${c.name}`} onClick={() => setDeletingClient(c)}>
                          <Trash2 size={15} />
                        </Button>
                      </li>
                    );
                  })}
                </ul>
              </Card>
            </section>
          </div>
        </>
      )}

      <Modal open={editingClient !== null} onClose={() => setEditingClient(null)} title={editingClient === "new" ? "Add client" : "Edit client"}>
        {editingClient !== null && (
          <ClientForm initial={editingClient === "new" ? undefined : editingClient} existing={clients} onDone={() => setEditingClient(null)} />
        )}
      </Modal>

      <Modal open={editingInvoice !== null} onClose={() => setEditingInvoice(null)} title={editingInvoice === "new" ? "New invoice" : "Edit invoice"}>
        {editingInvoice !== null && (
          <InvoiceForm
            initial={editingInvoice === "new" ? undefined : editingInvoice}
            clients={clients}
            number={editingInvoice === "new" ? nextInvoiceNumber(invoices) : editingInvoice.number}
            onDone={() => setEditingInvoice(null)}
          />
        )}
      </Modal>

      <Modal open={paying !== null} onClose={() => setPaying(null)} title={paying ? `Mark ${paying.number} paid` : ""}>
        {paying && (
          <PayForm
            invoice={paying}
            client={clientMap.get(paying.clientId)}
            income={categories.filter((c) => c.type === "income")}
            onDone={() => setPaying(null)}
          />
        )}
      </Modal>

      <ConfirmDialog
        open={unpaying !== null}
        title="Mark as unpaid?"
        message={unpaying && `The ${formatINR(unpaying.amount)} income added when ${unpaying.number} was paid will be removed from your transactions.`}
        confirmLabel="Mark unpaid"
        onConfirm={async () => {
          if (!unpaying) return;
          await db.transaction("rw", [db.invoices, db.transactions], async () => {
            if (unpaying.transactionId) await db.transactions.delete(unpaying.transactionId);
            await db.invoices.update(unpaying.id, { paidOn: undefined, transactionId: undefined });
          });
        }}
        onClose={() => setUnpaying(null)}
      />

      <ConfirmDialog
        open={deletingInvoice !== null}
        title={`Delete ${deletingInvoice?.number ?? "invoice"}?`}
        message={
          deletingInvoice?.paidOn
            ? "The invoice is removed. The income it added stays in your transactions, because you did receive that money."
            : "The invoice is removed. This can't be undone."
        }
        onConfirm={async () => {
          if (deletingInvoice) await db.invoices.delete(deletingInvoice.id);
        }}
        onClose={() => setDeletingInvoice(null)}
      />

      <ConfirmDialog
        open={deletingClient !== null}
        title={`Delete ${deletingClient?.name ?? "client"}?`}
        message={(() => {
          const n = deletingClient ? invoices.filter((i) => i.clientId === deletingClient.id).length : 0;
          return n > 0
            ? `Their ${n} ${n === 1 ? "invoice is" : "invoices are"} deleted too. Income from paid invoices stays in your transactions.`
            : "This client has no invoices.";
        })()}
        onConfirm={async () => {
          if (!deletingClient) return;
          await db.transaction("rw", [db.clients, db.invoices], async () => {
            await db.invoices.where("clientId").equals(deletingClient.id).delete();
            await db.clients.delete(deletingClient.id);
          });
        }}
        onClose={() => setDeletingClient(null)}
      />
    </>
  );
}

function Stat({ label, value, tone = "text-ink" }: { label: string; value: string; tone?: string }) {
  return (
    <Card className="min-w-0 p-3 sm:p-4">
      <p className="truncate text-xs font-medium text-muted">{label}</p>
      <p className={`mt-1 truncate text-base font-bold tabular-nums sm:text-xl ${tone}`}>{value}</p>
    </Card>
  );
}

function FormButtons({ onCancel, submit }: { onCancel: () => void; submit: string }) {
  return (
    <div className="flex justify-end gap-2 pt-2">
      <Button variant="secondary" onClick={onCancel}>
        Cancel
      </Button>
      <Button type="submit">{submit}</Button>
    </div>
  );
}

function ClientForm({ initial, existing, onDone }: { initial?: Client; existing: Client[]; onDone: () => void }) {
  const [name, setName] = useState(initial?.name ?? "");
  const [contact, setContact] = useState(initial?.contact ?? "");
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const n = name.trim();
    if (!n) return setError("Enter the client's name");
    if (existing.some((c) => c.id !== initial?.id && c.name.toLowerCase() === n.toLowerCase())) return setError(`You already have a client called “${n}”`);
    await db.clients.put({ id: initial?.id ?? newId(), name: n.slice(0, 60), contact: contact.trim().slice(0, 80) });
    onDone();
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      <Field label="Client name" htmlFor="cl-name" error={error}>
        <input id="cl-name" data-autofocus maxLength={60} value={name} onChange={(e) => (setName(e.target.value), setError(""))} className={inputClass} />
      </Field>
      <Field label="Contact" htmlFor="cl-contact" hint="Optional: email or phone">
        <input id="cl-contact" maxLength={80} value={contact} onChange={(e) => setContact(e.target.value)} className={inputClass} />
      </Field>
      <FormButtons onCancel={onDone} submit={initial ? "Save changes" : "Add client"} />
    </form>
  );
}

function addDays(iso: string, days: number) {
  const [y, m, d] = iso.split("-").map(Number);
  return toISODate(new Date(y, m - 1, d + days));
}

function InvoiceForm({ initial, clients, number, onDone }: { initial?: Invoice; clients: Client[]; number: string; onDone: () => void }) {
  const today = toISODate(new Date());
  const [clientId, setClientId] = useState(initial?.clientId ?? clients[0]?.id ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [amount, setAmount] = useState(initial ? String(initial.amount) : "");
  const [issued, setIssued] = useState(initial?.issued ?? today);
  const [due, setDue] = useState(initial?.due ?? addDays(today, 15));
  const [errors, setErrors] = useState<Record<string, string>>({});

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const errs: Record<string, string> = {};
    const value = Number(amount);
    if (!clientId) errs.client = "Pick a client";
    if (!description.trim()) errs.description = "Say what the invoice is for";
    if (!amount || !Number.isFinite(value) || value <= 0) errs.amount = "Enter an amount above ₹0";
    else if (value > 10_000_000) errs.amount = "That's more than ₹1 crore. Check the amount";
    if (!issued) errs.issued = "Pick a date";
    if (!due) errs.due = "Pick a due date";
    else if (issued && due < issued) errs.due = "Due date can't be before the issue date";
    setErrors(errs);
    if (Object.keys(errs).length) return;

    const inv: Invoice = { ...initial, id: initial?.id ?? newId(), number, clientId, description: description.trim().slice(0, 80), amount: Math.round(value * 100) / 100, issued, due };
    await db.transaction("rw", [db.invoices, db.transactions, db.clients], async () => {
      await db.invoices.put(inv);
      // Keep the income from a paid invoice in step with the invoice.
      if (inv.transactionId) {
        const client = await db.clients.get(clientId);
        await db.transactions.update(inv.transactionId, { amount: inv.amount, note: `${inv.number} · ${client?.name ?? ""}`.trim() });
      }
    });
    onDone();
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      <p className="text-sm text-ink-2">
        Invoice number <strong className="text-ink">{number}</strong>
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Client" htmlFor="inv-client" error={errors.client}>
          <select id="inv-client" value={clientId} onChange={(e) => setClientId(e.target.value)} className={inputClass}>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Amount (₹)" htmlFor="inv-amount" error={errors.amount}>
          <input id="inv-amount" type="number" inputMode="decimal" min="1" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} className={inputClass} />
        </Field>
      </div>
      <Field label="What it's for" htmlFor="inv-desc" error={errors.description}>
        <input id="inv-desc" data-autofocus maxLength={80} placeholder="e.g. Landing page design" value={description} onChange={(e) => setDescription(e.target.value)} className={inputClass} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Issued" htmlFor="inv-issued" error={errors.issued}>
          <input id="inv-issued" type="date" value={issued} onChange={(e) => setIssued(e.target.value)} className={inputClass} />
        </Field>
        <Field label="Due" htmlFor="inv-due" error={errors.due}>
          <input id="inv-due" type="date" min={issued} value={due} onChange={(e) => setDue(e.target.value)} className={inputClass} />
        </Field>
      </div>
      <FormButtons onCancel={onDone} submit={initial ? "Save changes" : "Create invoice"} />
    </form>
  );
}

function PayForm({ invoice, client, income, onDone }: { invoice: Invoice; client?: Client; income: Category[]; onDone: () => void }) {
  const [date, setDate] = useState(toISODate(new Date()));
  const [method, setMethod] = useState<PaymentMethod>("upi");
  const [categoryId, setCategoryId] = useState("");
  const [error, setError] = useState("");

  const chosen = categoryId || income.find((c) => c.id === "freelance")?.id || income[0]?.id || "";

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!date) return setError("Pick the date you were paid");
    if (!chosen) return setError("Add an income category in Settings first");
    const transactionId = newId();
    await db.transaction("rw", [db.invoices, db.transactions], async () => {
      await db.transactions.add({
        id: transactionId,
        type: "income",
        amount: invoice.amount,
        categoryId: chosen,
        date,
        method,
        note: `${invoice.number} · ${client?.name ?? "Client"}`.slice(0, 80),
      });
      await db.invoices.update(invoice.id, { paidOn: date, transactionId });
    });
    onDone();
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      <p className="flex items-start gap-2 rounded-lg bg-bg p-3 text-sm text-ink-2">
        <CircleDollarSign size={18} className="mt-0.5 shrink-0 text-income" />
        <span>
          <strong className="text-ink">{formatINR(invoice.amount)}</strong> from {client?.name ?? "this client"} will be added to your transactions as income.
        </span>
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Paid on" htmlFor="pay-date" error={error}>
          <input id="pay-date" data-autofocus type="date" value={date} onChange={(e) => (setDate(e.target.value), setError(""))} className={inputClass} />
        </Field>
        <Field label="Paid with" htmlFor="pay-method">
          <select id="pay-method" value={method} onChange={(e) => setMethod(e.target.value as PaymentMethod)} className={inputClass}>
            {Object.entries(METHOD_LABELS).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <Field label="Income category" htmlFor="pay-category">
        <select id="pay-category" value={chosen} onChange={(e) => setCategoryId(e.target.value)} className={inputClass}>
          {income.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </Field>
      <FormButtons onCancel={onDone} submit="Mark paid" />
    </form>
  );
}
