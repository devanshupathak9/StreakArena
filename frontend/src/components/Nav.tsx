import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Nav() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate("/login");
  }

  return (
    <header className="nav">
      <div className="container nav-inner">
        <Link to="/" className="brand">
          🔥 StreakArena
        </Link>
        <nav className="nav-links">
          {user ? (
            <>
              <NavLink to="/">Dashboard</NavLink>
              <NavLink to="/profile">Profile</NavLink>
              <button className="link-button" onClick={handleLogout}>
                Log out
              </button>
            </>
          ) : (
            <>
              <NavLink to="/login">Log in</NavLink>
              <NavLink to="/register">Sign up</NavLink>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
