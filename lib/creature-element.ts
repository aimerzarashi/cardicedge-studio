import type { BoardTileElement, CreatureElement } from "@/graphql/graphql";

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

// 配置制限の値は土地の属性（クリーチャーの属性ではない。core#178）。選べるのは火・地・水・風（無・複は土地の属性にもあるが、制限の値に無い）。
// Record にするのは、選べる属性が core で変わったときに気づけるよう、表示の名前と選択肢を 1 か所にするため
export const LAND_ELEMENT_LABELS: Partial<Record<BoardTileElement, string>> = {
  FIRE: "火",
  EARTH: "地",
  WATER: "水",
  WIND: "風",
};

export const PLACEMENT_RESTRICTION_ELEMENTS = Object.keys(
  LAND_ELEMENT_LABELS,
) as BoardTileElement[];

export function isPlacementRestrictionElement(
  value: string,
): value is BoardTileElement {
  return (PLACEMENT_RESTRICTION_ELEMENTS as string[]).includes(value);
}

// 配置制限の表示（無ければ「なし」）
export function placementRestrictionsLabel(
  elements: readonly BoardTileElement[],
): string {
  return elements.length === 0
    ? "なし"
    : elements
        .map((element) => LAND_ELEMENT_LABELS[element] ?? element)
        .join("");
}

// 複数の属性は core が並べた順のまま 1 文字ずつつなぐ（例: 火水）
export function elementsLabel(elements: readonly CreatureElement[]): string {
  return elements.map((element) => CREATURE_ELEMENT_LABELS[element]).join("");
}
