import type { CreatureElement, ItemEffectKind } from "@/graphql/graphql";
import { elementsLabel } from "@/lib/creature-element";
import { signedModifier } from "@/lib/item-category";

// 入力の欄の名前。Record<ItemEffectKind, …> にするのは、core に効果が足されたときの足し忘れを型検査で見つけるため
export const ITEM_EFFECT_LABELS: Record<ItemEffectKind, string> = {
  ATTACK_MODIFIER: "AT の増減",
  HIT_POINTS_MODIFIER: "HP の増減",
  ATTACK_OVERRIDE: "AT の上書き",
  ATTACK_MULTIPLIER: "強打（AT の倍率）",
  IGNORE_TERRAIN_EFFECT: "地形効果を無視する",
};

export const ITEM_EFFECT_KINDS = Object.keys(
  ITEM_EFFECT_LABELS,
) as ItemEffectKind[];

// 値の欄の名前（チェックボックスの名前と分けて、どちらを指すかを紛らわしくしない）
export const ITEM_EFFECT_VALUE_LABELS: Partial<Record<ItemEffectKind, string>> =
  {
    ATTACK_MODIFIER: "AT の増減の値",
    HIT_POINTS_MODIFIER: "HP の増減の値",
    ATTACK_OVERRIDE: "上書きした後の AT",
  };

export function isItemEffectKind(value: string): value is ItemEffectKind {
  return (ITEM_EFFECT_KINDS as string[]).includes(value);
}

// core が返した効果 1 つ（値の要る効果だけが値を持つ。制約は今は相手の属性だけ）
export type ItemEffectView = {
  kind: ItemEffectKind;
  value?: number;
  percent?: number;
  opponentElements?: CreatureElement[];
};

// 効果 1 つの表示（例: AT +25、AT を 30 に上書き、強打 150%（相手が水）、地形効果を無視する）。
// 「強打」は効果の種類の画面のラベル（2026-11-14 オーナー。core#177）
export function itemEffectLabel(effect: ItemEffectView): string {
  switch (effect.kind) {
    case "ATTACK_MODIFIER":
      return `AT ${signedModifier(effect.value ?? 0)}`;
    case "HIT_POINTS_MODIFIER":
      return `HP ${signedModifier(effect.value ?? 0)}`;
    case "ATTACK_OVERRIDE":
      return `AT を ${effect.value ?? 0} に上書き`;
    case "ATTACK_MULTIPLIER": {
      const elements = effect.opponentElements ?? [];
      return elements.length === 0
        ? `強打 ${effect.percent ?? 0}%`
        : `強打 ${effect.percent ?? 0}%（相手が${elementsLabel(elements)}）`;
    }
    case "IGNORE_TERRAIN_EFFECT":
      return "地形効果を無視する";
  }
}

// 効果の表示（core が返した並びのまま。無ければ「なし」）
export function itemEffectsLabel(effects: readonly ItemEffectView[]): string {
  return effects.length === 0
    ? "なし"
    : effects.map(itemEffectLabel).join("・");
}

// core の効果の型（種類は __typename）から、表示と入力の形にする
export function itemEffectView(effect: {
  __typename?: string;
  kind: ItemEffectKind;
  value?: number;
  percent?: number;
  constraints?: readonly { elements?: CreatureElement[] }[];
}): ItemEffectView {
  return {
    kind: effect.kind,
    value: effect.value,
    percent: effect.percent,
    opponentElements: effect.constraints?.flatMap(
      ({ elements }) => elements ?? [],
    ),
  };
}
