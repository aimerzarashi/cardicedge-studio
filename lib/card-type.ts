import type { CardType } from "@/graphql/graphql";

export const CARD_TYPES: { value: CardType; label: string }[] = [
  { value: "CREATURE", label: "クリーチャー" },
  { value: "ITEM", label: "アイテム" },
  { value: "SPELL", label: "スペル" },
];

export function isCardType(value: string): value is CardType {
  return CARD_TYPES.some((type) => type.value === value);
}

// Record<string, string> にしないのは、種類（Spell 等）が core の結果に加わったときに足し忘れると、
// 型検査に引っかからず種類の欄が黙って空になるため
export const CARD_TYPE_LABELS: Record<"Creature" | "Item" | "Spell", string> = {
  Creature: "クリーチャー",
  Item: "アイテム",
  Spell: "スペル",
};
