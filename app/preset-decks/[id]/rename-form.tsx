"use client";

import { useActionState } from "react";
import { type RenamePresetDeckState, renamePresetDeck } from "./actions";

const initialState: RenamePresetDeckState = {};

export function RenameForm({
  id,
  revision,
  name,
}: {
  id: string;
  revision: number;
  name: string;
}) {
  const [state, formAction, isPending] = useActionState(
    renamePresetDeck,
    initialState,
  );
  const kept = state.revision === revision ? state : {};

  return (
    <>
      {state.status && <p role="status">{state.status}</p>}
      {state.error && <p role="alert">{state.error}</p>}
      {/* 版が変わったら入力欄を作り直し、最新の名前を入れる（defaultValue は作った後に変えても入力欄に反映されない） */}
      <form key={revision} action={formAction}>
        <input type="hidden" name="id" value={id} />
        <input type="hidden" name="revision" value={revision} />
        <label>
          名前
          <input
            name="name"
            required
            defaultValue={kept.value ?? name}
            aria-invalid={kept.nameError ? true : undefined}
            aria-describedby={kept.nameError ? "name-error" : undefined}
          />
        </label>
        {kept.nameError && (
          <p id="name-error" role="alert">
            {kept.nameError}
          </p>
        )}
        <button type="submit" disabled={isPending}>
          名前を変える
        </button>
      </form>
    </>
  );
}
