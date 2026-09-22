import { useEffect, useState, type FormEvent } from "react";
import { api, type Platform } from "../lib/api";

type Props = { onCreate: (title: string, platform: string | null) => Promise<void> };

export default function TaskForm({ onCreate }: Props) {
  const [title, setTitle] = useState("");
  const [platform, setPlatform] = useState("");
  const [platforms, setPlatforms] = useState<Platform[]>([]);
  const [saving, setSaving] = useState(false);

  // Tagging is optional, so a failed catalog fetch just means a title-only form.
  useEffect(() => {
    api.platforms().then(setPlatforms).catch(() => setPlatforms([]));
  }, []);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const trimmed = title.trim();
    if (!trimmed || saving) return;

    setSaving(true);
    try {
      await onCreate(trimmed, platform || null);
      setTitle("");
      setPlatform("");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="task-form" onSubmit={handleSubmit}>
      <input
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        placeholder="Add a daily task — e.g. Solve one LeetCode problem"
        maxLength={80}
        aria-label="New task"
      />

      <select
        value={platform}
        onChange={(event) => setPlatform(event.target.value)}
        aria-label="Platform (optional)"
      >
        <option value="">No platform</option>
        {platforms.map((option) => (
          <option key={option.id} value={option.id}>
            {option.emoji} {option.label}
          </option>
        ))}
      </select>

      <button type="submit" className="button" disabled={saving || !title.trim()}>
        Add task
      </button>
    </form>
  );
}
