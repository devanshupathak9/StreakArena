import { useEffect, useState } from "react";
import { BellRing } from "lucide-react";
import { api, type ReminderSettings } from "../lib/api";
import { currentSubscription, enablePush, permission, pushSupported } from "../lib/push";

const DISMISS_KEY = "sa.nudge.push.dismissed";

function dismissed() {
  try {
    return localStorage.getItem(DISMISS_KEY) === "1";
  } catch {
    return false;
  }
}

/**
 * One line on the dashboard offering push, shown only when it would actually work
 * here and hasn't been answered: server configured, browser capable, permission not
 * yet asked, this device not subscribed. Asking from a button the person pressed is
 * also what browsers require before they'll show the permission prompt.
 */
export default function ReminderNudge({ hasDailyTasks }: { hasDailyTasks: boolean }) {
  const [settings, setSettings] = useState<ReminderSettings | null>(null);
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!hasDailyTasks || dismissed() || !pushSupported() || permission() !== "default") return;
    let live = true;
    Promise.all([api.reminders(), currentSubscription()])
      .then(([loaded, subscription]) => {
        if (!live) return;
        setSettings(loaded);
        setShow(Boolean(loaded.available.push && loaded.enabled && !subscription));
      })
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, [hasDailyTasks]);

  if (!show || !settings) return null;

  function dismiss() {
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      // Without storage it simply shows again next visit.
    }
    setShow(false);
  }

  async function turnOn() {
    setError("");
    try {
      await enablePush(settings!.vapidPublicKey!);
      await api.updateReminders({ push: true });
      setDone(true);
      window.setTimeout(() => setShow(false), 2500);
    } catch (err) {
      setError((err as Error).message);
    }
  }

  const [h, m] = settings.time.split(":").map(Number);
  const at = new Date(Date.UTC(2000, 0, 1, h, m)).toLocaleTimeString([], {
    hour: "numeric",
    minute: m ? "2-digit" : undefined,
    timeZone: "UTC",
  });

  return (
    <section className="nudge" aria-label="Turn on reminders">
      <span className="nudge-icon" aria-hidden="true">
        <BellRing size={18} />
      </span>
      <span className="nudge-text">
        <strong>{done ? "You're set." : "Don't lose a streak to forgetting"}</strong>
        <span className="muted small">
          {done
            ? `We'll ping this device at ${at} if anything's still open.`
            : `Get a notification at ${at} if a task is still open — and a last call before midnight.`}
        </span>
        {error && <span className="error small">{error}</span>}
      </span>
      {!done && (
        <span className="nudge-actions">
          <button type="button" className="button button-ghost" onClick={dismiss}>
            Not now
          </button>
          <button type="button" className="button" onClick={turnOn}>
            Turn on
          </button>
        </span>
      )}
    </section>
  );
}
