import { Navigate, Route, Routes } from "react-router-dom";
import MobileTabBar from "./components/nav/MobileTabBar";
import Sidebar from "./components/nav/Sidebar";
import About from "./pages/About";
import Dashboard from "./pages/Dashboard";
import Global from "./pages/Global";
import GroupDetail from "./pages/GroupDetail";
import Groups from "./pages/Groups";
import Login from "./pages/Login";
import Profile from "./pages/Profile";
import Register from "./pages/Register";
import { AppDataProvider } from "./context/AppData";
import { useAuth } from "./context/AuthContext";

export default function App() {
  const { user, loading } = useAuth();

  if (loading) return <div className="centered muted">Loading…</div>;

  // Signed out, the auth pages own the whole window. This guard is also what makes
  // every route below reachable only when signed in.
  if (!user) {
    return (
      <Routes>
        <Route path="/register" element={<Register />} />
        <Route path="*" element={<Login />} />
      </Routes>
    );
  }

  return (
    <AppDataProvider>
      <div className="shell">
        <Sidebar />
        <div className="shell-main">
          <main className="container">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/groups" element={<Groups />} />
              <Route path="/groups/:id" element={<GroupDetail />} />
              <Route path="/global" element={<Global />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/about" element={<About />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
        </div>
        <MobileTabBar />
      </div>
    </AppDataProvider>
  );
}
