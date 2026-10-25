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
  nameErrorMessage,
  publishErrorMessage,
  REVISION_CONFLICT,
  STARTER_DECK_NOT_DRAFT,
  starterDeckLimitReachedMessage,
} from "../../messages";
import { waitStarterDeck } from "../wait-starter-deck";

const renameStarterDeckMutation = graphql(`
  mutation RenameStarterDeck($input: RenameStarterDeckInput!) {
    renameStarterDeck(input: $input) {
      __typename
      ... on RenameStarterDeckSuccess {
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

const setStarterDeckCardCountsMutation = graphql(`
  mutation SetStarterDeckCardCounts($input: SetStarterDeckCardCountsInput!) {
    setStarterDeckCardCounts(input: $input) {
      __typename
      ... on SetStarterDeckCardCountsSuccess {
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

const deleteStarterDeckMutation = graphql(`
  mutation DeleteStarterDeck($input: DeleteStarterDeckInput!) {
    deleteStarterDeck(input: $input) {
      __typename
    }
  }
`);

const publishStarterDeckMutation = graphql(`
  mutation PublishStarterDeck($input: PublishStarterDeckInput!) {
    publishStarterDeck(input: $input) {
      __typename
      ... on PublishStarterDeckSuccess {
        id
        revision
      }
      ... on StarterDeckLimitReachedError {
        max
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

const retireStarterDeckMutation = graphql(`
  mutation RetireStarterDeck($input: RetireStarterDeckInput!) {
    retireStarterDeck(input: $input) {
      __typename
      ... on RetireStarterDeckSuccess {
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
  const reached = await waitStarterDeck(id, revision);
  refresh();
  return reached === "reached" ? { status } : { status: NOT_REFLECTED };
}

export async function renameStarterDeck(
  _previous: RenameDeckState,
  form: FormData,
): Promise<RenameDeckState> {
  const deck = target(form);
  const name = form.get("name");
  if (deck === undefined || typeof name !== "string") {
    return { error: INVALID_TARGET };
  }

  const result = await callCore(renameStarterDeckMutation, {
    input: { ...deck, name },
  });
  if (!result.ok) {
    return { revision: deck.revision, value: name, error: CORE_UNAVAILABLE };
  }

  const renamed = result.data.renameStarterDeck;
  switch (renamed.__typename) {
    case "RenameStarterDeckSuccess":
      return showChanged(renamed.id, renamed.revision, "名前を変えました");
    case "ValidationErrors":
      return {
        revision: deck.revision,
        value: name,
        nameError: nameErrorMessage(renamed.errors),
      };
    case "StarterDeckNameAlreadyInUseError":
      return {
        revision: deck.revision,
        value: name,
        nameError: NAME_ALREADY_IN_USE,
      };
    case "StarterDeckNotDraftError":
      refresh();
      return { error: STARTER_DECK_NOT_DRAFT };
    case "RevisionConflictError":
      refresh();
      return { error: REVISION_CONFLICT };
    // 画面を出し直すと「見つからない」になる
    case "StarterDeckNotFoundError":
      refresh();
      return {};
    case "ForbiddenError":
      return { revision: deck.revision, value: name, error: FORBIDDEN };
  }
}

export async function setStarterDeckCardCounts(
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

  const result = await callCore(setStarterDeckCardCountsMutation, {
    input: { ...deck, cards: changes },
  });
  if (!result.ok) {
    return { revision: deck.revision, counts, error: CORE_UNAVAILABLE };
  }

  const changed = result.data.setStarterDeckCardCounts;
  switch (changed.__typename) {
    case "SetStarterDeckCardCountsSuccess":
      return showChanged(changed.id, changed.revision, "枚数を保存しました");
    case "ValidationErrors":
      return {
        revision: deck.revision,
        counts,
        ...cardCountsErrors(changed.errors, changes),
      };
    case "StarterDeckNotDraftError":
      refresh();
      return { error: STARTER_DECK_NOT_DRAFT };
    case "RevisionConflictError":
      refresh();
      return { error: REVISION_CONFLICT };
    case "StarterDeckNotFoundError":
      refresh();
      return {};
    case "ForbiddenError":
      return { revision: deck.revision, counts, error: FORBIDDEN };
  }
}

export async function deleteStarterDeck(
  _previous: Notice,
  form: FormData,
): Promise<Notice> {
  const deck = target(form);
  if (deck === undefined) {
    return { error: INVALID_TARGET };
  }

  const result = await callCore(deleteStarterDeckMutation, { input: deck });
  if (!result.ok) {
    return { error: CORE_UNAVAILABLE };
  }

  const deleted = result.data.deleteStarterDeck;
  switch (deleted.__typename) {
    // 一覧は投影から読むため、移った直後は少し残ることがある。消えるまでは待たない（プリセットデッキと同じ）
    case "DeleteStarterDeckSuccess":
      return redirect("/starter-decks");
    case "StarterDeckNotDraftError":
      refresh();
      return { error: STARTER_DECK_NOT_DRAFT };
    case "RevisionConflictError":
      refresh();
      return { error: REVISION_CONFLICT };
    case "StarterDeckNotFoundError":
      refresh();
      return {};
    case "ForbiddenError":
      return { error: FORBIDDEN };
  }
}

export async function publishStarterDeck(
  _previous: Notice,
  form: FormData,
): Promise<Notice> {
  const deck = target(form);
  if (deck === undefined) {
    return { error: INVALID_TARGET };
  }

  const result = await callCore(publishStarterDeckMutation, { input: deck });
  if (!result.ok) {
    return { error: CORE_UNAVAILABLE };
  }

  const published = result.data.publishStarterDeck;
  switch (published.__typename) {
    case "PublishStarterDeckSuccess":
      return showChanged(published.id, published.revision, "公開しました");
    case "ValidationErrors":
      return { error: publishErrorMessage(published.errors) };
    case "StarterDeckLimitReachedError":
      return { error: starterDeckLimitReachedMessage(published.max) };
    case "RevisionConflictError":
      refresh();
      return { error: REVISION_CONFLICT };
    case "StarterDeckNotFoundError":
      refresh();
      return {};
    case "ForbiddenError":
      return { error: FORBIDDEN };
  }
}

export async function retireStarterDeck(
  _previous: Notice,
  form: FormData,
): Promise<Notice> {
  const deck = target(form);
  if (deck === undefined) {
    return { error: INVALID_TARGET };
  }

  const result = await callCore(retireStarterDeckMutation, { input: deck });
  if (!result.ok) {
    return { error: CORE_UNAVAILABLE };
  }

  const retired = result.data.retireStarterDeck;
  switch (retired.__typename) {
    case "RetireStarterDeckSuccess":
      return showChanged(retired.id, retired.revision, "使用不可にしました");
    case "InvalidStarterDeckStatusTransitionError":
      refresh();
      return { error: INVALID_STATUS_TRANSITION };
    case "RevisionConflictError":
      refresh();
      return { error: REVISION_CONFLICT };
    case "StarterDeckNotFoundError":
      refresh();
      return {};
    case "ForbiddenError":
      return { error: FORBIDDEN };
  }
}
