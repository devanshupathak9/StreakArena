import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Check, MoreHorizontal, Plus, Trash2, UserPlus, Users } from "lucide-react";
import { api, type GroupDetail as GroupData, type Platform } from "../lib/api";
import Avatar from "../components/Avatar";
import GroupChat from "../components/GroupChat";
import PillTabs from "../components/ui/PillTabs";
import PlatformIcon from "../components/ui/PlatformIcon";
import Scenery from "../components/ui/Scenery";

type Tab = "overview" | "challenges" | "members" | "chat";

const MEDALS = ["gold", "silver", "bronze"];

export default function GroupDetail() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState<GroupData | null>(null);
  const [platforms, setPlatforms] = useState<Platform[]>([]);
  const [tab, setTab] = useState<Tab>("overview");
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
    <div className="stack">
      <header className="group-banner">
        <Scenery variant="banner" />

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

      <PillTabs
        label="Group sections"
        active={tab}
        onChange={setTab}
        tabs={[
          { id: "overview", label: "Overview" },
          { id: "challenges", label: "Challenges", count: challenges.length },
          { id: "members", label: "Members", count: standings.length },
          { id: "chat", label: "Chat" },
        ]}
      />

      {error && <p className="error">{error}</p>}

      {tab === "overview" && (
        <div className="group-grid-2">
          <section className="card">
            <div className="card-head">
              <h2>Active challenges</h2>
              <button type="button" className="link-button" onClick={() => setTab("challenges")}>
                View all
              </button>
            </div>

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
                      <span className="challenge-count num">
                        {joined}/{standings.length}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          <GroupChat groupId={id} />
        </div>
      )}

      {tab === "challenges" && (
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
                  {option.label}
                </option>
              ))}
            </select>
            <button type="submit" className="button" disabled={busy || !title.trim()}>
              <Plus size={15} strokeWidth={2.4} aria-hidden="true" />
              Add
            </button>
          </form>

          {challenges.length > 0 && (
            <div className="challenge-list">
              {challenges.map((challenge) => (
                <div key={challenge.id} className="challenge-row">
                  <PlatformIcon platform={challenge.platform?.id ?? null} title={challenge.title} />
                  <div className="challenge-body">
                    <span className="challenge-title">{challenge.title}</span>
                    <span className="muted small">
                      {challenge.platform ? challenge.platform.label : "Manual"} ·{" "}
                      {activeOn(challenge.id)} racing
                    </span>
                  </div>
                  <button
                    type="button"
                    className="icon-button icon-button-sm danger"
                    onClick={() => handleRemove(challenge.id, challenge.title)}
                    aria-label={`Remove ${challenge.title}`}
                  >
                    <Trash2 size={15} strokeWidth={1.9} aria-hidden="true" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {tab === "members" && (
        <section className="card">
          <div className="card-head">
            <h2>Standings</h2>
            <p className="muted small">Streak per challenge, in each member's own timezone</p>
          </div>

          {challenges.length === 0 ? (
            <p className="empty">Add a challenge and the board fills in.</p>
          ) : (
            <div className="table-wrap">
              <table className="board">
                <thead>
                  <tr>
                    <th className="board-rank">#</th>
                    <th>Member</th>
                    {challenges.map((challenge) => (
                      <th key={challenge.id} className="board-num">
                        <span title={challenge.title}>{challenge.title}</span>
                      </th>
                    ))}
                    <th className="board-num">Score</th>
                  </tr>
                </thead>
                <tbody>
                  {standings.map((standing, index) => (
                    <tr key={standing.userId} className={standing.isYou ? "board-you" : undefined}>
                      <td className="board-rank">
                        {index < 3 ? (
                          <span className={`medal medal-${MEDALS[index]}`}>{index + 1}</span>
                        ) : (
                          <span className="num">{index + 1}</span>
                        )}
                      </td>
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
                          {standing.isYou && <span className="chip chip-you">you</span>}
                        </span>
                      </td>
                      {challenges.map((challenge) => {
                        const entry = standing.challenges.find(
                          (c) => c.challengeId === challenge.id,
                        );
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
                              <span className="num">{entry.currentStreak}</span>
                            </span>
                            {entry.doneToday && (
                              <span className="board-today" title="Done today">
                                ●
                              </span>
                            )}
                          </td>
                        );
                      })}
                      <td className="board-num board-score num">{standing.score}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {tab === "chat" && <GroupChat groupId={id} />}

      <p className="muted small">
        Group challenges show up on your dashboard like any other task — platform-backed ones fill
        themselves in when you sync.
      </p>
    </div>
  );
}
