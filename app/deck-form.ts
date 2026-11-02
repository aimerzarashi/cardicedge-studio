import type { PublishProblem } from "./boards/publish-problem";
import { cardErrorMessage, formErrorMessage } from "./messages";

// プリセットデッキ・スターターデッキ・NPC のデッキの画面で共通の、フォームの受け渡し

// 操作した結果、画面で知らせること
export type Notice = { status?: string; error?: string };

// 公開・使用不可にするボタンの結果。公開できなかったボードは、理由の一覧を、画面で見た版（revision）に結びつけて返す
export type PublishState = Notice & {
  revision?: number;
  problems?: PublishProblem[];
};

// プリセットデッキから写して登録するボタンの結果
export type RegisterFromPresetDeckState = {
  // 登録できたが、詳細に反映されるのを待ちきれなかったときの、詳細の ID
  registeredId?: string;
  error?: string;
};

// 入力した値と誤りは、画面で見た版（revision）に結びつける。ほかの操作で版が変わった後は、古い版で入力した値を残さない
export type Kept = { revision?: number };

export type RenameDeckState = Notice &
  Kept & {
    // 誤りのときに入力欄に残す値（無ければ今の名前を入れる）
    value?: string;
    nameError?: string;
  };

export type SetCardCountsState = Notice &
  Kept & {
    // 誤りのときに入力欄に残す値（カードの ID ごと。無ければ今の枚数を入れる）
    counts?: Record<string, string>;
    // カードごとの誤り（カードの ID ごと）
    cardErrors?: Record<string, string>;
  };

// 操作の対象（どのデッキの、画面で見たどの版か）は、画面が隠し項目で送る
export function target(
  form: FormData,
): { id: string; revision: number } | undefined {
  const id = form.get("id");
  const revision = Number(form.get("revision"));
  if (typeof id !== "string" || !Number.isInteger(revision)) {
    return undefined;
  }
  return { id, revision };
}

// 枚数の入力欄は count.<カードの ID>、画面で見た枚数は shown.<カードの ID> で送る
const COUNT_PREFIX = "count.";
const SHOWN_PREFIX = "shown.";

type ParsedCounts =
  | { kind: "invalid"; state: SetCardCountsState }
  | { kind: "unchanged" }
  | {
      kind: "changed";
      counts: Record<string, string>;
      changes: { cardId: string; count: number }[];
    };

export function parseCardCounts(
  form: FormData,
  revision: number,
): ParsedCounts {
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
    return { kind: "invalid", state: { revision, counts, cardErrors } };
  }
  if (changes.length === 0) {
    return { kind: "unchanged" };
  }
  return { kind: "changed", counts, changes };
}

type CardCountsError = {
  __typename: string;
  field: string;
  min?: number;
  max?: number;
};

// core の項目名は送った一覧の位置（cards.<番号>.count 等）で返るため、位置からカードに戻す
export function cardCountsErrors(
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
