import type { CreatureAbilityKind } from "@/graphql/graphql";

// Record<CreatureAbilityKind, …> にするのは、core に能力が足されたときの足し忘れを型検査で見つけるため
export const CREATURE_ABILITY_LABELS: Record<CreatureAbilityKind, string> = {
  DEFENSIVE: "防御型",
};

export const CREATURE_ABILITY_KINDS = Object.keys(
  CREATURE_ABILITY_LABELS,
) as CreatureAbilityKind[];

export function isCreatureAbilityKind(
  value: string,
): value is CreatureAbilityKind {
  return (CREATURE_ABILITY_KINDS as string[]).includes(value);
}

// 能力の表示（core が返した並びのまま。無ければ「なし」）
export function abilitiesLabel(
  abilities: readonly { kind: CreatureAbilityKind }[],
): string {
  return abilities.length === 0
    ? "なし"
    : abilities.map(({ kind }) => CREATURE_ABILITY_LABELS[kind]).join("・");
}
