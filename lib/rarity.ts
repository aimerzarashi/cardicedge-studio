import type { CardRarity } from "@/graphql/graphql";

// 画面では略称で出す（core の値は略さない名前）。Record<CardRarity, …> にするのは、core に段階が足されたときの足し忘れを型検査で見つけるため
export const RARITY_LABELS: Record<CardRarity, string> = {
  NORMAL: "N",
  STRANGE: "S",
  RARE: "R",
  EXTRA: "E",
};

export const RARITIES = Object.keys(RARITY_LABELS) as CardRarity[];

export function isRarity(value: string): value is CardRarity {
  return (RARITIES as string[]).includes(value);
}
