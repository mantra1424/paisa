"use client";

import { useEffect, useState } from "react";
import { seedIfEmpty } from "@/lib/demo-data";

/** Makes sure the database has demo data before any page reads from it. */
export function DataProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    seedIfEmpty()
      .then(() => setReady(true))
      .catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)));
  }, []);

  if (error) {
    return (
      <div role="alert" className="rounded-xl border border-border bg-surface p-6">
        <p className="font-semibold">Couldn&apos;t open local storage</p>
        <p className="mt-1 text-sm text-ink-2">
          Paisa keeps your data in this browser. Private browsing or blocked site data can stop that. ({error})
        </p>
      </div>
    );
  }
  if (!ready) {
    return <p className="text-sm text-muted">Loading your data…</p>;
  }
  return <>{children}</>;
}
