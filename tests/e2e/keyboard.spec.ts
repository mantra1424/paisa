import { expect, test } from "@playwright/test";

test("skip link jumps past the navigation", async ({ page }) => {
  await page.goto("/transactions");
  await expect(page.getByRole("heading", { level: 1, name: "Transactions" })).toBeVisible();
  await page.keyboard.press("Tab");
  const skip = page.getByRole("link", { name: "Skip to content" });
  await expect(skip).toBeFocused();
  await expect(skip).toBeVisible();
  await page.keyboard.press("Enter");
  await expect(page.locator("main")).toBeFocused();
});

test("add a transaction using only the keyboard", async ({ page }) => {
  await page.goto("/transactions");
  await expect(page.getByRole("heading", { level: 1, name: "Transactions" })).toBeVisible();
  await expect(page.getByText("Loading")).toHaveCount(0);

  // N opens the form with the amount field focused; Escape closes it again.
  await page.keyboard.press("n");
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByLabel("Amount (₹)")).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();

  await page.keyboard.press("n");
  await page.keyboard.type("120");
  await dialog.getByLabel("Note").focus();
  await page.keyboard.type("Keyboard chai");
  await page.keyboard.press("Enter");
  await expect(dialog).toBeHidden();

  // / jumps to search.
  await page.keyboard.press("/");
  await expect(page.getByRole("searchbox")).toBeFocused();
  await page.keyboard.type("Keyboard chai");
  await expect(page.getByRole("listitem").filter({ hasText: "Keyboard chai" })).toContainText("₹120");
});
