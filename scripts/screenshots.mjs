// Regenerates the README screenshots. Start the app first (npm run dev), then:
//   node scripts/screenshots.mjs [baseURL]
import { chromium } from "@playwright/test";

const base = process.argv[2] ?? "http://localhost:3000";
const shots = [
  { file: "dashboard-light.png", path: "/", width: 1280, height: 860, theme: "light" },
  { file: "dashboard-dark.png", path: "/", width: 1280, height: 860, theme: "dark" },
  { file: "transactions.png", path: "/transactions", width: 1280, height: 800, theme: "light" },
  { file: "budgets-dark.png", path: "/budgets", width: 1280, height: 800, theme: "dark" },
  { file: "clients.png", path: "/clients", width: 1280, height: 720, theme: "light" },
  { file: "mobile-dashboard.png", path: "/", width: 390, height: 844, theme: "light", scale: 2 },
  { file: "mobile-goals-dark.png", path: "/goals", width: 390, height: 844, theme: "dark", scale: 2 },
];

const browser = await chromium.launch();
for (const s of shots) {
  const page = await browser.newPage({ viewport: { width: s.width, height: s.height }, deviceScaleFactor: s.scale ?? 1, colorScheme: s.theme });
  await page.goto(base + s.path);
  await page.getByRole("heading", { level: 1 }).waitFor();
  await page.waitForFunction(() => !document.body.innerText.includes("Loading"));
  await page.waitForTimeout(1800); // chart animations
  await page.screenshot({ path: `docs/screenshots/${s.file}` });
  await page.close();
  console.log("saved", s.file);
}
await browser.close();
