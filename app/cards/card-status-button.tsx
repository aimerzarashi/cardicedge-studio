"use client";

import { useActionState } from "react";
import type { Notice } from "../deck-form";

const initialState: Notice = {};

// 一覧の 1 行ごとに送る。送るのは画面で見た版（revision）で、ほかの操作で変わっていれば core が「先に変えられた」にする
export function CardStatusButton({
  action,
  label,
  id,
  revision,
  name,
}: {
  action: (previous: Notice, form: FormData) => Promise<Notice>;
  label: string;
  id: string;
  revision: number;
  name: string;
}) {
  const [state, formAction, isPending] = useActionState(action, initialState);

  return (
    <form action={formAction}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="revision" value={revision} />
      <input type="hidden" name="name" value={name} />
      <button
        type="submit"
        disabled={isPending}
        aria-label={`${name}を${label}`}
      >
        {label}
      </button>
      {state.status && <span role="status"> {state.status}</span>}
      {state.error && <span role="alert"> {state.error}</span>}
    </form>
  );
}
