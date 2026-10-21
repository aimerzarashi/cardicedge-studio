"use client";

import { useActionState } from "react";
import { type SetCardCountsState, setPresetDeckCardCounts } from "./actions";

export type CardCountRow = {
  cardId: string;
  name: string;
  typeLabel: string;
  count: number;
};

const initialState: SetCardCountsState = {};

// 表の各行で枚数を変え、変えた行だけをまとめて送る（1 回の保存が core の 1 回の操作になる）
export function CardCountsForm({
  id,
  revision,
  rows,
}: {
  id: string;
  revision: number;
  rows: CardCountRow[];
}) {
  const [state, formAction, isPending] = useActionState(
    setPresetDeckCardCounts,
    initialState,
  );
  const kept = state.revision === revision ? state : {};

  return (
    <>
      {state.status && <p role="status">{state.status}</p>}
      {state.error && <p role="alert">{state.error}</p>}
      {/* 版が変わったら入力欄を作り直し、最新の枚数を入れる。作り直さないと、ほかの表で保存した後に古い枚数が残り、
          画面で見た枚数（shown）だけが新しくなって、変えていない行まで送ってしまう */}
      <form key={revision} action={formAction}>
        <input type="hidden" name="id" value={id} />
        <input type="hidden" name="revision" value={revision} />
        <table>
          <thead>
            <tr>
              <th>カード名</th>
              <th>種類</th>
              <th>枚数</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const error = kept.cardErrors?.[row.cardId];
              const errorId = `count-error-${row.cardId}`;
              return (
                <tr key={row.cardId}>
                  <td>{row.name}</td>
                  <td>{row.typeLabel}</td>
                  <td>
                    <input
                      type="hidden"
                      name={`shown.${row.cardId}`}
                      value={row.count}
                    />
                    {/* 範囲は core が判定する（studio に書き写さない）ため、min・max は付けない */}
                    <input
                      type="number"
                      name={`count.${row.cardId}`}
                      aria-label={`${row.name}の枚数`}
                      step={1}
                      required
                      defaultValue={kept.counts?.[row.cardId] ?? row.count}
                      aria-invalid={error ? true : undefined}
                      aria-describedby={error ? errorId : undefined}
                    />
                    {error && (
                      <span id={errorId} role="alert">
                        {error}
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <button type="submit" disabled={isPending}>
          枚数を保存
        </button>
      </form>
    </>
  );
}
