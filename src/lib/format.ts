export type DigitGrouping = "indian" | "international";
export interface CurrencyPrefs {
  /** "indian" -> ₹1,25,000 · "international" -> ₹125,000 */
  grouping: DigitGrouping;
  /** true -> ₹249.50 · false -> ₹250 */
  paise: boolean;
}

export const CURRENCY_KEY = "paisa-currency";
export const CURRENCY_EVENT = "paisa-currencychange";
export const DEFAULT_CURRENCY: CurrencyPrefs = { grouping: "indian", paise: true };

let prefs: CurrencyPrefs = DEFAULT_CURRENCY;
let whole: Intl.NumberFormat;
let withPaise: Intl.NumberFormat;

function build() {
  const locale = prefs.grouping === "indian" ? "en-IN" : "en-US";
  whole = new Intl.NumberFormat(locale, { style: "currency", currency: "INR", maximumFractionDigits: 0 });
  withPaise = new Intl.NumberFormat(locale, { style: "currency", currency: "INR", minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
build();

export function getCurrencyPrefs(): CurrencyPrefs {
  return prefs;
}

/** Apply new preferences everywhere; `save` also remembers them on this device. */
export function setCurrencyPrefs(next: CurrencyPrefs, save = true) {
  prefs = next;
  build();
  if (typeof window === "undefined") return;
  if (save) {
    try {
      localStorage.setItem(CURRENCY_KEY, JSON.stringify(next));
    } catch {
      /* storage blocked: the choice still applies for this visit */
    }
  }
  window.dispatchEvent(new Event(CURRENCY_EVENT));
}

/** Read saved preferences once, before the first page renders. */
export function loadCurrencyPrefs() {
  try {
    const saved = JSON.parse(localStorage.getItem(CURRENCY_KEY) ?? "null") as Partial<CurrencyPrefs> | null;
    if (saved && (saved.grouping === "indian" || saved.grouping === "international") && typeof saved.paise === "boolean") {
      prefs = { grouping: saved.grouping, paise: saved.paise };
      build();
    }
  } catch {
    /* ignore and keep the defaults */
  }
}

/** 125000 -> "₹1,25,000"; 249.5 -> "₹249.50" (or "₹250" with paise off) */
export function formatINR(amount: number): string {
  return prefs.paise && !Number.isInteger(amount) ? withPaise.format(amount) : whole.format(amount);
}

/** "2026-11-19" -> "19 Nov 2026" */
export function formatDate(iso: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/** Local date as YYYY-MM-DD */
export function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
