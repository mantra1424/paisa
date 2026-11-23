"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Lock, Settings } from "lucide-react";
import { Logo } from "./logo";
import { MOBILE_TABS, NAV_ITEMS } from "./nav-items";
import { ThemeToggle } from "./theme-toggle";

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-dvh md:flex">
      <a
        href="#main"
        className="sr-only z-50 rounded-lg bg-brand px-4 py-2 font-semibold text-brand-ink focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        Skip to content
      </a>
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r border-border bg-surface p-4 md:flex">
        <Link href="/" aria-label="Paisa home" className="mb-8 rounded-md px-2 focus-visible:outline-2 focus-visible:outline-brand">
          <Logo />
        </Link>
        <nav aria-label="Main" className="flex flex-1 flex-col gap-1">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const active = isActive(pathname, href);
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={`relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-brand ${
                  active
                    ? "bg-brand/10 font-semibold text-brand before:absolute before:top-2 before:bottom-2 before:-left-4 before:w-1 before:rounded-r before:bg-brand"
                    : "font-medium text-ink-2 hover:bg-bg hover:text-ink"
                }`}
              >
                <Icon size={18} />
                {label}
              </Link>
            );
          })}
        </nav>
        <div className="flex items-end justify-between gap-3 border-t border-border pt-4">
          <p className="flex items-start gap-1.5 text-xs leading-snug text-muted">
            <Lock size={12} className="mt-0.5 shrink-0" />
            Stored only in this browser. No account, no tracking.
          </p>
          <ThemeToggle />
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile top bar */}
        <header className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-surface/90 px-4 py-3 backdrop-blur md:hidden">
          <Link href="/" aria-label="Paisa home" className="rounded-md focus-visible:outline-2 focus-visible:outline-brand">
            <Logo size="sm" />
          </Link>
          <div className="flex items-center gap-2">
            <Link
              href="/settings"
              aria-label="Settings"
              aria-current={isActive(pathname, "/settings") ? "page" : undefined}
              className={`inline-flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-surface focus-visible:outline-2 focus-visible:outline-brand ${
                isActive(pathname, "/settings") ? "text-brand" : "text-ink-2 hover:text-ink"
              }`}
            >
              <Settings size={18} />
            </Link>
            <ThemeToggle />
          </div>
        </header>

        <main id="main" tabIndex={-1} className="mx-auto w-full max-w-6xl flex-1 px-4 pt-6 pb-24 outline-none md:px-8 md:pt-8 md:pb-10">
          {children}
        </main>

        {/* Mobile bottom tab bar */}
        <nav
          aria-label="Main"
          className="fixed inset-x-0 bottom-0 z-10 grid grid-cols-5 border-t border-border bg-surface pb-[env(safe-area-inset-bottom)] md:hidden"
        >
          {MOBILE_TABS.map(({ href, label, icon: Icon }) => {
            const active = isActive(pathname, href);
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={`flex flex-col items-center gap-1 py-2 text-[11px] ${active ? "font-semibold text-brand" : "font-medium text-muted"}`}
              >
                <Icon size={20} />
                {label}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
