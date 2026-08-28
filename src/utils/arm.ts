// Shared helper for displaying class arms with their optional alias,
// matching the format used on the Classes page: "Arm A (Science)"
export interface ArmLike {
  id?: string;
  letter: string;
  alias?: string | null;
}

export const formatArm = (
  arm: ArmLike | null | undefined,
  aliasLookup?: Map<string, string>
): string => {
  if (!arm) return '-';
  const alias = arm.alias || (arm.id ? aliasLookup?.get(arm.id) : undefined);
  return alias ? `Arm ${arm.letter} (${alias})` : `Arm ${arm.letter}`;
};
