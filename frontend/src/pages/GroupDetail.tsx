import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Check, MoreHorizontal, Plus, Trash2, UserPlus, Users } from "lucide-react";
import { api, type GroupDetail as GroupData, type Platform } from "../lib/api";
import Avatar from "../components/Avatar";
import GroupChat from "../components/GroupChat";
import PlatformIcon from "../components/ui/PlatformIcon";
import Scenery from "../components/ui/Scenery";

const MEDALS = ["gold", "silver", "bronze"];

export default function GroupDetail() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState<GroupData | null>(null);
  const [platforms, setPlatforms] = useState<Platform[]>([]);
  const [composing, setComposing] = useState(false);
  const [title, setTitle] = useState("");
  const [platform, setPlatform] = useState("");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      setData(await api.group(id));
    } catch (err) {
      setError((err as Error).message);
    }
  }, [id]);

  useEffect(() => {
    void load();
    api.platforms().then(setPlatforms).catch(() => setPlatforms([]));
  }, [load]);

  async function handleAdd(event: FormEvent) {
    event.preventDefault();
    const trimmed = title.trim();
    if (!trimmed || busy) return;

    setError("");
    setBusy(true);
    try {
      await api.createChallenge(id, trimmed, platform || null);
      setTitle("");
      setPlatform("");
      setComposing(false);
      await load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function handleRemove(challengeId: string, challengeTitle: string) {
    if (
      !window.confirm(
        `Remove "${challengeTitle}" from the group? Everyone keeps their own copy and its history.`,
      )
    )
      return;

    setError("");
    try {
      await api.deleteChallenge(id, challengeId);
      await load();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function handleLeave() {
    if (!window.confirm("Leave this group? Your tasks and streaks stay with you.")) return;
    try {
      await api.leaveGroup(id);
      navigate("/groups");
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function handleDelete() {
    if (!data) return;
    if (!window.confirm(`Delete "${data.group.name}" for everyone? Streaks aren't deleted.`)) return;
    try {
      await api.deleteGroup(id);
      navigate("/groups");
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function copyCode() {
    if (!data) return;
    try {
      await navigator.clipboard.writeText(data.group.inviteCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard needs a secure context; the code is on screen to read regardless.
      setError("Couldn't copy — the code is shown on the invite button.");
    }
  }

  if (error && !data) return <p className="error">{error}</p>;
  if (!data) return <div className="skeleton" style={{ height: 320, borderRadius: 16 }} />;

  const { group, challenges, standings } = data;

  /** How many members have this challenge running right now. */
  function activeOn(challengeId: string) {
    return standings.filter(
      (s) => s.challenges.find((c) => c.challengeId === challengeId)?.joined,
    ).length;
  }

  function doneTodayOn(challengeId: string) {
    return standings.filter(
      (s) => s.challenges.find((c) => c.challengeId === challengeId)?.doneToday,
    ).length;
  }

  return (
    <div className="dashboard">
      <header className="group-banner">
        <Scenery variant="hero" />

        <button
          type="button"
          className="icon-button banner-back"
          onClick={() => navigate("/groups")}
          aria-label="Back to groups"
        >
          <ArrowLeft size={18} strokeWidth={2} aria-hidden="true" />
        </button>

        <div className="banner-actions">
          <button type="button" className="button button-sm" onClick={copyCode}>
            {copied ? (
              <>
                <Check size={14} strokeWidth={3} aria-hidden="true" />
                Code copied
              </>
            ) : (
              <>
                <UserPlus size={14} strokeWidth={2.2} aria-hidden="true" />
                Invite · {group.inviteCode}
              </>
            )}
          </button>

          <button
            type="button"
            className="icon-button"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-expanded={menuOpen}
            aria-haspopup="menu"
            aria-label="Group options"
          >
            <MoreHorizontal size={18} strokeWidth={2} aria-hidden="true" />
          </button>

          {menuOpen && (
            <div className="account-menu banner-menu" role="menu">
              {group.isOwner ? (
                <button type="button" role="menuitem" className="danger" onClick={handleDelete}>
                  Delete group
                </button>
              ) : (
                <button type="button" role="menuitem" className="danger" onClick={handleLeave}>
                  Leave group
                </button>
              )}
            </div>
          )}
        </div>

        <div className="banner-identity">
          <span className="group-avatar group-avatar-lg" aria-hidden="true">
            <Users size={26} strokeWidth={2} />
          </span>
          <div>
            <h1>{group.name}</h1>
            <p className="muted small">
              {standings.length} member{standings.length === 1 ? "" : "s"} · {challenges.length}{" "}
              challenge{challenges.length === 1 ? "" : "s"}
            </p>
          </div>
        </div>
      </header>

      {error && <p className="error">{error}</p>}

      <div className="group-overview">
        <section className="card">
          <div className="card-head">
            <h2>Challenges</h2>
            <button type="button" className="button button-sm" onClick={() => setComposing(!composing)}>
              <Plus size={15} strokeWidth={2.6} aria-hidden="true" />
              Add task
            </button>
          </div>

          {composing && (
            <form className="composer task-form" onSubmit={handleAdd}>
              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="One LeetCode a day"
                maxLength={80}
                aria-label="New challenge"
                autoFocus
              />
              <select
                value={platform}
                onChange={(event) => setPlatform(event.target.value)}
                aria-label="Platform (optional)"
              >
                <option value="">Manual</option>
                {platforms.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
              <button type="submit" className="button" disabled={busy || !title.trim()}>
                Add
              </button>
            </form>
          )}

          {challenges.length === 0 ? (
            <p className="empty">
              No challenges yet. Add one and everyone in the group starts racing it.
            </p>
          ) : (
            <div className="challenge-list">
              {challenges.map((challenge) => {
                const joined = activeOn(challenge.id);
                const done = doneTodayOn(challenge.id);
                const pct = joined === 0 ? 0 : (done / joined) * 100;
                return (
                  <div key={challenge.id} className="challenge-row">
                    <PlatformIcon
                      platform={challenge.platform?.id ?? null}
                      title={challenge.title}
                    />
                    <div className="challenge-body">
                      <span className="challenge-title">{challenge.title}</span>
                      <span className="muted small">
                        {done} of {joined} done today
                      </span>
                      <span className="bar">
                        <span className="bar-fill" style={{ width: `${pct}%` }} />
                      </span>
                    </div>
                    {group.isOwner && (
                      <button
                        type="button"
                        className="icon-button icon-button-sm danger"
                        onClick={() => handleRemove(challenge.id, challenge.title)}
                        aria-label={`Remove ${challenge.title}`}
                      >
                        <Trash2 size={15} strokeWidth={1.9} aria-hidden="true" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section className="card">
          <div className="card-head">
            <h2>Members</h2>
            <p className="muted small">Points are verified days</p>
          </div>

          <ol className="member-list">
            {standings.map((standing, index) => {
              const streak = standing.challenges.reduce(
                (max, c) => Math.max(max, c.currentStreak),
                0,
              );
              return (
                <li
                  key={standing.userId}
                  className={standing.isYou ? "member-row member-you" : "member-row"}
                >
                  <span className="member-rank">
                    {index < 3 ? (
                      <span className={`medal medal-${MEDALS[index]}`}>{index + 1}</span>
                    ) : (
                      <span className="num">{index + 1}</span>
                    )}
                  </span>

                  <Avatar
                    username={standing.username}
                    displayName={standing.displayName}
                    avatarUrl={standing.avatarUrl}
                    size={32}
                  />

                  <span className="member-detail">
                    <span className="member-label">
                      {standing.displayName || standing.username}
                      {standing.isYou && <span className="chip chip-you">you</span>}
                    </span>
                    <span className="muted small">
                      <span className="flame-icon" aria-hidden="true">
                        🔥
                      </span>{" "}
                      {streak} day{streak === 1 ? "" : "s"} · {standing.doneToday} done today
                    </span>
                  </span>

                  <span className="member-points num">{standing.score}</span>
                </li>
              );
            })}
          </ol>
        </section>
      </div>

      <GroupChat groupId={id} />
    </div>
  );
}
