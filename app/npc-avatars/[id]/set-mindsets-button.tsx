"use client";

import { useActionState } from "react";
import type { Notice } from "../../deck-form";
import { setNpcAvatarMindsets } from "./actions";

const initialState: Notice = {};

// 割り当てる・外すボタン。押すと、変えた後の一覧（mindsetIds）をまるごと送る（core が一覧にそろえる操作のため、足す・外すを
// 別の操作にしない）
export function SetMindsetsButton({
  id,
  revision,
  mindsetIds,
  kind,
  label,
  accessibleName,
}: {
  id: string;
  revision: number;
  mindsetIds: string[];
  kind: "assign" | "unassign";
  label: string;
  accessibleName: string;
}) {
  const [state, formAction, isPending] = useActionState(
    setNpcAvatarMindsets,
    initialState,
  );

  return (
    <form action={formAction}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="revision" value={revision} />
      <input type="hidden" name="kind" value={kind} />
      {mindsetIds.map((mindsetId) => (
        <input
          key={mindsetId}
          type="hidden"
          name="mindsetId"
          value={mindsetId}
        />
      ))}
      <button type="submit" disabled={isPending} aria-label={accessibleName}>
        {label}
      </button>
      {state.status && <span role="status"> {state.status}</span>}
      {state.error && <span role="alert"> {state.error}</span>}
    </form>
  );
}
