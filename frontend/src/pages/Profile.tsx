import { useEffect, useState, type FormEvent } from "react";
import { api, type Dashboard } from "../lib/api";
import { useAuth } from "../context/AuthContext";

const timezones =
  typeof Intl.supportedValuesOf === "function" ? Intl.supportedValuesOf("timeZone") : [];

export default function Profile() {
  const { user, setUser } = useAuth();
  const [username, setUsername] = useState(user?.username ?? "");
  const [timezone, setTimezone] = useState(user?.timezone ?? "UTC");
  const [stats, setStats] = useState<Dashboard | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.dashboard().then(setStats).catch(() => setStats(null));
  }, [user]);

  if (!user) return null;

  // Include the current timezone even if the browser doesn't list it.
  const options = timezones.includes(timezone) ? timezones : [timezone, ...timezones];

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setMessage("");
    setError("");
    setBusy(true);
    try {
      setUser(await api.updateProfile({ username, timezone }));
      setMessage("Profile saved.");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const bestEver = stats?.tasks.reduce((max, task) => Math.max(max, task.longestStreak), 0) ?? 0;
  const totalDone = stats?.tasks.reduce((sum, task) => sum + task.totalDays, 0) ?? 0;

  return (
    <div className="stack">
      <div className="page-head">
        <h1>{user.username}</h1>
        <p className="muted">
          {user.email} · joined {new Date(user.createdAt).toLocaleDateString()}
        </p>
      </div>

      <section className="card stat-row">
        <div className="stat">
          <span className="stat-value">{stats?.tasks.length ?? 0}</span>
          <span className="muted">tasks</span>
        </div>
        <div className="stat">
          <span className="stat-value">{bestEver}</span>
          <span className="muted">longest streak</span>
        </div>
        <div className="stat">
          <span className="stat-value">{totalDone}</span>
          <span className="muted">days completed</span>
        </div>
      </section>

      <section className="card">
        <div className="card-head">
          <h2>Settings</h2>
        </div>

        <form className="stack" onSubmit={handleSubmit}>
          <label>
            Username
            <input value={username} onChange={(event) => setUsername(event.target.value)} required />
          </label>

          <label>
            Timezone
            <select value={timezone} onChange={(event) => setTimezone(event.target.value)}>
              {options.map((zone) => (
                <option key={zone} value={zone}>
                  {zone}
                </option>
              ))}
            </select>
          </label>

          <p className="muted small">
            Your day rolls over at midnight in this timezone — that's what decides whether a streak
            survives.
          </p>

          {error && <p className="error">{error}</p>}
          {message && <p className="success">{message}</p>}

          <button type="submit" className="button" disabled={busy}>
            {busy ? "Saving…" : "Save changes"}
          </button>
        </form>
      </section>
    </div>
  );
}
