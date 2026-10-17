// Shared mock data + mock subscription info for the Edufy AI UI demo.

export interface EdufyFeature {
  id:
    | "result-scanner"
    | "timetable-creator"
    | "chat"
    | "lesson-plan"
    | "insights"
    | "reports";
  title: string;
  description: string;
  icon: "scanner" | "calendar" | "chat" | "lesson" | "chart" | "report";
  premium: boolean;
  comingSoon: boolean;
  available: boolean;
}

export const EDUFY_FEATURES: EdufyFeature[] = [
  {
    id: "result-scanner",
    title: "AI Result Scanner",
    description: "Extract marks and student information from result sheets.",
    icon: "scanner",
    premium: false,
    comingSoon: false,
    available: true,
  },
  {
    id: "timetable-creator",
    title: "AI Timetable Creator",
    description: "Generate school timetables intelligently.",
    icon: "calendar",
    premium: false,
    comingSoon: false,
    available: true,
  },
  {
    id: "chat",
    title: "Ask Edufy AI",
    description: "Ask questions and get assistance.",
    icon: "chat",
    premium: false,
    comingSoon: false,
    available: true,
  },
  {
    id: "lesson-plan",
    title: "Lesson Plan Assistant",
    description: "Create lesson plans and teaching activities.",
    icon: "lesson",
    premium: false,
    comingSoon: false,
    available: true,
  },
  {
    id: "insights",
    title: "Student Performance Insights",
    description: "Explore student results and performance.",
    icon: "chart",
    premium: false,
    comingSoon: false,
    available: true,
  },
  {
    id: "reports",
    title: "AI Report Assistant",
    description: "Prepare academic summaries and reports.",
    icon: "report",
    premium: false,
    comingSoon: false,
    available: true,
  },
];

// Mock subscription — no billing is implemented.
export const MOCK_SUBSCRIPTION = {
  plan: "Free",
  premium: false,
  upgradePrice: "₦15,000",
  upgradePeriod: "/school term",
};
