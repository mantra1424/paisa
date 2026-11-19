# Paisa

A private personal-finance dashboard for students and freelancers in India. Track spending, monthly budgets and savings goals in ₹. All data stays in your browser (IndexedDB): no sign-up, no backend, no API keys.

## Run it

```bash
npm install
npm run dev
```

Then open http://localhost:3000. Six months of demo data load on first visit.

## Tech

- Next.js (App Router) + TypeScript
- Tailwind CSS (light and dark themes)
- Dexie.js on IndexedDB for local storage
- Recharts, React Hook Form + Zod, lucide-react

## Project structure

```
src/
  app/          pages: dashboard, transactions, budgets, goals, settings
  components/   layout (sidebar, mobile tab bar, theme toggle) and shared UI
  lib/          db.ts (Dexie), demo-data.ts, format.ts
  types/        shared TypeScript types
```

## Roadmap

- [x] Day 1: project setup, responsive layout, dark mode, local database and demo data
- [ ] Transactions: add/edit/delete, filters, search, sort
- [ ] Dashboard charts
- [ ] Budgets and savings goals
- [ ] CSV import/export, categories
- [ ] Tests (Vitest + Playwright)
