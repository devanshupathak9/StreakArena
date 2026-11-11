import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import AuthLayout from "../components/AuthLayout";
import { useAuth } from "../context/AuthContext";
import { api } from "../lib/api";

/**
 * Landing page for the verification link. Works signed in or out — people often
 * open the email on their phone, where they aren't signed in.
 */
export default function VerifyEmail() {
  const { user, setUser } = useAuth();
  const [params] = useSearchParams();
  const token = params.get("token") ?? "";
  const [state, setState] = useState<"working" | "done" | "failed">(token ? "working" : "failed");
  const [error, setError] = useState(token ? "" : "This link is missing its token.");
  // StrictMode mounts twice in dev; a token is single-use, so the second post would fail.
  const started = useRef(false);

  useEffect(() => {
    if (!token || started.current) return;
    started.current = true;
    api
      .verifyEmail(token)
      .then((verified) => {
        if (user && user.id === verified.id) setUser(verified);
        setState("done");
      })
      .catch((err: Error) => {
        setError(err.message);
        setState("failed");
      });
  }, [token, user, setUser]);

  const body = (
    <>
      <h1>{state === "done" ? "Email confirmed" : state === "working" ? "Confirming…" : "Couldn't confirm"}</h1>
      {state === "done" && (
        <p className="success" role="status">
          Thanks — you can now reset your password by email if you ever need to.
        </p>
      )}
      {state === "failed" && (
        <p className="error">
          {error} {user ? "You can send a fresh link from your profile." : "Log in to send a fresh link."}
        </p>
      )}
      <p className="muted">
        <Link to={user ? "/" : "/login"}>{user ? "Go to your dashboard" : "Log in"}</Link>
      </p>
    </>
  );

  // Signed in, it sits inside the app shell; signed out, in the auth layout.
  return user ? <section className="card stack">{body}</section> : <AuthLayout>{body}</AuthLayout>;
}
