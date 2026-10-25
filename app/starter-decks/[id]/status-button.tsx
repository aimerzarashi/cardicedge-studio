"use client";

import { useActionState } from "react";
import type { Notice } from "../../deck-form";

const initialState: Notice = {};

export function StatusButton({
  action,
  label,
  id,
  revision,
}: {
  action: (previous: Notice, form: FormData) => Promise<Notice>;
  label: string;
  id: string;
  revision: number;
}) {
  const [state, formAction, isPending] = useActionState(action, initialState);

  return (
    <>
      {state.status && <p role="status">{state.status}</p>}
      {state.error && <p role="alert">{state.error}</p>}
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
