import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api, type GroupDetail as GroupData, type Platform } from "../lib/api";
import Avatar from "../components/Avatar";

/** Medals for the top three, plain numbers after that. */
const RANKS = ["🥇", "🥈", "🥉"];

export default function GroupDetail() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState<GroupData | null>(null);
  const [platforms, setPlatforms] = useState<Platform[]>([]);
  const [title, setTitle] = useState("");
  const [platform, setPlatform] = useState("");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
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
      setError("Couldn't copy — the code is shown above.");
    }
  }

  if (error && !data) return <p className="error">{error}</p>;
  if (!data) return <div className="skeleton skeleton-row" />;

  const { group, challenges, standings } = data;

  return (
    <div className="stack">
      <div className="page-head">
        <div>
          <h1>{group.name}</h1>
          <p className="muted">
            {standings.length} member{standings.length === 1 ? "" : "s"} · ranked by combined live
            streaks
          </p>
        </div>

        <div className="task-actions">
          <button type="button" className="button button-secondary" onClick={copyCode}>
            {copied ? "✓ Copied" : `Invite: ${group.inviteCode}`}
          </button>
          {group.isOwner ? (
            <button type="button" className="link-button danger" onClick={handleDelete}>
              Delete group
            </button>
          ) : (
            <button type="button" className="link-button danger" onClick={handleLeave}>
              Leave
            </button>
          )}
        </div>
      </div>

      {error && <p className="error">{error}</p>}

      <section className="card">
        <div className="card-head">
          <h2>Leaderboard</h2>
          <p className="muted small">Streak per challenge, in each member's own timezone</p>
        </div>

        {challenges.length === 0 ? (
          <p className="empty">No challenges yet — add the first one below.</p>
        ) : (
          <div className="table-wrap">
            <table className="board">
              <thead>
                <tr>
                  <th className="board-rank">#</th>
                  <th>Member</th>
                  {challenges.map((challenge) => (
                    <th key={challenge.id} className="board-num">
                      <span title={challenge.title}>
                        {challenge.platform ? `${challenge.platform.emoji} ` : ""}
                        {challenge.title}
                      </span>
                    </th>
                  ))}
                  <th className="board-num">Score</th>
                </tr>
              </thead>
              <tbody>
                {standings.map((standing, index) => (
                  <tr key={standing.userId} className={standing.isYou ? "board-you" : undefined}>
                    <td className="board-rank">{RANKS[index] ?? index + 1}</td>
                    <td>
                      <span className="member-cell">
                        <Avatar
                          username={standing.username}
                          displayName={standing.displayName}
                          avatarUrl={standing.avatarUrl}
                          size={28}
                        />
                        <span className="member-name">
                          <strong>{standing.displayName || standing.username}</strong>
                        </span>
                        {standing.isYou && <span className="badge">you</span>}
                      </span>
                    </td>
                    {challenges.map((challenge) => {
                      const entry = standing.challenges.find((c) => c.challengeId === challenge.id);
                      if (!entry?.joined) {
                        return (
                          <td key={challenge.id} className="board-num muted">
                            —
                          </td>
                        );
                      }
                      return (
                        <td key={challenge.id} className="board-num">
                          <span className={entry.currentStreak > 0 ? "flame" : "flame flame-cold"}>
                            {entry.currentStreak}
                          </span>
                          {entry.doneToday && (
                            <span className="board-today" title="Done today">
                              ●
                            </span>
                          )}
                        </td>
                      );
                    })}
                    <td className="board-num board-score">{standing.score}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="card">
        <div className="card-head">
          <h2>Challenges</h2>
          <p className="muted small">Everyone in the group gets their own copy</p>
        </div>

        <form className="task-form" onSubmit={handleAdd}>
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Add a challenge — e.g. One LeetCode a day"
            maxLength={80}
            aria-label="New challenge"
          />
          <select
            value={platform}
            onChange={(event) => setPlatform(event.target.value)}
            aria-label="Platform (optional)"
          >
            <option value="">No platform</option>
            {platforms.map((option) => (
              <option key={option.id} value={option.id}>
                {option.emoji} {option.label}
              </option>
            ))}
          </select>
          <button type="submit" className="button" disabled={busy || !title.trim()}>
            Add
          </button>
        </form>

        {challenges.length > 0 && (
          <div className="challenge-list">
            {challenges.map((challenge) => (
              <div key={challenge.id} className="challenge-row">
                <span>
                  {challenge.platform && (
                    <span className="badge">
                      <span aria-hidden="true">{challenge.platform.emoji}</span>{" "}
                      {challenge.platform.label}
                    </span>
                  )}{" "}
                  {challenge.title}
                </span>
                <button
                  type="button"
                  className="link-button danger"
                  onClick={() => handleRemove(challenge.id, challenge.title)}
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      <p className="muted small">
        Group challenges show up on your dashboard like any other task — platform-backed ones fill
        themselves in when you sync.
      </p>
    </div>
  );
}
