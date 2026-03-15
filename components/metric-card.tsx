type MetricCardProps = {
  label: string;
  value: string;
  tone?: "default" | "accent" | "marine";
};

export function MetricCard({ label, value, tone = "default" }: MetricCardProps) {
  const tones = {
    default: "border-border bg-background-alt",
    accent: "border-accent/30 bg-accent/5 text-accent",
    marine: "border-indigo-200 bg-indigo-50",
  };

  return (
    <div className={`rounded-3xl border p-6 shadow-sm transition-shadow hover:shadow-md ${tones[tone]}`}>
      <p className={`text-sm font-medium ${tone === 'accent' ? 'text-accent' : 'text-foreground-muted'}`}>{label}</p>
      <p className="mt-3 text-4xl font-bold text-foreground tracking-tight">{value}</p>
    </div>
  );
}
