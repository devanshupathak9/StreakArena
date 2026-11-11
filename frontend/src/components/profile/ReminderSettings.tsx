import { useEffect, useState } from "react";
import { BellRing, Send } from "lucide-react";
import { api, type ReminderSettings as Settings } from "../../lib/api";
import { currentSubscription, disablePush, enablePush, permission, pushSupported } from "../../lib/push";

function Switch({
  checked,
  onChange,
  label,
  disabled = false,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      className="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
    />
  );
}

/**
 * When and how StreakArena nudges you. Everything is evaluated in your own
 * timezone, and a reminder only goes out if a daily task is actually still open —
 * the server syncs your platforms first, so finished work doesn't get nagged.
 */
export default function ReminderSettings() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [thisDevice, setThisDevice] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.reminders().then(setSettings).catch((err: Error) => setError(err.message));
    currentSubscription()
      .then((sub) => setThisDevice(Boolean(sub)))
      .catch(() => setThisDevice(false));
  }, []);

  // Arriving from the bell's "Reminders" link should land on this card.
  useEffect(() => {
    if (settings && window.location.hash === "#reminders") {
      document.getElementById("reminders")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [settings]);

  if (!settings) {
    return error ? (
      <section className="card" id="reminders">
        <p className="error">{error}</p>
      </section>
    ) : null;
  }
  const current = settings;

  async function save(patch: Parameters<typeof api.updateReminders>[0]) {
    setError("");
    setNotice("");
    // Optimistic: a toggle that waits on the network feels broken.
    setSettings({ ...current, ...patch });
    try {
      setSettings(await api.updateReminders(patch));
    } catch (err) {
      setSettings(current);
      setError((err as Error).message);
    }
  }

  async function togglePush(next: boolean) {
    setError("");
    setNotice("");
    setBusy(true);
    try {
      if (next) {
        await enablePush(current.vapidPublicKey!);
        setThisDevice(true);
        setSettings(await api.updateReminders({ push: true }));
        setNotice("Push is on for this device.");
      } else {
        await disablePush();
        setThisDevice(false);
        setSettings(await api.reminders());
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function sendTest() {
    setError("");
    setNotice("");
    setBusy(true);
    try {
      const { channels } = await api.testReminder();
      const where = [
        channels.push > 0 && `${channels.push} device${channels.push === 1 ? "" : "s"}`,
        channels.email && "your inbox",
      ].filter(Boolean);
      setNotice(
        where.length
          ? `Sent to ${where.join(" and ")}. It's in the bell too.`
          : "Sent to the bell. Turn on push or email to get it outside the app.",
      );
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const blocked = permission() === "denied";
  const canPush = current.available.push && pushSupported();
  const pushHint = !current.available.push
    ? "Not set up on this server yet."
    : !pushSupported()
      ? "This browser can't receive push. On iPhone, add StreakArena to your Home Screen first."
      : blocked
        ? "Blocked in this browser's site settings."
        : thisDevice
          ? `On for this device${current.devices > 1 ? ` and ${current.devices - 1} other` : ""}.`
          : current.devices > 0
            ? `On for ${current.devices} other device${current.devices === 1 ? "" : "s"}, not this one.`
            : "A notification on this phone or computer.";

  const emailHint = !current.available.email
    ? "Email isn't set up on this server yet."
    : !current.available.emailVerified
      ? "Confirm your email first (Account, below)."
      : "One email at your reminder time, never more than one a day.";

  return (
    <section className="card stack" id="reminders">
      <div className="card-head">
        <div>
          <h2>Reminders</h2>
          <p className="muted small">
            Only when a daily task is still open — and we sync your platforms first, so finished
            work never gets nagged.
          </p>
        </div>
        <Switch
          checked={current.enabled}
          onChange={(enabled) => save({ enabled })}
          label="Daily reminders"
        />
      </div>

      <div className="reminder-grid" aria-disabled={!current.enabled}>
        <label className="reminder-row">
          <span className="reminder-row-text">
            <strong>Remind me at</strong>
            <span className="muted small">Your time zone. 8pm leaves time to act on it.</span>
          </span>
          <input
            type="time"
            value={current.time}
            step={900}
            disabled={!current.enabled}
            onChange={(event) => event.target.value && save({ time: event.target.value })}
          />
        </label>

        <div className="reminder-row">
          <span className="reminder-row-text">
            <strong>Last call at 10:30pm</strong>
            <span className="muted small">Only if a live streak would break at midnight.</span>
          </span>
          <Switch
            checked={current.lastCall}
            disabled={!current.enabled}
            onChange={(lastCall) => save({ lastCall })}
            label="Last call before midnight"
          />
        </div>

        <div className="reminder-row">
          <span className="reminder-row-text">
            <strong>Push notifications</strong>
            <span className="muted small">{pushHint}</span>
          </span>
          <Switch
            checked={thisDevice && current.push}
            disabled={!current.enabled || !canPush || blocked || busy}
            onChange={togglePush}
            label="Push notifications on this device"
          />
        </div>

        <div className="reminder-row">
          <span className="reminder-row-text">
            <strong>Email</strong>
            <span className="muted small">{emailHint}</span>
          </span>
          <Switch
            // Shown off when it can't send, so a dimmed-but-on switch never implies
            // emails that aren't coming.
            checked={current.email && current.available.email && current.available.emailVerified}
            disabled={!current.enabled || !current.available.email || !current.available.emailVerified}
            onChange={(email) => save({ email })}
            label="Email reminders"
          />
        </div>
      </div>

      <div className="head-actions">
        <button type="button" className="button button-ghost" onClick={sendTest} disabled={busy}>
          <Send size={16} aria-hidden="true" /> Send a test
        </button>
        {!thisDevice && canPush && !blocked && current.enabled && (
          <button type="button" className="button" onClick={() => togglePush(true)} disabled={busy}>
            <BellRing size={16} aria-hidden="true" /> Turn on push here
          </button>
        )}
      </div>

      {notice && (
        <p className="success" role="status">
          {notice}
        </p>
      )}
      {error && <p className="error">{error}</p>}
    </section>
  );
}
