import { useEffect, useState, type FormEvent } from "react";
import { api, type LinkedProfile, type Platform } from "../lib/api";
import { formatWhen } from "../lib/dates";

/**
 * One handle per platform, edited in place. StreakArena stores nothing but the
 * handle — linking is what turns a task into a one-click trip to your profile.
 */
export default function LinkedProfiles() {
  const [platforms, setPlatforms] = useState<Platform[]>([]);
  const [linked, setLinked] = useState<Record<string, LinkedProfile>>({});
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([api.platforms(), api.profiles()])
      .then(([catalog, profiles]) => {
        setPlatforms(catalog);
        setLinked(Object.fromEntries(profiles.map((p) => [p.platform, p])));
        setDrafts(Object.fromEntries(profiles.map((p) => [p.platform, p.handle])));
      })
      .catch((err) => setError((err as Error).message));
  }, []);

  async function handleSave(event: FormEvent, platform: string) {
    event.preventDefault();
    const handle = (drafts[platform] ?? "").trim();
    if (!handle || busy) return;

    setError("");
    setBusy(platform);
    try {
      const profile = await api.linkProfile(platform, handle);
      setLinked((current) => ({ ...current, [platform]: profile }));
      // The server strips a pasted URL down to the handle — show what it kept.
      setDrafts((current) => ({ ...current, [platform]: profile.handle }));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy("");
    }
  }

  async function handleUnlink(platform: string) {
    setError("");
    setBusy(platform);
    try {
      await api.unlinkProfile(platform);
      setLinked((current) => {
        const next = { ...current };
        delete next[platform];
        return next;
      });
      setDrafts((current) => ({ ...current, [platform]: "" }));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy("");
    }
  }

  return (
    <section className="card">
      <div className="card-head">
        <h2>Linked profiles</h2>
        <p className="muted">{Object.keys(linked).length} linked</p>
      </div>

      <p className="muted small">
        Add your handle once, then tag a task with that platform. Its tile row links straight
        to your profile, and <strong>Sync</strong> reads your real activity back so the streak
        is evidence rather than self-report. Public handles only — no passwords, no account
        access.
      </p>

      {error && <p className="error">{error}</p>}

      <div className="profile-list">
        {platforms.map((platform) => {
          const profile = linked[platform.id];
          const draft = drafts[platform.id] ?? "";
          const saving = busy === platform.id;
          const unchanged = profile?.handle === draft.trim();

          return (
            <form
              key={platform.id}
              className={`profile-row${profile ? " profile-row-linked" : ""}`}
              onSubmit={(event) => handleSave(event, platform.id)}
            >
              <span className="profile-label">
                <span aria-hidden="true">{platform.emoji}</span> {platform.label}
              </span>

              <input
                value={draft}
                placeholder={platform.placeholder}
                aria-label={`${platform.label} handle`}
                onChange={(event) =>
                  setDrafts((current) => ({ ...current, [platform.id]: event.target.value }))
                }
              />

              {profile && (
                <p className={`profile-note${profile.lastSyncError ? " profile-note-error" : ""}`}>
                  {profile.lastSyncError
                    ? `Last sync failed: ${profile.lastSyncError}`
                    : profile.lastSyncedAt
                      ? `Last synced ${formatWhen(profile.lastSyncedAt)}`
                      : "Not synced yet — hit Sync on the dashboard."}
                </p>
              )}

              <div className="profile-actions">
                <button type="submit" className="button" disabled={saving || !draft.trim() || unchanged}>
                  {saving ? "…" : profile ? "Update" : "Link"}
                </button>
                {profile && (
                  <>
                    {profile.url && (
                      <a href={profile.url} target="_blank" rel="noreferrer" className="profile-open">
                        Open ↗
                      </a>
                    )}
                    <button
                      type="button"
                      className="link-button danger"
                      onClick={() => handleUnlink(platform.id)}
                      disabled={saving}
                    >
                      Unlink
                    </button>
                  </>
                )}
              </div>
            </form>
          );
        })}
      </div>
    </section>
  );
}
