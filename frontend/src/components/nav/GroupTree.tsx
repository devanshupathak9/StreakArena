import { useEffect, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { ChevronRight, Users } from "lucide-react";
import { useAppData } from "../../context/AppData";

const VISIBLE_LIMIT = 5;
const STORAGE_KEY = "sa.groups.expanded";

/**
 * Groups behave like folders in a file explorer: the ones you open daily, with your
 * standing beside each. Expanded state is remembered because collapsing it is a
 * preference, not a per-visit decision.
 */
export default function GroupTree({ collapsed }: { collapsed: boolean }) {
  const { groups } = useAppData();
  const location = useLocation();
  const [open, setOpen] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) !== "false";
    } catch {
      return true;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, String(open));
    } catch {
      // A blocked storage API shouldn't break the nav.
    }
  }, [open]);

  // On a group page the group row is the active item, not "Groups".
  const onGroupsIndex = location.pathname === "/groups";
  const shown = groups?.slice(0, VISIBLE_LIMIT) ?? [];

  if (collapsed) {
    return (
      <NavLink to="/groups" className="nav-item" title="Groups">
        <Users size={18} strokeWidth={1.75} aria-hidden="true" />
        <span className="nav-label">Groups</span>
      </NavLink>
    );
  }

  return (
    <div className="nav-tree">
      <div className={`nav-item nav-item-parent${onGroupsIndex ? " active" : ""}`}>
        <button
          type="button"
          className="nav-chevron"
          onClick={() => setOpen(!open)}
          aria-expanded={open}
          aria-label={open ? "Collapse groups" : "Expand groups"}
        >
          <ChevronRight
            size={14}
            strokeWidth={2}
            className={open ? "chevron-open" : undefined}
            aria-hidden="true"
          />
        </button>

        <NavLink to="/groups" end className="nav-parent-link">
          <Users size={18} strokeWidth={1.75} aria-hidden="true" />
          <span className="nav-label">Groups</span>
        </NavLink>
      </div>

      {open && (
        <ul className="nav-sublist">
          {shown.map((group) => (
            <li key={group.id}>
              <NavLink
                to={`/groups/${group.id}`}
                className={({ isActive }) => `nav-subitem${isActive ? " active" : ""}`}
              >
                {({ isActive }) => (
                  <>
                    <span className="nav-subname" aria-current={isActive ? "page" : undefined}>
                      {group.name}
                    </span>
                    {group.owedToday && (
                      <span className="nav-dot" title="Something still owed here today" />
                    )}
                    {group.yourRank && <span className="nav-rank num">#{group.yourRank}</span>}
                  </>
                )}
              </NavLink>
            </li>
          ))}

          {groups && groups.length > VISIBLE_LIMIT && (
            <li>
              <NavLink to="/groups" end className="nav-subitem nav-subitem-more">
                View all groups
              </NavLink>
            </li>
          )}

          {groups && groups.length === 0 && (
            <li>
              <NavLink to="/groups" end className="nav-subitem nav-subitem-more">
                Join or create a group
              </NavLink>
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
