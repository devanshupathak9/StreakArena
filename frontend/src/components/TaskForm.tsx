import { useEffect, useState, type FormEvent } from "react";
import { api, type Platform, type TaskKind } from "../lib/api";

type Props = {
  onCreate: (
    title: string,
    platform: string | null,
    options: { kind?: TaskKind; dueDate?: string },
  ) => Promise<void>;
  today: string;
  onCancel?: () => void;
};

/**
 * One tap to a sensible task. The manual ones come first on purpose: not everything
 * worth a streak has an API, and reading a book is the obvious example.
 */
const PRESETS = [
  { title: "Read 20 pages", platform: null },
  { title: "Workout", platform: null },
  { title: "Meditate", platform: null },
  { title: "Ship a commit", platform: "github" },
  { title: "One LeetCode problem", platform: "leetcode" },
];

export default function TaskForm({ onCreate, today, onCancel }: Props) {
  const [title, setTitle] = useState("");
  const [platform, setPlatform] = useState("");
  const [platforms, setPlatforms] = useState<Platform[]>([]);
  const [saving, setSaving] = useState(false);
  // Daily is the default because a habit is what this app is for; a one-off is the
  // thing you also need somewhere to put.
  const [kind, setKind] = useState<TaskKind>("daily");
  const [dueDate, setDueDate] = useState(today);

  // Tagging is optional, so a failed catalog fetch just means a title-only form.
  useEffect(() => {
    api.platforms().then(setPlatforms).catch(() => setPlatforms([]));
  }, []);

  async function submit(
    nextTitle: string,
    nextPlatform: string | null,
    nextKind: TaskKind = kind,
  ) {
    const trimmed = nextTitle.trim();
    if (!trimmed || saving) return;

    setSaving(true);
    try {
      // A due date is only sent for a one-off; the server rejects one on a habit.
      await onCreate(
        trimmed,
        nextPlatform,
        nextKind === "once" ? { kind: "once", dueDate } : { kind: "daily" },
      );
      setTitle("");
      setPlatform("");
    } finally {
      setSaving(false);
    }
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    void submit(title, platform || null);
  }

  const once = kind === "once";

  return (
    <div className="composer">
      {/* The choice comes first, because it changes what the rest of the form means. */}
      <div className="kind-switch" role="radiogroup" aria-label="How often">
        <button
          type="button"
          role="radio"
          aria-checked={!once}
          className={!once ? "kind-option is-active" : "kind-option"}
          onClick={() => setKind("daily")}
        >
          <span className="kind-title">Every day</span>
          <span className="kind-sub">Builds a streak</span>
        </button>
        <button
          type="button"
          role="radio"
          aria-checked={once}
          className={once ? "kind-option is-active" : "kind-option"}
          onClick={() => setKind("once")}
        >
          <span className="kind-title">Just once</span>
          <span className="kind-sub">A single job, no streak</span>
        </button>
      </div>

      <form className="task-form" onSubmit={handleSubmit}>
        <input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder={once ? "What do you have to do?" : "What are you doing every day?"}
          maxLength={80}
          aria-label="New task"
          autoFocus
        />

        {once && (
          <input
            type="date"
            value={dueDate}
            onChange={(event) => setDueDate(event.target.value)}
            aria-label="Due date"
          />
        )}

        <select
          value={platform}
          onChange={(event) => setPlatform(event.target.value)}
          aria-label="Platform (optional)"
        >
          <option value="">Manual</option>
          {platforms.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </select>

        <button type="submit" className="button" disabled={saving || !title.trim()}>
          {once ? "Add to-do" : "Add task"}
        </button>
        {onCancel && (
          <button type="button" className="button button-ghost" onClick={onCancel}>
            Cancel
          </button>
        )}
      </form>

      <div className="presets">
        {/* Presets are habits by nature, so they ignore the switch above. */}
        {PRESETS.map((preset) => (
          <button
            key={preset.title}
            type="button"
            className="preset"
            disabled={saving}
            onClick={() => void submit(preset.title, preset.platform, "daily")}
          >
            {preset.title}
          </button>
        ))}
      </div>
    </div>
  );
}
