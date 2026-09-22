import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api, type GroupSummary } from "../lib/api";

export default function Groups() {
  const navigate = useNavigate();
  const [groups, setGroups] = useState<GroupSummary[] | null>(null);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function load() {
    try {
      setGroups(await api.groups());
    } catch (err) {
      setError((err as Error).message);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function handleCreate(event: FormEvent) {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed || busy) return;

    setError("");
    setBusy(true);
    try {
      const group = await api.createGroup(trimmed);
      navigate(`/groups/${group.id}`);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function handleJoin(event: FormEvent) {
    event.preventDefault();
    const trimmed = code.trim();
    if (!trimmed || busy) return;

    setError("");
    setBusy(true);
    try {
      const { group } = await api.joinGroup(trimmed);
      navigate(`/groups/${group.id}`);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="stack">
      <div className="page-head">
        <div>
          <h1>Groups</h1>
          <p className="muted">Race your friends on the same daily challenges.</p>
        </div>
      </div>

      {error && <p className="error">{error}</p>}

      <div className="split">
        <form className="card stack" onSubmit={handleCreate}>
          <h2>Start a group</h2>
          <p className="muted small">You'll get an invite code to share.</p>
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Grind Squad"
            maxLength={60}
            aria-label="Group name"
          />
          <button type="submit" className="button" disabled={busy || !name.trim()}>
            Create group
          </button>
        </form>

        <form className="card stack" onSubmit={handleJoin}>
          <h2>Join a group</h2>
          <p className="muted small">Paste the code a friend sent you.</p>
          <input
            value={code}
            onChange={(event) => setCode(event.target.value.toUpperCase())}
            placeholder="ABDJ47"
            maxLength={6}
            className="code-input"
            aria-label="Invite code"
          />
          <button type="submit" className="button button-secondary" disabled={busy || !code.trim()}>
            Join
          </button>
        </form>
      </div>

      {groups === null ? (
        <div className="skeleton skeleton-row" />
      ) : groups.length === 0 ? (
        <p className="empty">No groups yet — create one above, or join with a friend's code.</p>
      ) : (
        <div className="stack">
          {groups.map((group) => (
            <Link key={group.id} to={`/groups/${group.id}`} className="group-card">
              <div>
                <h3>{group.name}</h3>
                <p className="task-meta">
                  <span>
                    {group.memberCount} member{group.memberCount === 1 ? "" : "s"}
                  </span>
                  <span className="dot">·</span>
                  <span>
                    {group.challengeCount} challenge{group.challengeCount === 1 ? "" : "s"}
                  </span>
                  {group.isOwner && (
                    <>
                      <span className="dot">·</span>
                      <span>you own this</span>
                    </>
                  )}
                </p>
              </div>
              <code className="code-chip">{group.inviteCode}</code>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
