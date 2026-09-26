import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Check,
  Crown,
  Globe,
  Home,
  Lock,
  MessageSquare,
  Settings,
  SquareCheck,
  Trophy,
  UserPlus,
  Users,
} from "lucide-react";
import { api, type GroupDetail as GroupData, type Platform } from "../../lib/api";
import GroupChat from "../GroupChat";
import PillTabs from "../ui/PillTabs";
import Scenery from "../ui/Scenery";
import GroupMembers from "./GroupMembers";
import GroupSettings from "./GroupSettings";
import GroupStats from "./GroupStats";
import GroupTasks from "./GroupTasks";

type Tab = "overview" | "tasks" | "members" | "chat" | "leaderboard" | "settings";

const TABS: { id: Tab; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "tasks", label: "Tasks" },
  { id: "members", label: "Members" },
  { id: "chat", label: "Chat" },
  { id: "leaderboard", label: "Leaderboard" },
  { id: "settings", label: "Settings" },
];

const TAB_ICONS = {
  overview: Home,
  tasks: SquareCheck,
  members: Users,
  chat: MessageSquare,
  leaderboard: Trophy,
  settings: Settings,
} as const;

const MEDALS = ["gold", "silver", "bronze"];

export default function GroupView({ id }: { id: string }) {
  const navigate = useNavigate();
  const [data, setData] = useState<GroupData | null>(null);
  const [platforms, setPlatforms] = useState<Platform[]>([]);
  const [tab, setTab] = useState<Tab>("overview");
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      setData(await api.group(id));
    } catch (err) {
      setError((err as Error).message);
    }
  }, [id]);

  useEffect(() => {
    setData(null);
    setTab("overview");
    setError("");
    void load();
  }, [load]);

  useEffect(() => {
    api.platforms().then(setPlatforms).catch(() => setPlatforms([]));
  }, []);

  async function handleAdd(title: string, platform: string | null) {
    setError("");
    setBusy(true);
    try {
      await api.createChallenge(id, title, platform);
      await load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function handleRemove(challengeId: string, title: string) {
    if (
      !window.confirm(
        `Remove "${title}" from the group? Everyone keeps their own copy and its history.`,
      )
    )
      return;
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
      // Clipboard needs a secure context; the code is on the button either way.
      setError("Couldn't copy — the code is on the invite button.");
    }
  }

  if (error && !data) return <p className="error">{error}</p>;
  if (!data) return <div className="skeleton" style={{ height: 420, borderRadius: 16 }} />;

  const { group, challenges, standings } = data;
  const Private = group.visibility === "private" ? Lock : Globe;

  return (
    <div className="group-main">
      <header className="group-banner">
        <Scenery variant="hero" />

        <div className="banner-actions">
          <button type="button" className="button button-sm" onClick={copyCode}>
            {copied ? (
              <>
                <Check size={14} strokeWidth={3} aria-hidden="true" />
                Copied
              </>
            ) : (
              <>
                <UserPlus size={14} strokeWidth={2.2} aria-hidden="true" />
                Invite · {group.inviteCode}
              </>
            )}
          </button>
        </div>

        <div className="banner-identity">
          <span className="group-avatar group-avatar-lg" aria-hidden="true">
            <Crown size={26} strokeWidth={2} />
          </span>
          <div>
            <h1>{group.name}</h1>
            {group.description && <p className="banner-tagline">{group.description}</p>}
            <ul className="profile-meta">
              <li>
                <Users size={14} strokeWidth={2} aria-hidden="true" />
                {standings.length} member{standings.length === 1 ? "" : "s"}
              </li>
              <li>
                <Private size={14} strokeWidth={2} aria-hidden="true" />
                {group.visibility === "private" ? "Private" : "Public"}
              </li>
              <li>
                Created{" "}
                {new Date(group.createdAt).toLocaleDateString(undefined, {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </li>
            </ul>
          </div>
        </div>

        <figure className="hero-quote">
          <blockquote>“Discipline together creates unstoppable progress.”</blockquote>
          <span className="hero-quote-rule" aria-hidden="true" />
        </figure>
      </header>

      <div className="group-tabs">
        <PillTabs
          label="Group sections"
          active={tab}
          onChange={setTab}
          tabs={TABS.map((entry) => ({
            id: entry.id,
            label: entry.label,
            icon: TAB_ICONS[entry.id],
          }))}
        />
      </div>

      {error && <p className="error">{error}</p>}

      <GroupStats standings={standings} challengeCount={challenges.length} />

      {tab === "overview" && (
        <>
          <div className="group-overview">
            <GroupTasks
              challenges={challenges}
              standings={standings}
              platforms={platforms}
              isOwner={group.isOwner}
              busy={busy}
              onAdd={handleAdd}
              onRemove={handleRemove}
            />
            <div className="stack">
              <GroupMembers standings={standings} ownerId={group.ownerId} compact />
              <GroupChat groupId={id} />
            </div>
          </div>
        </>
      )}

      {tab === "tasks" && (
        <GroupTasks
          challenges={challenges}
          standings={standings}
          platforms={platforms}
          isOwner={group.isOwner}
          busy={busy}
          onAdd={handleAdd}
          onRemove={handleRemove}
        />
      )}

      {tab === "members" && <GroupMembers standings={standings} ownerId={group.ownerId} />}

      {tab === "chat" && <GroupChat groupId={id} />}

      {tab === "leaderboard" && (
        <section className="card">
          <div className="card-head">
            <h2>{group.name} leaderboard</h2>
            <p className="muted small">Verified days score, in each member's own timezone</p>
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
                    <th className="board-num">Streak</th>
                    <th className="board-num">Days done</th>
                    <th className="board-num">Score</th>
                  </tr>
                </thead>
                <tbody>
                  {standings.map((member, index) => (
                    <tr key={member.userId} className={member.isYou ? "board-you" : undefined}>
                      <td className="board-rank">
                        {index < 3 ? (
                          <span className={`medal medal-${MEDALS[index]}`}>{index + 1}</span>
                        ) : (
                          <span className="num">{index + 1}</span>
                        )}
                      </td>
                      <td>
                        <span className="member-cell">
                          <span className="member-name">
                            <strong>{member.displayName || member.username}</strong>
                          </span>
                          {member.isYou && <span className="chip chip-you">you</span>}
                        </span>
                      </td>
                      <td className="board-num">
                        <span className="flame">
                          <span className="num">
                            {member.challenges.reduce((max, c) => Math.max(max, c.currentStreak), 0)}
                          </span>
                        </span>
                      </td>
                      <td className="board-num num">
                        {member.challenges.reduce((sum, c) => sum + c.totalDays, 0)}
                      </td>
                      <td className="board-num board-score num">{member.score}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {tab === "settings" && (
        <GroupSettings
          group={group}
          onSaved={load}
          onLeave={handleLeave}
          onDelete={handleDelete}
        />
      )}
    </div>
  );
}
