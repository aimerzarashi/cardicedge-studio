"use client";

import { useActionState } from "react";
import { PublishProblemList } from "./boards/publish-problems";
import type { PublishState } from "./deck-form";

const initialState: PublishState = {};

export function StatusButton({
  action,
  label,
  id,
  revision,
}: {
  action: (previous: PublishState, form: FormData) => Promise<PublishState>;
  label: string;
  id: string;
  revision: number;
}) {
  const [state, formAction, isPending] = useActionState(action, initialState);

  return (
    <>
      {state.status && <p role="status">{state.status}</p>}
      {state.error && <p role="alert">{state.error}</p>}
      {/* 版が変わった後は、古い版の理由を残さない */}
      {state.problems && state.revision === revision && (
        <PublishProblemList problems={state.problems} />
      )}
      <form action={formAction}>
        <input type="hidden" name="id" value={id} />
        <input type="hidden" name="revision" value={revision} />
        <button type="submit" disabled={isPending}>
          {label}
        </button>
      </form>
    </>
  );
}
