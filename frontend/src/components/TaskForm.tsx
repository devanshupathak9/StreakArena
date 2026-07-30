import { useState, type FormEvent } from "react";

export default function TaskForm({ onCreate }: { onCreate: (title: string) => Promise<void> }) {
  const [title, setTitle] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const trimmed = title.trim();
    if (!trimmed || saving) return;

    setSaving(true);
    try {
      await onCreate(trimmed);
      setTitle("");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="task-form" onSubmit={handleSubmit}>
      <input
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        placeholder="Add a daily task — e.g. Morning run"
        maxLength={80}
        aria-label="New task"
      />
      <button type="submit" className="button" disabled={saving || !title.trim()}>
        Add task
      </button>
    </form>
  );
}
