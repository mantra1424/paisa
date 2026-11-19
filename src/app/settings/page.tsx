"use client";

import { useState } from "react";
import { loadDemoData } from "@/lib/demo-data";
import { ComingSoon, PageHeader } from "@/components/page-header";

export default function SettingsPage() {
  const [status, setStatus] = useState<"idle" | "working" | "done">("idle");

  async function resetDemo() {
    if (!confirm("Replace all data on this device with fresh demo data?")) return;
    setStatus("working");
    await loadDemoData();
    setStatus("done");
  }

  return (
    <>
      <PageHeader title="Settings" subtitle="Theme, categories and your data." />

      <section className="mb-6 rounded-xl border border-border bg-surface p-5">
        <h2 className="font-semibold">Demo data</h2>
        <p className="mt-1 text-sm text-ink-2">Reload six months of sample transactions, budgets and goals.</p>
        <button
          type="button"
          onClick={resetDemo}
          disabled={status === "working"}
          className="mt-4 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-brand-ink hover:opacity-90 disabled:opacity-60"
        >
          {status === "working" ? "Loading…" : "Load demo data"}
        </button>
        <p role="status" className="mt-2 text-sm text-income">
          {status === "done" ? "Demo data loaded." : ""}
        </p>
      </section>

      <ComingSoon
        day="Week 2 (Day 14)"
        items={["Add, rename and recolour categories", "Export to CSV and import from CSV", "Reset all data"]}
      />
    </>
  );
}
