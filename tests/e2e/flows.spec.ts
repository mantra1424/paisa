import { expect, test, type Page } from "@playwright/test";

// Every test gets a fresh browser profile, so the app seeds its demo data on first load.
async function open(page: Page, path: string, heading: string) {
  await page.goto(path);
  await expect(page.getByRole("heading", { level: 1, name: heading })).toBeVisible();
  await expect(page.getByText("Loading")).toHaveCount(0);
}

test("add, edit and delete a transaction", async ({ page }) => {
  await open(page, "/transactions", "Transactions");

  await page.getByRole("button", { name: "Add transaction" }).click();
  const dialog = page.getByRole("dialog");

  // Empty amount is rejected
  await dialog.getByRole("button", { name: "Add transaction" }).click();
  await expect(dialog.getByText("Enter an amount")).toBeVisible();

  await dialog.getByLabel("Amount (₹)").fill("349");
  await dialog.getByLabel("Category").selectOption({ label: "Food & Dining" });
  await dialog.getByLabel("Paid with").selectOption({ label: "Cash" });
  await dialog.getByLabel("Note").fill("E2E thali");
  await dialog.getByRole("button", { name: "Add transaction" }).click();
  await expect(dialog).toBeHidden();

  await page.getByRole("searchbox").fill("E2E thali");
  const row = page.getByRole("listitem").filter({ hasText: "E2E thali" });
  await expect(row).toContainText("₹349");
  await expect(row).toContainText("Cash");

  await row.getByRole("button", { name: "Edit E2E thali" }).click();
  await dialog.getByLabel("Amount (₹)").fill("399");
  await dialog.getByRole("button", { name: "Save changes" }).click();
  await expect(row).toContainText("₹399");

  await row.getByRole("button", { name: "Delete E2E thali" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Delete" }).click();
  await expect(page.getByText("Nothing matches these filters")).toBeVisible();
});

test("set a budget and see the warning when it is nearly used", async ({ page }) => {
  await open(page, "/budgets", "Budgets");

  await page.getByRole("button", { name: "Add budget" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Category").selectOption({ label: "Education" });
  await dialog.getByLabel("Monthly limit (₹)").fill("100000");
  await dialog.getByRole("button", { name: "Add budget" }).click();
  await expect(dialog).toBeHidden();

  const bar = page.getByRole("progressbar", { name: "Education budget used" });
  const card = page.locator("div").filter({ has: bar }).last();
  await expect(card).toContainText("of ₹1,00,000");
  await expect(bar).toBeVisible();

  // Lower the limit to just above this month's spend: the card should warn.
  const spentText = (await card.textContent()) ?? "";
  const spent = Number(/₹([\d,]+) of/.exec(spentText)?.[1].replace(/,/g, "") ?? 0);
  test.skip(spent === 0, "No Education spending in the demo data this month");
  await card.getByRole("button", { name: "Edit Education budget" }).click();
  await dialog.getByLabel("Monthly limit (₹)").fill(String(Math.ceil(spent / 0.9)));
  await dialog.getByRole("button", { name: "Save changes" }).click();
  const banner = page.getByRole("alert").filter({ hasText: "Nearly there (80%+):" });
  await expect(banner).toContainText(/Nearly there \(80%\+\):[^.]*Education/);
});

test("export transactions to CSV", async ({ page }) => {
  await open(page, "/settings", "Settings");

  const [download] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "Export CSV" }).click()]);
  expect(download.suggestedFilename()).toMatch(/^paisa-transactions-\d{4}-\d{2}-\d{2}\.csv$/);

  const stream = await download.createReadStream();
  const chunks: Buffer[] = [];
  for await (const c of stream) chunks.push(c as Buffer);
  const lines = Buffer.concat(chunks).toString("utf8").replace(/^﻿/, "").trim().split(/\r\n/);

  expect(lines[0]).toBe("date,type,amount,category,method,note");
  expect(lines.length - 1).toBeGreaterThan(100);
  await expect(page.getByRole("status")).toContainText(`Exported ${lines.length - 1} transactions`);
});

test("create a savings goal and add money to it", async ({ page }) => {
  await open(page, "/goals", "Savings goals");

  await page.getByRole("button", { name: "New goal" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("What are you saving for?").fill("E2E bike");
  await dialog.getByLabel("Target (₹)").fill("12000");
  const next = new Date();
  next.setFullYear(next.getFullYear() + 1);
  await dialog.getByLabel("Target date").fill(next.toISOString().slice(0, 10));
  await dialog.getByRole("button", { name: "Create goal" }).click();

  const card = page.locator("div").filter({ hasText: "E2E bike" }).filter({ has: page.getByRole("button", { name: "Add or withdraw" }) }).last();
  await expect(card).toContainText("₹0 of ₹12,000");

  await card.getByRole("button", { name: "Add or withdraw" }).click();
  await dialog.getByLabel("Amount (₹)").fill("12000");
  await dialog.getByRole("button", { name: "Add money" }).last().click();
  await expect(card).toContainText("Goal reached");
});

test("currency format changes how every amount is shown", async ({ page }) => {
  await open(page, "/transactions", "Transactions");
  await page.getByRole("button", { name: "Add transaction" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("radio", { name: "income" }).check({ force: true });
  await dialog.getByLabel("Amount (₹)").fill("150000.25");
  await dialog.getByLabel("Note").fill("E2E big payment");
  await dialog.getByRole("button", { name: "Add transaction" }).click();
  await page.getByRole("searchbox").fill("E2E big payment");
  await expect(page.getByRole("listitem").filter({ hasText: "E2E big payment" })).toContainText("₹1,50,000.25");

  await page.getByRole("link", { name: "Settings" }).filter({ visible: true }).click();
  await page.getByRole("radio", { name: /International/ }).click();
  await page.getByRole("radio", { name: /Round/ }).click();

  await page.getByRole("link", { name: "Transactions" }).filter({ visible: true }).click();
  await page.getByRole("searchbox").fill("E2E big payment");
  await expect(page.getByRole("listitem").filter({ hasText: "E2E big payment" })).toContainText("₹150,000");

  // The choice is remembered after a reload.
  await page.reload();
  await page.getByRole("searchbox").fill("E2E big payment");
  await expect(page.getByRole("listitem").filter({ hasText: "E2E big payment" })).toContainText("+₹150,000");
});

test("invoice a client, mark it paid, and see the income", async ({ page }) => {
  await open(page, "/clients", "Clients & invoices");

  await page.getByRole("button", { name: "Add client" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Client name").fill("E2E Cafe");
  await dialog.getByRole("button", { name: "Add client" }).click();
  await expect(page.getByRole("listitem").filter({ hasText: "E2E Cafe" })).toBeVisible();

  await page.getByRole("button", { name: "New invoice" }).click();
  await dialog.getByLabel("Client").selectOption({ label: "E2E Cafe" });
  await dialog.getByLabel("What it's for").fill("Menu card design");
  await dialog.getByLabel("Amount (₹)").fill("4200");
  await dialog.getByRole("button", { name: "Create invoice" }).click();

  const row = page.getByRole("listitem").filter({ hasText: "Menu card design" });
  await expect(row).toContainText(/pending/i);
  await expect(row).toContainText("₹4,200");
  const number = /INV-\d{4}/.exec((await row.textContent()) ?? "")?.[0] ?? "";

  await row.getByRole("button", { name: `Mark ${number} paid` }).click();
  await dialog.getByRole("button", { name: "Mark paid" }).click();
  await page.getByRole("tab", { name: /^paid/i }).click();
  await expect(page.getByRole("listitem").filter({ hasText: "Menu card design" })).toContainText(/paid \d/i);

  // The payment shows up as income in Transactions.
  await page.getByRole("link", { name: "Transactions" }).filter({ visible: true }).click();
  await page.getByRole("searchbox").fill(number);
  await expect(page.getByRole("listitem").filter({ hasText: `${number} · E2E Cafe` })).toContainText("+₹4,200");

  // Marking it unpaid again removes that income.
  await page.getByRole("link", { name: "Clients" }).filter({ visible: true }).click();
  await page.getByRole("tab", { name: /^paid/i }).click();
  await page.getByRole("button", { name: `Mark ${number} unpaid` }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Mark unpaid" }).click();
  await page.getByRole("link", { name: "Transactions" }).filter({ visible: true }).click();
  await page.getByRole("searchbox").fill(number);
  await expect(page.getByText("Nothing matches these filters")).toBeVisible();
});
