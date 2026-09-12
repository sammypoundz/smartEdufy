import {
  ChatBubbleLeftRightIcon,
  InboxIcon,
} from "@heroicons/react/24/outline";
import { useTheme } from "../../contexts/ThemeContext";
import { useAuth } from "../../contexts/AuthContext";

/**
 * Messages — placeholder. Wire to a real messaging/thread API when available.
 */
export default function ParentMessages() {
  const { theme } = useTheme();
  const { token, user } = useAuth();
  void token;
  void user; // consumed when the real API is wired
  const isDark = theme === "dark";

  return (
    <div>
      <h1
        className={`text-xl font-bold mb-4 ${isDark ? "text-white" : "text-gray-900"}`}
      >
        Messages
      </h1>

      <div
        className={`flex flex-col items-center justify-center rounded-3xl px-6 py-16 text-center border ${
          isDark
            ? "bg-gray-900/70 border-white/10"
            : "bg-white border-gray-200 shadow-sm"
        }`}
      >
        <span
          className={`h-16 w-16 rounded-2xl flex items-center justify-center mb-4 ${
            isDark
              ? "bg-blue-500/15 text-blue-400"
              : "bg-blue-100 text-blue-600"
          }`}
        >
          <InboxIcon className="h-8 w-8" />
        </span>
        <h2 className={`font-bold ${isDark ? "text-white" : "text-gray-900"}`}>
          No messages yet
        </h2>
        <p
          className={`mt-2 text-sm leading-relaxed ${isDark ? "text-gray-400" : "text-gray-500"}`}
        >
          Notes from teachers and the school office about your children will
          appear here.
        </p>
        <span
          className={`mt-4 inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full ${isDark ? "bg-white/5 text-gray-400" : "bg-gray-100 text-gray-600"}`}
        >
          <ChatBubbleLeftRightIcon className="h-4 w-4" />
          Coming soon
        </span>
      </div>
    </div>
  );
}
