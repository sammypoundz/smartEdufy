// Shared onboarding gate state.
// When a Super Admin assigns the self-onboarding wizard to a school, its
// admin panel surfaces "required: true" from /onboarding/progress until all
// 8 stages are completed. Consumers (AdminLayout, EdufyAI, Overview) use
// this hook to hide Edufy AI / show CTAs while onboarding is outstanding.
import { useQuery } from "@tanstack/react-query";
import { api } from "../utils/api";

export interface OnboardingGate {
  required: boolean;
  completed: boolean;
}

export function useOnboardingGate(enabled: boolean): OnboardingGate {
  const q = useQuery({
    queryKey: ["onboarding-gate"],
    queryFn: async () =>
      (
        await api.get("/onboarding/progress")
      ).json() as unknown as OnboardingGate,
    enabled,
    staleTime: 10_000,
  });
  return {
    required: !!q.data?.required,
    completed: !!q.data?.completed,
  };
}
