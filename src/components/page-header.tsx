export function PageHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-6">
      <h1 className="text-2xl font-bold tracking-tight md:text-3xl">{title}</h1>
      {subtitle && <p className="mt-1 text-sm text-ink-2">{subtitle}</p>}
    </div>
  );
}

/** Placeholder for features you build in the coming days. */
export function ComingSoon({ day, items }: { day: string; items: string[] }) {
  return (
    <div className="rounded-xl border border-dashed border-border bg-surface p-6">
      <p className="text-sm font-semibold text-brand">Planned for {day}</p>
      <ul className="mt-3 list-inside list-disc space-y-1 text-sm text-ink-2">
        {items.map((i) => (
          <li key={i}>{i}</li>
        ))}
      </ul>
    </div>
  );
}
