"use client";

import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import { THEME_EVENT, getThemePref, resolveTheme, setThemePref, watchSystemTheme, type Theme } from "@/lib/theme";

export { themeInitScript } from "@/lib/theme";

export function ThemeToggle({ className = "" }: { className?: string }) {
  const [theme, setTheme] = useState<Theme | null>(null);

  useEffect(() => {
    const sync = () => setTheme(resolveTheme(getThemePref()));
    sync();
    window.addEventListener(THEME_EVENT, sync);
    const stop = watchSystemTheme();
    return () => {
      window.removeEventListener(THEME_EVENT, sync);
      stop();
    };
  }, []);

  const isDark = theme === "dark";
  return (
    <button
      type="button"
      onClick={() => setThemePref(isDark ? "light" : "dark")}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      className={`inline-flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-surface text-ink-2 hover:text-ink focus-visible:outline-2 focus-visible:outline-brand ${className}`}
    >
      {isDark ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
}
