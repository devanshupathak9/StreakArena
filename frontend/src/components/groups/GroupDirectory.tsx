import { useEffect, useState } from "react";
import { NavLink } from "react-router-dom";
import { Compass, Flame, Plus, Ticket, Users } from "lucide-react";
import { api, type DiscoverableGroup } from "../../lib/api";
import { useAppData } from "../../context/AppData";
import PillTabs from "../ui/PillTabs";

type Filter = "all" | "owned" | "joined";

type Props = { onCreate: () => void; onJoin: () => void; onJoined: (id: string) => void };

export default function GroupDirectory({ onCreate, onJoin, onJoined }: Props) {
  const { groups, reloadGroups } = useAppData();
  const [filter, setFilter] = useState<Filter>("all");
  const [discover, setDiscover] = useState<DiscoverableGroup[] | null>(null);
  const [joining, setJoining] = useState("");

  useEffect(() => {
    api.discoverGroups().then(setDiscover).catch(() => setDiscover([]));
  }, [groups]);

  const mine = groups ?? [];
  const owned = mine.filter((group) => group.isOwner);
  const joined = mine.filter((group) => !group.isOwner);
  const shown = filter === "owned" ? owned : filter === "joined" ? joined : mine;

  async function handleJoin(group: DiscoverableGroup) {
    setJoining(group.id);
    try {
      await api.joinPublicGroup(group.id);
      await reloadGroups();
      onJoined(group.id);
    } finally {
      setJoining("");
    }
  }

  return (
    <aside className="group-directory">
      <div className="directory-head">
        <h2>Your groups</h2>
        <button type="button" className="button button-sm" onClick={onCreate}>
          <Plus size={15} strokeWidth={2.6} aria-hidden="true" />
          Create
        </button>
      </div>

      <PillTabs
        label="Filter groups"
        active={filter}
        onChange={setFilter}
        tabs={[
          { id: "all" as Filter, label: "All", count: mine.length },
          { id: "owned" as Filter, label: "Mine", count: owned.length },
          { id: "joined" as Filter, label: "Joined", count: joined.length },
        ]}
      />

      {shown.length === 0 ? (
        <div className="directory-empty">
          <p className="muted small">
            {mine.length === 0
              ? "No groups yet. Create one or join your friends to start competing."
              : "Nothing in this filter."}
          </p>
        </div>
      ) : (
        <nav className="directory-list" aria-label="Your groups">
          {shown.map((group) => (
            <NavLink
              key={group.id}
              to={`/groups/${group.id}`}
              className={({ isActive }) => `directory-item${isActive ? " is-active" : ""}`}
            >
              <span className="directory-icon" aria-hidden="true">
                <Users size={17} strokeWidth={2} />
              </span>
              <span className="directory-body">
                <span className="directory-name">{group.name}</span>
                <span className="muted small">
                  {group.memberCount} member{group.memberCount === 1 ? "" : "s"}
                </span>
              </span>
              {group.owedToday && (
                <Flame
                  size={15}
                  strokeWidth={2.2}
                  className="flame-tint"
                  aria-label="Something still owed here today"
                />
              )}
            </NavLink>
          ))}
        </nav>
      )}

      <button type="button" className="button button-ghost button-block" onClick={onJoin}>
        <Ticket size={15} strokeWidth={2.2} aria-hidden="true" />
        Join with a code
      </button>

      <div className="directory-head directory-head-sub">
        <h2>
          <Compass size={15} strokeWidth={2.2} aria-hidden="true" />
          Discover
        </h2>
      </div>

      {discover === null ? (
        <div className="skeleton" style={{ height: 90, borderRadius: "var(--radius-md)" }} />
      ) : discover.length === 0 ? (
        <p className="muted small directory-empty">
          No public groups to join right now. Make one public and it shows up here for everyone.
        </p>
      ) : (
        <div className="directory-list">
          {discover.map((group) => (
            <div key={group.id} className="directory-item is-static">
              <span className="directory-body">
                <span className="directory-name">{group.name}</span>
                <span className="muted small">
                  {group.memberCount} member{group.memberCount === 1 ? "" : "s"}
                </span>
              </span>
              <button
                type="button"
                className="button button-sm button-ghost"
                onClick={() => void handleJoin(group)}
                disabled={joining === group.id}
              >
                {joining === group.id ? "…" : "Join"}
              </button>
            </div>
          ))}
        </div>
      )}
    </aside>
  );
}
