"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { graphql } from "@/graphql";
import { callCore } from "@/lib/core";
import {
  CORE_UNAVAILABLE,
  FORBIDDEN,
  NAME_ALREADY_IN_USE,
  nameErrorMessage,
} from "../messages";
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

const REVISION_CONFLICT =
  "ほかの操作で変わっていたため、変えませんでした。最新の状態を表示しています";
const NOT_REFLECTED =
  "反映に時間がかかっています。しばらくしてから再読み込みしてください";
const INVALID_TARGET =
  "画面が古くなっています。再読み込みしてから操作してください";

// 操作した結果、画面で知らせること
export type Notice = { status?: string; error?: string };

// 操作の対象（どのプリセットデッキの、画面で見たどの版か）は、画面が隠し項目で送る
function target(form: FormData): { id: string; revision: number } | undefined {
  const id = form.get("id");
  const revision = Number(form.get("revision"));
  if (typeof id !== "string" || !Number.isInteger(revision)) {
    return undefined;
  }
  return { id, revision };
}

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

// 入力した値と誤りは、画面で見た版（revision）に結びつける。ほかの操作で版が変わった後は、古い版で入力した値を残さない
type Kept = { revision?: number };

export type RenamePresetDeckState = Notice &
  Kept & {
    // 誤りのときに入力欄に残す値（無ければ今の名前を入れる）
    value?: string;
    nameError?: string;
  };

export async function renamePresetDeck(
  _previous: RenamePresetDeckState,
  form: FormData,
): Promise<RenamePresetDeckState> {
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

export type SetCardCountsState = Notice &
  Kept & {
    // 誤りのときに入力欄に残す値（カードの ID ごと。無ければ今の枚数を入れる）
    counts?: Record<string, string>;
    // カードごとの誤り（カードの ID ごと）
    cardErrors?: Record<string, string>;
  };

// 枚数の入力欄は count.<カードの ID>、画面で見た枚数は shown.<カードの ID> で送る
const COUNT_PREFIX = "count.";
const SHOWN_PREFIX = "shown.";

export async function setPresetDeckCardCounts(
  _previous: SetCardCountsState,
  form: FormData,
): Promise<SetCardCountsState> {
  const deck = target(form);
  if (deck === undefined) {
    return { error: INVALID_TARGET };
  }

  const counts: Record<string, string> = {};
  const cardErrors: Record<string, string> = {};
  // 変えたカードだけを送る（core は変えないカードを含めなくてよく、一覧の件数にも上限がある）
  const changes: { cardId: string; count: number }[] = [];
  for (const [key, value] of form) {
    if (!key.startsWith(COUNT_PREFIX) || typeof value !== "string") {
      continue;
    }
    const cardId = key.slice(COUNT_PREFIX.length);
    counts[cardId] = value;
    if (value === form.get(`${SHOWN_PREFIX}${cardId}`)) {
      continue;
    }
    // 範囲は core が判定するため、ここでは整数であることだけを確かめる
    const count = Number(value);
    if (value.trim() === "" || !Number.isInteger(count)) {
      cardErrors[cardId] = "枚数は整数で入力してください";
      continue;
    }
    changes.push({ cardId, count });
  }
  if (Object.keys(cardErrors).length > 0) {
    return { revision: deck.revision, counts, cardErrors };
  }
  if (changes.length === 0) {
    return { status: "変えた枚数がありません" };
  }

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

type CardCountsError = {
  __typename: string;
  field: string;
  min?: number;
  max?: number;
};

// core の項目名は送った一覧の位置（cards.<番号>.count 等）で返るため、位置からカードに戻す
function cardCountsErrors(
  errors: CardCountsError[],
  changes: { cardId: string }[],
): Pick<SetCardCountsState, "error" | "cardErrors"> {
  const cardErrors: Record<string, string> = {};
  const formErrors: string[] = [];
  for (const error of errors) {
    const index = /^cards\.(\d+)\./.exec(error.field)?.[1];
    const cardId =
      index === undefined ? undefined : changes[Number(index)]?.cardId;
    if (cardId === undefined) {
      formErrors.push(formErrorMessage(error));
    } else {
      cardErrors[cardId] = cardErrorMessage(error);
    }
  }
  return {
    ...(formErrors.length > 0 && { error: formErrors.join("。") }),
    cardErrors,
  };
}

function formErrorMessage(error: CardCountsError): string {
  switch (error.__typename) {
    case "FieldTotalTooLarge":
      return `枚数の合計は ${error.max} 枚以内にしてください`;
    case "FieldOutOfRange":
      return `一度に変えられるカードは ${error.max} 種類までです`;
    default:
      return "入力が正しくありません";
  }
}

function cardErrorMessage(error: CardCountsError): string {
  switch (error.__typename) {
    case "FieldOutOfRange":
      return `枚数は ${error.min}〜${error.max} 枚にしてください`;
    case "FieldNotFound":
      return "このカードは見つかりません";
    case "FieldDuplicated":
      return "同じカードが 2 回入っています";
    default:
      return "入力が正しくありません";
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
