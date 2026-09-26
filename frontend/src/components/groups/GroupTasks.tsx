import { useState, type FormEvent } from "react";
import { Plus, Trash2 } from "lucide-react";
import type { GroupChallenge, Platform, Standing } from "../../lib/api";
import PlatformIcon from "../ui/PlatformIcon";

type Props = {
  challenges: GroupChallenge[];
  standings: Standing[];
  platforms: Platform[];
  isOwner: boolean;
  busy: boolean;
  onAdd: (title: string, platform: string | null) => Promise<void>;
  onRemove: (id: string, title: string) => void;
};

export default function GroupTasks({
  challenges,
  standings,
  platforms,
  isOwner,
  busy,
  onAdd,
  onRemove,
}: Props) {
  const [composing, setComposing] = useState(false);
  const [title, setTitle] = useState("");
  const [platform, setPlatform] = useState("");

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!title.trim() || busy) return;
    await onAdd(title.trim(), platform || null);
    setTitle("");
    setPlatform("");
    setComposing(false);
  }

  /** Everyone racing a challenge, and how many settled it today. */
  function progress(challengeId: string) {
    const entries = standings
      .map((member) => member.challenges.find((c) => c.challengeId === challengeId))
      .filter((entry) => entry?.joined);
    return {
      joined: entries.length,
      done: entries.filter((entry) => entry?.doneToday).length,
      best: entries.reduce((max, entry) => Math.max(max, entry?.currentStreak ?? 0), 0),
    };
  }

  return (
    <section className="card">
      <div className="card-head">
        <h2>Group tasks</h2>
        <button type="button" className="button button-sm" onClick={() => setComposing(!composing)}>
          <Plus size={15} strokeWidth={2.6} aria-hidden="true" />
          Add task
        </button>
      </div>

      {composing && (
        <form className="composer task-form" onSubmit={handleSubmit}>
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Solve 5 LeetCode problems"
            maxLength={80}
            aria-label="New challenge"
            autoFocus
          />
          <select
            value={platform}
            onChange={(event) => setPlatform(event.target.value)}
            aria-label="Verified by (optional)"
          >
            <option value="">Manual</option>
            {platforms.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
          <button type="submit" className="button" disabled={busy || !title.trim()}>
            Add task
          </button>
          <button type="button" className="button button-ghost" onClick={() => setComposing(false)}>
            Cancel
          </button>
        </form>
      )}

      {challenges.length === 0 ? (
        <p className="empty">
          No group tasks yet. Add one and everyone here starts racing it.
        </p>
      ) : (
        <div className="challenge-table">
          <div className="challenge-head-row" aria-hidden="true">
            <span>Task</span>
            <span>Added by</span>
            <span>Today</span>
            <span>Best streak</span>
            <span />
          </div>

          {challenges.map((challenge) => {
            const { joined, done, best } = progress(challenge.id);
            const pct = joined === 0 ? 0 : (done / joined) * 100;
            return (
              <div key={challenge.id} className="challenge-row">
                <div className="challenge-cell challenge-cell-name">
                  <PlatformIcon platform={challenge.platform?.id ?? null} title={challenge.title} />
                  <div className="challenge-body">
                    <span className="challenge-title">{challenge.title}</span>
                    <span className="muted small">
                      {challenge.platform ? challenge.platform.label : "Manual"}
                    </span>
                  </div>
                </div>

                <span className="muted small">{challenge.addedBy ?? "—"}</span>

                <div className="challenge-cell challenge-cell-progress">
                  <span className="progress-count num">
                    {done}/{joined}
                  </span>
                  <span className="bar">
                    <span
                      className={pct < 40 ? "bar-fill is-low" : "bar-fill"}
                      style={{ width: `${pct}%` }}
                      role="progressbar"
                      aria-valuenow={done}
                      aria-valuemin={0}
                      aria-valuemax={joined}
                      aria-label={`${done} of ${joined} done today`}
                    />
                  </span>
                </div>

                <span className="streak-figure">
                  <span className="flame-icon" aria-hidden="true">
                    🔥
                  </span>
                  <span className="num">{best}</span>
                </span>

                <span className="challenge-cell challenge-cell-actions">
                  {isOwner && (
                    <button
                      type="button"
                      className="icon-button icon-button-sm danger"
                      onClick={() => onRemove(challenge.id, challenge.title)}
                      aria-label={`Remove ${challenge.title}`}
                      title="Remove for everyone"
                    >
                      <Trash2 size={15} strokeWidth={1.9} aria-hidden="true" />
                    </button>
                  )}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
