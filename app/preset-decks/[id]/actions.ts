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
  INVALID_TARGET,
  NAME_ALREADY_IN_USE,
  NOT_REFLECTED,
  nameErrorMessage,
  REVISION_CONFLICT,
} from "../../messages";
import { waitPresetDeck } from "../wait-preset-deck";

const renamePresetDeckMutation = graphql(`
  mutation RenamePresetDeck($input: RenamePresetDeckInput!) {
    renamePresetDeck(input: $input) {
      __typename
      ... on RenamePresetDeckSuccess {
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

const setPresetDeckCardCountsMutation = graphql(`
  mutation SetPresetDeckCardCounts($input: SetPresetDeckCardCountsInput!) {
    setPresetDeckCardCounts(input: $input) {
      __typename
      ... on SetPresetDeckCardCountsSuccess {
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

const deletePresetDeckMutation = graphql(`
  mutation DeletePresetDeck($input: DeletePresetDeckInput!) {
    deletePresetDeck(input: $input) {
      __typename
    }
  }
`);

// 操作の結果の revision が詳細に届いてから出し直す（届く前に出し直すと、古い revision のまま次の操作をしてしまう）
async function showChanged(
  id: string,
  revision: number,
  status: string,
): Promise<Notice> {
  const reached = await waitPresetDeck(id, revision);
  refresh();
  return reached === "reached" ? { status } : { status: NOT_REFLECTED };
}

export async function renamePresetDeck(
  _previous: RenameDeckState,
  form: FormData,
): Promise<RenameDeckState> {
  const deck = target(form);
  const name = form.get("name");
  if (deck === undefined || typeof name !== "string") {
    return { error: INVALID_TARGET };
  }

  const result = await callCore(renamePresetDeckMutation, {
    input: { ...deck, name },
  });
  if (!result.ok) {
    return { revision: deck.revision, value: name, error: CORE_UNAVAILABLE };
  }

  const renamed = result.data.renamePresetDeck;
  switch (renamed.__typename) {
    case "RenamePresetDeckSuccess":
      return showChanged(renamed.id, renamed.revision, "名前を変えました");
    case "ValidationErrors":
      return {
        revision: deck.revision,
        value: name,
        nameError: nameErrorMessage(renamed.errors),
      };
    case "PresetDeckNameAlreadyInUseError":
      return {
        revision: deck.revision,
        value: name,
        nameError: NAME_ALREADY_IN_USE,
      };
    case "RevisionConflictError":
      refresh();
      return { error: REVISION_CONFLICT };
    // 画面を出し直すと「見つからない」になる
    case "PresetDeckNotFoundError":
      refresh();
      return {};
    case "ForbiddenError":
      return { revision: deck.revision, value: name, error: FORBIDDEN };
  }
}

export async function setPresetDeckCardCounts(
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

  const result = await callCore(setPresetDeckCardCountsMutation, {
    input: { ...deck, cards: changes },
  });
  if (!result.ok) {
    return { revision: deck.revision, counts, error: CORE_UNAVAILABLE };
  }

  const changed = result.data.setPresetDeckCardCounts;
  switch (changed.__typename) {
    case "SetPresetDeckCardCountsSuccess":
      return showChanged(changed.id, changed.revision, "枚数を保存しました");
    case "ValidationErrors":
      return {
        revision: deck.revision,
        counts,
        ...cardCountsErrors(changed.errors, changes),
      };
    case "RevisionConflictError":
      refresh();
      return { error: REVISION_CONFLICT };
    case "PresetDeckNotFoundError":
      refresh();
      return {};
    case "ForbiddenError":
      return { revision: deck.revision, counts, error: FORBIDDEN };
  }
}

export async function deletePresetDeck(
  _previous: Notice,
  form: FormData,
): Promise<Notice> {
  const deck = target(form);
  if (deck === undefined) {
    return { error: INVALID_TARGET };
  }

  const result = await callCore(deletePresetDeckMutation, { input: deck });
  if (!result.ok) {
    return { error: CORE_UNAVAILABLE };
  }

  const deleted = result.data.deletePresetDeck;
  switch (deleted.__typename) {
    // 一覧は投影から読むため、移った直後は少し残ることがある。消えるまでは待たない（消えたことは
    // 「詳細が見つからない」でしか確かめられず、そこまでして待つほどの害が無い）
    case "DeletePresetDeckSuccess":
      return redirect("/preset-decks");
    case "RevisionConflictError":
      refresh();
      return { error: REVISION_CONFLICT };
    case "PresetDeckNotFoundError":
      refresh();
      return {};
    case "ForbiddenError":
      return { error: FORBIDDEN };
  }
}
