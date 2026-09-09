"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { NAP } from "@/lib/site";

// Floating lead-gen assistant, mounted once in the marketing layout so it
// appears on the five public pages (and nowhere near /book or /contact). Talks
// to /api/chat, which owns the model call, the knowledge base, rate limiting,
// and lead capture. This component is just the surface.

type Turn = { role: "user" | "assistant"; content: string };

const STORAGE_KEY = "uinta_chat_v1";
const MAX_INPUT = 1000; // mirrors MAX_MESSAGE_CHARS in lib/chat/config.ts
const INPUT_MAX_HEIGHT = 96; // keep in sync with .uic-composer__input max-height

const GREETING =
  "Hi — I can help with questions about our ice machine cleaning: what's " +
  "involved, pricing, the service area, or getting booked. What's on your mind?";

type Convo = { turns: Turn[]; leadCaptured: boolean; limitReached: boolean };

function emptyConvo(): Convo {
  return { turns: [], leadCaptured: false, limitReached: false };
}

// Read once, in a lazy state initializer. Safe against a hydration mismatch
// because the panel (the only storage-dependent DOM) isn't rendered until the
// visitor opens it, well after hydration.
function initialConvo(): Convo {
  if (typeof window === "undefined") return emptyConvo();
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyConvo();
    const p = JSON.parse(raw) as Partial<Convo>;
    if (!Array.isArray(p.turns)) return emptyConvo();
    return {
      turns: p.turns.filter(
        (t): t is Turn =>
          !!t &&
          (t.role === "user" || t.role === "assistant") &&
          typeof t.content === "string",
      ),
      leadCaptured: p.leadCaptured === true,
      limitReached: p.limitReached === true,
    };
  } catch {
    return emptyConvo();
  }
}

export function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [convo, setConvo] = useState<Convo>(initialConvo);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const { turns, leadCaptured, limitReached } = convo;

  const launcherRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(convo));
    } catch {
      /* private mode / disabled storage — the chat still works, just won't persist */
    }
  }, [convo]);

  // Keep the log pinned to the latest message.
  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight });
  }, [turns, busy, notice, open]);

  // Move focus into the panel on open and back to the launcher on close, but
  // never steal focus on the initial (closed) page load.
  const openedOnce = useRef(false);
  useEffect(() => {
    if (open) {
      openedOnce.current = true;
      inputRef.current?.focus();
    } else if (openedOnce.current) {
      launcherRef.current?.focus();
    }
  }, [open]);

  // Auto-grow the textarea up to a few lines, then let it scroll.
  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "auto";
    const capped = Math.min(el.scrollHeight, INPUT_MAX_HEIGHT);
    el.style.height = `${capped}px`;
    el.style.overflowY = el.scrollHeight > INPUT_MAX_HEIGHT ? "auto" : "hidden";
  }, [input, open]);

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, close]);

  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || busy || limitReached) return;

    const optimistic: Turn[] = [...turns, { role: "user", content: text }];
    setConvo((c) => ({ ...c, turns: optimistic }));
    setInput("");
    setNotice(null);
    setBusy(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: optimistic, leadCaptured }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        reply?: string;
        error?: string;
        leadCaptured?: boolean;
        limitReached?: boolean;
      };

      if (!res.ok || !data.reply) {
        // roll the optimistic user turn back; let them retry without retyping
        setConvo((c) => ({
          ...c,
          turns,
          limitReached: c.limitReached || data.limitReached === true,
        }));
        setInput(text);
        setNotice(data.error || "Something went wrong. Try again in a moment.");
        return;
      }

      const reply = data.reply;
      setConvo((c) => ({
        turns: [...optimistic, { role: "assistant", content: reply }],
        leadCaptured: c.leadCaptured || data.leadCaptured === true,
        limitReached: c.limitReached || data.limitReached === true,
      }));
    } catch {
      setConvo((c) => ({ ...c, turns }));
      setInput(text);
      setNotice("Couldn't reach the assistant. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }, [input, busy, limitReached, turns, leadCaptured]);

  const onInputKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void send();
    }
  };

  return (
    <>
      {!open && (
        <button
          ref={launcherRef}
          type="button"
          className="uic-launcher"
          aria-haspopup="dialog"
          aria-expanded={false}
          onClick={() => setOpen(true)}
        >
          <ChatIcon />
          <span className="uic-launcher__label">Questions?</span>
        </button>
      )}

      {open && (
        <div
          className="uic-panel"
          role="dialog"
          aria-label="Chat with Uinta Ice Co."
        >
          <header className="uic-panel__head">
            <span className="uic-panel__title">Ask Uinta Ice Co.</span>
            <a href="/book" className="uic-panel__book">
              Book a cleaning
            </a>
            <button
              type="button"
              className="uic-panel__close"
              aria-label="Close chat"
              onClick={close}
            >
              <CloseIcon />
            </button>
          </header>

          <div className="uic-log" ref={logRef} aria-live="polite">
            <Bubble role="assistant">{GREETING}</Bubble>
            {turns.map((t, i) => (
              <Bubble key={i} role={t.role}>
                {t.role === "assistant" ? renderAssistant(t.content) : renderPlain(t.content)}
              </Bubble>
            ))}
            {busy && (
              <div className="uic-bubble uic-bubble--assistant" aria-hidden="true">
                <span className="uic-typing">
                  <span />
                  <span />
                  <span />
                </span>
              </div>
            )}
            {notice && <p className="uic-notice">{notice}</p>}
          </div>

          {limitReached ? (
            <div className="uic-limit">
              <p>This chat has reached its length limit.</p>
              <button
                type="button"
                className="uic-limit__refresh"
                onClick={() => window.location.reload()}
              >
                Refresh to start a new chat
              </button>
            </div>
          ) : (
            <div className="uic-composer">
              <textarea
                ref={inputRef}
                className="uic-composer__input"
                placeholder="Type your question…"
                value={input}
                maxLength={MAX_INPUT}
                rows={1}
                disabled={busy}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={onInputKeyDown}
              />
              <button
                type="button"
                className="uic-composer__send"
                aria-label="Send"
                disabled={busy || !input.trim()}
                onClick={() => void send()}
              >
                <SendIcon />
              </button>
            </div>
          )}

          <p className="uic-foot">
            Answers from Uinta Ice Co. Or call/text{" "}
            <a href={NAP.phoneHref}>{NAP.phoneDisplay}</a>.
          </p>
        </div>
      )}
    </>
  );
}

function Bubble({
  role,
  children,
}: {
  role: "user" | "assistant";
  children: ReactNode;
}) {
  return (
    <div className={`uic-bubble uic-bubble--${role}`}>
      <div className="uic-bubble__body">{children}</div>
    </div>
  );
}

// ---- minimal, allow-listed rendering of assistant text --------------------

function renderPlain(text: string): ReactNode {
  const lines = text.split("\n");
  return lines.map((line, i) => (
    <span key={i}>
      {line}
      {i < lines.length - 1 && <br />}
    </span>
  ));
}

function renderAssistant(text: string): ReactNode {
  return text
    .split(/\n{2,}/)
    .map((para, i) => <p key={i}>{renderInline(para)}</p>);
}

const INLINE_RE = /\[([^\]]+)\]\(([^)\s]+)\)|\*\*([^*]+)\*\*/g;

function renderInline(segment: string): ReactNode[] {
  const out: ReactNode[] = [];
  let cursor = 0;
  let key = 0;
  let match: RegExpExecArray | null;
  INLINE_RE.lastIndex = 0;

  while ((match = INLINE_RE.exec(segment)) !== null) {
    if (match.index > cursor) {
      out.push(...withBreaks(segment.slice(cursor, match.index), key));
      key += 1;
    }
    const [full, linkText, linkHref, boldText] = match;
    if (linkText && linkHref) {
      const href = safeHref(linkHref);
      out.push(
        href ? (
          <a
            key={`l${key}`}
            href={href}
            className="uic-inline-link"
            {...(href.startsWith("http")
              ? { target: "_blank", rel: "noopener noreferrer" }
              : {})}
          >
            {linkText}
          </a>
        ) : (
          <span key={`l${key}`}>{linkText}</span>
        ),
      );
    } else if (boldText) {
      out.push(<strong key={`b${key}`}>{boldText}</strong>);
    }
    key += 1;
    cursor = match.index + full.length;
  }

  if (cursor < segment.length) {
    out.push(...withBreaks(segment.slice(cursor), key));
  }
  return out;
}

function withBreaks(text: string, keyBase: number): ReactNode[] {
  const lines = text.split("\n");
  return lines.map((line, i) => (
    <span key={`t${keyBase}-${i}`}>
      {line}
      {i < lines.length - 1 && <br />}
    </span>
  ));
}

// Internal paths, tel:, mailto:, and the site's own https URLs only. Anything
// else renders as plain text — the bot should never be emitting other links,
// and this guarantees it can't.
function safeHref(raw: string): string | null {
  const h = raw.trim();
  if (h.startsWith("/") && !h.startsWith("//")) return h;
  if (/^tel:\+?[0-9()\-.\s]+$/i.test(h)) return h;
  if (/^mailto:[^\s@]+@[^\s@]+\.[^\s@]+$/i.test(h)) return h;
  if (/^https:\/\/(www\.)?uintaice\.com(\/|$)/i.test(h)) return h;
  return null;
}

function ChatIcon() {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function SendIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <line x1="22" y1="2" x2="11" y2="13" />
      <polygon points="22 2 15 22 11 13 2 9 22 2" />
    </svg>
  );
}
