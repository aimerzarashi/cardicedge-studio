"use client";

import Link from "next/link";
import { useActionState } from "react";
import type { RegisterFromPresetDeckState } from "./deck-form";

const initialState: RegisterFromPresetDeckState = {};

// 名前は元から写さず、入れてから作る（元の名前のままだと、同じプリセットデッキから 2 つ目を作ると名前の重複になるため）。
// 入力欄には最初から元の名前を入れておき、そのままでよければ直さずに作れる
export function CopyPresetDeckForm({
  action,
  basePath,
  presetDeckId,
  name,
}: {
  action: (
    previous: RegisterFromPresetDeckState,
    form: FormData,
  ) => Promise<RegisterFromPresetDeckState>;
  // 登録したデッキの詳細の親のパス（/starter-decks 等）
  basePath: string;
  presetDeckId: string;
  name: string;
}) {
  const [state, formAction, isPending] = useActionState(action, initialState);
  const errorId = `copy-name-error-${presetDeckId}`;

  return (
    <form action={formAction}>
      <input type="hidden" name="presetDeckId" value={presetDeckId} />
      {/* 送信の後、React は入力欄を defaultValue に戻すため、誤りのときに入力した値が残るよう state の値を渡す */}
      <input
        name="name"
        required
        aria-label={`${name}からコピーして作るデッキの名前`}
        defaultValue={state.value ?? name}
        aria-invalid={state.nameError ? true : undefined}
        aria-describedby={state.nameError ? errorId : undefined}
      />{" "}
      <button
        type="submit"
        disabled={isPending}
        aria-label={`${name}をコピーして作る`}
      >
        コピーして作る
      </button>
      {state.nameError && (
        <span id={errorId} role="alert">
          {" "}
          {state.nameError}
        </span>
      )}
      {state.registeredId !== undefined && (
        <span role="status">
          {" "}
          登録しました。詳細に反映されるまで時間がかかっています。{" "}
          <Link href={`${basePath}/${state.registeredId}`}>詳細へ</Link>
        </span>
      )}
      {state.error && <span role="alert"> {state.error}</span>}
    </form>
  );
}
