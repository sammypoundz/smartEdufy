// frontend/src/components/teacher/ProfileSetupBanner.tsx
// Shown on the teacher dashboard when the teacher's profile is incomplete
// (no phone number yet — typical right after self-registration).
// Prompts them to finish setting up, and PATCHes /teachers/me on save.
import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../../services/api";
import toast from "react-hot-toast";
import { useTheme } from "../../contexts/ThemeContext";
import { useAuth } from "../../contexts/AuthContext";
import {
  ExclamationTriangleIcon,
  XMarkIcon,
  CheckIcon,
  UserCircleIcon,
} from "@heroicons/react/24/outline";

interface TeacherMe {
  id: string;
  name: string;
  phone: string | null;
  email: string;
}

export default function ProfileSetupBanner() {
  const { theme } = useTheme();
  const dark = theme === "dark";
  const { user, refreshUser } = useAuth();
  const queryClient = useQueryClient();
  const [dismissed, setDismissed] = useState(false);
  const [phone, setPhone] = useState("");
  const [name, setName] = useState(user?.name || "");

  const { data: teacher } = useQuery<TeacherMe>({
    queryKey: ["teacher-me-profile", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const res = await api.get("/teachers/me");
      return res.data?.teacher ?? res.data;
    },
  });

  // Only prompt when there's a teacher profile missing a phone number.
  const needsSetup = !!teacher && !teacher.phone;

  useEffect(() => {
    if (teacher) {
      setName(teacher.name || user?.name || "");
      setPhone(teacher.phone || "");
    }
  }, [teacher, user?.name]);

  const save = useMutation({
    mutationFn: async () => {
      const body: Record<string, string> = {};
      if (phone.trim()) body.phone = phone.trim();
      if (name.trim() && name.trim() !== teacher?.name) body.name = name.trim();
      return api.patch("/teachers/me", body);
    },
    onSuccess: async () => {
      toast.success("Profile saved!");
      await refreshUser();
      queryClient.invalidateQueries({ queryKey: ["teacher-me-profile"] });
    },
    onError: () =>
      toast.error("Could not save your profile. Please try again."),
  });

  if (!needsSetup || dismissed) return null;

  return (
    <div
      className={`mb-6 rounded-2xl border shadow-lg overflow-hidden ${
        dark
          ? "bg-amber-500/10 border-amber-400/30 backdrop-blur-xl"
          : "bg-amber-50 border-amber-200"
      }`}
    >
      <div className="px-4 sm:px-5 py-4 flex flex-col gap-3 sm:flex-row sm:items-start">
        <ExclamationTriangleIcon
          className={`h-6 w-6 flex-shrink-0 mt-0.5 ${
            dark ? "text-amber-300" : "text-amber-500"
          }`}
        />
        <div className="flex-1 min-w-0">
          <h3
            className={`text-sm font-bold ${dark ? "text-amber-200" : "text-amber-800"}`}
          >
            Complete your profile
          </h3>
          <p
            className={`mt-0.5 text-xs ${dark ? "text-amber-200/70" : "text-amber-700"}`}
          >
            Welcome! Please add your phone number (and confirm your name) so the
            school can reach you. It only takes a second.
          </p>

          <div className="mt-3 flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1 sm:max-w-[220px]">
              <UserCircleIcon
                className={`h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 ${
                  dark ? "text-amber-300/60" : "text-amber-500/60"
                }`}
              />
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your full name"
                className={`w-full rounded-lg pl-9 pr-3 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-400 ${
                  dark
                    ? "bg-white/10 text-white placeholder-amber-200/40 border border-white/10"
                    : "bg-white text-gray-900 placeholder-gray-400 border border-amber-200"
                }`}
              />
            </div>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Phone number e.g. 080…"
              inputMode="tel"
              className={`flex-1 sm:max-w-[240px] rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-400 ${
                dark
                  ? "bg-white/10 text-white placeholder-amber-200/40 border border-white/10"
                  : "bg-white text-gray-900 placeholder-gray-400 border border-amber-200"
              }`}
            />
            <button
              onClick={() => {
                if (!phone.trim()) {
                  toast.error("Please enter your phone number");
                  return;
                }
                save.mutate();
              }}
              disabled={save.isPending}
              className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold px-4 py-2 shadow disabled:opacity-60"
            >
              {save.isPending ? (
                <span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <CheckIcon className="h-4 w-4" />
              )}
              Save
            </button>
          </div>
        </div>
        <button
          onClick={() => setDismissed(true)}
          className={`self-start p-1.5 rounded-lg flex-shrink-0 ${
            dark
              ? "text-amber-300/60 hover:text-amber-200 hover:bg-white/10"
              : "text-amber-400 hover:text-amber-600 hover:bg-amber-100"
          }`}
          aria-label="Dismiss for now"
          title="Dismiss for now"
        >
          <XMarkIcon className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
