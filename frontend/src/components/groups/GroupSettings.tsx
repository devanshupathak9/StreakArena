import { useState, type FormEvent } from "react";
import { Globe, Lock } from "lucide-react";
import { api, type GroupDetail } from "../../lib/api";

type Props = {
  group: GroupDetail["group"];
  onSaved: () => Promise<void>;
  onLeave: () => void;
  onDelete: () => void;
};

export default function GroupSettings({ group, onSaved, onLeave, onDelete }: Props) {
  const [name, setName] = useState(group.name);
  const [description, setDescription] = useState(group.description ?? "");
  const [visibility, setVisibility] = useState(group.visibility);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    setError("");
    setSaved(false);
    setBusy(true);
    try {
      await api.updateGroup(group.id, { name: name.trim(), description: description.trim(), visibility });
      await onSaved();
      setSaved(true);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="group-overview">
      <section className="card">
        <div className="card-head">
          <h2>Group settings</h2>
          {!group.isOwner && <p className="muted small">Only the owner can change these</p>}
        </div>

        <form className="stack" onSubmit={handleSubmit}>
          <label>
            Name
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              maxLength={60}
              disabled={!group.isOwner}
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
              disabled={!group.isOwner}
            />
          </label>

          <fieldset className="choice-set" disabled={!group.isOwner}>
            <legend>Who can join</legend>

            <label className={visibility === "private" ? "choice is-picked" : "choice"}>
              <input
                type="radio"
                name="group-visibility"
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
                name="group-visibility"
                checked={visibility === "public"}
                onChange={() => setVisibility("public")}
              />
              <Globe size={16} strokeWidth={2} aria-hidden="true" />
              <span>
                <strong>Public</strong>
                <span className="muted small">
                  Listed in Discover. Anyone signed in can join and see this board.
                </span>
              </span>
            </label>
          </fieldset>

          {error && <p className="error">{error}</p>}
          {saved && <p className="success">Saved.</p>}

          {group.isOwner && (
            <div className="head-actions">
              <button type="submit" className="button" disabled={busy || !name.trim()}>
                {busy ? "Saving…" : "Save changes"}
              </button>
            </div>
          )}
        </form>
      </section>

      <section className="card">
        <div className="card-head">
          <h2>Danger zone</h2>
        </div>

        {group.isOwner ? (
          <>
            <p className="muted small">
              Deleting the group removes it for everyone. Nobody loses a streak — each member
              keeps their tasks and their history as personal ones.
            </p>
            <div className="head-actions">
              <button type="button" className="button button-ghost danger-button" onClick={onDelete}>
                Delete group
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="muted small">
              Leaving keeps your tasks and their history with you — they simply become personal
              tasks again.
            </p>
            <div className="head-actions">
              <button type="button" className="button button-ghost danger-button" onClick={onLeave}>
                Leave group
              </button>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
