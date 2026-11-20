"use client";

import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { CalendarClock, CheckCircle2, Pencil, Plus, Target, Trash2, Wallet } from "lucide-react";
import { db, newId } from "@/lib/db";
import { formatDate, formatINR, toISODate } from "@/lib/format";
import { goalInfo } from "@/lib/calculations";
import { PageHeader } from "@/components/page-header";
import { Button, Card, ConfirmDialog, EmptyState, Field, Modal, inputClass } from "@/components/ui";
import type { Goal } from "@/types";

export default function GoalsPage() {
  const goals = useLiveQuery(() => db.goals.toArray());
  const [editing, setEditing] = useState<Goal | "new" | null>(null);
  const [funding, setFunding] = useState<Goal | null>(null);
  const [deleting, setDeleting] = useState<Goal | null>(null);

  if (!goals) return <p className="text-sm text-muted">Loading…</p>;

  const order = { active: 0, overdue: 1, done: 2 };
  const rows = goals
    .map((g) => ({ goal: g, info: goalInfo(g) }))
    .sort((a, b) => order[a.info.status] - order[b.info.status] || a.goal.deadline.localeCompare(b.goal.deadline));
  const saved = goals.reduce((s, g) => s + g.saved, 0);
  const target = goals.reduce((s, g) => s + g.target, 0);
  const monthly = rows.filter((r) => r.info.status === "active").reduce((s, r) => s + r.info.perMonth, 0);

  return (
    <>
      <PageHeader
        title="Savings goals"
        subtitle="Save up for the things that matter."
        action={
          goals.length > 0 && (
            <Button onClick={() => setEditing("new")}>
              <Plus size={16} /> New goal
            </Button>
          )
        }
      />

      {goals.length === 0 ? (
        <EmptyState
          icon={<Target size={22} />}
          title="No savings goals yet"
          text="A laptop, a trip, an emergency fund: set a target and a date, and Paisa works out how much to put aside each month."
          action={
            <Button onClick={() => setEditing("new")}>
              <Plus size={16} /> Create your first goal
            </Button>
          }
        />
      ) : (
        <>
          <div className="mb-4 grid grid-cols-3 gap-2 sm:gap-3">
            <Stat label="Saved so far" value={formatINR(saved)} tone="text-income" />
            <Stat label="Total target" value={formatINR(target)} />
            <Stat label="Per month" value={formatINR(monthly)} />
          </div>

          <div className="grid gap-3 lg:grid-cols-2 2xl:grid-cols-3">
            {rows.map(({ goal, info }) => (
              <Card key={goal.id} className="flex flex-col p-4">
                <div className="flex items-start gap-4">
                  <ProgressRing pct={info.pct} done={info.status === "done"} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{goal.name}</p>
                    <p className="text-sm text-ink-2 tabular-nums">
                      {formatINR(goal.saved)} of {formatINR(goal.target)}
                    </p>
                    <p className="mt-1 flex items-center gap-1 text-xs text-muted">
                      <CalendarClock size={12} /> by {formatDate(goal.deadline)}
                    </p>
                  </div>
                </div>

                <div
                  className={`mt-4 rounded-lg px-3 py-2 text-sm ${
                    info.status === "done" ? "bg-income/10 text-income" : info.status === "overdue" ? "bg-danger/10 text-danger" : "bg-bg text-ink-2"
                  }`}
                >
                  {info.status === "done" ? (
                    <span className="flex items-center gap-1.5 font-semibold">
                      <CheckCircle2 size={16} /> Goal reached. Well done!
                    </span>
                  ) : info.status === "overdue" ? (
                    <>
                      Deadline passed with <strong>{formatINR(info.remaining)}</strong> to go. Edit the date to make a new plan.
                    </>
                  ) : (
                    <>
                      Save <strong className="text-ink tabular-nums">{formatINR(info.perMonth)}/month</strong> for {info.monthsLeft}{" "}
                      {info.monthsLeft === 1 ? "month" : "months"} to reach it.
                    </>
                  )}
                </div>

                <div className="mt-3 flex items-center gap-1 pt-1">
                  <Button variant="secondary" size="sm" onClick={() => setFunding(goal)}>
                    <Wallet size={14} /> Add or withdraw
                  </Button>
                  <span className="flex-1" />
                  <Button variant="ghost" size="icon" aria-label={`Edit ${goal.name}`} onClick={() => setEditing(goal)}>
                    <Pencil size={16} />
                  </Button>
                  <Button variant="ghost" size="icon" aria-label={`Delete ${goal.name}`} onClick={() => setDeleting(goal)}>
                    <Trash2 size={16} />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </>
      )}

      <Modal open={editing !== null} onClose={() => setEditing(null)} title={editing === "new" ? "New savings goal" : "Edit goal"}>
        {editing !== null && <GoalForm initial={editing === "new" ? undefined : editing} onDone={() => setEditing(null)} />}
      </Modal>

      <Modal open={funding !== null} onClose={() => setFunding(null)} title={funding ? `Update ${funding.name}` : ""}>
        {funding && <FundForm goal={funding} onDone={() => setFunding(null)} />}
      </Modal>

      <ConfirmDialog
        open={deleting !== null}
        title="Delete goal?"
        message={deleting && `“${deleting.name}” and its progress (${formatINR(deleting.saved)} saved) will be removed.`}
        onConfirm={async () => {
          if (deleting) await db.goals.delete(deleting.id);
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
      <p className={`mt-1 truncate text-base font-bold tabular-nums sm:text-xl ${tone}`}>{value}</p>
    </Card>
  );
}

function ProgressRing({ pct, done }: { pct: number; done: boolean }) {
  const r = 28;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative h-[72px] w-[72px] shrink-0" role="img" aria-label={`${Math.round(pct)}% saved`}>
      <svg viewBox="0 0 72 72" className="h-full w-full -rotate-90">
        <circle cx="36" cy="36" r={r} fill="none" strokeWidth="7" className="stroke-bg" />
        <circle
          cx="36"
          cy="36"
          r={r}
          fill="none"
          strokeWidth="7"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - pct / 100)}
          className={`transition-[stroke-dashoffset] duration-500 ${done ? "stroke-income" : "stroke-brand"}`}
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-sm font-bold tabular-nums">{Math.round(pct)}%</span>
    </div>
  );
}

function parseAmount(raw: string, { allowZero = false } = {}): number | string {
  const n = Number(raw);
  if (raw.trim() === "" || !Number.isFinite(n)) return "Enter an amount";
  if (n < 0 || (!allowZero && n === 0)) return allowZero ? "Can't be negative" : "Must be more than ₹0";
  if (n > 100_000_000) return "That's more than ₹10 crore. Check the amount";
  return Math.round(n);
}

function GoalForm({ initial, onDone }: { initial?: Goal; onDone: () => void }) {
  const today = toISODate(new Date());
  const [name, setName] = useState(initial?.name ?? "");
  const [target, setTarget] = useState(initial ? String(initial.target) : "");
  const [saved, setSaved] = useState(initial ? String(initial.saved) : "0");
  const [deadline, setDeadline] = useState(initial?.deadline ?? "");
  const [errors, setErrors] = useState<Record<string, string>>({});

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const errs: Record<string, string> = {};
    const t = parseAmount(target);
    const s = parseAmount(saved, { allowZero: true });
    if (!name.trim()) errs.name = "Give the goal a name";
    else if (name.trim().length > 40) errs.name = "Keep it under 40 characters";
    if (typeof t === "string") errs.target = t;
    if (typeof s === "string") errs.saved = s;
    if (!deadline) errs.deadline = "Pick a target date";
    else if (!initial && deadline <= today) errs.deadline = "Pick a date in the future";
    setErrors(errs);
    if (Object.keys(errs).length) return;
    await db.goals.put({ id: initial?.id ?? newId(), name: name.trim(), target: t as number, saved: s as number, deadline });
    onDone();
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      <Field label="What are you saving for?" htmlFor="g-name" error={errors.name}>
        <input id="g-name" data-autofocus maxLength={40} placeholder="e.g. New laptop" value={name} onChange={(e) => setName(e.target.value)} className={inputClass} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Target (₹)" htmlFor="g-target" error={errors.target}>
          <input id="g-target" type="number" inputMode="numeric" min="1" value={target} onChange={(e) => setTarget(e.target.value)} className={inputClass} />
        </Field>
        <Field label="Already saved (₹)" htmlFor="g-saved" error={errors.saved}>
          <input id="g-saved" type="number" inputMode="numeric" min="0" value={saved} onChange={(e) => setSaved(e.target.value)} className={inputClass} />
        </Field>
      </div>
      <Field label="Target date" htmlFor="g-deadline" error={errors.deadline}>
        <input id="g-deadline" type="date" min={initial ? undefined : today} value={deadline} onChange={(e) => setDeadline(e.target.value)} className={inputClass} />
      </Field>
      <div className="flex justify-end gap-2 pt-2">
        <Button variant="secondary" onClick={onDone}>
          Cancel
        </Button>
        <Button type="submit">{initial ? "Save changes" : "Create goal"}</Button>
      </div>
    </form>
  );
}

function FundForm({ goal, onDone }: { goal: Goal; onDone: () => void }) {
  const [mode, setMode] = useState<"add" | "withdraw">("add");
  const [amount, setAmount] = useState("");
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const n = parseAmount(amount);
    if (typeof n === "string") return setError(n);
    if (mode === "withdraw" && n > goal.saved) return setError(`You can withdraw at most ${formatINR(goal.saved)}`);
    await db.goals.update(goal.id, { saved: mode === "add" ? goal.saved + n : goal.saved - n });
    onDone();
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      <p className="text-sm text-ink-2">
        Saved so far: <strong className="text-ink">{formatINR(goal.saved)}</strong> of {formatINR(goal.target)}
      </p>
      <div className="grid grid-cols-2 gap-1 rounded-lg bg-bg p-1" role="radiogroup" aria-label="Add or withdraw">
        {(["add", "withdraw"] as const).map((m) => (
          <button
            key={m}
            type="button"
            role="radio"
            aria-checked={mode === m}
            onClick={() => (setMode(m), setError(""))}
            className={`rounded-md py-2 text-sm font-semibold ${mode === m ? "bg-surface text-ink shadow-sm" : "text-muted"}`}
          >
            {m === "add" ? "Add money" : "Withdraw"}
          </button>
        ))}
      </div>
      <Field label="Amount (₹)" htmlFor="f-amount" error={error}>
        <input
          id="f-amount"
          type="number"
          inputMode="numeric"
          min="1"
          data-autofocus
          value={amount}
          onChange={(e) => (setAmount(e.target.value), setError(""))}
          aria-invalid={!!error}
          className={inputClass}
        />
      </Field>
      <div className="flex justify-end gap-2 pt-2">
        <Button variant="secondary" onClick={onDone}>
          Cancel
        </Button>
        <Button type="submit">{mode === "add" ? "Add money" : "Withdraw"}</Button>
      </div>
    </form>
  );
}
