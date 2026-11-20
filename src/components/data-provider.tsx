"use client";

import { Fragment, useEffect, useState } from "react";
import { seedIfEmpty } from "@/lib/demo-data";
import { CURRENCY_EVENT, loadCurrencyPrefs } from "@/lib/format";

/**
 * Makes sure the database has demo data and the saved currency format is loaded
 * before any page reads from them.
 */
export function DataProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Bumped when the currency format changes; the key below redraws every amount on the page.
  const [formatVersion, setFormatVersion] = useState(0);

  useEffect(() => {
    loadCurrencyPrefs();
    seedIfEmpty()
      .then(() => setReady(true))
      .catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)));

    const bump = () => setFormatVersion((v) => v + 1);
    window.addEventListener(CURRENCY_EVENT, bump);
    return () => window.removeEventListener(CURRENCY_EVENT, bump);
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
  return <Fragment key={formatVersion}>{children}</Fragment>;
}
