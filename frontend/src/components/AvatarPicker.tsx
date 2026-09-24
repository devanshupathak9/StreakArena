import { useRef, useState } from "react";
import { Trash2, Upload } from "lucide-react";
import { api } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import Avatar from "./Avatar";

const MAX_BYTES = 5 * 1024 * 1024;

/**
 * A picture, not a URL. Hunting down a hosted image was the old price of having an
 * avatar at all, so the file goes through the same store the chat attachments use.
 * Clearing it falls back to the generated initials, which are never nothing.
 */
export default function AvatarPicker() {
  const { user, setUser } = useAuth();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  if (!user) return null;

  async function handlePick(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("That needs to be an image");
      return;
    }
    if (file.size > MAX_BYTES) {
      setError("Images must be under 5 MB");
      return;
    }

    setError("");
    setBusy(true);
    try {
      setUser(await api.uploadAvatar(file));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
      // Without this, picking the same file twice fires no change event.
      if (input.current) input.current.value = "";
    }
  }

  async function handleClear() {
    setError("");
    setBusy(true);
    try {
      setUser(await api.updateProfile({ avatarUrl: "" }));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="avatar-picker">
      <span className={busy ? "avatar-slot is-busy" : "avatar-slot"}>
        <Avatar
          username={user.username}
          displayName={user.displayName}
          avatarUrl={user.avatarUrl}
          size={88}
        />
      </span>

      <div className="avatar-controls">
        <input
          ref={input}
          type="file"
          id="avatar-file"
          className="visually-hidden"
          accept="image/png,image/jpeg,image/gif,image/webp"
          onChange={handlePick}
          disabled={busy}
        />
        <label htmlFor="avatar-file" className="button button-sm">
          <Upload size={14} strokeWidth={2.2} aria-hidden="true" />
          {busy ? "Uploading…" : user.avatarUrl ? "Change photo" : "Upload photo"}
        </label>

        {user.avatarUrl && (
          <button
            type="button"
            className="icon-button icon-button-sm danger"
            onClick={handleClear}
            disabled={busy}
            aria-label="Remove photo"
            title="Remove photo"
          >
            <Trash2 size={15} strokeWidth={1.9} aria-hidden="true" />
          </button>
        )}

        {error ? (
          <p className="error">{error}</p>
        ) : (
          <p className="muted small">PNG, JPEG, GIF or WebP, up to 5 MB.</p>
        )}
      </div>
    </div>
  );
}
