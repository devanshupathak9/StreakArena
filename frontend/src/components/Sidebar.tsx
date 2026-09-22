import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Avatar from "./Avatar";

const LINKS = [
  { to: "/", label: "Dashboard", icon: "▦", end: true },
  { to: "/groups", label: "Groups", icon: "◈", end: false },
  { to: "/global", label: "Global", icon: "◎", end: false },
  { to: "/profile", label: "Profile", icon: "◔", end: false },
  { to: "/about", label: "About", icon: "◇", end: false },
];

/** The app's spine: every destination in one column, current one highlighted. */
export default function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate("/login");
  }

  if (!user) return null;

  return (
    <aside className="sidebar">
      <NavLink to="/" className="brand sidebar-brand">
        <span aria-hidden="true">🔥</span>
        <span>StreakArena</span>
      </NavLink>

      <nav className="sidebar-nav">
        {LINKS.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            end={link.end}
            className={({ isActive }) => `sidebar-link${isActive ? " active" : ""}`}
          >
            <span className="sidebar-icon" aria-hidden="true">
              {link.icon}
            </span>
            <span>{link.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-foot">
        <NavLink to="/profile" className="sidebar-user">
          <Avatar
            username={user.username}
            displayName={user.displayName}
            avatarUrl={user.avatarUrl}
            size={32}
          />
          <span className="member-name">
            <strong>{user.displayName || user.username}</strong>
            <span className="muted small">@{user.username}</span>
          </span>
        </NavLink>
        <button type="button" className="link-button" onClick={handleLogout}>
          Log out
        </button>
      </div>
    </aside>
  );
}
