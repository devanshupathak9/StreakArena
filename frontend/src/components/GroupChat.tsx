import { useCallback, useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { Paperclip, SendHorizonal, X } from "lucide-react";
import { api, type GroupMessage } from "../lib/api";
import Avatar from "./Avatar";
import { useAuth } from "../context/AuthContext";
import { formatWhen } from "../lib/dates";

const POLL_MS = 6000;
const MAX_BYTES = 5 * 1024 * 1024;
/** Consecutive messages from one person inside this window read as one turn. */
const GROUPING_MS = 5 * 60 * 1000;

function humanSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function dayLabel(iso: string) {
  const date = new Date(iso);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const same = (a: Date, b: Date) => a.toDateString() === b.toDateString();
  if (same(date, today)) return "Today";
  if (same(date, yesterday)) return "Yesterday";
  return date.toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" });
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
      <Paperclip size={14} strokeWidth={2} aria-hidden="true" />
      <span className="chat-file-name">{message.file.name}</span>
      <span className="muted small">{humanSize(message.file.size)}</span>
    </a>
  );
}

export default function GroupChat({ groupId }: { groupId: string }) {
  const { user } = useAuth();
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

  /** Enter sends, shift+Enter starts a line — what every chat does. */
  function handleKey(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void handleSend(event as unknown as FormEvent);
    }
  }

  return (
    <section className="card chat-card">
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
          messages.map((message, index) => {
            const previous = messages[index - 1];
            const mine = message.author.userId === user?.id;
            const newDay =
              !previous || dayLabel(previous.createdAt) !== dayLabel(message.createdAt);
            // A run of messages from one person reads as one turn, so only the
            // first of the run carries an avatar and a name.
            const runs =
              !newDay &&
              previous?.author.userId === message.author.userId &&
              new Date(message.createdAt).getTime() -
                new Date(previous.createdAt).getTime() <
                GROUPING_MS;

            return (
              <div key={message.id}>
                {newDay && (
                  <div className="chat-day">
                    <span>{dayLabel(message.createdAt)}</span>
                  </div>
                )}

                <div
                  className={`chat-message${mine ? " chat-mine" : ""}${runs ? " chat-run" : ""}`}
                >
                  <span className="chat-avatar">
                    {!runs && (
                      <Avatar
                        username={message.author.username}
                        displayName={message.author.displayName}
                        avatarUrl={message.author.avatarUrl}
                        size={30}
                      />
                    )}
                  </span>

                  <div className="chat-body">
                    {!runs && (
                      <p className="chat-meta">
                        <strong>
                          {mine ? "You" : message.author.displayName || message.author.username}
                        </strong>
                        <time dateTime={message.createdAt}>{formatWhen(message.createdAt)}</time>
                      </p>
                    )}
                    {message.body && <p className="chat-text">{message.body}</p>}
                    <Attachment message={message} groupId={groupId} />
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      <form className="chat-composer" onSubmit={handleSend}>
        {file && (
          <div className="chat-pending">
            <Paperclip size={14} strokeWidth={2} aria-hidden="true" />
            <span className="chat-file-name">{file.name}</span>
            <span className="muted small">{humanSize(file.size)}</span>
            <button
              type="button"
              className="icon-button icon-button-sm"
              onClick={clearFile}
              aria-label="Remove file"
            >
              <X size={14} strokeWidth={2.4} aria-hidden="true" />
            </button>
          </div>
        )}

        <div className="chat-input-row">
          <input
            ref={fileInput}
            type="file"
            className="visually-hidden"
            id="chat-file"
            accept="image/png,image/jpeg,image/gif,image/webp,application/pdf,text/plain,text/csv"
            onChange={handlePick}
          />
          <label htmlFor="chat-file" className="chat-attach" title="Attach a file">
            <Paperclip size={17} strokeWidth={2} aria-hidden="true" />
            <span className="visually-hidden">Attach a file</span>
          </label>

          <textarea
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={handleKey}
            placeholder="Message the group…"
            maxLength={1000}
            rows={1}
            aria-label="Message"
          />

          <button
            type="submit"
            className="chat-send"
            disabled={sending || (!draft.trim() && !file)}
            aria-label="Send message"
          >
            <SendHorizonal size={17} strokeWidth={2} aria-hidden="true" />
          </button>
        </div>
      </form>
    </section>
  );
}
