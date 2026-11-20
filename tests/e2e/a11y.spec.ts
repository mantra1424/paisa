import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const pages = [
  { path: "/", heading: "Dashboard" },
  { path: "/transactions", heading: "Transactions" },
  { path: "/budgets", heading: "Budgets" },
  { path: "/goals", heading: "Savings goals" },
  { path: "/clients", heading: "Clients & invoices" },
  { path: "/settings", heading: "Settings" },
];

for (const theme of ["light", "dark"] as const) {
  test.describe(`${theme} theme`, () => {
    test.use({ colorScheme: theme });

    for (const p of pages) {
      test(`${p.heading} has no WCAG 2 AA violations`, async ({ page }) => {
        await page.goto(p.path);
        await expect(page.getByRole("heading", { level: 1, name: p.heading })).toBeVisible();
        await expect(page.getByText("Loading")).toHaveCount(0);
        await page.waitForTimeout(1200); // let chart animations finish

        const { violations } = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
        const summary = violations.map((v) => `${v.id} (${v.impact}): ${v.nodes.length}× e.g. ${v.nodes[0]?.target.join(" ")} — ${v.nodes[0]?.failureSummary?.split("\n")[1] ?? ""}`);
        expect(summary).toEqual([]);
      });
    }
  });
}
