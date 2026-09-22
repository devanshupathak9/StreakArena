import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { MoreHorizontal } from "lucide-react";
import Avatar from "../Avatar";
import { useAuth } from "../../context/AuthContext";

/** Profile lives where people look for it: the account row, not the nav list. */
export default function AccountRow({ collapsed }: { collapsed: boolean }) {
  const { user, logout } = useAuth();
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

  function go(path: string) {
    setOpen(false);
    navigate(path);
  }

  return (
    <div className="account-row" ref={wrapper}>
      <button
        type="button"
        className="account-button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-haspopup="menu"
        title={collapsed ? (user.displayName ?? user.username) : undefined}
      >
        <Avatar
          username={user.username}
          displayName={user.displayName}
          avatarUrl={user.avatarUrl}
          size={28}
        />
        <span className="account-name nav-label">{user.displayName || user.username}</span>
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
