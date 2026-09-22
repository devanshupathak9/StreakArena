import { useEffect, useState, type FormEvent } from "react";
import { api, type Dashboard } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import Avatar from "../components/Avatar";
import LinkedProfiles from "../components/LinkedProfiles";

const timezones =
  typeof Intl.supportedValuesOf === "function" ? Intl.supportedValuesOf("timeZone") : [];

export default function Profile() {
  const { user, setUser } = useAuth();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    username: user?.username ?? "",
    displayName: user?.displayName ?? "",
    bio: user?.bio ?? "",
    location: user?.location ?? "",
    avatarUrl: user?.avatarUrl ?? "",
    timezone: user?.timezone ?? "UTC",
  });
  const [stats, setStats] = useState<Dashboard | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.dashboard().then(setStats).catch(() => setStats(null));
  }, [user]);

  if (!user) return null;

  // Include the current timezone even if the browser doesn't list it.
  const options = timezones.includes(form.timezone) ? timezones : [form.timezone, ...timezones];
  const set = (field: keyof typeof form) => (value: string) =>
    setForm((current) => ({ ...current, [field]: value }));

  function startEditing() {
    setForm({
      username: user!.username,
      displayName: user!.displayName ?? "",
      bio: user!.bio ?? "",
      location: user!.location ?? "",
      avatarUrl: user!.avatarUrl ?? "",
      timezone: user!.timezone,
    });
    setMessage("");
    setError("");
    setEditing(true);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setMessage("");
    setError("");
    setBusy(true);
    try {
      setUser(await api.updateProfile(form));
      setMessage("Profile saved.");
      setEditing(false);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const bestEver = stats?.tasks.reduce((max, task) => Math.max(max, task.longestStreak), 0) ?? 0;
  const running = stats?.tasks.reduce((max, task) => Math.max(max, task.currentStreak), 0) ?? 0;
  const totalDone = stats?.tasks.reduce((sum, task) => sum + task.totalDays, 0) ?? 0;

  return (
    <div className="stack">
      <section className="card profile-header">
        <Avatar
          username={user.username}
          displayName={user.displayName}
          avatarUrl={user.avatarUrl}
          size={84}
        />

        <div className="profile-identity">
          <h1>{user.displayName || user.username}</h1>
          <p className="muted">@{user.username}</p>
          {user.bio && <p className="profile-bio">{user.bio}</p>}
          <p className="task-meta">
            {user.location && (
              <>
                <span>📍 {user.location}</span>
                <span className="dot">·</span>
              </>
            )}
            <span>🕑 {user.timezone}</span>
            <span className="dot">·</span>
            <span>joined {new Date(user.createdAt).toLocaleDateString()}</span>
          </p>
        </div>

        {!editing && (
          <button type="button" className="button button-secondary" onClick={startEditing}>
            Edit profile
          </button>
        )}
      </section>

      {message && <p className="success">{message}</p>}

      <div className="stat-grid">
        <div className="stat-card">
          <span className="stat-value stat-value-flame">🔥 {running}</span>
          <span className="stat-label">running streak</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">{bestEver}</span>
          <span className="stat-label">longest ever</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">{stats?.tasks.length ?? 0}</span>
          <span className="stat-label">tasks</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">{totalDone}</span>
          <span className="stat-label">days completed</span>
        </div>
      </div>

      {editing && (
        <section className="card">
          <div className="card-head">
            <h2>Edit profile</h2>
            <button type="button" className="link-button" onClick={() => setEditing(false)}>
              Cancel
            </button>
          </div>

          <form className="stack" onSubmit={handleSubmit}>
            <div className="field-row">
              <label>
                Name
                <input
                  value={form.displayName}
                  onChange={(event) => set("displayName")(event.target.value)}
                  placeholder="Devanshu Pathak"
                  maxLength={50}
                />
              </label>

              <label>
                Username
                <input
                  value={form.username}
                  onChange={(event) => set("username")(event.target.value)}
                  required
                />
              </label>
            </div>

            <label>
              Bio
              <input
                value={form.bio}
                onChange={(event) => set("bio")(event.target.value)}
                placeholder="What are you building a streak for?"
                maxLength={160}
              />
            </label>
            <p className="muted small">{160 - form.bio.length} characters left</p>

            <div className="field-row">
              <label>
                Location
                <input
                  value={form.location}
                  onChange={(event) => set("location")(event.target.value)}
                  placeholder="India"
                  maxLength={60}
                />
              </label>

              <label>
                Timezone
                <select
                  value={form.timezone}
                  onChange={(event) => set("timezone")(event.target.value)}
                >
                  {options.map((zone) => (
                    <option key={zone} value={zone}>
                      {zone}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <label>
              Avatar image URL
              <input
                value={form.avatarUrl}
                onChange={(event) => set("avatarUrl")(event.target.value)}
                placeholder="https://github.com/yourname.png"
                maxLength={300}
              />
            </label>
            <p className="muted small">
              Leave it empty for generated initials. If you're on GitHub,{" "}
              <code>https://github.com/yourname.png</code> is already a picture of you.
            </p>

            <p className="muted small">
              Your day rolls over at midnight in your timezone — that's what decides whether a
              streak survives.
            </p>

            {error && <p className="error">{error}</p>}

            <div className="task-actions">
              <button type="submit" className="button" disabled={busy}>
                {busy ? "Saving…" : "Save changes"}
              </button>
              <button type="button" className="link-button" onClick={() => setEditing(false)}>
                Cancel
              </button>
            </div>
          </form>
        </section>
      )}

      <LinkedProfiles />
    </div>
  );
}
