import { ComingSoon, PageHeader } from "@/components/page-header";

export default function TransactionsPage() {
  return (
    <>
      <PageHeader title="Transactions" subtitle="Every rupee in and out." />
      <ComingSoon
        day="Week 1 (Day 3–6)"
        items={[
          "Add / edit / delete income and expenses (React Hook Form + Zod)",
          "Filters: date range, category, type, payment method",
          "Search by note, sort by date or amount, pagination",
        ]}
      />
    </>
  );
}
