export type ThemePref = "light" | "dark" | "system";
export type Theme = "light" | "dark";

export const THEME_KEY = "paisa-theme";
export const THEME_EVENT = "paisa-themechange";

export function getThemePref(): ThemePref {
  try {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved === "light" || saved === "dark") return saved;
  } catch {
    /* storage can be blocked; fall back to the system setting */
  }
  return "system";
}

export function resolveTheme(pref: ThemePref): Theme {
  if (pref !== "system") return pref;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

/** Save the choice, apply it to <html>, and tell every theme control on the page. */
export function setThemePref(pref: ThemePref) {
  try {
    if (pref === "system") localStorage.removeItem(THEME_KEY);
    else localStorage.setItem(THEME_KEY, pref);
  } catch {
    /* ignore: the choice still applies for this visit */
  }
  document.documentElement.classList.toggle("dark", resolveTheme(pref) === "dark");
  window.dispatchEvent(new Event(THEME_EVENT));
}

/** Keeps "system" in sync when the OS switches between light and dark. */
export function watchSystemTheme(): () => void {
  const mq = window.matchMedia("(prefers-color-scheme: dark)");
  const onChange = () => {
    if (getThemePref() === "system") setThemePref("system");
  };
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}

/** Runs before React loads so the page never flashes the wrong theme. */
export const themeInitScript = `(function(){try{var t=localStorage.getItem('${THEME_KEY}');if(!t){t=matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'}if(t==='dark')document.documentElement.classList.add('dark')}catch(e){}})();`;
