import { useState, type FormEvent } from "react";
import { LogOut, MailCheck, Trash2 } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { api } from "../../lib/api";

/**
 * Email confirmation, signing out other browsers, and leaving for good. Deletion
 * asks for the password — or, for a Google-only account with none, the username
 * typed back — because it can't be undone.
 */
export default function AccountSafety() {
  const { user, setUser, logout } = useAuth();
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [secret, setSecret] = useState("");
  const [busy, setBusy] = useState(false);

  if (!user) return null;
  const account = user;

  async function resend() {
    setError("");
    setNotice("");
    try {
      const result = (await api.resendVerification()) as { alreadyVerified?: boolean };
      if (result.alreadyVerified) setUser({ ...account, emailVerified: true });
      setNotice(`Confirmation link sent to ${account.email}.`);
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function signOutEverywhere() {
    if (!window.confirm("Sign out of StreakArena on every device, including this one?")) return;
    try {
      await api.logoutEverywhere();
      await logout().catch(() => undefined);
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function handleDelete(event: FormEvent) {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      await api.deleteAccount(account.hasPassword ? { password: secret } : { confirm: secret });
      // The cookie is already cleared server-side; this just resets local state.
      await logout().catch(() => undefined);
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  return (
    <section className="card stack">
      <div className="card-head">
        <h2>Account</h2>
      </div>

      <div className="stack">
        <p className="small">
          <strong>{account.email}</strong>{" "}
          <span className="muted">{account.emailVerified ? "· confirmed" : "· not confirmed yet"}</span>
        </p>
        {!account.emailVerified && (
          <div className="head-actions">
            <button type="button" className="button button-ghost" onClick={resend}>
              <MailCheck size={16} aria-hidden /> Send confirmation link
            </button>
          </div>
        )}
      </div>

      <div className="head-actions">
        <button type="button" className="button button-ghost" onClick={signOutEverywhere}>
          <LogOut size={16} aria-hidden /> Sign out everywhere
        </button>
        {!deleting && (
          <button
            type="button"
            className="button button-ghost danger-button"
            onClick={() => setDeleting(true)}
          >
            <Trash2 size={16} aria-hidden /> Delete account
          </button>
        )}
      </div>

      {deleting && (
        <form className="stack" onSubmit={handleDelete}>
          <p className="muted small">
            This deletes your tasks, streak history and linked handles. Groups you own pass to
            their longest-standing member. It can't be undone.
          </p>
          <label>
            {account.hasPassword ? "Your password" : `Type ${account.username} to confirm`}
            <input
              type={account.hasPassword ? "password" : "text"}
              value={secret}
              onChange={(event) => setSecret(event.target.value)}
              autoComplete={account.hasPassword ? "current-password" : "off"}
              required
            />
          </label>
          <div className="head-actions">
            <button type="submit" className="button danger-button" disabled={busy || !secret}>
              {busy ? "Deleting…" : "Delete my account"}
            </button>
            <button type="button" className="button button-ghost" onClick={() => setDeleting(false)}>
              Cancel
            </button>
          </div>
        </form>
      )}

      {notice && <p className="success" role="status">{notice}</p>}
      {error && <p className="error">{error}</p>}
    </section>
  );
}
