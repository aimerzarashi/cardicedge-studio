"use client";

import { useActionState } from "react";
import type { Notice } from "../../deck-form";

const initialState: Notice = {};

// 割り当てる・外すボタン。押すと、変えた後の一覧（ids）をまるごと送る（core が一覧にそろえる操作のため、足す・外すを
// 別の操作にしない）。配るデッキ・解放するボード・解放する NPC で同じ形のため、操作（action）と隠し項目の名前（field）を受け取る
export function SetItemsButton({
  action,
  field,
  id,
  revision,
  ids,
  kind,
  label,
  accessibleName,
}: {
  action: (previous: Notice, form: FormData) => Promise<Notice>;
  field: string;
  id: string;
  revision: number;
  ids: string[];
  kind: "assign" | "unassign";
  label: string;
  accessibleName: string;
}) {
  const [state, formAction, isPending] = useActionState(action, initialState);

  return (
    <form action={formAction}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="revision" value={revision} />
      <input type="hidden" name="kind" value={kind} />
      {ids.map((itemId) => (
        <input key={itemId} type="hidden" name={field} value={itemId} />
      ))}
      <button type="submit" disabled={isPending} aria-label={accessibleName}>
        {label}
      </button>
      {state.status && <span role="status"> {state.status}</span>}
      {state.error && <span role="alert"> {state.error}</span>}
    </form>
  );
}
