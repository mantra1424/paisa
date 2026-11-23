import { IndianRupee } from "lucide-react";

/** Vermilion rupee block + serif wordmark, after the cover of a bahi-khata. */
export function Logo({ size = "md" }: { size?: "md" | "sm" }) {
  const box = size === "md" ? "h-9 w-9" : "h-8 w-8";
  return (
    <span className="flex items-center gap-2.5">
      <span className={`flex ${box} items-center justify-center rounded-md bg-brand text-brand-ink shadow-[inset_0_-2px_0_rgb(0_0_0/0.18)]`}>
        <IndianRupee size={size === "md" ? 18 : 16} strokeWidth={2.5} />
      </span>
      <span className="font-serif text-xl font-semibold tracking-tight">
        paisa<span className="text-brand">.</span>
      </span>
    </span>
  );
}
