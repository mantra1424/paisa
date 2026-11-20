"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { useMemo } from "react";
import { db } from "@/lib/db";
import type { Category } from "@/types";

/** All categories, sorted by name. `undefined` while loading. */
export function useCategories() {
  return useLiveQuery(() => db.categories.toArray().then((cs) => cs.sort((a, b) => a.name.localeCompare(b.name))));
}

export function useCategoryMap(categories: Category[] | undefined) {
  return useMemo(() => new Map((categories ?? []).map((c) => [c.id, c])), [categories]);
}

export function useTransactions() {
  return useLiveQuery(() => db.transactions.toArray());
}
