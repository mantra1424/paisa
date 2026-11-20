import { ArrowLeftRight, Briefcase, LayoutDashboard, PiggyBank, Settings, Target } from "lucide-react";

export const NAV_ITEMS = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/transactions", label: "Transactions", icon: ArrowLeftRight },
  { href: "/budgets", label: "Budgets", icon: PiggyBank },
  { href: "/goals", label: "Goals", icon: Target },
  { href: "/clients", label: "Clients", icon: Briefcase },
  { href: "/settings", label: "Settings", icon: Settings },
] as const;

/** The phone tab bar has room for five; Settings moves to the top bar there. */
export const MOBILE_TABS = NAV_ITEMS.filter((i) => i.href !== "/settings");
