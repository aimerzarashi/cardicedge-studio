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

// 複数の属性は core が並べた順のまま 1 文字ずつつなぐ（例: 火水）
export function elementsLabel(elements: readonly CreatureElement[]): string {
  return elements.map((element) => CREATURE_ELEMENT_LABELS[element]).join("");
}
