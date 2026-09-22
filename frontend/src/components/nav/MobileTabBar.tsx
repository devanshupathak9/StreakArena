import { NavLink } from "react-router-dom";
import { LayoutDashboard, Trophy, UserRound, Users } from "lucide-react";

const TABS = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/groups", label: "Groups", icon: Users, end: false },
  { to: "/global", label: "Global", icon: Trophy, end: false },
  { to: "/profile", label: "Profile", icon: UserRound, end: false },
];

/** Below the sidebar breakpoint the nav belongs under the thumb, not beside the page. */
export default function MobileTabBar() {
  return (
    <nav className="tabbar" aria-label="Main">
      {TABS.map(({ to, label, icon: Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          className={({ isActive }) => `tabbar-item${isActive ? " active" : ""}`}
        >
          {({ isActive }) => (
            <>
              <Icon size={20} strokeWidth={1.75} aria-hidden="true" />
              <span aria-current={isActive ? "page" : undefined}>{label}</span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}
