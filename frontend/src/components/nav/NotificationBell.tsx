import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Bell, BellRing, Settings2 } from "lucide-react";
import { api, type AppNotification } from "../../lib/api";
import { formatWhen } from "../../lib/dates";

type Props = {
  /** "row" sits in the sidebar nav; "icon" is the round button in the phone top bar. */
  variant: "row" | "icon";
  collapsed?: boolean;
};

const REFRESH_MS = 5 * 60 * 1000;

/**
 * The inbox for reminders. It polls gently (every five minutes, and whenever the tab
 * regains focus) because a reminder is minutes-scale news — a socket would be a lot
 * of machinery to learn about something push already announced.
 */
export default function NotificationBell({ variant, collapsed = false }: Props) {
  const [items, setItems] = useState<AppNotification[]>([]);
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const navigate = useNavigate();

  const load = useCallback(async () => {
    try {
      const result = await api.notifications();
      setItems(result.items);
      setUnread(result.unread);
    } catch {
      // The bell is a convenience; a failed poll just waits for the next one.
    }
  }, []);

  useEffect(() => {
    void load();
    const timer = window.setInterval(load, REFRESH_MS);
    const onFocus = () => void load();
    window.addEventListener("focus", onFocus);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", onFocus);
    };
  }, [load]);

  // Close on outside click and Escape, returning focus to the bell.
  useEffect(() => {
    if (!open) return;
    function onDown(event: MouseEvent) {
      const target = event.target as Node;
      if (!panelRef.current?.contains(target) && !buttonRef.current?.contains(target)) setOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  async function toggle() {
    const next = !open;
    setOpen(next);
    if (next && unread > 0) {
      // Opening the panel is reading it. Optimistic, so the badge clears at once.
      setUnread(0);
      setItems((current) => current.map((item) => ({ ...item, read: true })));
      await api.markNotificationsRead().catch(() => undefined);
    }
  }

  const label = unread > 0 ? `Notifications, ${unread} unread` : "Notifications";
  const Icon = unread > 0 ? BellRing : Bell;

  return (
    <div className={`bell bell-${variant}`}>
      <button
        ref={buttonRef}
        type="button"
        className={variant === "row" ? "nav-item bell-trigger" : "icon-button bell-trigger"}
        onClick={toggle}
        aria-label={label}
        aria-expanded={open}
        aria-haspopup="dialog"
        title={collapsed ? label : undefined}
      >
        <span className="bell-icon">
          <Icon size={18} strokeWidth={1.75} aria-hidden="true" />
          {unread > 0 && <span className="bell-badge num">{unread > 9 ? "9+" : unread}</span>}
        </span>
        {variant === "row" && <span className="nav-label">Notifications</span>}
      </button>

      {open && (
        <div ref={panelRef} className="bell-panel card" role="dialog" aria-label="Notifications">
          <div className="bell-panel-head">
            <h2>Notifications</h2>
            <Link to="/profile#reminders" className="link-button small" onClick={() => setOpen(false)}>
              <Settings2 size={14} aria-hidden="true" /> Reminders
            </Link>
          </div>
          {items.length === 0 ? (
            <p className="empty">
              Nothing yet. If a streak is still open in the evening, the reminder lands here — and on
              your phone if you turn push on.
            </p>
          ) : (
            <ol className="bell-list">
              {items.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    className={`bell-item${item.read ? "" : " is-unread"}`}
                    onClick={() => {
                      setOpen(false);
                      navigate(item.url || "/");
                    }}
                  >
                    <span className="bell-item-title">{item.title}</span>
                    <span className="bell-item-body muted small">{item.body}</span>
                    <span className="bell-item-when muted small">{formatWhen(item.at)}</span>
                  </button>
                </li>
              ))}
            </ol>
          )}
        </div>
      )}
    </div>
  );
}
