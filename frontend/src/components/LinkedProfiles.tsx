import { useEffect, useState, type FormEvent } from "react";
import { Check, ExternalLink, Plus, RefreshCw, Trash2 } from "lucide-react";
import { api, type LinkedProfile, type Platform } from "../lib/api";
import PlatformIcon from "./ui/PlatformIcon";
import { formatWhen } from "../lib/dates";

/**
 * Only what you've actually linked is on screen. Nine empty rows was a list of
 * things you hadn't done; picking a platform from the menu and adding it is the
 * same work without the wall.
 */
export default function LinkedProfiles() {
  const [platforms, setPlatforms] = useState<Platform[]>([]);
  const [linked, setLinked] = useState<LinkedProfile[]>([]);
  const [adding, setAdding] = useState(false);
  const [choice, setChoice] = useState("");
  const [handle, setHandle] = useState("");
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([api.platforms(), api.profiles()])
      .then(([catalog, profiles]) => {
        setPlatforms(catalog);
        setLinked(profiles);
      })
      .catch((err) => setError((err as Error).message));
  }, []);

  const linkedIds = new Set(linked.map((profile) => profile.platform));
  const available = platforms.filter((platform) => !linkedIds.has(platform.id));
  const selected = available.find((platform) => platform.id === choice) ?? available[0];

  async function handleAdd(event: FormEvent) {
    event.preventDefault();
    const trimmed = handle.trim();
    if (!selected || !trimmed || busy) return;

    setError("");
    setBusy(selected.id);
    try {
      const profile = await api.linkProfile(selected.id, trimmed);
      setLinked((current) => [...current, profile]);
      setHandle("");
      setChoice("");
      setAdding(false);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy("");
    }
  }

  async function handleUnlink(platform: string, label: string) {
    if (!window.confirm(`Unlink ${label}? Days it already proved stay on your tiles.`)) return;

    setError("");
    setBusy(platform);
    try {
      await api.unlinkProfile(platform);
      setLinked((current) => current.filter((profile) => profile.platform !== platform));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy("");
    }
  }

  return (
    <section className="card">
      <div className="card-head">
        <div>
          <h2>Linked accounts</h2>
          <p className="muted small">
            {linked.length === 0
              ? "Nothing connected yet"
              : `${linked.length} of ${platforms.length} connected`}
          </p>
        </div>

        {available.length > 0 && (
          <button type="button" className="button button-sm" onClick={() => setAdding(!adding)}>
            <Plus size={15} strokeWidth={2.6} aria-hidden="true" />
            Connect a platform
          </button>
        )}
      </div>

      {error && <p className="error">{error}</p>}

      {adding && selected && (
        <form className="composer link-form" onSubmit={handleAdd}>
          <select
            value={selected.id}
            onChange={(event) => setChoice(event.target.value)}
            aria-label="Platform"
          >
            {available.map((platform) => (
              <option key={platform.id} value={platform.id}>
                {platform.label}
              </option>
            ))}
          </select>

          <input
            value={handle}
            onChange={(event) => setHandle(event.target.value)}
            placeholder={selected.placeholder}
            aria-label={`${selected.label} handle`}
            autoFocus
          />

          <button type="submit" className="button" disabled={Boolean(busy) || !handle.trim()}>
            {busy ? "Linking…" : "Link"}
          </button>
          <button type="button" className="button button-ghost" onClick={() => setAdding(false)}>
            Cancel
          </button>

          <p className="muted small link-hint">{selected.hint}</p>
        </form>
      )}

      {linked.length === 0 ? (
        <p className="empty">
          Link a handle and any task tagged with that platform starts proving itself.
        </p>
      ) : (
        <div className="account-grid">
          {linked.map((profile) => (
            <article key={profile.platform} className="account-card">
              <div className="account-top">
                <PlatformIcon platform={profile.platform} title={profile.label} />
                <div className="account-name">
                  <span className="profile-label">{profile.label}</span>
                  <span className="muted small">@{profile.handle}</span>
                </div>
              </div>

              {/* Connected means a handle is stored. Whether it has ever proved a day
                  is a different claim, so the sync line makes that one separately. */}
              <span
                className={
                  profile.lastSyncError ? "account-status is-failing" : "account-status is-live"
                }
              >
                {profile.lastSyncError ? (
                  <>
                    <RefreshCw size={12} strokeWidth={2.6} aria-hidden="true" />
                    Sync failed
                  </>
                ) : (
                  <>
                    <Check size={12} strokeWidth={3} aria-hidden="true" />
                    Connected
                  </>
                )}
              </span>

              <p className={`profile-note${profile.lastSyncError ? " profile-note-error" : ""}`}>
                {profile.lastSyncError
                  ? profile.lastSyncError
                  : profile.lastSyncedAt
                    ? `Synced ${formatWhen(profile.lastSyncedAt)}`
                    : "Not synced yet"}
              </p>

              <div className="account-actions">
                {profile.url && (
                  <a
                    href={profile.url}
                    target="_blank"
                    rel="noreferrer"
                    className="icon-button icon-button-sm"
                    aria-label={`Open ${profile.handle} on ${profile.label}`}
                    title="Open profile"
                  >
                    <ExternalLink size={15} strokeWidth={1.9} aria-hidden="true" />
                  </a>
                )}
                <button
                  type="button"
                  className="icon-button icon-button-sm danger"
                  onClick={() => handleUnlink(profile.platform, profile.label)}
                  disabled={busy === profile.platform}
                  aria-label={`Disconnect ${profile.label}`}
                  title="Disconnect"
                >
                  <Trash2 size={15} strokeWidth={1.9} aria-hidden="true" />
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
