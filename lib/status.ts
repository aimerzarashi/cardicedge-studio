import type { CardStatus } from "@/graphql/graphql";

// カード・スターターデッキ・ボード・NPC のアバターの状態は、値も表示名も同じため共通にする（core の enum は別々だが、値は同じ文字列）
// Record<string, string> にしないのは、状態が core に加わったときに足し忘れると、型検査に引っかからず状態の欄が黙って空になるため
export const STATUS_LABELS: Record<CardStatus, string> = {
  DRAFT: "準備中",
  PUBLISHED: "公開中",
  RETIRED: "使用不可",
};

// 絞り込みの選択肢の並び（準備中 → 公開中 → 使用不可）は、表示名の対応の並びと同じ
export const STATUSES = (
  Object.entries(STATUS_LABELS) as [CardStatus, string][]
).map(([value, label]) => ({ value, label }));

export function isStatus(value: string): value is CardStatus {
  return STATUSES.some((status) => status.value === value);
}
