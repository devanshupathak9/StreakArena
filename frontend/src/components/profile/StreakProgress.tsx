import { useState } from "react";
import { BarChart3, Check, Flame, Target } from "lucide-react";
import type { Dashboard } from "../../lib/api";
import ProgressRing from "../ui/ProgressRing";

const RANGES = [7, 30, 90] as const;
type Range = (typeof RANGES)[number] | "all";

/**
 * "How consistent have I been?" over a window you choose. Every number here is
 * counted from the same heatmap the dashboard draws, so the ring, the rate and the
 * streaks can't disagree with each other or with the rest of the app.
 */
export default function StreakProgress({ data }: { data: Dashboard }) {
  const [range, setRange] = useState<Range>(30);

  const days = range === "all" ? data.heatmap : data.heatmap.slice(-range);
  // A day only counts against you once a task existed to do — the heatmap already
  // carries that as `total`.
  const eligible = days.filter((day) => day.total > 0);
  const completed = eligible.filter((day) => day.completed > 0).length;
  const rate = eligible.length === 0 ? 0 : Math.round((completed / eligible.length) * 100);

  const current = data.tasks.reduce((max, task) => Math.max(max, task.currentStreak), 0);
  const best = data.tasks.reduce((max, task) => Math.max(max, task.longestStreak), 0);

  return (
    <section className="card streak-card">
      <div className="card-head">
        <div className="head-title">
          <Flame size={18} strokeWidth={2.2} className="flame-tint" aria-hidden="true" />
          <h2>Streak progress</h2>
        </div>

        <select
          className="select-sm"
          value={String(range)}
          onChange={(event) =>
            setRange(event.target.value === "all" ? "all" : (Number(event.target.value) as Range))
          }
          aria-label="Streak progress period"
        >
          {RANGES.map((option) => (
            <option key={option} value={option}>
              Last {option} days
            </option>
          ))}
          <option value="all">All time</option>
        </select>
      </div>

      <div className="streak-body">
        <div className="streak-ring">
          <ProgressRing done={completed} total={eligible.length} />
          <p className="muted small">days completed</p>
        </div>

        <ul className="checklist streak-checklist">
          {data.tasks.length === 0 ? (
            <li className="muted small">No tasks yet.</li>
          ) : (
            data.tasks.map((task) => (
              <li key={task.id} className={task.doneToday ? "checked" : ""}>
                <span className="check-mark" aria-hidden="true">
                  {task.doneToday && <Check size={12} strokeWidth={3.5} />}
                </span>
                <span className="check-text">{task.title}</span>
              </li>
            ))
          )}
        </ul>

        <dl className="streak-metrics">
          <div>
            <dt>
              <Flame size={15} strokeWidth={2.2} className="flame-tint" aria-hidden="true" />
              Current streak
            </dt>
            <dd className="num">{current} days</dd>
            <p className="muted small">
              {current === 0 ? "Start one today" : current >= best ? "Longest run yet!" : "Going strong"}
            </p>
          </div>

          <div>
            <dt>
              <BarChart3 size={15} strokeWidth={2.2} className="accent-tint" aria-hidden="true" />
              Best streak
            </dt>
            <dd className="num">{best} days</dd>
          </div>

          <div>
            <dt>
              <Target size={15} strokeWidth={2.2} className="gold-tint" aria-hidden="true" />
              Completion rate
            </dt>
            <dd className="num">{rate}%</dd>
            <span className="bar">
              <span
                className="bar-fill"
                style={{ width: `${rate}%` }}
                role="progressbar"
                aria-valuenow={rate}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label="Completion rate"
              />
            </span>
          </div>
        </dl>
      </div>
    </section>
  );
}
