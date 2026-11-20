"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { db, newId } from "@/lib/db";
import { toISODate } from "@/lib/format";
import type { Category, Transaction } from "@/types";
import { Button, Field, inputClass } from "./ui";

export const METHOD_LABELS = { upi: "UPI", card: "Card", cash: "Cash", bank: "Bank transfer" } as const;

const schema = z.object({
  type: z.enum(["income", "expense"]),
  amount: z
    .number({ error: "Enter an amount" })
    .positive("Amount must be more than ₹0")
    .max(10_000_000, "That's more than ₹1 crore. Check the amount")
    .refine((n) => Math.round(n * 100) === n * 100, "Use at most 2 decimal places"),
  categoryId: z.string().min(1, "Pick a category"),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a date"),
  method: z.enum(["upi", "card", "cash", "bank"]),
  note: z.string().trim().max(80, "Keep the note under 80 characters"),
});

type FormValues = z.infer<typeof schema>;

export function TransactionForm({
  categories,
  initial,
  onDone,
}: {
  categories: Category[];
  initial?: Transaction;
  onDone: () => void;
}) {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: initial
      ? { type: initial.type, amount: initial.amount, categoryId: initial.categoryId, date: initial.date, method: initial.method, note: initial.note }
      : { type: "expense", categoryId: categories.find((c) => c.type === "expense")?.id ?? "", date: toISODate(new Date()), method: "upi", note: "" },
  });

  const type = watch("type");
  const options = categories.filter((c) => c.type === type);

  // Switching between income and expense must also switch to a matching category.
  useEffect(() => {
    const matching = categories.filter((c) => c.type === type);
    const current = getValues("categoryId");
    if (!matching.some((c) => c.id === current)) setValue("categoryId", matching[0]?.id ?? "");
  }, [type, categories, getValues, setValue]);

  async function onSubmit(values: FormValues) {
    const tx: Transaction = { id: initial?.id ?? newId(), ...values, note: values.note.trim() };
    await db.transactions.put(tx);
    onDone();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
      <fieldset>
        <legend className="mb-1.5 text-sm font-medium">Type</legend>
        <div className="grid grid-cols-2 gap-1 rounded-lg bg-bg p-1">
          {(["expense", "income"] as const).map((t) => (
            <label
              key={t}
              className={`cursor-pointer rounded-md py-2 text-center text-sm font-semibold capitalize has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-brand ${
                type === t ? (t === "income" ? "bg-surface text-income shadow-sm" : "bg-surface text-expense shadow-sm") : "text-muted"
              }`}
            >
              <input type="radio" value={t} {...register("type")} className="sr-only" />
              {t}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Amount (₹)" htmlFor="tx-amount" error={errors.amount?.message}>
          <input
            id="tx-amount"
            type="number"
            inputMode="decimal"
            step="0.01"
            min="0"
            placeholder="0"
            data-autofocus
            aria-invalid={!!errors.amount}
            className={inputClass}
            {...register("amount", { valueAsNumber: true })}
          />
        </Field>
        <Field label="Date" htmlFor="tx-date" error={errors.date?.message}>
          <input id="tx-date" type="date" className={inputClass} aria-invalid={!!errors.date} {...register("date")} />
        </Field>
        <Field label="Category" htmlFor="tx-category" error={errors.categoryId?.message}>
          <select id="tx-category" className={inputClass} aria-invalid={!!errors.categoryId} {...register("categoryId")}>
            {options.length === 0 && <option value="">No {type} categories yet</option>}
            {options.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Paid with" htmlFor="tx-method" error={errors.method?.message}>
          <select id="tx-method" className={inputClass} {...register("method")}>
            {Object.entries(METHOD_LABELS).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <Field label="Note" htmlFor="tx-note" error={errors.note?.message} hint="Optional, e.g. “Swiggy order”">
        <input id="tx-note" type="text" maxLength={80} className={inputClass} {...register("note")} />
      </Field>

      <div className="flex justify-end gap-2 pt-2">
        <Button variant="secondary" onClick={onDone}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {initial ? "Save changes" : "Add transaction"}
        </Button>
      </div>
    </form>
  );
}
