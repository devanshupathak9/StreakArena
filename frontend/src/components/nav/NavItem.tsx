import { NavLink } from "react-router-dom";
import type { LucideIcon } from "lucide-react";

type Props = {
  to: string;
  label: string;
  icon: LucideIcon;
  collapsed: boolean;
  /** Only the exact path counts as active, so /groups/:id doesn't light up Groups. */
  end?: boolean;
};

export default function NavItem({ to, label, icon: Icon, collapsed, end = false }: Props) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) => `nav-item${isActive ? " active" : ""}`}
      aria-current={undefined}
      title={collapsed ? label : undefined}
    >
      {({ isActive }) => (
        <>
          <Icon size={18} strokeWidth={1.75} aria-hidden="true" />
          <span className="nav-label" aria-current={isActive ? "page" : undefined}>
            {label}
          </span>
        </>
      )}
    </NavLink>
  );
}
