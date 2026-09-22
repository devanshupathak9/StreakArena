import { Link } from "react-router-dom";

export default function Footer() {
  return (
    <footer className="footer">
      <div className="container footer-inner">
        <span className="muted small">🔥 StreakArena</span>
        <nav className="footer-links">
          <Link to="/global">Global dashboard</Link>
          <Link to="/groups">Groups</Link>
          <Link to="/profile">Profile</Link>
        </nav>
      </div>
    </footer>
  );
}
