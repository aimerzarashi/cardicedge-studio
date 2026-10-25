"use client";

import Link from "next/link";
import { useActionState } from "react";
import { type RegisterStarterDeckState, registerStarterDeck } from "./actions";

const initialState: RegisterStarterDeckState = { value: "" };

export function RegisterStarterDeckForm() {
  const [state, formAction, isPending] = useActionState(
    registerStarterDeck,
    initialState,
  );

  return (
    <>
      {state.registeredId !== undefined && (
        <p role="status">
          登録しました。詳細に反映されるまで時間がかかっています。{" "}
          <Link href={`/starter-decks/${state.registeredId}`}>詳細へ</Link>
        </p>
      )}
      {state.error && <p role="alert">{state.error}</p>}
      {/* 送信の後、React は入力欄を defaultValue に戻すため、誤りのときに入力した値が残るよう state の値を渡す */}
      <form action={formAction}>
        <label>
          名前
          <input
            name="name"
            required
            defaultValue={state.value}
            aria-invalid={state.nameError ? true : undefined}
            aria-describedby={state.nameError ? "name-error" : undefined}
          />
        </label>
        {state.nameError && (
          <p id="name-error" role="alert">
            {state.nameError}
          </p>
        )}
        <button type="submit" disabled={isPending}>
          登録する
        </button>
      </form>
    </>
  );
}
