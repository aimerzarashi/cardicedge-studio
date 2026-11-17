import type { ItemCategory } from "@/graphql/graphql";

// Record<ItemCategory, …> にするのは、core に分類が足されたときの足し忘れを型検査で見つけるため
export const ITEM_CATEGORY_LABELS: Record<ItemCategory, string> = {
  WEAPON: "武器",
  ARMOR: "防具",
  SCROLL: "巻物",
};

export const ITEM_CATEGORIES = Object.keys(
  ITEM_CATEGORY_LABELS,
) as ItemCategory[];

export function isItemCategory(value: string): value is ItemCategory {
  return (ITEM_CATEGORIES as string[]).includes(value);
}

// アイテム制限の表示（core が並べた順。無ければ「なし」）
export function itemRestrictionsLabel(
  itemRestrictions: readonly ItemCategory[],
): string {
  return itemRestrictions.length === 0
    ? "なし"
    : itemRestrictions
        .map((category) => ITEM_CATEGORY_LABELS[category])
        .join("・");
}

// 下げるアイテムと見分けるため、増やす値にも + を付ける（0 は増減が無いので符号を付けない）
export function signedModifier(value: number): string {
  return value > 0 ? `+${value}` : `${value}`;
}
