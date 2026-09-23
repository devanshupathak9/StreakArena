import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, Search } from "lucide-react";
import Avatar from "../Avatar";
import { useAuth } from "../../context/AuthContext";
import { useAppData } from "../../context/AppData";

/**
 * The floating cluster at the top right of every page. Search jumps to a task or
 * a group — it's a shortcut, not a second navigation, so it filters what the app
 * already has rather than asking the server.
 */
export default function TopBar() {
  const { user } = useAuth();
  const { dashboard, groups } = useAppData();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const wrapper = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    input.current?.focus();
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

  const needle = query.trim().toLowerCase();
  const hits = needle
    ? [
        ...(groups ?? [])
          .filter((group) => group.name.toLowerCase().includes(needle))
          .map((group) => ({ key: `g${group.id}`, label: group.name, to: `/groups/${group.id}` })),
        ...(dashboard?.tasks ?? [])
          .filter((task) => task.title.toLowerCase().includes(needle))
          .map((task) => ({ key: `t${task.id}`, label: task.title, to: "/tasks" })),
      ].slice(0, 6)
    : [];

  // Anything still owed today is what a notification would be about.
  const owed = dashboard?.tasks.filter((task) => !task.doneToday).length ?? 0;

  return (
    <div className="topbar" ref={wrapper}>
      <button
        type="button"
        className="icon-button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-label="Search tasks and groups"
      >
        <Search size={18} strokeWidth={1.75} aria-hidden="true" />
      </button>

      <button
        type="button"
        className="icon-button"
        onClick={() => navigate("/")}
        aria-label={owed === 0 ? "Nothing outstanding today" : `${owed} tasks left today`}
        title={owed === 0 ? "Nothing outstanding today" : `${owed} tasks left today`}
      >
        <Bell size={18} strokeWidth={1.75} aria-hidden="true" />
        {owed > 0 && <span className="icon-dot" aria-hidden="true" />}
      </button>

      <button
        type="button"
        className="topbar-avatar"
        onClick={() => navigate("/profile")}
        aria-label="Your profile"
      >
        <Avatar
          username={user.username}
          displayName={user.displayName}
          avatarUrl={user.avatarUrl}
          size={40}
        />
      </button>

      {open && (
        <div className="search-pop">
          <input
            ref={input}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search tasks and groups…"
            aria-label="Search"
          />
          {needle !== "" && (
            <div className="search-hits">
              {hits.length === 0 ? (
                <p className="muted small">Nothing matches “{query}”.</p>
              ) : (
                hits.map((hit) => (
                  <button
                    key={hit.key}
                    type="button"
                    onClick={() => {
                      setOpen(false);
                      setQuery("");
                      navigate(hit.to);
                    }}
                  >
                    {hit.label}
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
