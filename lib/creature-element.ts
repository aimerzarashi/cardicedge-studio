import type { CreatureElement } from "@/graphql/graphql";

// 画面では 1 文字で出す。Record<CreatureElement, …> にするのは、core に属性が足されたときの足し忘れを型検査で見つけるため
export const CREATURE_ELEMENT_LABELS: Record<CreatureElement, string> = {
  FIRE: "火",
  EARTH: "地",
  WATER: "水",
  WIND: "風",
  NEUTRAL: "無",
};

export const CREATURE_ELEMENTS = Object.keys(
  CREATURE_ELEMENT_LABELS,
) as CreatureElement[];

export function isCreatureElement(value: string): value is CreatureElement {
  return (CREATURE_ELEMENTS as string[]).includes(value);
}

// 配置制限に選べる属性（無は土地の属性にもあるが、制限の値に無い）
export const PLACEMENT_RESTRICTION_ELEMENTS = CREATURE_ELEMENTS.filter(
  (element) => element !== "NEUTRAL",
);

// 攻撃無効に選べる属性（無は選べない。core#174）
export const ATTACK_IMMUNITY_ELEMENTS = CREATURE_ELEMENTS.filter(
  (element) => element !== "NEUTRAL",
);

// 配置制限の表示（無ければ「なし」）
export function placementRestrictionsLabel(
  elements: readonly CreatureElement[],
): string {
  return elements.length === 0 ? "なし" : elementsLabel(elements);
}

// 複数の属性は core が並べた順のまま 1 文字ずつつなぐ（例: 火水）
export function elementsLabel(elements: readonly CreatureElement[]): string {
  return elements.map((element) => CREATURE_ELEMENT_LABELS[element]).join("");
}
