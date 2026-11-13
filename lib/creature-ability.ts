import type { CreatureAbilityKind, CreatureElement } from "@/graphql/graphql";
import { elementsLabel } from "@/lib/creature-element";
import { signedModifier } from "@/lib/item-category";

// Record<CreatureAbilityKind, …> にするのは、core に能力が足されたときの足し忘れを型検査で見つけるため
export const CREATURE_ABILITY_LABELS: Record<CreatureAbilityKind, string> = {
  DEFENSIVE: "防御型",
  TOLL_MULTIPLIER: "通行料の倍率",
  FIRST_STRIKE: "先制",
  LAST_STRIKE: "後手",
  BATTLE_MODIFIER: "戦闘中の増減",
  BATTLE_RANDOM_STATS: "戦闘中のランダム",
  ATTACK_IMMUNITY: "攻撃無効",
};

export const CREATURE_ABILITY_KINDS = Object.keys(
  CREATURE_ABILITY_LABELS,
) as CreatureAbilityKind[];

export function isCreatureAbilityKind(
  value: string,
): value is CreatureAbilityKind {
  return (CREATURE_ABILITY_KINDS as string[]).includes(value);
}

// core が返した能力 1 つ（値の要る能力だけが値を持つ）
export type CreatureAbilityView = {
  kind: CreatureAbilityKind;
  percent?: number;
  attackModifier?: number;
  hitPointsModifier?: number;
  minimum?: number;
  maximum?: number;
  elements?: CreatureElement[];
};

// 能力 1 つの表示（値があれば添える。例: 通行料の倍率 150%、戦闘中の増減（AT 0、HP -20）、戦闘中のランダム（10〜70）、攻撃無効（火地））
export function abilityLabel(ability: CreatureAbilityView): string {
  const label = CREATURE_ABILITY_LABELS[ability.kind];
  if (ability.elements !== undefined) {
    return `${label}（${elementsLabel(ability.elements)}）`;
  }
  if (
    ability.attackModifier !== undefined &&
    ability.hitPointsModifier !== undefined
  ) {
    return `${label}（AT ${signedModifier(ability.attackModifier)}、HP ${signedModifier(ability.hitPointsModifier)}）`;
  }
  if (ability.minimum !== undefined && ability.maximum !== undefined) {
    return `${label}（${ability.minimum}〜${ability.maximum}）`;
  }
  return ability.percent === undefined ? label : `${label} ${ability.percent}%`;
}

// 能力の表示（core が返した並びのまま。無ければ「なし」）
export function abilitiesLabel(
  abilities: readonly CreatureAbilityView[],
): string {
  return abilities.length === 0
    ? "なし"
    : abilities.map(abilityLabel).join("・");
}
