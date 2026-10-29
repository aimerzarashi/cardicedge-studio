"use client";

import { useActionState } from "react";
import { RULE_LABELS, type RuleField } from "../../messages";
import type { ChangeRulesState, Rules } from "./rules-form";

// 100 刻みは入力のしやすさのための表示の都合の値で、core の決まりではない（拡大の上限・下限と同じ扱い。core の決まりは core が判定する）
const STEP = 100;

const initialState: ChangeRulesState = {};

export function RulesEditor({
  action,
  id,
  revision,
  rules,
}: {
  action: (
    previous: ChangeRulesState,
    form: FormData,
  ) => Promise<ChangeRulesState>;
  id: string;
  revision: number;
  rules: Rules;
}) {
  const [state, formAction, isPending] = useActionState(action, initialState);
  const kept = state.revision === revision ? state : {};

  return (
    <>
      {state.status && <p role="status">{state.status}</p>}
      {state.error && <p role="alert">{state.error}</p>}
      {kept.ruleErrors && (
        <ul role="alert">
          {kept.ruleErrors.map((message) => (
            <li key={message}>{message}</li>
          ))}
        </ul>
      )}
      {/* 版が変わったら入力欄を作り直し、最新の値を入れる（defaultValue は作った後に変えても入力欄に反映されない） */}
      <form key={revision} action={formAction}>
        <input type="hidden" name="id" value={id} />
        <input type="hidden" name="revision" value={revision} />
        {(Object.keys(RULE_LABELS) as RuleField[]).map((field) => (
          <label key={field}>
            {RULE_LABELS[field]}
            <input
              type="number"
              name={field}
              step={STEP}
              required
              defaultValue={kept.values?.[field] ?? rules[field]}
            />
          </label>
        ))}
        <button type="submit" disabled={isPending}>
          ルールを保存
        </button>
      </form>
    </>
  );
}
