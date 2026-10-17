// ============================================================
// Centralized SmartEdufy subscription pricing configuration.
// Administrators can update prices/capacities here in one place.
// ============================================================

export type BillingPeriod = "monthly" | "termly" | "annual";
export type PlanId = "free" | "premium" | "growth" | "advanced" | "enterprise";

export interface PricingFeature {
  label: string;
  /** Feature is announced but not yet implemented — shown as "Coming Soon". */
  comingSoon?: boolean;
}

export interface PricingPlan {
  id: PlanId;
  name: string;
  /** Prices per billing period in ₦. `null` = Free (always ₦0), 'custom' = Enterprise. */
  price: {
    monthly: number | null | "custom";
    termly: number | null | "custom";
    annual: number | null | "custom";
  };
  capacity: string;
  capacityNote: string;
  tagline: string;
  recommended?: boolean;
  features: PricingFeature[];
}

export const PRICING: PricingPlan[] = [
  {
    id: "free",
    name: "Free",
    tagline: "Get started with core school management.",
    price: { monthly: null, termly: null, annual: null },
    capacity: "Up to 50 students",
    capacityNote: "Entry-level plan for small schools.",
    features: [
      { label: "Core school management features" },
      { label: "Student, staff, class, subject & attendance management" },
      { label: "Basic results and report cards" },
      { label: "Parent, staff and administrator app access" },
      { label: "Basic Edufy AI assistance (limited capabilities)" },
    ],
  },
  {
    id: "premium",
    name: "Premium",
    tagline: "The best value for growing schools.",
    price: { monthly: 10000, termly: 27000, annual: 75000 },
    capacity: "1 – 500 students",
    capacityNote: "Ideal for a single-campus primary or secondary school.",
    recommended: true,
    features: [
      { label: "Everything in the Free plan" },
      { label: "Edufy AI Premium access" },
      { label: "AI Result Scanner" },
      { label: "AI-assisted result processing and analysis" },
      { label: "AI-generated academic comments and insights" },
      { label: "Higher AI usage allowance" },
      { label: "Priority support" },
    ],
  },
  {
    id: "growth",
    name: "Growth",
    tagline: "More power for larger schools.",
    price: { monthly: 20000, termly: 54000, annual: 150000 },
    capacity: "501 – 1,000 students",
    capacityNote: "For busy schools that need bulk processing.",
    features: [
      { label: "Everything in Premium" },
      { label: "Higher AI usage allowance" },
      { label: "Advanced reporting and analytics" },
      { label: "Bulk academic processing" },
      { label: "Enhanced administrative productivity tools" },
      { label: "Faster support response" },
    ],
  },
  {
    id: "advanced",
    name: "Advanced",
    tagline: "Full AI-powered school operations.",
    price: { monthly: 35000, termly: 94500, annual: 262500 },
    capacity: "1,001 – 2,000 students",
    capacityNote: "For large single institutions.",
    features: [
      { label: "Everything in Growth" },
      { label: "Higher AI processing capacity" },
      { label: "Advanced academic analytics" },
      { label: "AI-assisted timetable planning", comingSoon: true },
      { label: "Student performance insights & administrative automation" },
    ],
  },
  {
    id: "enterprise",
    name: "Enterprise",
    tagline: "Tailored for multi-campus institutions.",
    price: { monthly: "custom", termly: "custom", annual: "custom" },
    capacity: "2,000+ students",
    capacityNote: "Multi-campus groups and large networks.",
    features: [
      { label: "Custom student capacity and AI usage" },
      { label: "Multi-campus management options", comingSoon: true },
      { label: "Custom onboarding, training and support" },
      { label: "Dedicated account management" },
    ],
  },
];

export const BILLING_PERIODS: {
  id: BillingPeriod;
  label: string;
  note?: string;
}[] = [
  { id: "monthly", label: "Monthly", note: "Billed every month" },
  {
    id: "termly",
    label: "Termly",
    note: "Covers one academic term (3 months)",
  },
  {
    id: "annual",
    label: "Annual",
    note: "Covers one academic session (12 months)",
  },
];

/** Monthly-equivalent price used to compute savings for termly/annual billing. */
export function computeSavings(
  plan: PricingPlan,
  period: BillingPeriod,
): number | null {
  if (typeof plan.price[period] !== "number") return null;
  if (period === "monthly") return null;
  const periodPrice = plan.price[period] as number;
  const monthlyTotal =
    (plan.price.monthly as number) * (period === "termly" ? 3 : 12);
  if (monthlyTotal <= periodPrice) return null;
  return monthlyTotal - periodPrice;
}

export const formatNaira = (n: number) => `₦${n.toLocaleString("en-NG")}`;

export function planPriceLabel(
  plan: PricingPlan,
  period: BillingPeriod,
): { amount: string; suffix?: string } {
  const p = plan.price[period];
  if (p === null) return { amount: "₦0", suffix: "/forever" };
  if (p === "custom") return { amount: "Custom", suffix: "pricing" };
  return {
    amount: formatNaira(p as number),
    suffix:
      period === "monthly"
        ? "/month"
        : period === "termly"
          ? "/term"
          : "/session",
  };
}
