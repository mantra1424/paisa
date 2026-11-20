import { expect, test } from "@playwright/test";

const pages = [
  { path: "/", heading: "Dashboard" },
  { path: "/transactions", heading: "Transactions" },
  { path: "/budgets", heading: "Budgets" },
  { path: "/goals", heading: "Savings goals" },
  { path: "/clients", heading: "Clients & invoices" },
  { path: "/settings", heading: "Settings" },
];
const sizes = [
  { name: "mobile", width: 375, height: 812 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "desktop", width: 1280, height: 800 },
];

for (const size of sizes) {
  test.describe(`${size.name} ${size.width}px`, () => {
    test.use({ viewport: { width: size.width, height: size.height } });

    for (const p of pages) {
      test(`${p.heading}: no sideways scroll, no placeholders`, async ({ page }) => {
        const errors: string[] = [];
        page.on("pageerror", (e) => errors.push(e.message));

        await page.goto(p.path);
        await expect(page.getByRole("heading", { level: 1, name: p.heading })).toBeVisible();
        await expect(page.getByText("Loading")).toHaveCount(0);

        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
        expect(overflow, "page scrolls sideways").toBeLessThanOrEqual(0);
        await expect(page.getByText(/coming soon|planned for/i)).toHaveCount(0);

        // Mobile shows the bottom tab bar, larger screens the sidebar.
        const nav = page.getByRole("navigation", { name: "Main" });
        await expect(nav.filter({ visible: true })).toHaveCount(1);
        expect(errors).toEqual([]);
      });
    }
  });
}
