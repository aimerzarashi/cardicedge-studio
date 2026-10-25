"use client";

import { useActionState, useState } from "react";
import type { Notice } from "./deck-form";

const initialState: Notice = {};

// 削除は取り消せないため、押し間違いを防ぐ確認を同じ画面の中に出す。確認は開いたときの版に結びつけ、ほかの操作で
// 版が変わったら閉じる（開いたまま最新を出し直すと、変わった中身を見直さずに削除できてしまう）
export function DeleteDeck({
  action,
  id,
  revision,
  name,
}: {
  action: (previous: Notice, form: FormData) => Promise<Notice>;
  id: string;
  revision: number;
  name: string;
}) {
  const [confirmingAt, setConfirmingAt] = useState<number>();
  const [state, formAction, isPending] = useActionState(action, initialState);
  const confirming = confirmingAt === revision;

  return (
    <>
      {state.error && <p role="alert">{state.error}</p>}
      {confirming ? (
        <form action={formAction}>
          <input type="hidden" name="id" value={id} />
          <input type="hidden" name="revision" value={revision} />
          <p>「{name}」を削除します。よろしいですか？</p>
          <button type="submit" disabled={isPending}>
            削除する
          </button>{" "}
          <button
            type="button"
            disabled={isPending}
            onClick={() => setConfirmingAt(undefined)}
          >
            やめる
          </button>
        </form>
      ) : (
        <button type="button" onClick={() => setConfirmingAt(revision)}>
          削除する
        </button>
      )}
    </>
  );
}
