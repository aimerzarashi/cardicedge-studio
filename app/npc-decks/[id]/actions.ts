"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { graphql } from "@/graphql";
import { callCore } from "@/lib/core";
import {
  cardCountsErrors,
  type Notice,
  parseCardCounts,
  type RenameDeckState,
  type SetCardCountsState,
  target,
} from "../../deck-form";
import {
  CORE_UNAVAILABLE,
  FORBIDDEN,
  INVALID_STATUS_TRANSITION,
  INVALID_TARGET,
  NAME_ALREADY_IN_USE,
  NOT_REFLECTED,
  NPC_DECK_NOT_DRAFT,
  nameErrorMessage,
  publishErrorMessage,
  REVISION_CONFLICT,
} from "../../messages";
import { waitNpcDeck } from "../wait-npc-deck";

const renameNpcDeckMutation = graphql(`
  mutation RenameNpcDeck($input: RenameNpcDeckInput!) {
    renameNpcDeck(input: $input) {
      __typename
      ... on RenameNpcDeckSuccess {
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

const setNpcDeckCardCountsMutation = graphql(`
  mutation SetNpcDeckCardCounts($input: SetNpcDeckCardCountsInput!) {
    setNpcDeckCardCounts(input: $input) {
      __typename
      ... on SetNpcDeckCardCountsSuccess {
        id
        revision
      }
      ... on ValidationErrors {
        errors {
          __typename
          field
          ... on FieldOutOfRange {
            min
            max
          }
          ... on FieldTotalTooLarge {
            max
          }
        }
      }
    }
  }
`);

const deleteNpcDeckMutation = graphql(`
  mutation DeleteNpcDeck($input: DeleteNpcDeckInput!) {
    deleteNpcDeck(input: $input) {
      __typename
    }
  }
`);

const publishNpcDeckMutation = graphql(`
  mutation PublishNpcDeck($input: PublishNpcDeckInput!) {
    publishNpcDeck(input: $input) {
      __typename
      ... on PublishNpcDeckSuccess {
        id
        revision
      }
      ... on ValidationErrors {
        errors {
          __typename
          ... on FieldTotalMismatch {
            required
          }
        }
      }
    }
  }
`);

const retireNpcDeckMutation = graphql(`
  mutation RetireNpcDeck($input: RetireNpcDeckInput!) {
    retireNpcDeck(input: $input) {
      __typename
      ... on RetireNpcDeckSuccess {
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
  const reached = await waitNpcDeck(id, revision);
  refresh();
  return reached === "reached" ? { status } : { status: NOT_REFLECTED };
}

export async function renameNpcDeck(
  _previous: RenameDeckState,
  form: FormData,
): Promise<RenameDeckState> {
  const deck = target(form);
  const name = form.get("name");
  if (deck === undefined || typeof name !== "string") {
    return { error: INVALID_TARGET };
  }

  const result = await callCore(renameNpcDeckMutation, {
    input: { ...deck, name },
  });
  if (!result.ok) {
    return { revision: deck.revision, value: name, error: CORE_UNAVAILABLE };
  }

  const renamed = result.data.renameNpcDeck;
  switch (renamed.__typename) {
    case "RenameNpcDeckSuccess":
      return showChanged(renamed.id, renamed.revision, "名前を変えました");
    case "ValidationErrors":
      return {
        revision: deck.revision,
        value: name,
        nameError: nameErrorMessage(renamed.errors),
      };
    case "NpcDeckNameAlreadyInUseError":
      return {
        revision: deck.revision,
        value: name,
        nameError: NAME_ALREADY_IN_USE,
      };
    case "NpcDeckNotDraftError":
      refresh();
      return { error: NPC_DECK_NOT_DRAFT };
    case "RevisionConflictError":
      refresh();
      return { error: REVISION_CONFLICT };
    // 画面を出し直すと「見つからない」になる
    case "NpcDeckNotFoundError":
      refresh();
      return {};
    case "ForbiddenError":
      return { revision: deck.revision, value: name, error: FORBIDDEN };
  }
}

export async function setNpcDeckCardCounts(
  _previous: SetCardCountsState,
  form: FormData,
): Promise<SetCardCountsState> {
  const deck = target(form);
  if (deck === undefined) {
    return { error: INVALID_TARGET };
  }

  const parsed = parseCardCounts(form, deck.revision);
  if (parsed.kind === "invalid") {
    return parsed.state;
  }
  if (parsed.kind === "unchanged") {
    return { status: "変えた枚数がありません" };
  }
  const { counts, changes } = parsed;

  const result = await callCore(setNpcDeckCardCountsMutation, {
    input: { ...deck, cards: changes },
  });
  if (!result.ok) {
    return { revision: deck.revision, counts, error: CORE_UNAVAILABLE };
  }

  const changed = result.data.setNpcDeckCardCounts;
  switch (changed.__typename) {
    case "SetNpcDeckCardCountsSuccess":
      return showChanged(changed.id, changed.revision, "枚数を保存しました");
    case "ValidationErrors":
      return {
        revision: deck.revision,
        counts,
        ...cardCountsErrors(changed.errors, changes),
      };
    case "NpcDeckNotDraftError":
      refresh();
      return { error: NPC_DECK_NOT_DRAFT };
    case "RevisionConflictError":
      refresh();
      return { error: REVISION_CONFLICT };
    case "NpcDeckNotFoundError":
      refresh();
      return {};
    case "ForbiddenError":
      return { revision: deck.revision, counts, error: FORBIDDEN };
  }
}

export async function deleteNpcDeck(
  _previous: Notice,
  form: FormData,
): Promise<Notice> {
  const deck = target(form);
  if (deck === undefined) {
    return { error: INVALID_TARGET };
  }

  const result = await callCore(deleteNpcDeckMutation, { input: deck });
  if (!result.ok) {
    return { error: CORE_UNAVAILABLE };
  }

  const deleted = result.data.deleteNpcDeck;
  switch (deleted.__typename) {
    // 一覧は投影から読むため、移った直後は少し残ることがある。消えるまでは待たない（プリセットデッキと同じ）
    case "DeleteNpcDeckSuccess":
      return redirect("/npc-decks");
    case "NpcDeckNotDraftError":
      refresh();
      return { error: NPC_DECK_NOT_DRAFT };
    case "RevisionConflictError":
      refresh();
      return { error: REVISION_CONFLICT };
    case "NpcDeckNotFoundError":
      refresh();
      return {};
    case "ForbiddenError":
      return { error: FORBIDDEN };
  }
}

export async function publishNpcDeck(
  _previous: Notice,
  form: FormData,
): Promise<Notice> {
  const deck = target(form);
  if (deck === undefined) {
    return { error: INVALID_TARGET };
  }

  const result = await callCore(publishNpcDeckMutation, { input: deck });
  if (!result.ok) {
    return { error: CORE_UNAVAILABLE };
  }

  const published = result.data.publishNpcDeck;
  switch (published.__typename) {
    case "PublishNpcDeckSuccess":
      return showChanged(published.id, published.revision, "公開しました");
    case "ValidationErrors":
      return { error: publishErrorMessage(published.errors) };
    case "RevisionConflictError":
      refresh();
      return { error: REVISION_CONFLICT };
    case "NpcDeckNotFoundError":
      refresh();
      return {};
    case "ForbiddenError":
      return { error: FORBIDDEN };
  }
}

export async function retireNpcDeck(
  _previous: Notice,
  form: FormData,
): Promise<Notice> {
  const deck = target(form);
  if (deck === undefined) {
    return { error: INVALID_TARGET };
  }

  const result = await callCore(retireNpcDeckMutation, { input: deck });
  if (!result.ok) {
    return { error: CORE_UNAVAILABLE };
  }

  const retired = result.data.retireNpcDeck;
  switch (retired.__typename) {
    case "RetireNpcDeckSuccess":
      return showChanged(retired.id, retired.revision, "使用不可にしました");
    case "InvalidNpcDeckStatusTransitionError":
      refresh();
      return { error: INVALID_STATUS_TRANSITION };
    case "RevisionConflictError":
      refresh();
      return { error: REVISION_CONFLICT };
    case "NpcDeckNotFoundError":
      refresh();
      return {};
    case "ForbiddenError":
      return { error: FORBIDDEN };
  }
}
