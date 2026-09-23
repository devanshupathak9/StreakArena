import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Plus, Search, Users } from "lucide-react";
import { api } from "../lib/api";
import Scenery from "../components/ui/Scenery";
import { useAppData } from "../context/AppData";

/** A stable crop offset per group, so a group looks the same every time you see it. */
function coverOffset(id: string) {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) % 100;
  return hash;
}

export default function Groups() {
  const navigate = useNavigate();
  const { groups, reloadGroups } = useAppData();
  const [query, setQuery] = useState("");
  const [composing, setComposing] = useState(false);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void reloadGroups().catch((err) => setError((err as Error).message));
  }, [reloadGroups]);

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

  const needle = query.trim().toLowerCase();
  const shown = (groups ?? []).filter((group) => group.name.toLowerCase().includes(needle));

  return (
    <div className="stack">
      <header className="page-head">
        <div>
          <h1>Groups</h1>
          <p className="muted">Join challenges, compete with friends, and stay accountable.</p>
        </div>

        <button type="button" className="button" onClick={() => setComposing(!composing)}>
          <Plus size={16} strokeWidth={2.4} aria-hidden="true" />
          Create group
        </button>
      </header>

      {error && <p className="error">{error}</p>}

      {composing && (
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
              autoFocus
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
            <button type="submit" className="button button-ghost" disabled={busy || !code.trim()}>
              Join
            </button>
          </form>
        </div>
      )}

      <div className="search-field">
        <Search size={16} strokeWidth={2} aria-hidden="true" />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search groups…"
          aria-label="Search groups"
        />
      </div>

      {groups === null ? (
        <div className="skeleton" style={{ height: 180, borderRadius: "var(--radius-lg)" }} />
      ) : shown.length === 0 ? (
        <p className="empty">
          {groups.length === 0
            ? "No groups yet — create one, or join with a friend's code."
            : `No group matches “${query}”.`}
        </p>
      ) : (
        <div className="group-grid">
          {shown.map((group) => (
            <article key={group.id} className="group-card">
              <div className="group-cover">
                <Scenery variant="cover" offset={coverOffset(group.id)} />
              </div>

              <div className="group-card-body">
                <div className="group-card-head">
                  <span className="group-avatar" aria-hidden="true">
                    <Users size={20} strokeWidth={2} />
                  </span>
                  <div>
                    <h3>{group.name}</h3>
                    <p className="muted small">
                      {group.memberCount} member{group.memberCount === 1 ? "" : "s"}
                    </p>
                  </div>
                </div>

                <p className="group-card-note">
                  {group.challengeCount === 0
                    ? "No challenges yet — add the first one."
                    : `${group.challengeCount} challenge${group.challengeCount === 1 ? "" : "s"} running${
                        group.yourRank ? `. You're #${group.yourRank}.` : "."
                      }`}
                </p>

                <div className="group-card-foot">
                  <div className="chips">
                    {group.isOwner && <span className="chip">Owner</span>}
                    {group.owedToday && <span className="chip chip-warn">Owed today</span>}
                    <code className="chip chip-code">{group.inviteCode}</code>
                  </div>
                  <Link to={`/groups/${group.id}`} className="button button-sm">
                    View
                  </Link>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
