import type { BoardTileElement, ItemCategory } from "@/graphql/graphql";
import { placementRestrictionsLabel } from "@/lib/creature-element";
import { type EffectView, effectsLabel } from "@/lib/effect";
import {
  ITEM_CATEGORY_LABELS,
  itemRestrictionsLabel,
} from "@/lib/item-category";

// 一覧の「性能」の列。詳細と同じ文言を、持っているものだけ「／」でつなぐ（何も無ければ空。詳細の「なし」「効果なし」を
// 一覧に並べると、行のほとんどが「なし」で埋まるため。studio#73）
export function creatureSpecSummary(creature: {
  itemRestrictions: readonly ItemCategory[];
  placementRestrictions: readonly BoardTileElement[];
  effects: readonly EffectView[];
}): string {
  return [
    creature.itemRestrictions.length > 0 &&
      `アイテム制限 ${itemRestrictionsLabel(creature.itemRestrictions)}`,
    creature.placementRestrictions.length > 0 &&
      `配置制限 ${placementRestrictionsLabel(creature.placementRestrictions)}`,
    creature.effects.length > 0 && effectsLabel(creature.effects),
  ]
    .filter((part) => part !== false)
    .join("／");
}

export function itemSpecSummary(item: {
  category: ItemCategory;
  effects: readonly EffectView[];
}): string {
  return [
    ITEM_CATEGORY_LABELS[item.category],
    item.effects.length > 0 && effectsLabel(item.effects),
  ]
    .filter((part) => part !== false)
    .join("／");
}
