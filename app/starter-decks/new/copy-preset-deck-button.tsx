"use client";

import Link from "next/link";
import { useActionState } from "react";
import {
  type RegisterFromPresetDeckState,
  registerStarterDeckFromPresetDeck,
} from "./actions";

const initialState: RegisterFromPresetDeckState = {};

export function CopyPresetDeckButton({
  presetDeckId,
  name,
}: {
  presetDeckId: string;
  name: string;
}) {
  const [state, formAction, isPending] = useActionState(
    registerStarterDeckFromPresetDeck,
    initialState,
  );

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
          <Link href={`/starter-decks/${state.registeredId}`}>詳細へ</Link>
        </span>
      )}
      {state.error && <span role="alert"> {state.error}</span>}
    </form>
  );
}
