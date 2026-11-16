import type {
  CreatureElement,
  EffectDestruction,
  EffectKind,
} from "@/graphql/graphql";
import { elementsLabel } from "@/lib/creature-element";
import { signedModifier } from "@/lib/item-category";

// 効果はアイテムとクリーチャーで共有する（core の型も共有している。core#178）。
// 入力の欄の名前。Record<EffectKind, …> にするのは、core に効果が足されたときの足し忘れを型検査で見つけるため。
// 「強打」「先制」「後手」「攻撃無効」は効果の画面のラベル（2026-11-14・2026-11-15 オーナー）
export const EFFECT_LABELS: Record<EffectKind, string> = {
  ATTACK_MODIFIER: "AT の増減",
  HIT_POINTS_MODIFIER: "HP の増減",
  ATTACK_OVERRIDE: "AT の上書き",
  HIT_POINTS_OVERRIDE: "HP の上書き",
  ATTACK_MULTIPLIER: "強打（AT の倍率）",
  IGNORE_TERRAIN_EFFECT: "地形効果を無視する",
  STRIKE_FIRST: "先制（先に攻撃する）",
  STRIKE_LAST: "後手（後に攻撃する）",
  NULLIFY_RECEIVED_DAMAGE: "攻撃無効（受けるダメージを 0 にする）",
  TOLL_MULTIPLIER: "通行料の倍率",
  FORBID_INVASION: "侵略できない",
  FORBID_MOVEMENT: "移動できない",
  RETURN_TO_HAND_ON_DESTRUCTION: "破壊されたら手札に戻る",
  GAIN_MAGIC_ON_DESTRUCTION: "破壊されたら魔力を得る",
};

export const EFFECT_KINDS = Object.keys(EFFECT_LABELS) as EffectKind[];

export function isEffectKind(value: string): value is EffectKind {
  return (EFFECT_KINDS as string[]).includes(value);
}

// 種類ごとの値の欄。core の入力（EffectInput）の項目と同じ名前で、種類に要る項目だけを持つ
export type EffectField =
  | "value"
  | "minimum"
  | "maximum"
  | "percent"
  | "amount";

// 値の欄の名前と、入れていないときの既定の値（入力のしやすさのための値で、core の決まりではない）
export const EFFECT_FIELDS: Partial<
  Record<EffectKind, { field: EffectField; label: string; initial: number }[]>
> = {
  ATTACK_MODIFIER: [{ field: "value", label: "AT の増減の値", initial: 0 }],
  HIT_POINTS_MODIFIER: [{ field: "value", label: "HP の増減の値", initial: 0 }],
  ATTACK_OVERRIDE: [
    { field: "minimum", label: "上書きした後の AT の最小", initial: 30 },
    { field: "maximum", label: "上書きした後の AT の最大", initial: 30 },
  ],
  HIT_POINTS_OVERRIDE: [
    { field: "minimum", label: "上書きした後の HP の最小", initial: 30 },
    { field: "maximum", label: "上書きした後の HP の最大", initial: 30 },
  ],
  ATTACK_MULTIPLIER: [
    { field: "percent", label: "強打の倍率（%）", initial: 150 },
  ],
  TOLL_MULTIPLIER: [
    { field: "percent", label: "通行料の倍率（%）", initial: 150 },
  ],
  GAIN_MAGIC_ON_DESTRUCTION: [
    { field: "amount", label: "受け取る魔力の額", initial: 200 },
  ],
};

// 破壊されたときの効果が発動する破壊（core の 3 つの破壊のイベントと対応する。core#182）。並びは core と同じ侵略・守る・ボード
export const DESTRUCTION_LABELS: Record<EffectDestruction, string> = {
  INVADING: "侵略したとき",
  DEFENDING: "守るとき",
  BOARD: "ボード",
};

export const DESTRUCTIONS = Object.keys(
  DESTRUCTION_LABELS,
) as EffectDestruction[];

export function isEffectDestruction(value: string): value is EffectDestruction {
  return (DESTRUCTIONS as string[]).includes(value);
}

// 発動する破壊を選ぶ種類と、欄の名前（1 つ以上を選ぶ。選ばないと発動しない効果になるので core が断る）
export const EFFECT_DESTRUCTION_LABELS: Partial<Record<EffectKind, string>> = {
  RETURN_TO_HAND_ON_DESTRUCTION: "手札に戻る破壊（1 つ以上）",
  GAIN_MAGIC_ON_DESTRUCTION: "魔力を得る破壊（1 つ以上）",
};

// 相手のクリーチャーの属性の制約を持てる種類と、欄の名前（選ばなければ制約なしで、いつも発動する）
export const EFFECT_CONSTRAINT_LABELS: Partial<Record<EffectKind, string>> = {
  ATTACK_MULTIPLIER: "強打する相手の属性（選ばなければいつも）",
  NULLIFY_RECEIVED_DAMAGE: "攻撃無効にする相手の属性（選ばなければいつも）",
};

// core が返した効果 1 つ（値の要る効果だけが値を持つ。制約は今は相手のクリーチャーの属性だけ）
export type EffectView = {
  kind: EffectKind;
  value?: number;
  minimum?: number;
  maximum?: number;
  percent?: number;
  opponentElements?: CreatureElement[];
  destructions?: EffectDestruction[];
  amount?: number;
};

// 上書きの範囲（固定は「30」、範囲は「10〜70」）
function rangeLabel(effect: EffectView): string {
  const minimum = effect.minimum ?? 0;
  const maximum = effect.maximum ?? 0;
  return minimum === maximum ? `${minimum}` : `${minimum}〜${maximum}`;
}

function opponentLabel(label: string, effect: EffectView): string {
  const elements = effect.opponentElements ?? [];
  return elements.length === 0
    ? label
    : `${label}（相手が${elementsLabel(elements)}）`;
}

function destructionsLabel(effect: EffectView): string {
  return (effect.destructions ?? [])
    .map((destruction) => DESTRUCTION_LABELS[destruction])
    .join("・");
}

// 効果 1 つの表示（例: AT +25、AT を 30 に上書き、HP を 10〜70 に上書き、強打 150%（相手が水）、先制、攻撃無効（相手が火地））
export function effectLabel(effect: EffectView): string {
  switch (effect.kind) {
    case "ATTACK_MODIFIER":
      return `AT ${signedModifier(effect.value ?? 0)}`;
    case "HIT_POINTS_MODIFIER":
      return `HP ${signedModifier(effect.value ?? 0)}`;
    case "ATTACK_OVERRIDE":
      return `AT を ${rangeLabel(effect)} に上書き`;
    case "HIT_POINTS_OVERRIDE":
      return `HP を ${rangeLabel(effect)} に上書き`;
    case "ATTACK_MULTIPLIER":
      return opponentLabel(`強打 ${effect.percent ?? 0}%`, effect);
    case "IGNORE_TERRAIN_EFFECT":
      return "地形効果を無視する";
    case "STRIKE_FIRST":
      return "先制";
    case "STRIKE_LAST":
      return "後手";
    case "NULLIFY_RECEIVED_DAMAGE":
      return opponentLabel("攻撃無効", effect);
    case "TOLL_MULTIPLIER":
      return `通行料の倍率 ${effect.percent ?? 0}%`;
    case "FORBID_INVASION":
      return "侵略できない";
    case "FORBID_MOVEMENT":
      return "移動できない";
    case "RETURN_TO_HAND_ON_DESTRUCTION":
      return `破壊されたら手札に戻る（${destructionsLabel(effect)}）`;
    case "GAIN_MAGIC_ON_DESTRUCTION":
      return `破壊されたら魔力 +${effect.amount ?? 0}（${destructionsLabel(effect)}）`;
  }
}

// 効果の表示（core が返した並びのまま。無ければ「なし」）
export function effectsLabel(effects: readonly EffectView[]): string {
  return effects.length === 0 ? "なし" : effects.map(effectLabel).join("・");
}

// core の効果の型（種類は __typename）から、表示と入力の形にする
export function effectView(effect: {
  __typename?: string;
  kind: EffectKind;
  value?: number;
  minimum?: number;
  maximum?: number;
  percent?: number;
  constraints?: readonly { elements?: CreatureElement[] }[];
  destructions?: readonly EffectDestruction[];
  amount?: number;
}): EffectView {
  return {
    kind: effect.kind,
    value: effect.value,
    minimum: effect.minimum,
    maximum: effect.maximum,
    percent: effect.percent,
    opponentElements: effect.constraints?.flatMap(
      ({ elements }) => elements ?? [],
    ),
    destructions: effect.destructions ? [...effect.destructions] : undefined,
    amount: effect.amount,
  };
}
