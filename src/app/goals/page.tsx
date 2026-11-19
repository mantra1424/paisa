import { ComingSoon, PageHeader } from "@/components/page-header";

export default function GoalsPage() {
  return (
    <>
      <PageHeader title="Savings goals" subtitle="Save up for the things that matter." />
      <ComingSoon
        day="Week 2 (Day 12–13)"
        items={["Create goals with a target and deadline", "Progress ring for each goal", "How much to save each month to stay on track"]}
      />
    </>
  );
}
