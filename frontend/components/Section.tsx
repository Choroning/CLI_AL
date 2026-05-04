/**
 * Feature card per DESIGN.md `feature-card` token:
 * surface-1 background, 1px hairline border, rounded-lg (12px), padding 24px.
 */
export function Section({
  title,
  children,
  right,
}: {
  title: string;
  children: React.ReactNode;
  right?: React.ReactNode;
}) {
  return (
    <section className="rounded-lg bg-surface-1 ring-1 ring-hairline p-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="eyebrow">{title}</h2>
        {right}
      </div>
      {children}
    </section>
  );
}
