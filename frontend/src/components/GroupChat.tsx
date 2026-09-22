import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { api, type GroupMessage } from "../lib/api";
import Avatar from "./Avatar";
import { formatWhen } from "../lib/dates";

const POLL_MS = 6000;

export default function GroupChat({ groupId }: { groupId: string }) {
  const [messages, setMessages] = useState<GroupMessage[] | null>(null);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const pinned = useRef(true);

  /** Only scroll for new messages if the reader hadn't scrolled up to read history. */
  function rememberPosition() {
    const list = listRef.current;
    if (!list) return;
    pinned.current = list.scrollHeight - list.scrollTop - list.clientHeight < 60;
  }

  const merge = useCallback((incoming: GroupMessage[]) => {
    if (incoming.length === 0) return;
    setMessages((current) => {
      const seen = new Set((current ?? []).map((message) => message.id));
      const added = incoming.filter((message) => !seen.has(message.id));
      return added.length ? [...(current ?? []), ...added] : current;
    });
  }, []);

  useEffect(() => {
    let alive = true;
    let lastId: string | undefined;

    async function tick(initial: boolean) {
      try {
        const batch = await api.messages(groupId, initial ? undefined : lastId);
        if (!alive) return;
        if (batch.length) lastId = batch[batch.length - 1].id;
        if (initial) setMessages(batch);
        else merge(batch);
      } catch (err) {
        if (alive && initial) setError((err as Error).message);
      }
    }

    void tick(true);
    // Polling, not sockets: a chat this size doesn't justify a second transport,
    // and the cursor means an idle poll costs one empty array.
    const timer = setInterval(() => void tick(false), POLL_MS);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, [groupId, merge]);

  useEffect(() => {
    if (pinned.current && listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages]);

  async function handleSend(event: FormEvent) {
    event.preventDefault();
    const body = draft.trim();
    if (!body || sending) return;

    setError("");
    setSending(true);
    try {
      const message = await api.sendMessage(groupId, body);
      pinned.current = true;
      merge([message]);
      setDraft("");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSending(false);
    }
  }

  return (
    <section className="card">
      <div className="card-head">
        <h2>Group chat</h2>
        <p className="muted small">Trash talk, accountability, whatever works</p>
      </div>

      {error && <p className="error">{error}</p>}

      <div className="chat-list" ref={listRef} onScroll={rememberPosition}>
        {messages === null ? (
          <p className="muted small">Loading…</p>
        ) : messages.length === 0 ? (
          <p className="muted small chat-empty">No messages yet — say something.</p>
        ) : (
          messages.map((message) => (
            <div key={message.id} className="chat-message">
              <Avatar
                username={message.author.username}
                displayName={message.author.displayName}
                avatarUrl={message.author.avatarUrl}
                size={30}
              />
              <div className="chat-body">
                <p className="chat-meta">
                  <strong>{message.author.displayName || message.author.username}</strong>
                  <span className="muted small">{formatWhen(message.createdAt)}</span>
                </p>
                <p className="chat-text">{message.body}</p>
              </div>
            </div>
          ))
        )}
      </div>

      <form className="task-form task-form-bare chat-composer" onSubmit={handleSend}>
        <input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Message the group…"
          maxLength={1000}
          aria-label="Message"
        />
        <button type="submit" className="button" disabled={sending || !draft.trim()}>
          Send
        </button>
      </form>
    </section>
  );
}
