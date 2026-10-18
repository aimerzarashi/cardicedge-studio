"use client";

import Link from "next/link";
import { useActionState } from "react";
import { type RegisterCreatureState, registerCreature } from "./actions";

const initialState: RegisterCreatureState = { value: "" };

export function RegisterCreatureForm() {
  const [state, formAction, isPending] = useActionState(
    registerCreature,
    initialState,
  );

  return (
    <>
      {state.registeredName !== undefined && (
        <p role="status">
          「{state.registeredName}
          」を登録しました。一覧に出るまで少し時間がかかることがあります。{" "}
          <Link href="/cards">カードの一覧へ</Link>
        </p>
      )}
      {state.error && <p role="alert">{state.error}</p>}
      {/* 送信の後、React は入力欄を defaultValue に戻すため、誤りのときに入力した値が残るよう state の値を渡す */}
      <form action={formAction}>
        <label>
          カード名
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
