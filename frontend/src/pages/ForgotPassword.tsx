import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import AuthLayout from "../components/AuthLayout";
import { api } from "../lib/api";

/**
 * Always ends on the same "check your inbox" message, whatever the address — the
 * server answers identically too, so this page can't reveal who has an account.
 */
export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      await api.forgotPassword(email.trim());
      setSent(true);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthLayout>
      <h1>Reset your password</h1>
      {sent ? (
        <>
          <p className="success" role="status">
            If an account uses {email.trim()}, a reset link is on its way. It works once and
            expires in an hour.
          </p>
          <p className="muted small">Nothing after a few minutes? Check spam, or try again.</p>
        </>
      ) : (
        <>
          <p className="muted">Enter the email on your account and we'll send you a link.</p>
          <form className="stack" onSubmit={handleSubmit}>
            <label>
              Email
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
                required
              />
            </label>
            {error && <p className="error">{error}</p>}
            <button type="submit" className="button" disabled={busy}>
              {busy ? "Sending…" : "Send reset link"}
            </button>
          </form>
        </>
      )}
      <p className="muted">
        <Link to="/login">Back to log in</Link>
      </p>
    </AuthLayout>
  );
}
