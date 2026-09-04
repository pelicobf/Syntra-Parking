import type { LucideIcon } from "lucide-react";

type StatProps = {
  label: string;
  value: string;
  hint: string;
  tone: string;
  icon: LucideIcon;
};

export function Stat({
  label,
  value,
  hint,
  tone,
  icon: Icon,
}: StatProps) {
  return (
    <article className="stat">
      <span className={`stat-icon ${tone}`}>
        <Icon size={19} />
      </span>

      <div>
        <p>{label}</p>
        <strong>{value}</strong>
        <small>{hint}</small>
      </div>
    </article>
  );
}