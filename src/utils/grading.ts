import { api } from "./api";

export interface GradingScale {
  minScore: number;
  maxScore: number;
  grade: string;
  points?: number | null;
}

export interface GradingScaleGroup {
  id: string;
  name: string;
  isDefault?: boolean;
  grades: GradingScale[];
}

export interface ClassWithGradingGroup {
  id: string;
  gradingScaleGroup?: { id: string; name: string } | null;
}

/**
 * Fetch the school-wide (ungrouped) scales and all scale groups for the tenant.
 */
export async function fetchGradingData(token: string): Promise<{
  schoolScales: GradingScale[];
  groups: GradingScaleGroup[];
}> {
  let schoolScales: GradingScale[] = [];
  let groups: GradingScaleGroup[] = [];

  try {
    const res = await api.get("/grading-scales", token);
    if (res.ok) schoolScales = await res.json();
  } catch {
    /* fall through to empty */
  }

  try {
    const res = await api.get("/grading-scale-groups", token);
    if (res.ok) groups = await res.json();
  } catch {
    /* fall through to empty */
  }

  return { schoolScales, groups };
}

/**
 * Resolve the grading scales that apply to a class:
 * the class's assigned grading scale group if it has one, otherwise the
 * school-wide (ungrouped) scales.
 */
export function resolveClassScales(
  selectedClass: ClassWithGradingGroup | undefined,
  schoolScales: GradingScale[],
  groups: GradingScaleGroup[],
): GradingScale[] {
  if (selectedClass?.gradingScaleGroup) {
    const group = groups.find(
      (g) => g.id === selectedClass.gradingScaleGroup!.id,
    );
    if (group && group.grades.length > 0) return group.grades;
  }
  return schoolScales;
}

/**
 * Compute a grade letter for a score using the given scales.
 */
export function computeGradeWithScales(
  scales: GradingScale[],
  score: number,
): string {
  const scale = scales.find((s) => score >= s.minScore && score <= s.maxScore);
  return scale?.grade || "?";
}
