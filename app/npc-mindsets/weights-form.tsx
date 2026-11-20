"use client";

import { useActionState } from "react";
import type { SetWeightsState } from "./weights-parse";

const initialState: SetWeightsState = {};

export type WeightRow = {
  key: string;
  label: string;
  // 行の説明（無ければ出さない）
  description?: string;
  weight: number;
};

export function WeightsForm({
  action,
  id,
  revision,
  idPrefix,
  rows,
  submitLabel,
}: {
  action: (
    previous: SetWeightsState,
    form: FormData,
  ) => Promise<SetWeightsState>;
  id: string;
  revision: number;
  // 入力欄の id の頭（同じ画面に重みのフォームが 2 つあるため、行の key だけでは重なる）
  idPrefix: string;
  rows: WeightRow[];
  submitLabel: string;
}) {
  const [state, formAction, isPending] = useActionState(action, initialState);
  const kept = state.revision === revision ? state : {};

  return (
    <>
      {state.status && <p role="status">{state.status}</p>}
      {state.error && <p role="alert">{state.error}</p>}
      {/* 版が変わったら入力欄を作り直し、最新の重みを入れる（defaultValue は作った後に変えても入力欄に反映されない） */}
      <form key={revision} action={formAction}>
        <input type="hidden" name="id" value={id} />
        <input type="hidden" name="revision" value={revision} />
        <table>
          <tbody>
            {rows.map((row) => {
              const inputId = `${idPrefix}-${row.key}`;
              const error = kept.rowErrors?.[row.key];
              return (
                <tr key={row.key}>
                  <th scope="row">
                    <label htmlFor={inputId}>{row.label}</label>
                  </th>
                  <td>
                    <input
                      id={inputId}
                      name={`weight.${row.key}`}
                      type="number"
                      required
                      defaultValue={kept.values?.[row.key] ?? row.weight}
                      aria-invalid={error ? true : undefined}
                      aria-describedby={
                        [
                          error ? `${inputId}-error` : undefined,
                          row.description
                            ? `${inputId}-description`
                            : undefined,
                        ]
                          .filter(Boolean)
                          .join(" ") || undefined
                      }
                    />
                  </td>
                  <td>
                    {row.description && (
                      <span id={`${inputId}-description`}>
                        {row.description}
                      </span>
                    )}
                    {error && (
                      <p id={`${inputId}-error`} role="alert">
                        {error}
                      </p>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <button type="submit" disabled={isPending}>
          {submitLabel}
        </button>
      </form>
    </>
  );
}
