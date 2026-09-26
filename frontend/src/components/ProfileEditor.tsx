import { useEffect, useRef, useState, type FormEvent } from "react";
import { X } from "lucide-react";
import { api } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import AvatarPicker from "./AvatarPicker";

const timezones =
  typeof Intl.supportedValuesOf === "function" ? Intl.supportedValuesOf("timeZone") : [];

/** One editor behind every pencil on the page, so there's one place to get it right. */
export default function ProfileEditor({ onClose }: { onClose: () => void }) {
  const { user, setUser } = useAuth();
  const dialog = useRef<HTMLDivElement>(null);
  const [form, setForm] = useState({
    username: user?.username ?? "",
    displayName: user?.displayName ?? "",
    bio: user?.bio ?? "",
    location: user?.location ?? "",
    timezone: user?.timezone ?? "UTC",
  });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    // The page behind a modal shouldn't scroll under it.
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [onClose]);

  if (!user) return null;

  const options = timezones.includes(form.timezone) ? timezones : [form.timezone, ...timezones];
  const set = (field: keyof typeof form) => (value: string) =>
    setForm((current) => ({ ...current, [field]: value }));

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      setUser(await api.updateProfile(form));
      onClose();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="modal-backdrop"
      onMouseDown={(event) => {
        if (!dialog.current?.contains(event.target as Node)) onClose();
      }}
    >
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-profile-title"
        ref={dialog}
      >
        <div className="card-head">
          <h2 id="edit-profile-title">Edit profile</h2>
          <button
            type="button"
            className="icon-button icon-button-sm"
            onClick={onClose}
            aria-label="Close"
          >
            <X size={16} strokeWidth={2.2} aria-hidden="true" />
          </button>
        </div>

        <AvatarPicker />

        <form className="stack modal-form" onSubmit={handleSubmit}>
          <div className="field-row">
            <label>
              Name
              <input
                value={form.displayName}
                onChange={(event) => set("displayName")(event.target.value)}
                placeholder="Devanshu Pathak"
                maxLength={50}
              />
            </label>

            <label>
              Username
              <input
                value={form.username}
                onChange={(event) => set("username")(event.target.value)}
                required
              />
            </label>
          </div>

          <label>
            Bio
            <input
              value={form.bio}
              onChange={(event) => set("bio")(event.target.value)}
              placeholder="What are you building a streak for?"
              maxLength={160}
            />
          </label>
          <p className="muted small">{160 - form.bio.length} characters left</p>

          <div className="field-row">
            <label>
              Location
              <input
                value={form.location}
                onChange={(event) => set("location")(event.target.value)}
                placeholder="India"
                maxLength={60}
              />
            </label>

            <label>
              Timezone
              <select
                value={form.timezone}
                onChange={(event) => set("timezone")(event.target.value)}
              >
                {options.map((zone) => (
                  <option key={zone} value={zone}>
                    {zone}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <p className="muted small">
            Your day rolls over at midnight in your timezone — that's what decides whether a
            streak survives.
          </p>

          {error && <p className="error">{error}</p>}

          <div className="head-actions">
            <button type="submit" className="button" disabled={busy}>
              {busy ? "Saving…" : "Save changes"}
            </button>
            <button type="button" className="button button-ghost" onClick={onClose}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
