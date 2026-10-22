"use client";

import Link from "next/link";
import { useActionState } from "react";
import { type SetStarterDeckSetState, setStarterDeckSet } from "./actions";

export type SelectedDeck = {
  id: string;
  // 見つからなければ undefined（削除された等）
  deck?: { name: string; totalCount: number };
  // この 1 つを外した URL
  removeHref: string;
};

const initialState: SetStarterDeckSetState = {};

// 選んだプリセットデッキ（元の今の名前・合計）を並べ、まとめて設定する。選ぶ・外すは URL を変えるリンクで行い、
// ここでは送るだけにする（選んだ状態をページや絞り込みの移動で消さないため）
export function SetStarterDeckSetForm({
  revision,
  selected,
}: {
  revision: number;
  selected: SelectedDeck[];
}) {
  const [state, formAction, isPending] = useActionState(
    setStarterDeckSet,
    initialState,
  );
  // 誤りは、出したときの版の画面にだけ結びつける（ほかの操作で版が変わった後に、古い誤りを残さない）
  const deckErrors =
    state.revision === revision ? (state.deckErrors ?? {}) : {};

  return (
    <>
      {state.error && <p role="alert">{state.error}</p>}
      <form action={formAction}>
        <input type="hidden" name="revision" value={revision} />
        {selected.length === 0 ? (
          <p>プリセットデッキが選ばれていません。下の一覧から選んでください</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>名前</th>
                <th>合計の枚数</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {selected.map((row, index) => {
                const error = deckErrors[index];
                return (
                  <tr key={row.id}>
                    <td>
                      <input type="hidden" name="presetDeckId" value={row.id} />
                      {row.deck ? (
                        <Link href={`/preset-decks/${row.id}`}>
                          {row.deck.name}
                        </Link>
                      ) : (
                        "（見つかりません）"
                      )}
                      {error && <span role="alert"> {error}</span>}
                    </td>
                    <td>{row.deck?.totalCount}</td>
                    <td>
                      <Link href={row.removeHref}>外す</Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
        <button type="submit" disabled={isPending}>
          設定する
        </button>
      </form>
    </>
  );
}
