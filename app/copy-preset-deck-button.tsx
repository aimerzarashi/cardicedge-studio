"use client";

import Link from "next/link";
import { useActionState } from "react";
import type { RegisterFromPresetDeckState } from "./deck-form";

const initialState: RegisterFromPresetDeckState = {};

export function CopyPresetDeckButton({
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

  return (
    <form action={formAction}>
      <input type="hidden" name="presetDeckId" value={presetDeckId} />
      <button
        type="submit"
        disabled={isPending}
        aria-label={`${name}を写して作る`}
      >
        写して作る
      </button>
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
