import { useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import AuthLayout from "../components/AuthLayout";
import { useAuth } from "../context/AuthContext";
import { api } from "../lib/api";

/** Landing page for the emailed link. Success signs this browser in and every other one out. */
export default function ResetPassword() {
  const { setUser } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const token = params.get("token") ?? "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState(token ? "" : "This link is missing its token — request a new one.");
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (password !== confirm) {
      setError("Those passwords don't match");
      return;
    }
    setError("");
    setBusy(true);
    try {
      setUser(await api.resetPassword({ token, password }));
      navigate("/", { replace: true });
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  return (
    <AuthLayout>
      <h1>Choose a new password</h1>
      <p className="muted">This signs you out everywhere else.</p>
      <form className="stack" onSubmit={handleSubmit}>
        <label>
          New password
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="new-password"
            minLength={8}
            required
          />
        </label>
        <label>
          Confirm it
          <input
            type="password"
            value={confirm}
            onChange={(event) => setConfirm(event.target.value)}
            autoComplete="new-password"
            minLength={8}
            required
          />
        </label>
        {error && <p className="error">{error}</p>}
        <button type="submit" className="button" disabled={busy || !token}>
          {busy ? "Saving…" : "Save and sign in"}
        </button>
      </form>
      <p className="muted">
        Link expired? <Link to="/forgot-password">Send a new one</Link>
      </p>
    </AuthLayout>
  );
}
