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

export interface Client {
  id: string;
  name: string;
  /** Email, phone or anything that helps you reach them. Optional. */
  contact: string;
}

export interface Invoice {
  id: string;
  clientId: string;
  /** e.g. "INV-0007" */
  number: string;
  description: string;
  amount: number;
  /** ISO dates, YYYY-MM-DD */
  issued: string;
  due: string;
  /** Set once the client pays. */
  paidOn?: string;
  /** The income transaction created when it was marked paid. */
  transactionId?: string;
}
