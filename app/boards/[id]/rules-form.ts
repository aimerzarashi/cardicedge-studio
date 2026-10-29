import { type Kept, type Notice, target } from "../../deck-form";
import { isRuleField, RULE_LABELS, type RuleField } from "../../messages";

// 誤りと入力した値は、画面で見た版（revision）に結びつける
export type ChangeRulesState = Notice &
  Kept & {
    // 誤りのときに入力欄に残す値（無ければ今の値を入れる）
    values?: Record<RuleField, string>;
    // 項目ごとの誤り
    ruleErrors?: string[];
  };

export type Rules = Record<RuleField, number>;

type Parsed =
  | { kind: "invalid"; state: ChangeRulesState }
  | { kind: "ok"; board: { id: string; revision: number }; rules: Rules };

// 境界の検査は整数であることだけにする（下限・大小の比べは core が判定する）
export function parseRules(form: FormData): Parsed | undefined {
  const board = target(form);
  if (board === undefined) {
    return undefined;
  }
  const values = {} as Record<RuleField, string>;
  const rules = {} as Rules;
  const ruleErrors: string[] = [];
  for (const field of Object.keys(RULE_LABELS)) {
    if (!isRuleField(field)) {
      continue;
    }
    const value = form.get(field);
    if (typeof value !== "string") {
      return undefined;
    }
    values[field] = value;
    const number = Number(value);
    if (value.trim() === "" || !Number.isInteger(number)) {
      ruleErrors.push(`${RULE_LABELS[field]}は整数で入力してください`);
    }
    rules[field] = number;
  }
  if (ruleErrors.length > 0) {
    return {
      kind: "invalid",
      state: { revision: board.revision, values, ruleErrors },
    };
  }
  return { kind: "ok", board, rules };
}
