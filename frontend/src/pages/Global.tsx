import { useEffect, useState } from "react";
import { api, type GlobalBoard } from "../lib/api";
import Avatar from "../components/Avatar";

const RANKS = ["🥇", "🥈", "🥉"];

export default function Global() {
  const [data, setData] = useState<GlobalBoard | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .global()
      .then(setData)
      .catch((err) => setError((err as Error).message));
  }, []);

  if (error) return <p className="error">{error}</p>;
  if (!data) return <div className="skeleton skeleton-row" />;

  return (
    <div className="stack">
      <div className="page-head">
        <div>
          <h1>Global dashboard</h1>
          <p className="muted">
            Everyone on StreakArena, ranked by their longest running streak.
            {data.yourRank && ` You're #${data.yourRank}.`}
          </p>
        </div>
      </div>

      <div className="stat-grid">
        <div className="stat-card">
          <span className="stat-value">{data.totals.members}</span>
          <span className="stat-label">members</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">{data.totals.tasks}</span>
          <span className="stat-label">tasks tracked</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">{data.totals.days}</span>
          <span className="stat-label">days logged</span>
        </div>
        <div className="stat-card">
          <span className="stat-value stat-value-flame">{data.totals.verified}</span>
          <span className="stat-label">verified by platforms</span>
        </div>
      </div>

      <section className="card">
        <div className="card-head">
          <h2>Leaderboard</h2>
          <p className="muted small">Live streak first, then lifetime best</p>
        </div>

        {data.board.length === 0 ? (
          <p className="empty">Nobody here yet.</p>
        ) : (
          <div className="table-wrap">
            <table className="board">
              <thead>
                <tr>
                  <th className="board-rank">#</th>
                  <th>Member</th>
                  <th className="board-num">Streak</th>
                  <th className="board-num">Best</th>
                  <th className="board-num">Days</th>
                  <th className="board-num">Verified</th>
                </tr>
              </thead>
              <tbody>
                {data.board.map((row, index) => (
                  <tr key={row.userId} className={row.isYou ? "board-you" : undefined}>
                    <td className="board-rank">{RANKS[index] ?? index + 1}</td>
                    <td>
                      <span className="member-cell">
                        <Avatar
                          username={row.username}
                          displayName={row.displayName}
                          avatarUrl={row.avatarUrl}
                          size={32}
                        />
                        <span className="member-name">
                          <strong>{row.displayName || row.username}</strong>
                          {row.displayName && <span className="muted small">@{row.username}</span>}
                        </span>
                        {row.isYou && <span className="badge">you</span>}
                      </span>
                    </td>
                    <td className="board-num">
                      <span className={row.currentStreak > 0 ? "flame" : "flame flame-cold"}>
                        🔥 {row.currentStreak}
                      </span>
                    </td>
                    <td className="board-num">{row.longestStreak}</td>
                    <td className="board-num">{row.activeDays}</td>
                    <td className="board-num board-score">{row.verifiedDays}</td>
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
