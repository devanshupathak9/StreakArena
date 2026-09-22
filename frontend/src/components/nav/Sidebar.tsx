import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronsLeft, ChevronsRight, LayoutDashboard, Trophy } from "lucide-react";
import AccountRow from "./AccountRow";
import GroupTree from "./GroupTree";
import NavItem from "./NavItem";
import TodayBlock from "./TodayBlock";

const STORAGE_KEY = "sa.sidebar.collapsed";
/** Below this the rail is the sensible default; the tab bar takes over lower still. */
const RAIL_BELOW = 1024;

function initialCollapsed() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored !== null) return stored === "true";
  } catch {
    // Fall through to the width-based default.
  }
  return window.innerWidth < RAIL_BELOW;
}

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(initialCollapsed);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, String(collapsed));
    } catch {
      // A blocked storage API shouldn't break the nav.
    }
  }, [collapsed]);

  // "[" toggles the rail, the way an editor would.
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      const typing =
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.isContentEditable;
      if (event.key === "[" && !typing && !event.metaKey && !event.ctrlKey) {
        setCollapsed((current) => !current);
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  return (
    <aside className={`sidebar${collapsed ? " sidebar-rail" : ""}`}>
      <div className="sidebar-top">
        <Link to="/" className="wordmark">
          <span className="nav-label">StreakArena</span>
          <span className="wordmark-short" aria-hidden="true">
            SA
          </span>
        </Link>

        <button
          type="button"
          className="rail-toggle"
          onClick={() => setCollapsed(!collapsed)}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          title={collapsed ? "Expand sidebar ([)" : "Collapse sidebar ([)"}
        >
          {collapsed ? (
            <ChevronsRight size={16} strokeWidth={1.75} aria-hidden="true" />
          ) : (
            <ChevronsLeft size={16} strokeWidth={1.75} aria-hidden="true" />
          )}
        </button>
      </div>

      <TodayBlock collapsed={collapsed} />

      <nav className="sidebar-nav" aria-label="Main">
        <NavItem to="/" label="Dashboard" icon={LayoutDashboard} collapsed={collapsed} end />
        <GroupTree collapsed={collapsed} />
        <NavItem to="/global" label="Global" icon={Trophy} collapsed={collapsed} />
      </nav>

      <AccountRow collapsed={collapsed} />
    </aside>
  );
}
