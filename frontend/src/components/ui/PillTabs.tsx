import type { LucideIcon } from "lucide-react";

/** The pill row used for filters, leaderboard scopes and group sections. */
type Tab<T extends string> = { id: T; label: string; count?: number; icon?: LucideIcon };

type Props<T extends string> = {
  tabs: Tab<T>[];
  active: T;
  onChange: (id: T) => void;
  label: string;
};

export default function PillTabs<T extends string>({ tabs, active, onChange, label }: Props<T>) {
  return (
    <div className="pill-tabs" role="tablist" aria-label={label}>
      {tabs.map((tab) => {
        const Icon = tab.icon;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={tab.id === active}
            className={`pill${tab.id === active ? " pill-active" : ""}`}
            onClick={() => onChange(tab.id)}
          >
            {Icon && <Icon size={15} strokeWidth={2.2} aria-hidden="true" />}
            {tab.label}
            {tab.count !== undefined && <span className="pill-count num">{tab.count}</span>}
          </button>
        );
      })}
    </div>
  );
}
