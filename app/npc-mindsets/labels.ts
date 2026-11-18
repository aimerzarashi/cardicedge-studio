import type { MatchAction, NpcMindsetCriterion } from "@/graphql/graphql";

// 行動の種類の呼び方は、game の対戦の画面のボタンの文言（game/app/matches/[id]/debug/match-player.tsx）に合わせる。
// Record にするのは、core に種類が足されたときの足し忘れを型検査で見つけるため
export const MATCH_ACTION_LABELS: Record<MatchAction, string> = {
  DRAW_CARD: "カードを引く",
  DISCARD_CARD: "手札を捨てる",
  USE_SPELL: "スペルを使う",
  ROLL_DICE: "サイコロを振る",
  CHOOSE_PATH: "行き先を選ぶ",
  PLACE_CREATURE: "配置",
  INVADE_TERRITORY: "侵略",
  PAY_TOLL: "通行料を払う",
  LEVEL_UP_LAND: "土地レベルアップ",
  EXCHANGE_CREATURE: "クリーチャー交換",
  CHANGE_LAND_ELEMENT: "土地の属性変更",
  MOVE_CREATURE: "クリーチャー移動",
  ATTACK_WITH_ITEM: "アイテムを出して攻める",
  ATTACK_WITHOUT_ITEM: "アイテムを出さずに攻める",
  DEFEND_WITH_ITEM: "アイテムを出して守る",
  DEFEND_WITHOUT_ITEM: "アイテムを出さずに守る",
  USE_CREATURE_AS_ITEM: "援護",
  RELINQUISH_TERRITORY: "領地を手放す",
  END_TURN: "ターンを終える",
};

export const CRITERION_LABELS: Record<NpcMindsetCriterion, string> = {
  TOTAL_MAGIC_LEAD: "総魔力の差",
  TERRITORY_COUNT: "領地の数",
  BATTLE_HOLD: "戦闘の勝ち見込み",
  MAGIC_RESERVE: "魔力を残す",
};

export const CRITERION_DESCRIPTIONS: Record<NpcMindsetCriterion, string> = {
  TOTAL_MAGIC_LEAD: "自分の総魔力と相手のうち一番高い人の差",
  TERRITORY_COUNT: "自分の領地の数",
  BATTLE_HOLD: "戦闘の後に領地を持っている見込み",
  MAGIC_RESERVE: "手持ちの魔力（盤面の一番高い通行料まで）",
};

// フォームから来た文字列を、core に渡せる値かどうか確かめる（知らない値を渡すと GraphQL の誤りになり、想定外として扱われるため）
export function isMatchAction(value: string): value is MatchAction {
  return Object.hasOwn(MATCH_ACTION_LABELS, value);
}

export function isCriterion(value: string): value is NpcMindsetCriterion {
  return Object.hasOwn(CRITERION_LABELS, value);
}
