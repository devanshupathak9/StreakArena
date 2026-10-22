import { useEffect, useState } from "react";
import { ExternalLink } from "lucide-react";
import { api, type TaskActivity as Activity } from "../lib/api";
import { formatDay } from "../lib/dates";

/**
 * What the platform says you actually did — the problem names behind the green
 * tiles. Fetched when the row opens rather than with the dashboard, because it's
 * detail nobody has asked for until they expand it.
 *
 * `supported: false` is a different statement from an empty list: one means the
 * platform can't say, the other means it says nothing happened.
 */
export default function TaskActivity({ taskId, label }: { taskId: string; label: string }) {
  const [activity, setActivity] = useState<Activity | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let live = true;
    api
      .taskActivity(taskId)
      .then((data) => live && setActivity(data))
      .catch((err) => live && setError((err as Error).message));
    return () => {
      live = false;
    };
  }, [taskId]);

  if (error) return <p className="muted small">Couldn't load what you solved. {error}</p>;
  if (!activity) return <p className="muted small">Loading what you solved…</p>;
  if (!activity.supported) return null;

  return (
    <div className="solved">
      <h4 className="solved-head">
        What {label} recorded
        {activity.days.length > 0 && (
          <span className="muted small"> · last {activity.days.length} active days</span>
        )}
      </h4>

      {activity.days.length === 0 ? (
        <p className="muted small">
          Nothing recorded yet. Sync this task and the problems you solved show up here.
        </p>
      ) : (
        <ul className="solved-list">
          {activity.days.map((day) => (
            <li key={day.date} className="solved-day">
              <span className="solved-date num">{formatDay(day.date)}</span>
              <ul className="solved-items">
                {day.items.map((item) => (
                  <li key={item.title}>
                    {item.url ? (
                      <a href={item.url} target="_blank" rel="noreferrer">
                        {item.title}
                        <ExternalLink size={12} strokeWidth={2.2} aria-hidden="true" />
                      </a>
                    ) : (
                      item.title
                    )}
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      )}

      {activity.suggestion && (
        <a
          className="solved-suggestion"
          href={activity.suggestion.url}
          target="_blank"
          rel="noreferrer"
        >
          <span className="solved-suggestion-label">Today's problem</span>
          <span className="solved-suggestion-title">{activity.suggestion.title}</span>
          {activity.suggestion.difficulty && (
            <span
              className={`difficulty difficulty-${activity.suggestion.difficulty.toLowerCase()}`}
            >
              {activity.suggestion.difficulty}
            </span>
          )}
        </a>
      )}
    </div>
  );
}
