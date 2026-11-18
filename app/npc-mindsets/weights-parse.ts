import type { Kept, Notice } from "../deck-form";
import { weightErrorMessage } from "../messages.ts";

// 行動の種類ごとの重み・採点基準ごとの重みのフォームで共通の、フォームの受け渡し

export type SetWeightsState = Notice &
  Kept & {
    // 誤りのときに入力欄に残す値（行の key ごと。無ければ今の重みを入れる）
    values?: Record<string, string>;
    // 行ごとの誤り（行の key ごと）
    rowErrors?: Record<string, string>;
  };

// 重みの入力欄は weight.<行の key>（行動の種類・採点基準の値）で送る
const WEIGHT_PREFIX = "weight.";

type ParsedWeights =
  | { kind: "invalid"; state: SetWeightsState }
  | {
      kind: "parsed";
      values: Record<string, string>;
      // 画面に並んでいた順（core の項目名 weights.<番号> の番号は、この並びの位置）
      weights: { key: string; weight: number }[];
    };

// core は置き換える操作で、すべての行を 1 回ずつ入れさせるため、変えていない行も含めて送る
export function parseWeights(form: FormData, revision: number): ParsedWeights {
  const values: Record<string, string> = {};
  const rowErrors: Record<string, string> = {};
  const weights: { key: string; weight: number }[] = [];
  for (const [name, value] of form) {
    if (!name.startsWith(WEIGHT_PREFIX) || typeof value !== "string") {
      continue;
    }
    const key = name.slice(WEIGHT_PREFIX.length);
    values[key] = value;
    // 範囲は core が判定するため、ここでは整数であることだけを確かめる
    const weight = Number(value);
    if (value.trim() === "" || !Number.isInteger(weight)) {
      rowErrors[key] = "重みは整数で入力してください";
      continue;
    }
    weights.push({ key, weight });
  }
  if (Object.keys(rowErrors).length > 0) {
    return { kind: "invalid", state: { revision, values, rowErrors } };
  }
  return { kind: "parsed", values, weights };
}

type WeightsError = {
  __typename: string;
  field: string;
  min?: number;
  max?: number;
};

// core の項目名は送った一覧の位置（weights.<番号>.weight 等）で返るため、位置から行に戻す
export function weightsErrors(
  errors: WeightsError[],
  weights: { key: string }[],
): Pick<SetWeightsState, "error" | "rowErrors"> {
  const rowErrors: Record<string, string> = {};
  let unmatched = false;
  for (const error of errors) {
    const index = /^weights\.(\d+)/.exec(error.field)?.[1];
    const key = index === undefined ? undefined : weights[Number(index)]?.key;
    if (key === undefined) {
      unmatched = true;
    } else {
      rowErrors[key] = weightErrorMessage(error);
    }
  }
  return {
    ...(unmatched && { error: "入力が正しくありません" }),
    rowErrors,
  };
}
