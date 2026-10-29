import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { useAuth } from "../contexts/AuthContext";

// Safe hook access — EdufyProvider may mount outside an AuthProvider in some
// test setups; fail gracefully to "logged out".
function useAuthSafe() {
  try {
    return useAuth();
  } catch {
    return null;
  }
}

export type EdufyScreen =
  | "menu"
  | "chat"
  | "result-scanner"
  | "timetable-creator"
  | "lesson-plan"
  | "insights"
  | "reports";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  status?: "loading" | "error";
}

/** A row extracted by the AI Result Scanner (backend /ai-scan/result-sheet). */
export interface EdufyScanRow {
  name: string;
  admissionNumber?: string | null;
  ca1: number | null;
  ca2: number | null;
  ca3: number | null;
  exam: number | null;
  confidence: "high" | "medium" | "low";
}

/** Handoff from a host page (e.g. Results) into the agent's scanner screen. */
export interface ScannerHandoff {
  rosterNames: string[];
  onApply: (rows: EdufyScanRow[]) => void;
  /** Where the scanned marks should land when pushed to the Result Compiler. */
  context?: {
    classId?: string;
    armId?: string;
    subjectId?: string;
    term?: string;
    academicYearId?: string;
  };
}

/** A completed scan waiting to be pushed into the Result Compiler page. */
export interface PendingScan {
  rows: EdufyScanRow[];
  context?: ScannerHandoff["context"];
}

interface EdufyContextValue {
  open: boolean;
  screen: EdufyScreen;
  history: EdufyScreen[];
  chat: ChatMessage[];
  chatTyping: boolean;
  scannerHandoff: ScannerHandoff | null;
  pendingScan: PendingScan | null;
  openPanel: () => void;
  closePanel: () => void;
  togglePanel: () => void;
  go: (screen: EdufyScreen) => void;
  back: () => void;
  resetToMenu: () => void;
  sendChat: (text: string) => void;
  /** Open the agent directly on the Result Scanner with a host handoff. */
  openScanner: (handoff: ScannerHandoff) => void;
  /** Queue a completed scan for the Result Compiler page to consume. */
  pushScan: (scan: PendingScan) => void;
  /** Consume (clear) the queued scan — called by the Result Compiler. */
  consumePendingScan: () => void;
}

const EdufyContext = createContext<EdufyContextValue | null>(null);

// ------------------------------------------------------------------
// Mock AI responses — frontend demo only. No backend is involved.
// ------------------------------------------------------------------
const MOCK_RESPONSES: { match: RegExp; reply: string }[] = [
  {
    match: /timetable|schedule/i,
    reply:
      "I can help with that! Open the **AI Timetable Creator** from the menu — it generates class timetables based on your subjects, teachers and preferences. I can also draft one for you right here: give me a class, the subjects and how many periods per day.",
  },
  {
    match: /result|mark|score|grade/i,
    reply:
      "For marks extraction, try the **AI Result Scanner** — just upload a photo or scan of a result sheet and I will pull out student names and scores for you to review before saving.",
  },
  {
    match: /lesson|plan|teach/i,
    reply:
      "The **Lesson Plan Assistant** can draft weekly lesson plans, objectives and activities. Tell me the subject and topic here and I will sketch a quick outline for you.",
  },
  {
    match: /report|summary/i,
    reply:
      "The **AI Report Assistant** prepares academic summaries, teacher remarks and per-student report comments from compiled results.",
  },
  {
    match: /hello|hi|hey|good (morning|afternoon|evening)/i,
    reply:
      "Hello there! 👋 I am Edufy AI, your SmartEdufy assistant. Ask me anything about your school, or pick a feature from the menu to get started.",
  },
  {
    match: /who are you|what can you do|help/i,
    reply:
      "I am Edufy AI 🤖 — I can scan result sheets, build timetables, draft lesson plans, analyse student performance and prepare reports. Choose a feature from the menu, or just type your question below.",
  },
];

const GENERIC_REPLIES = [
  "Good question! Here is what I found: SmartEdufy organises your school data into classes, arms, subjects and results. I can help you work with any of them — try asking about timetables, results or lesson plans. (Mock demo response)",
  "I understand you are exploring Edufy AI. Right now this is a frontend-only demo, so my answers are mock data — but the full flow of every feature is available from the menu. (Mock demo response)",
  "That is on my roadmap! While the AI engine is being connected, you can try the feature screens in the menu — Result Scanner and Timetable Creator are fully interactive. (Mock demo response)",
];

let replyIdx = 0;

export function EdufyProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [screen, setScreen] = useState<EdufyScreen>("menu");
  const [history, setHistory] = useState<EdufyScreen[]>([]);
  const [chat, setChat] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      text: "Hi there! 👋 I'm Edufy AI, your SmartEdufy assistant. I can help you scan results, build timetables, draft lesson plans and much more. How can I help you today?",
    },
  ]);
  const [chatTyping, setChatTyping] = useState(false);
  const [scannerHandoff, setScannerHandoff] = useState<ScannerHandoff | null>(null);
  const [pendingScan, setPendingScan] = useState<PendingScan | null>(null);

  // ---------- Auth-gated transient greeting ----------
  // The assistant auto-greets ONLY for logged-in users, and the greeting is
  // transient: it opens briefly then closes itself. If the user opens it
  // manually (button click) it stays open until they close it.
  const auth = useAuthSafe();
  const isLoggedIn = !!auth?.user && !!auth?.token;
  const autoOpenedRef = useRef(false);
  const autoCloseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Not logged in → make sure the panel is closed and no timers run.
    if (!isLoggedIn) {
      setOpen(false);
      if (autoCloseTimer.current) clearTimeout(autoCloseTimer.current);
      return;
    }
    // Mobile view: never auto-open — the greeting covers the small screen and
    // the button is enough. Desktop keeps the once-per-session greeting.
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      autoOpenedRef.current = true; // consume the once-per-session flag
      return;
    }
    // Logged in → transient greeting once per login session, unless the
    // user has already opened the panel themselves.
    if (autoOpenedRef.current) return;
    autoOpenedRef.current = true;
    const t = setTimeout(() => {
      // Only auto-open if the user hasn't already opened it manually.
      setOpen((prev) => {
        if (prev) return prev; // user already has it open — don't touch it
        // Schedule the auto-close only if it remains untouched.
        autoCloseTimer.current = setTimeout(() => setOpen(false), 6500);
        return true;
      });
    }, 1200);
    return () => clearTimeout(t);
  }, [isLoggedIn]);

  // If the viewport crosses into mobile while the transient greeting is up
  // (rotation, window resize), close it immediately.
  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth < 768 && autoCloseTimer.current) {
        clearTimeout(autoCloseTimer.current);
        autoCloseTimer.current = null;
        setOpen(false);
      }
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const openPanel = useCallback(() => {
    // A manual open cancels any pending auto-close — the panel stays open.
    if (autoCloseTimer.current) {
      clearTimeout(autoCloseTimer.current);
      autoCloseTimer.current = null;
    }
    setOpen(true);
  }, []);

  // Manual open/close controls — any user interaction cancels the transient
  // greeting's auto-close so the panel behaves normally afterwards.
  const closePanel = useCallback(() => setOpen(false), []);
  const togglePanel = useCallback(() => {
    // A manual toggle cancels any pending auto-close — after the user
    // interacts, the panel behaves normally (stays open until they close it).
    if (autoCloseTimer.current) {
      clearTimeout(autoCloseTimer.current);
      autoCloseTimer.current = null;
    }
    setOpen((o) => !o);
  }, []);

  const openScanner = useCallback((handoff: ScannerHandoff) => {
    // Manual open cancels any pending auto-close — the panel stays open.
    if (autoCloseTimer.current) {
      clearTimeout(autoCloseTimer.current);
      autoCloseTimer.current = null;
    }
    setScannerHandoff(handoff);
    setScreen("result-scanner");
    setHistory((h) => [...h, "result-scanner"]);
    setOpen(true);
  }, []);

  const pushScan = useCallback((scan: PendingScan) => {
    setPendingScan(scan);
  }, []);

  const consumePendingScan = useCallback(() => {
    setPendingScan(null);
  }, []);

  const go = useCallback((s: EdufyScreen) => {
    setHistory((h) => [...h, s]);
    setScreen(s);
  }, []);

  const back = useCallback(() => {
    setHistory((h) => {
      const next = h.slice(0, -1);
      setScreen(next[next.length - 1] ?? "menu");
      return next;
    });
  }, []);

  const resetToMenu = useCallback(() => {
    setScreen("menu");
    setHistory([]);
    setScannerHandoff(null);
    setPendingScan(null);
  }, []);

  const sendChat = useCallback((text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    const userMsg: ChatMessage = {
      id: `u${Date.now()}`,
      role: "user",
      text: trimmed,
    };
    setChat((c) => [...c, userMsg]);
    setChatTyping(true);
    // Simulated AI delay — mock only.
    setTimeout(
      () => {
        const hit = MOCK_RESPONSES.find((r) => r.match.test(trimmed));
        const reply = hit
          ? hit.reply
          : GENERIC_REPLIES[replyIdx++ % GENERIC_REPLIES.length];
        setChat((c) => [
          ...c,
          { id: `a${Date.now()}`, role: "assistant", text: reply },
        ]);
        setChatTyping(false);
      },
      900 + Math.random() * 700,
    );
  }, []);

  const value = useMemo(
    () => ({
      open,
      screen,
      history,
      chat,
      chatTyping,
      scannerHandoff,
      pendingScan,
      openPanel,
      closePanel,
      togglePanel,
      go,
      back,
      resetToMenu,
      sendChat,
      openScanner,
      pushScan,
      consumePendingScan,
    }),
    [
      open,
      screen,
      history,
      chat,
      chatTyping,
      scannerHandoff,
      pendingScan,
      openPanel,
      closePanel,
      togglePanel,
      go,
      back,
      resetToMenu,
      sendChat,
      openScanner,
      pushScan,
      consumePendingScan,
    ],
  );

  return (
    <EdufyContext.Provider value={value}>{children}</EdufyContext.Provider>
  );
}

export function useEdufy() {
  const ctx = useContext(EdufyContext);
  if (!ctx) throw new Error("useEdufy must be used inside <EdufyProvider>");
  return ctx;
}
