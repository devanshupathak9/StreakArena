import { useEffect, useMemo, useState } from "react";
import { api, type GlobalBoard, type GroupDetail, type GroupSummary } from "../lib/api";
import Avatar from "../components/Avatar";
import PillTabs from "../components/ui/PillTabs";
import { useAppData } from "../context/AppData";

type Scope = "streak" | "total" | "verified";

type Row = {
  userId: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  isYou: boolean;
  currentStreak: number;
  totalDone: number;
  verified: number;
};

const MEDALS = ["gold", "silver", "bronze"];

function fromGlobal(board: GlobalBoard): Row[] {
  return board.board.map((row) => ({
    userId: row.userId,
    username: row.username,
    displayName: row.displayName,
    avatarUrl: row.avatarUrl,
    isYou: row.isYou,
    currentStreak: row.currentStreak,
    totalDone: row.activeDays,
    verified: row.verifiedDays,
  }));
}

function fromGroup(detail: GroupDetail): Row[] {
  return detail.standings.map((standing) => ({
    userId: standing.userId,
    username: standing.username,
    displayName: standing.displayName,
    avatarUrl: standing.avatarUrl,
    isYou: standing.isYou,
    currentStreak: standing.challenges.reduce((max, c) => Math.max(max, c.currentStreak), 0),
    totalDone: standing.challenges.reduce((sum, c) => sum + c.totalDays, 0),
    verified: standing.score,
  }));
}

export default function Leaderboard() {
  const { groups } = useAppData();
  const [scopeId, setScopeId] = useState<string>("global");
  const [scope, setScope] = useState<Scope>("streak");
  const [rows, setRows] = useState<Row[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    setRows(null);
    setError("");

    const request =
      scopeId === "global"
        ? api.global().then(fromGlobal)
        : api.group(scopeId).then(fromGroup);

    request
      .then((result) => {
        if (!cancelled) setRows(result);
      })
      .catch((err) => {
        if (!cancelled) setError((err as Error).message);
      });

    return () => {
      cancelled = true;
    };
  }, [scopeId]);

  const sorted = useMemo(() => {
    if (!rows) return null;
    const key: keyof Row =
      scope === "streak" ? "currentStreak" : scope === "total" ? "totalDone" : "verified";
    return [...rows].sort((a, b) => (b[key] as number) - (a[key] as number));
  }, [rows, scope]);

  const yourRank = sorted ? sorted.findIndex((row) => row.isYou) + 1 : 0;
  const options: (GroupSummary | null)[] = [null, ...(groups ?? [])];

  return (
    <div className="stack">
      <header className="page-head">
        <div>
          <h1>Leaderboard</h1>
          <p className="muted">
            {yourRank > 0
              ? `Top performers. You're #${yourRank}. Keep going.`
              : "Top performers. Keep going."}
          </p>
        </div>

        <select
          className="select-sm"
          value={scopeId}
          onChange={(event) => setScopeId(event.target.value)}
          aria-label="Leaderboard scope"
        >
          {options.map((group) => (
            <option key={group?.id ?? "global"} value={group?.id ?? "global"}>
              {group ? group.name : "Everyone"}
            </option>
          ))}
        </select>
      </header>

      <PillTabs
        label="Rank by"
        active={scope}
        onChange={setScope}
        tabs={[
          { id: "streak", label: "Streaks" },
          { id: "total", label: "Total completions" },
          { id: "verified", label: "Verified days" },
        ]}
      />

      {error && <p className="error">{error}</p>}

      <section className="card">
        {!sorted ? (
          <div className="skeleton" style={{ height: 240, borderRadius: "var(--radius-md)" }} />
        ) : sorted.length === 0 ? (
          <p className="empty">No one is tracking a streak here yet.</p>
        ) : (
          <div className="table-wrap">
            <table className="board">
              <thead>
                <tr>
                  <th className="board-rank">#</th>
                  <th>User</th>
                  <th className="board-num">Streak</th>
                  <th className="board-num">Total done</th>
                  <th className="board-num">Verified</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((row, index) => (
                  <tr key={row.userId} className={row.isYou ? "board-you" : undefined}>
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
                          username={row.username}
                          displayName={row.displayName}
                          avatarUrl={row.avatarUrl}
                          size={28}
                        />
                        <span className="member-name">
                          <strong>{row.displayName || row.username}</strong>
                        </span>
                        {row.isYou && <span className="chip chip-you">you</span>}
                      </span>
                    </td>
                    <td className="board-num">
                      <span className={row.currentStreak > 0 ? "flame" : "flame flame-cold"}>
                        <span className="flame-icon" aria-hidden="true">
                          🔥
                        </span>
                        <span className="num">{row.currentStreak}</span>
                      </span>
                    </td>
                    <td className="board-num num">{row.totalDone}</td>
                    <td className="board-num board-score num">{row.verified}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <p className="muted small">
        Your username, name and avatar are visible to everyone signed in here. Your email never is.
      </p>
    </div>
  );
}
