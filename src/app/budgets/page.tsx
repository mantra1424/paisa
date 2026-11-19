import { ComingSoon, PageHeader } from "@/components/page-header";

export default function BudgetsPage() {
  return (
    <>
      <PageHeader title="Budgets" subtitle="Set a monthly limit for each category." />
      <ComingSoon
        day="Week 2 (Day 10–11)"
        items={["Monthly limit per category", "Progress bars with a warning at 80%", "Alert when a budget is exceeded"]}
      />
    </>
  );
}
