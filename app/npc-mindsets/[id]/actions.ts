"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import {
  publishNpcMindsetMutation,
  setNpcMindsetActionWeightsMutation,
  setNpcMindsetCriterionWeightsMutation,
} from "@/app/npc-mindsets/operations";
import { graphql } from "@/graphql";
import { callCore } from "@/lib/core";
import { type Notice, type RenameDeckState, target } from "../../deck-form";
import {
  CORE_UNAVAILABLE,
  FORBIDDEN,
  INVALID_STATUS_TRANSITION,
  INVALID_TARGET,
  NAME_ALREADY_IN_USE,
  NOT_REFLECTED,
  NPC_MINDSET_NOT_DRAFT,
  nameErrorMessage,
  REVISION_CONFLICT,
} from "../../messages";
import { isCriterion, isMatchAction } from "../labels";
import { waitNpcMindset } from "../wait-npc-mindset";
import {
  parseWeights,
  type SetWeightsState,
  weightsErrors,
} from "../weights-parse";

const renameNpcMindsetMutation = graphql(`
  mutation RenameNpcMindset($input: RenameNpcMindsetInput!) {
    renameNpcMindset(input: $input) {
      __typename
      ... on RenameNpcMindsetSuccess {
        id
        revision
      }
      ... on ValidationErrors {
        errors {
          __typename
          ... on FieldTooLong {
            max
          }
        }
      }
    }
  }
`);

const deleteNpcMindsetMutation = graphql(`
  mutation DeleteNpcMindset($input: DeleteNpcMindsetInput!) {
    deleteNpcMindset(input: $input) {
      __typename
    }
  }
`);

const retireNpcMindsetMutation = graphql(`
  mutation RetireNpcMindset($input: RetireNpcMindsetInput!) {
    retireNpcMindset(input: $input) {
      __typename
      ... on RetireNpcMindsetSuccess {
        id
        revision
      }
    }
  }
`);

// 操作の結果の revision が詳細に届いてから出し直す（届く前に出し直すと、古い revision のまま次の操作をしてしまう）
async function showChanged(
  id: string,
  revision: number,
  status: string,
): Promise<Notice> {
  const reached = await waitNpcMindset(id, revision);
  refresh();
  return reached === "reached" ? { status } : { status: NOT_REFLECTED };
}

export async function renameNpcMindset(
  _previous: RenameDeckState,
  form: FormData,
): Promise<RenameDeckState> {
  const mindset = target(form);
  const name = form.get("name");
  if (mindset === undefined || typeof name !== "string") {
    return { error: INVALID_TARGET };
  }

  const result = await callCore(renameNpcMindsetMutation, {
    input: { ...mindset, name },
  });
  if (!result.ok) {
    return { revision: mindset.revision, value: name, error: CORE_UNAVAILABLE };
  }

  const renamed = result.data.renameNpcMindset;
  switch (renamed.__typename) {
    case "RenameNpcMindsetSuccess":
      return showChanged(renamed.id, renamed.revision, "名前を変えました");
    case "ValidationErrors":
      return {
        revision: mindset.revision,
        value: name,
        nameError: nameErrorMessage(renamed.errors),
      };
    case "NpcMindsetNameAlreadyInUseError":
      return {
        revision: mindset.revision,
        value: name,
        nameError: NAME_ALREADY_IN_USE,
      };
    case "NpcMindsetNotDraftError":
      refresh();
      return { error: NPC_MINDSET_NOT_DRAFT };
    case "RevisionConflictError":
      refresh();
      return { error: REVISION_CONFLICT };
    // 画面を出し直すと「見つからない」になる
    case "NpcMindsetNotFoundError":
      refresh();
      return {};
    case "ForbiddenError":
      return { revision: mindset.revision, value: name, error: FORBIDDEN };
  }
}

export async function setNpcMindsetActionWeights(
  _previous: SetWeightsState,
  form: FormData,
): Promise<SetWeightsState> {
  const mindset = target(form);
  if (mindset === undefined) {
    return { error: INVALID_TARGET };
  }

  const parsed = parseWeights(form, mindset.revision);
  if (parsed.kind === "invalid") {
    return parsed.state;
  }
  const { values, weights } = parsed;
  const input = weights.flatMap(({ key, weight }) =>
    isMatchAction(key) ? [{ action: key, weight }] : [],
  );
  if (input.length !== weights.length) {
    return { error: INVALID_TARGET };
  }

  const result = await callCore(setNpcMindsetActionWeightsMutation, {
    input: { ...mindset, weights: input },
  });
  if (!result.ok) {
    return { revision: mindset.revision, values, error: CORE_UNAVAILABLE };
  }

  const changed = result.data.setNpcMindsetActionWeights;
  switch (changed.__typename) {
    case "SetNpcMindsetActionWeightsSuccess":
      return showChanged(changed.id, changed.revision, "重みを保存しました");
    case "ValidationErrors":
      return {
        revision: mindset.revision,
        values,
        ...weightsErrors(changed.errors, weights),
      };
    case "NpcMindsetNotDraftError":
      refresh();
      return { error: NPC_MINDSET_NOT_DRAFT };
    case "RevisionConflictError":
      refresh();
      return { error: REVISION_CONFLICT };
    case "NpcMindsetNotFoundError":
      refresh();
      return {};
    case "ForbiddenError":
      return { revision: mindset.revision, values, error: FORBIDDEN };
  }
}

export async function setNpcMindsetCriterionWeights(
  _previous: SetWeightsState,
  form: FormData,
): Promise<SetWeightsState> {
  const mindset = target(form);
  if (mindset === undefined) {
    return { error: INVALID_TARGET };
  }

  const parsed = parseWeights(form, mindset.revision);
  if (parsed.kind === "invalid") {
    return parsed.state;
  }
  const { values, weights } = parsed;
  const input = weights.flatMap(({ key, weight }) =>
    isCriterion(key) ? [{ criterion: key, weight }] : [],
  );
  if (input.length !== weights.length) {
    return { error: INVALID_TARGET };
  }

  const result = await callCore(setNpcMindsetCriterionWeightsMutation, {
    input: { ...mindset, weights: input },
  });
  if (!result.ok) {
    return { revision: mindset.revision, values, error: CORE_UNAVAILABLE };
  }

  const changed = result.data.setNpcMindsetCriterionWeights;
  switch (changed.__typename) {
    case "SetNpcMindsetCriterionWeightsSuccess":
      return showChanged(changed.id, changed.revision, "重みを保存しました");
    case "ValidationErrors":
      return {
        revision: mindset.revision,
        values,
        ...weightsErrors(changed.errors, weights),
      };
    case "NpcMindsetNotDraftError":
      refresh();
      return { error: NPC_MINDSET_NOT_DRAFT };
    case "RevisionConflictError":
      refresh();
      return { error: REVISION_CONFLICT };
    case "NpcMindsetNotFoundError":
      refresh();
      return {};
    case "ForbiddenError":
      return { revision: mindset.revision, values, error: FORBIDDEN };
  }
}

export async function deleteNpcMindset(
  _previous: Notice,
  form: FormData,
): Promise<Notice> {
  const mindset = target(form);
  if (mindset === undefined) {
    return { error: INVALID_TARGET };
  }

  const result = await callCore(deleteNpcMindsetMutation, { input: mindset });
  if (!result.ok) {
    return { error: CORE_UNAVAILABLE };
  }

  const deleted = result.data.deleteNpcMindset;
  switch (deleted.__typename) {
    // 一覧は投影から読むため、移った直後は少し残ることがある。消えるまでは待たない（プリセットデッキと同じ）
    case "DeleteNpcMindsetSuccess":
      return redirect("/npc-mindsets");
    case "NpcMindsetNotDraftError":
      refresh();
      return { error: NPC_MINDSET_NOT_DRAFT };
    case "RevisionConflictError":
      refresh();
      return { error: REVISION_CONFLICT };
    case "NpcMindsetNotFoundError":
      refresh();
      return {};
    case "ForbiddenError":
      return { error: FORBIDDEN };
  }
}

export async function publishNpcMindset(
  _previous: Notice,
  form: FormData,
): Promise<Notice> {
  const mindset = target(form);
  if (mindset === undefined) {
    return { error: INVALID_TARGET };
  }

  const result = await callCore(publishNpcMindsetMutation, { input: mindset });
  if (!result.ok) {
    return { error: CORE_UNAVAILABLE };
  }

  const published = result.data.publishNpcMindset;
  switch (published.__typename) {
    case "PublishNpcMindsetSuccess":
      return showChanged(published.id, published.revision, "公開しました");
    case "RevisionConflictError":
      refresh();
      return { error: REVISION_CONFLICT };
    case "NpcMindsetNotFoundError":
      refresh();
      return {};
    case "ForbiddenError":
      return { error: FORBIDDEN };
  }
}

export async function retireNpcMindset(
  _previous: Notice,
  form: FormData,
): Promise<Notice> {
  const mindset = target(form);
  if (mindset === undefined) {
    return { error: INVALID_TARGET };
  }

  const result = await callCore(retireNpcMindsetMutation, { input: mindset });
  if (!result.ok) {
    return { error: CORE_UNAVAILABLE };
  }

  const retired = result.data.retireNpcMindset;
  switch (retired.__typename) {
    case "RetireNpcMindsetSuccess":
      return showChanged(retired.id, retired.revision, "使用不可にしました");
    case "InvalidNpcMindsetStatusTransitionError":
      refresh();
      return { error: INVALID_STATUS_TRANSITION };
    case "RevisionConflictError":
      refresh();
      return { error: REVISION_CONFLICT };
    case "NpcMindsetNotFoundError":
      refresh();
      return {};
    case "ForbiddenError":
      return { error: FORBIDDEN };
  }
}
