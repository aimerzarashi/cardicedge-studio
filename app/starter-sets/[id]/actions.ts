"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import {
  setStarterSetGrantDecksMutation,
  setStarterSetUnlockBoardsMutation,
  setStarterSetUnlockNpcAvatarsMutation,
} from "@/app/starter-sets/operations";
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
  nameErrorMessage,
  REVISION_CONFLICT,
  STARTER_SET_NOT_DRAFT,
  starterSetItemErrorMessage,
  starterSetLimitReachedMessage,
  starterSetPublishErrorMessage,
} from "../../messages";
import { waitStarterSet } from "../wait-starter-set";

const renameStarterSetMutation = graphql(`
  mutation RenameStarterSet($input: RenameStarterSetInput!) {
    renameStarterSet(input: $input) {
      __typename
      ... on RenameStarterSetSuccess {
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

const deleteStarterSetMutation = graphql(`
  mutation DeleteStarterSet($input: DeleteStarterSetInput!) {
    deleteStarterSet(input: $input) {
      __typename
    }
  }
`);

const publishStarterSetMutation = graphql(`
  mutation PublishStarterSet($input: PublishStarterSetInput!) {
    publishStarterSet(input: $input) {
      __typename
      ... on PublishStarterSetSuccess {
        id
        revision
      }
      ... on StarterSetLimitReachedError {
        max
      }
      ... on ValidationErrors {
        errors {
          __typename
        }
      }
    }
  }
`);

const retireStarterSetMutation = graphql(`
  mutation RetireStarterSet($input: RetireStarterSetInput!) {
    retireStarterSet(input: $input) {
      __typename
      ... on RetireStarterSetSuccess {
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
  const reached = await waitStarterSet(id, revision);
  refresh();
  return reached === "reached" ? { status } : { status: NOT_REFLECTED };
}

export async function renameStarterSet(
  _previous: RenameDeckState,
  form: FormData,
): Promise<RenameDeckState> {
  const set = target(form);
  const name = form.get("name");
  if (set === undefined || typeof name !== "string") {
    return { error: INVALID_TARGET };
  }

  const result = await callCore(renameStarterSetMutation, {
    input: { ...set, name },
  });
  if (!result.ok) {
    return { revision: set.revision, value: name, error: CORE_UNAVAILABLE };
  }

  const renamed = result.data.renameStarterSet;
  switch (renamed.__typename) {
    case "RenameStarterSetSuccess":
      return showChanged(renamed.id, renamed.revision, "名前を変えました");
    case "ValidationErrors":
      return {
        revision: set.revision,
        value: name,
        nameError: nameErrorMessage(renamed.errors),
      };
    case "StarterSetNameAlreadyInUseError":
      return {
        revision: set.revision,
        value: name,
        nameError: NAME_ALREADY_IN_USE,
      };
    case "StarterSetNotDraftError":
      refresh();
      return { error: STARTER_SET_NOT_DRAFT };
    case "RevisionConflictError":
      refresh();
      return { error: REVISION_CONFLICT };
    // 画面を出し直すと「見つからない」になる
    case "StarterSetNotFoundError":
      refresh();
      return {};
    case "ForbiddenError":
      return { revision: set.revision, value: name, error: FORBIDDEN };
  }
}

export async function deleteStarterSet(
  _previous: Notice,
  form: FormData,
): Promise<Notice> {
  const set = target(form);
  if (set === undefined) {
    return { error: INVALID_TARGET };
  }

  const result = await callCore(deleteStarterSetMutation, { input: set });
  if (!result.ok) {
    return { error: CORE_UNAVAILABLE };
  }

  const deleted = result.data.deleteStarterSet;
  switch (deleted.__typename) {
    // 一覧は投影から読むため、移った直後は少し残ることがある。消えるまでは待たない（プリセットデッキと同じ）
    case "DeleteStarterSetSuccess":
      return redirect("/starter-sets");
    case "StarterSetNotDraftError":
      refresh();
      return { error: STARTER_SET_NOT_DRAFT };
    case "RevisionConflictError":
      refresh();
      return { error: REVISION_CONFLICT };
    case "StarterSetNotFoundError":
      refresh();
      return {};
    case "ForbiddenError":
      return { error: FORBIDDEN };
  }
}

export async function publishStarterSet(
  _previous: Notice,
  form: FormData,
): Promise<Notice> {
  const set = target(form);
  if (set === undefined) {
    return { error: INVALID_TARGET };
  }

  const result = await callCore(publishStarterSetMutation, { input: set });
  if (!result.ok) {
    return { error: CORE_UNAVAILABLE };
  }

  const published = result.data.publishStarterSet;
  switch (published.__typename) {
    case "PublishStarterSetSuccess":
      return showChanged(published.id, published.revision, "公開しました");
    case "ValidationErrors":
      return { error: starterSetPublishErrorMessage(published.errors) };
    case "StarterSetLimitReachedError":
      return { error: starterSetLimitReachedMessage(published.max) };
    case "RevisionConflictError":
      refresh();
      return { error: REVISION_CONFLICT };
    case "StarterSetNotFoundError":
      refresh();
      return {};
    case "ForbiddenError":
      return { error: FORBIDDEN };
  }
}

export async function retireStarterSet(
  _previous: Notice,
  form: FormData,
): Promise<Notice> {
  const set = target(form);
  if (set === undefined) {
    return { error: INVALID_TARGET };
  }

  const result = await callCore(retireStarterSetMutation, { input: set });
  if (!result.ok) {
    return { error: CORE_UNAVAILABLE };
  }

  const retired = result.data.retireStarterSet;
  switch (retired.__typename) {
    case "RetireStarterSetSuccess":
      return showChanged(retired.id, retired.revision, "使用不可にしました");
    case "InvalidStarterSetStatusTransitionError":
      refresh();
      return { error: INVALID_STATUS_TRANSITION };
    case "RevisionConflictError":
      refresh();
      return { error: REVISION_CONFLICT };
    case "StarterSetNotFoundError":
      refresh();
      return {};
    case "ForbiddenError":
      return { error: FORBIDDEN };
  }
}

// 割り当てる・外すのどちらも、変えた後の一覧（隠し項目 <項目名> を並べたもの）をまるごと送る（core の Set の操作が一覧に
// そろえる操作のため）。並びは画面に出ている割り当てた順のまま。知らせの文言は、押したボタンの種類（割り当てる・外す）から作る
function parseItems(form: FormData, field: string) {
  const set = target(form);
  const ids = form.getAll(field);
  const kind = form.get("kind");
  if (
    set === undefined ||
    !ids.every((id) => typeof id === "string") ||
    (kind !== "assign" && kind !== "unassign")
  ) {
    return undefined;
  }
  return { set, ids, kind };
}

function changedMessage(kind: string): string {
  return kind === "assign" ? "割り当てました" : "外しました";
}

export async function setStarterSetGrantDecks(
  _previous: Notice,
  form: FormData,
): Promise<Notice> {
  const parsed = parseItems(form, "grantDeckId");
  if (parsed === undefined) {
    return { error: INVALID_TARGET };
  }

  const result = await callCore(setStarterSetGrantDecksMutation, {
    input: { ...parsed.set, grantDeckIds: parsed.ids },
  });
  if (!result.ok) {
    return { error: CORE_UNAVAILABLE };
  }

  const changed = result.data.setStarterSetGrantDecks;
  switch (changed.__typename) {
    case "SetStarterSetGrantDecksSuccess":
      return showChanged(
        changed.id,
        changed.revision,
        changedMessage(parsed.kind),
      );
    case "ValidationErrors":
      refresh();
      return { error: starterSetItemErrorMessage(changed.errors, "デッキ") };
    case "StarterSetNotDraftError":
      refresh();
      return { error: STARTER_SET_NOT_DRAFT };
    case "RevisionConflictError":
      refresh();
      return { error: REVISION_CONFLICT };
    case "StarterSetNotFoundError":
      refresh();
      return {};
    case "ForbiddenError":
      return { error: FORBIDDEN };
  }
}

export async function setStarterSetUnlockBoards(
  _previous: Notice,
  form: FormData,
): Promise<Notice> {
  const parsed = parseItems(form, "unlockBoardId");
  if (parsed === undefined) {
    return { error: INVALID_TARGET };
  }

  const result = await callCore(setStarterSetUnlockBoardsMutation, {
    input: { ...parsed.set, unlockBoardIds: parsed.ids },
  });
  if (!result.ok) {
    return { error: CORE_UNAVAILABLE };
  }

  const changed = result.data.setStarterSetUnlockBoards;
  switch (changed.__typename) {
    case "SetStarterSetUnlockBoardsSuccess":
      return showChanged(
        changed.id,
        changed.revision,
        changedMessage(parsed.kind),
      );
    case "ValidationErrors":
      refresh();
      return { error: starterSetItemErrorMessage(changed.errors, "ボード") };
    case "StarterSetNotDraftError":
      refresh();
      return { error: STARTER_SET_NOT_DRAFT };
    case "RevisionConflictError":
      refresh();
      return { error: REVISION_CONFLICT };
    case "StarterSetNotFoundError":
      refresh();
      return {};
    case "ForbiddenError":
      return { error: FORBIDDEN };
  }
}

export async function setStarterSetUnlockNpcAvatars(
  _previous: Notice,
  form: FormData,
): Promise<Notice> {
  const parsed = parseItems(form, "unlockNpcAvatarId");
  if (parsed === undefined) {
    return { error: INVALID_TARGET };
  }

  const result = await callCore(setStarterSetUnlockNpcAvatarsMutation, {
    input: { ...parsed.set, unlockNpcAvatarIds: parsed.ids },
  });
  if (!result.ok) {
    return { error: CORE_UNAVAILABLE };
  }

  const changed = result.data.setStarterSetUnlockNpcAvatars;
  switch (changed.__typename) {
    case "SetStarterSetUnlockNpcAvatarsSuccess":
      return showChanged(
        changed.id,
        changed.revision,
        changedMessage(parsed.kind),
      );
    case "ValidationErrors":
      refresh();
      return { error: starterSetItemErrorMessage(changed.errors, "NPC") };
    case "StarterSetNotDraftError":
      refresh();
      return { error: STARTER_SET_NOT_DRAFT };
    case "RevisionConflictError":
      refresh();
      return { error: REVISION_CONFLICT };
    case "StarterSetNotFoundError":
      refresh();
      return {};
    case "ForbiddenError":
      return { error: FORBIDDEN };
  }
}
