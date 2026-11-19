export type TxType = "income" | "expense";
export type PaymentMethod = "upi" | "card" | "cash" | "bank";

export interface Category {
  id: string;
  name: string;
  type: TxType;
  /** Tailwind-friendly hex colour used for chart slices and badges */
  color: string;
}

export interface Transaction {
  id: string;
  type: TxType;
  /** Amount in rupees. Always positive; `type` says which way it flows. */
  amount: number;
  categoryId: string;
  /** ISO date, YYYY-MM-DD */
  date: string;
  note: string;
  method: PaymentMethod;
}

export interface Budget {
  id: string;
  categoryId: string;
  /** Month the budget applies to, YYYY-MM */
  month: string;
  limit: number;
}

export interface Goal {
  id: string;
  name: string;
  target: number;
  saved: number;
  /** ISO date, YYYY-MM-DD */
  deadline: string;
}
