import { Link } from "react-router-dom";
import { Flame } from "lucide-react";
import NotificationBell from "./NotificationBell";

/**
 * Phones have no sidebar, so the wordmark and the bell live in a slim bar above the
 * page. Hidden at tablet widths and up, where the sidebar carries both.
 */
export default function MobileTopBar() {
  return (
    <header className="mobile-topbar">
      <Link to="/" className="wordmark">
        <span className="wordmark-flame" aria-hidden="true">
          <Flame size={18} strokeWidth={2.2} />
        </span>
        <span>StreakArena</span>
      </Link>
      <NotificationBell variant="icon" />
    </header>
  );
}
