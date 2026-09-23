import { NavLink } from "react-router-dom";
import { BarChart3, Home, SquareCheck, User, Users } from "lucide-react";

const TABS = [
  { to: "/", label: "Home", icon: Home, end: true },
  { to: "/tasks", label: "Tasks", icon: SquareCheck, end: false },
  { to: "/groups", label: "Groups", icon: Users, end: false },
  { to: "/leaderboard", label: "Ranks", icon: BarChart3, end: false },
  { to: "/profile", label: "Profile", icon: User, end: false },
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
