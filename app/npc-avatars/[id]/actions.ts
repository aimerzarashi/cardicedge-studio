"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
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
  NPC_AVATAR_NOT_DRAFT,
  nameErrorMessage,
  REVISION_CONFLICT,
} from "../../messages";
import { waitNpcAvatar } from "../wait-npc-avatar";

const renameNpcAvatarMutation = graphql(`
  mutation RenameNpcAvatar($input: RenameNpcAvatarInput!) {
    renameNpcAvatar(input: $input) {
      __typename
      ... on RenameNpcAvatarSuccess {
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

const deleteNpcAvatarMutation = graphql(`
  mutation DeleteNpcAvatar($input: DeleteNpcAvatarInput!) {
    deleteNpcAvatar(input: $input) {
      __typename
    }
  }
`);

const publishNpcAvatarMutation = graphql(`
  mutation PublishNpcAvatar($input: PublishNpcAvatarInput!) {
    publishNpcAvatar(input: $input) {
      __typename
      ... on PublishNpcAvatarSuccess {
        id
        revision
      }
    }
  }
`);

const retireNpcAvatarMutation = graphql(`
  mutation RetireNpcAvatar($input: RetireNpcAvatarInput!) {
    retireNpcAvatar(input: $input) {
      __typename
      ... on RetireNpcAvatarSuccess {
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
  const reached = await waitNpcAvatar(id, revision);
  refresh();
  return reached === "reached" ? { status } : { status: NOT_REFLECTED };
}

export async function renameNpcAvatar(
  _previous: RenameDeckState,
  form: FormData,
): Promise<RenameDeckState> {
  const avatar = target(form);
  const name = form.get("name");
  if (avatar === undefined || typeof name !== "string") {
    return { error: INVALID_TARGET };
  }

  const result = await callCore(renameNpcAvatarMutation, {
    input: { ...avatar, name },
  });
  if (!result.ok) {
    return { revision: avatar.revision, value: name, error: CORE_UNAVAILABLE };
  }

  const renamed = result.data.renameNpcAvatar;
  switch (renamed.__typename) {
    case "RenameNpcAvatarSuccess":
      return showChanged(renamed.id, renamed.revision, "名前を変えました");
    case "ValidationErrors":
      return {
        revision: avatar.revision,
        value: name,
        nameError: nameErrorMessage(renamed.errors),
      };
    case "NpcAvatarNameAlreadyInUseError":
      return {
        revision: avatar.revision,
        value: name,
        nameError: NAME_ALREADY_IN_USE,
      };
    case "NpcAvatarNotDraftError":
      refresh();
      return { error: NPC_AVATAR_NOT_DRAFT };
    case "RevisionConflictError":
      refresh();
      return { error: REVISION_CONFLICT };
    // 画面を出し直すと「見つからない」になる
    case "NpcAvatarNotFoundError":
      refresh();
      return {};
    case "ForbiddenError":
      return { revision: avatar.revision, value: name, error: FORBIDDEN };
  }
}

export async function deleteNpcAvatar(
  _previous: Notice,
  form: FormData,
): Promise<Notice> {
  const avatar = target(form);
  if (avatar === undefined) {
    return { error: INVALID_TARGET };
  }

  const result = await callCore(deleteNpcAvatarMutation, { input: avatar });
  if (!result.ok) {
    return { error: CORE_UNAVAILABLE };
  }

  const deleted = result.data.deleteNpcAvatar;
  switch (deleted.__typename) {
    // 一覧は投影から読むため、移った直後は少し残ることがある。消えるまでは待たない（プリセットデッキと同じ）
    case "DeleteNpcAvatarSuccess":
      return redirect("/npc-avatars");
    case "NpcAvatarNotDraftError":
      refresh();
      return { error: NPC_AVATAR_NOT_DRAFT };
    case "RevisionConflictError":
      refresh();
      return { error: REVISION_CONFLICT };
    case "NpcAvatarNotFoundError":
      refresh();
      return {};
    case "ForbiddenError":
      return { error: FORBIDDEN };
  }
}

export async function publishNpcAvatar(
  _previous: Notice,
  form: FormData,
): Promise<Notice> {
  const avatar = target(form);
  if (avatar === undefined) {
    return { error: INVALID_TARGET };
  }

  const result = await callCore(publishNpcAvatarMutation, { input: avatar });
  if (!result.ok) {
    return { error: CORE_UNAVAILABLE };
  }

  const published = result.data.publishNpcAvatar;
  switch (published.__typename) {
    case "PublishNpcAvatarSuccess":
      return showChanged(published.id, published.revision, "公開しました");
    case "RevisionConflictError":
      refresh();
      return { error: REVISION_CONFLICT };
    case "NpcAvatarNotFoundError":
      refresh();
      return {};
    case "ForbiddenError":
      return { error: FORBIDDEN };
  }
}

export async function retireNpcAvatar(
  _previous: Notice,
  form: FormData,
): Promise<Notice> {
  const avatar = target(form);
  if (avatar === undefined) {
    return { error: INVALID_TARGET };
  }

  const result = await callCore(retireNpcAvatarMutation, { input: avatar });
  if (!result.ok) {
    return { error: CORE_UNAVAILABLE };
  }

  const retired = result.data.retireNpcAvatar;
  switch (retired.__typename) {
    case "RetireNpcAvatarSuccess":
      return showChanged(retired.id, retired.revision, "使用不可にしました");
    case "InvalidNpcAvatarStatusTransitionError":
      refresh();
      return { error: INVALID_STATUS_TRANSITION };
    case "RevisionConflictError":
      refresh();
      return { error: REVISION_CONFLICT };
    case "NpcAvatarNotFoundError":
      refresh();
      return {};
    case "ForbiddenError":
      return { error: FORBIDDEN };
  }
}
