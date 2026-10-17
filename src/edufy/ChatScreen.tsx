import { useEffect, useRef, useState } from "react";
import {
  PaperAirplaneIcon,
  ArrowPathIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/solid";
import { useEdufy } from "./EdufyContext";

const QUICK_PROMPTS = [
  "What can Edufy AI do?",
  "Help me build a timetable",
  "How do I scan result sheets?",
];

/** Minimal markdown-ish rendering for mock replies (bold + newlines only). */
function renderMockText(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((p, i) =>
    p.startsWith("**") && p.endsWith("**") ? (
      <strong key={i} className="font-bold text-blue-700 dark:text-blue-300">
        {p.slice(2, -2)}
      </strong>
    ) : (
      <span key={i}>{p}</span>
    ),
  );
}

export default function ChatScreen() {
  const { chat, chatTyping, sendChat, back } = useEdufy();
  const [input, setInput] = useState("");
  const [sendError, setSendError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [chat, chatTyping]);

  const submit = () => {
    if (!input.trim()) {
      setSendError("Please type a message first.");
      return;
    }
    if (input.trim().length > 500) {
      setSendError("Message too long (max 500 characters).");
      return;
    }
    setSendError(null);
    sendChat(input);
    setInput("");
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b border-gray-100 px-4 py-3 dark:border-gray-700/70">
        <button
          onClick={back}
          aria-label="Back to Edufy AI menu"
          className="rounded-lg p-1.5 text-gray-500 transition hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-700/60 dark:hover:text-gray-200"
        >
          <svg
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15.75 19.5L8.25 12l7.5-7.5"
            />
          </svg>
        </button>
        <div>
          <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100">Ask Edufy AI</h3>
          <p className="text-[11px] text-gray-500 dark:text-gray-400">
            Questions, help &amp; guidance
          </p>
        </div>
      </div>

      {/* messages */}
      <div
        ref={scrollRef}
        className="flex-1 space-y-3 overflow-y-auto p-4"
        role="log"
        aria-live="polite"
      >
        {chat.map((m) => (
          <div
            key={m.id}
            className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[85%] rounded-2xl px-3 py-2 text-[12px] leading-relaxed shadow-sm ${
                m.role === "user"
                  ? "rounded-br-sm bg-blue-600 text-white"
                  : m.status === "error"
                    ? "rounded-bl-sm bg-red-50 text-red-700 dark:bg-red-500/15 dark:text-red-300"
                    : "rounded-bl-sm bg-gray-100 text-gray-800 dark:bg-gray-700/70 dark:text-gray-200"
              }`}
            >
              {m.status === "error" && (
                <ExclamationTriangleIcon className="mb-1 h-4 w-4 text-red-500" />
              )}
              {m.role === "assistant" ? renderMockText(m.text) : m.text}
            </div>
          </div>
        ))}
        {chatTyping && (
          <div className="flex justify-start">
            <div
              className="flex items-center gap-1.5 rounded-2xl rounded-bl-sm bg-gray-100 px-3 py-2 dark:bg-gray-700/70"
              aria-label="Edufy AI is typing"
            >
              <ArrowPathIcon className="h-3.5 w-3.5 animate-spin text-blue-500" />
              <span className="flex gap-1">
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-gray-400 dark:bg-gray-500 [animation-delay:0ms]" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-gray-400 dark:bg-gray-500 [animation-delay:150ms]" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-gray-400 dark:bg-gray-500 [animation-delay:300ms]" />
              </span>
            </div>
          </div>
        )}
      </div>

      {/* quick prompts (empty-ish state helper) */}
      {chat.length <= 1 && (
        <div className="flex flex-wrap gap-1.5 px-4 pb-2">
          {QUICK_PROMPTS.map((q) => (
            <button
              key={q}
              onClick={() => sendChat(q)}
              className="rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-semibold text-blue-700 transition hover:bg-blue-100 dark:bg-blue-500/15 dark:text-blue-300 dark:hover:bg-blue-500/25"
            >
              {q}
            </button>
          ))}
        </div>
      )}

      {sendError && (
        <p
          className="px-4 pb-1 text-[10px] font-semibold text-red-600"
          role="alert"
        >
          {sendError}
        </p>
      )}

      {/* composer */}
      <div className="border-t border-gray-100 p-3 dark:border-gray-700/70">
        <div className="flex items-center gap-2">
          <input
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              if (sendError) setSendError(null);
            }}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            placeholder="Ask Edufy AI anything…"
            aria-label="Message Edufy AI"
            maxLength={600}
            className="flex-1 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-800 placeholder:text-gray-400 focus:border-blue-500 focus:bg-white focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:placeholder:text-gray-500 dark:focus:bg-gray-800"
          />
          <button
            onClick={submit}
            aria-label="Send message"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md transition hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50"
            disabled={chatTyping}
          >
            <PaperAirplaneIcon className="h-4 w-4" />
          </button>
        </div>
        <p className="mt-1.5 text-center text-[9px] text-gray-400 dark:text-gray-500">
          Mock responses — Edufy AI backend is not connected yet.
        </p>
      </div>
    </div>
  );
}
