type MetricCardProps = {
  label: string;
  value: string;
  tone?: "default" | "accent" | "marine";
};

export function MetricCard({ label, value, tone = "default" }: MetricCardProps) {
  const tones = {
    default: "border-ink/10 bg-white/80",
    accent: "border-ember/30 bg-ember/10",
    marine: "border-marine/25 bg-marine/10",
  };

  return (
    <div className={`rounded-3xl border p-5 ${tones[tone]}`}>
      <p className="text-sm uppercase tracking-[0.18em] text-ink/55">{label}</p>
      <p className="mt-2 text-3xl font-semibold text-ink">{value}</p>
    </div>
  );
}
