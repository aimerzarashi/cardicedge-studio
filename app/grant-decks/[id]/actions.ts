"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import {
  publishGrantDeckMutation,
  setGrantDeckCardCountsMutation,
} from "@/app/grant-decks/operations";
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
  GRANT_DECK_NOT_DRAFT,
  INVALID_STATUS_TRANSITION,
  INVALID_TARGET,
  NAME_ALREADY_IN_USE,
  NOT_REFLECTED,
  nameErrorMessage,
  publishErrorMessage,
  REVISION_CONFLICT,
} from "../../messages";
import { waitGrantDeck } from "../wait-grant-deck";

const renameGrantDeckMutation = graphql(`
  mutation RenameGrantDeck($input: RenameGrantDeckInput!) {
    renameGrantDeck(input: $input) {
      __typename
      ... on RenameGrantDeckSuccess {
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

const deleteGrantDeckMutation = graphql(`
  mutation DeleteGrantDeck($input: DeleteGrantDeckInput!) {
    deleteGrantDeck(input: $input) {
      __typename
    }
  }
`);

const retireGrantDeckMutation = graphql(`
  mutation RetireGrantDeck($input: RetireGrantDeckInput!) {
    retireGrantDeck(input: $input) {
      __typename
      ... on RetireGrantDeckSuccess {
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
  const reached = await waitGrantDeck(id, revision);
  refresh();
  return reached === "reached" ? { status } : { status: NOT_REFLECTED };
}

export async function renameGrantDeck(
  _previous: RenameDeckState,
  form: FormData,
): Promise<RenameDeckState> {
  const deck = target(form);
  const name = form.get("name");
  if (deck === undefined || typeof name !== "string") {
    return { error: INVALID_TARGET };
  }

  const result = await callCore(renameGrantDeckMutation, {
    input: { ...deck, name },
  });
  if (!result.ok) {
    return { revision: deck.revision, value: name, error: CORE_UNAVAILABLE };
  }

  const renamed = result.data.renameGrantDeck;
  switch (renamed.__typename) {
    case "RenameGrantDeckSuccess":
      return showChanged(renamed.id, renamed.revision, "名前を変えました");
    case "ValidationErrors":
      return {
        revision: deck.revision,
        value: name,
        nameError: nameErrorMessage(renamed.errors),
      };
    case "GrantDeckNameAlreadyInUseError":
      return {
        revision: deck.revision,
        value: name,
        nameError: NAME_ALREADY_IN_USE,
      };
    case "GrantDeckNotDraftError":
      refresh();
      return { error: GRANT_DECK_NOT_DRAFT };
    case "RevisionConflictError":
      refresh();
      return { error: REVISION_CONFLICT };
    // 画面を出し直すと「見つからない」になる
    case "GrantDeckNotFoundError":
      refresh();
      return {};
    case "ForbiddenError":
      return { revision: deck.revision, value: name, error: FORBIDDEN };
  }
}

export async function setGrantDeckCardCounts(
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

  const result = await callCore(setGrantDeckCardCountsMutation, {
    input: { ...deck, cards: changes },
  });
  if (!result.ok) {
    return { revision: deck.revision, counts, error: CORE_UNAVAILABLE };
  }

  const changed = result.data.setGrantDeckCardCounts;
  switch (changed.__typename) {
    case "SetGrantDeckCardCountsSuccess":
      return showChanged(changed.id, changed.revision, "枚数を保存しました");
    case "ValidationErrors":
      return {
        revision: deck.revision,
        counts,
        ...cardCountsErrors(changed.errors, changes),
      };
    case "GrantDeckNotDraftError":
      refresh();
      return { error: GRANT_DECK_NOT_DRAFT };
    case "RevisionConflictError":
      refresh();
      return { error: REVISION_CONFLICT };
    case "GrantDeckNotFoundError":
      refresh();
      return {};
    case "ForbiddenError":
      return { revision: deck.revision, counts, error: FORBIDDEN };
  }
}

export async function deleteGrantDeck(
  _previous: Notice,
  form: FormData,
): Promise<Notice> {
  const deck = target(form);
  if (deck === undefined) {
    return { error: INVALID_TARGET };
  }

  const result = await callCore(deleteGrantDeckMutation, { input: deck });
  if (!result.ok) {
    return { error: CORE_UNAVAILABLE };
  }

  const deleted = result.data.deleteGrantDeck;
  switch (deleted.__typename) {
    // 一覧は投影から読むため、移った直後は少し残ることがある。消えるまでは待たない（プリセットデッキと同じ）
    case "DeleteGrantDeckSuccess":
      return redirect("/grant-decks");
    case "GrantDeckNotDraftError":
      refresh();
      return { error: GRANT_DECK_NOT_DRAFT };
    case "RevisionConflictError":
      refresh();
      return { error: REVISION_CONFLICT };
    case "GrantDeckNotFoundError":
      refresh();
      return {};
    case "ForbiddenError":
      return { error: FORBIDDEN };
  }
}

export async function publishGrantDeck(
  _previous: Notice,
  form: FormData,
): Promise<Notice> {
  const deck = target(form);
  if (deck === undefined) {
    return { error: INVALID_TARGET };
  }

  const result = await callCore(publishGrantDeckMutation, { input: deck });
  if (!result.ok) {
    return { error: CORE_UNAVAILABLE };
  }

  const published = result.data.publishGrantDeck;
  switch (published.__typename) {
    case "PublishGrantDeckSuccess":
      return showChanged(published.id, published.revision, "公開しました");
    case "ValidationErrors":
      return { error: publishErrorMessage(published.errors) };
    case "RevisionConflictError":
      refresh();
      return { error: REVISION_CONFLICT };
    case "GrantDeckNotFoundError":
      refresh();
      return {};
    case "ForbiddenError":
      return { error: FORBIDDEN };
  }
}

export async function retireGrantDeck(
  _previous: Notice,
  form: FormData,
): Promise<Notice> {
  const deck = target(form);
  if (deck === undefined) {
    return { error: INVALID_TARGET };
  }

  const result = await callCore(retireGrantDeckMutation, { input: deck });
  if (!result.ok) {
    return { error: CORE_UNAVAILABLE };
  }

  const retired = result.data.retireGrantDeck;
  switch (retired.__typename) {
    case "RetireGrantDeckSuccess":
      return showChanged(retired.id, retired.revision, "使用不可にしました");
    case "InvalidGrantDeckStatusTransitionError":
      refresh();
      return { error: INVALID_STATUS_TRANSITION };
    case "RevisionConflictError":
      refresh();
      return { error: REVISION_CONFLICT };
    case "GrantDeckNotFoundError":
      refresh();
      return {};
    case "ForbiddenError":
      return { error: FORBIDDEN };
  }
}
