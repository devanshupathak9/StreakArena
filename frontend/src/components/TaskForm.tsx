import { useEffect, useState, type FormEvent } from "react";
import { api, type Platform } from "../lib/api";

type Props = { onCreate: (title: string, platform: string | null) => Promise<void> };

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

export default function TaskForm({ onCreate }: Props) {
  const [title, setTitle] = useState("");
  const [platform, setPlatform] = useState("");
  const [platforms, setPlatforms] = useState<Platform[]>([]);
  const [saving, setSaving] = useState(false);

  // Tagging is optional, so a failed catalog fetch just means a title-only form.
  useEffect(() => {
    api.platforms().then(setPlatforms).catch(() => setPlatforms([]));
  }, []);

  async function submit(nextTitle: string, nextPlatform: string | null) {
    const trimmed = nextTitle.trim();
    if (!trimmed || saving) return;

    setSaving(true);
    try {
      await onCreate(trimmed, nextPlatform);
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

  return (
    <section className="card composer">
      <div className="card-head">
        <h2>Add a task</h2>
        <p className="muted small">Tag a platform to have it verified, or leave it manual</p>
      </div>

      <form className="task-form task-form-bare" onSubmit={handleSubmit}>
        <input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="What are you doing every day?"
          maxLength={80}
          aria-label="New task"
        />

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
          Add task
        </button>
      </form>

      <div className="presets">
        {PRESETS.map((preset) => (
          <button
            key={preset.title}
            type="button"
            className="preset"
            disabled={saving}
            onClick={() => void submit(preset.title, preset.platform)}
          >
            {preset.title}
          </button>
        ))}
      </div>
    </section>
  );
}
