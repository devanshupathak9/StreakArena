import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { MoreHorizontal } from "lucide-react";
import Avatar from "../Avatar";
import { useAuth } from "../../context/AuthContext";
import { useAppData } from "../../context/AppData";

/**
 * A level has to mean something or it's decoration, so it counts the days you
 * actually recorded: one level per fifty, and the bar is progress to the next.
 */
const DAYS_PER_LEVEL = 50;

export default function AccountRow({ collapsed }: { collapsed: boolean }) {
  const { user, logout } = useAuth();
  const { dashboard } = useAppData();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const wrapper = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDocument(event: MouseEvent) {
      if (!wrapper.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDocument);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocument);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (!user) return null;

  const totalDays = dashboard?.tasks.reduce((sum, task) => sum + task.totalDays, 0) ?? 0;
  const level = Math.floor(totalDays / DAYS_PER_LEVEL) + 1;
  const progress = ((totalDays % DAYS_PER_LEVEL) / DAYS_PER_LEVEL) * 100;

  function go(path: string) {
    setOpen(false);
    navigate(path);
  }

  return (
    <div className="account-row" ref={wrapper}>
      <button
        type="button"
        className="account-card"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-haspopup="menu"
        title={collapsed ? (user.displayName ?? user.username) : undefined}
      >
        <Avatar
          username={user.username}
          displayName={user.displayName}
          avatarUrl={user.avatarUrl}
          size={40}
        />

        <span className="account-detail nav-label">
          <span className="account-name">{user.displayName || user.username}</span>
          <span className="account-level">Level {level}</span>
          <span className="xp-bar">
            <span
              className="xp-fill"
              style={{ width: `${progress}%` }}
              role="progressbar"
              aria-valuenow={Math.round(progress)}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`Progress to level ${level + 1}`}
            />
          </span>
        </span>

        <MoreHorizontal size={16} strokeWidth={1.75} className="nav-label" aria-hidden="true" />
      </button>

      {open && (
        <div className="account-menu" role="menu">
          <button type="button" role="menuitem" onClick={() => go("/profile")}>
            Edit profile
          </button>
          <button type="button" role="menuitem" onClick={() => go("/about")}>
            About StreakArena
          </button>
          <button
            type="button"
            role="menuitem"
            className="danger"
            onClick={async () => {
              setOpen(false);
              await logout();
              navigate("/login");
            }}
          >
            Log out
          </button>
        </div>
      )}
    </div>
  );
}
