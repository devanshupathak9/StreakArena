import { useEffect } from "react";

export type Toast = { id: number; ok: boolean; text: string };

/** Sync reports one line per platform, so results stack and clear themselves. */
export default function Toasts({
  toasts,
  onDismiss,
}: {
  toasts: Toast[];
  onDismiss: (id: number) => void;
}) {
  useEffect(() => {
    if (!toasts.length) return;
    const timers = toasts.map((toast) => setTimeout(() => onDismiss(toast.id), 6000));
    return () => timers.forEach(clearTimeout);
  }, [toasts, onDismiss]);

  if (!toasts.length) return null;

  return (
    <div className="toasts" role="status" aria-live="polite">
      {toasts.map((toast) => (
        <div key={toast.id} className={`toast ${toast.ok ? "toast-ok" : "toast-bad"}`}>
          <span aria-hidden="true">{toast.ok ? "✓" : "!"}</span>
          <span>{toast.text}</span>
          <button
            type="button"
            className="link-button"
            style={{ marginLeft: "auto" }}
            onClick={() => onDismiss(toast.id)}
            aria-label="Dismiss"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}
