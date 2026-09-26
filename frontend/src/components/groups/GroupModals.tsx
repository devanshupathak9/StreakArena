import { useEffect, useRef, useState, type FormEvent } from "react";
import { Globe, Lock, X } from "lucide-react";
import { api } from "../../lib/api";

type Props = { onClose: () => void; onDone: (groupId: string) => void };

/** Escape and a backdrop click close a dialog; the page behind it stays put. */
function useDialog(onClose: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [onClose]);
  return ref;
}

export function CreateGroupModal({ onClose, onDone }: Props) {
  const dialog = useDialog(onClose);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [visibility, setVisibility] = useState<"private" | "public">("private");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!name.trim() || busy) return;
    setError("");
    setBusy(true);
    try {
      const group = await api.createGroup({
        name: name.trim(),
        description: description.trim(),
        visibility,
      });
      onDone(group.id);
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
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="create-group" ref={dialog}>
        <div className="card-head">
          <h2 id="create-group">Create a group</h2>
          <button type="button" className="icon-button icon-button-sm" onClick={onClose} aria-label="Close">
            <X size={16} strokeWidth={2.2} aria-hidden="true" />
          </button>
        </div>

        <form className="stack modal-form" onSubmit={handleSubmit}>
          <label>
            Group name
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Grind Squad"
              maxLength={60}
              autoFocus
              required
            />
          </label>

          <label>
            Description
            <input
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="What is this group about?"
              maxLength={200}
            />
          </label>

          <fieldset className="choice-set">
            <legend>Who can join</legend>

            <label className={visibility === "private" ? "choice is-picked" : "choice"}>
              <input
                type="radio"
                name="visibility"
                checked={visibility === "private"}
                onChange={() => setVisibility("private")}
              />
              <Lock size={16} strokeWidth={2} aria-hidden="true" />
              <span>
                <strong>Private</strong>
                <span className="muted small">Invite code only. Nobody can find it.</span>
              </span>
            </label>

            <label className={visibility === "public" ? "choice is-picked" : "choice"}>
              <input
                type="radio"
                name="visibility"
                checked={visibility === "public"}
                onChange={() => setVisibility("public")}
              />
              <Globe size={16} strokeWidth={2} aria-hidden="true" />
              <span>
                <strong>Public</strong>
                <span className="muted small">
                  Listed in Discover. Anyone signed in can join and see the board.
                </span>
              </span>
            </label>
          </fieldset>

          {error && <p className="error">{error}</p>}

          <div className="head-actions">
            <button type="submit" className="button" disabled={busy || !name.trim()}>
              {busy ? "Creating…" : "Create group"}
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

export function JoinGroupModal({ onClose, onDone }: Props) {
  const dialog = useDialog(onClose);
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!code.trim() || busy) return;
    setError("");
    setBusy(true);
    try {
      const { group } = await api.joinGroup(code.trim());
      onDone(group.id);
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
      <div className="modal modal-sm" role="dialog" aria-modal="true" aria-labelledby="join-group" ref={dialog}>
        <div className="card-head">
          <h2 id="join-group">Join a group</h2>
          <button type="button" className="icon-button icon-button-sm" onClick={onClose} aria-label="Close">
            <X size={16} strokeWidth={2.2} aria-hidden="true" />
          </button>
        </div>

        <form className="stack modal-form" onSubmit={handleSubmit}>
          <p className="muted small">Enter the invite code a friend shared with you.</p>
          <input
            value={code}
            onChange={(event) => setCode(event.target.value.toUpperCase())}
            placeholder="AB3D47"
            maxLength={6}
            className="code-input"
            aria-label="Invite code"
            autoFocus
          />

          {error && <p className="error">{error}</p>}

          <div className="head-actions">
            <button type="submit" className="button" disabled={busy || !code.trim()}>
              {busy ? "Joining…" : "Join"}
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
