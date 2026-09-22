import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { api, type GroupMessage } from "../lib/api";
import Avatar from "./Avatar";
import { formatWhen } from "../lib/dates";

const POLL_MS = 6000;
const MAX_BYTES = 5 * 1024 * 1024;

function humanSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

/** Images are shown; everything else is a download link with its size. */
function Attachment({ message, groupId }: { message: GroupMessage; groupId: string }) {
  if (!message.file) return null;
  const href = api.attachmentUrl(groupId, message.id);

  if (message.file.type.startsWith("image/")) {
    return (
      <a href={href} className="chat-image" target="_blank" rel="noreferrer">
        <img src={href} alt={message.file.name} loading="lazy" />
      </a>
    );
  }

  return (
    <a href={href} className="chat-file" target="_blank" rel="noreferrer">
      <span aria-hidden="true">📎</span>
      <span className="chat-file-name">{message.file.name}</span>
      <span className="muted small">{humanSize(message.file.size)}</span>
    </a>
  );
}

export default function GroupChat({ groupId }: { groupId: string }) {
  const [messages, setMessages] = useState<GroupMessage[] | null>(null);
  const [draft, setDraft] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
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

  function clearFile() {
    setFile(null);
    // The input keeps its value after a send, so picking the same file again
    // would fire no change event without this.
    if (fileInput.current) fileInput.current.value = "";
  }

  function handlePick(event: React.ChangeEvent<HTMLInputElement>) {
    const picked = event.target.files?.[0] ?? null;
    if (picked && picked.size > MAX_BYTES) {
      setError("Files must be under 5 MB");
      clearFile();
      return;
    }
    setError("");
    setFile(picked);
  }

  async function handleSend(event: FormEvent) {
    event.preventDefault();
    const body = draft.trim();
    if ((!body && !file) || sending) return;

    setError("");
    setSending(true);
    try {
      const message = await api.sendMessage(groupId, body, file);
      pinned.current = true;
      merge([message]);
      setDraft("");
      clearFile();
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
                {message.body && <p className="chat-text">{message.body}</p>}
                <Attachment message={message} groupId={groupId} />
              </div>
            </div>
          ))
        )}
      </div>

      <form className="chat-composer" onSubmit={handleSend}>
        {file && (
          <div className="chat-pending">
            <span aria-hidden="true">📎</span>
            <span className="chat-file-name">{file.name}</span>
            <span className="muted small">{humanSize(file.size)}</span>
            <button type="button" className="link-button" onClick={clearFile} aria-label="Remove file">
              ✕
            </button>
          </div>
        )}

        <div className="task-form task-form-bare">
          <input
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Message the group…"
            maxLength={1000}
            aria-label="Message"
          />

          <input
            ref={fileInput}
            type="file"
            className="visually-hidden"
            id="chat-file"
            accept="image/png,image/jpeg,image/gif,image/webp,application/pdf,text/plain,text/csv"
            onChange={handlePick}
          />
          <label htmlFor="chat-file" className="button button-secondary chat-attach" title="Attach a file">
            <span aria-hidden="true">📎</span>
          </label>

          <button type="submit" className="button" disabled={sending || (!draft.trim() && !file)}>
            {sending ? "Sending…" : "Send"}
          </button>
        </div>
      </form>
    </section>
  );
}
