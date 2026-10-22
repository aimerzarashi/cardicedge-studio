"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { graphql } from "@/graphql";
import { callCore } from "@/lib/core";
import { waitStarterDeckSet } from "../wait-starter-deck-set";

const setStarterDeckSetMutation = graphql(`
  mutation SetStarterDeckSet($input: SetStarterDeckSetInput!) {
    setStarterDeckSet(input: $input) {
      __typename
      ... on SetStarterDeckSetSuccess {
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
          ... on FieldTotalMismatch {
            required
          }
        }
      }
    }
  }
`);

export type SetStarterDeckSetState = {
  // 選んだものの順番（presetDeckIds.<番号>）ごとの誤り
  deckErrors?: Record<number, string>;
  // 選んだものに結びつかない誤り
  error?: string;
  // 誤りを出したときの画面の版（版が変わったら残さない）
  revision?: number;
};

export async function setStarterDeckSet(
  _previous: SetStarterDeckSetState,
  form: FormData,
): Promise<SetStarterDeckSetState> {
  // 中身の正誤は core が判定するため、ここでは形（整数・文字列であること）だけを確かめる
  const revision = Number(form.get("revision"));
  const presetDeckIds = form.getAll("presetDeckId");
  if (
    !Number.isInteger(revision) ||
    presetDeckIds.some((id) => typeof id !== "string")
  ) {
    return {
      error: "画面が古くなっています。再読み込みしてから操作してください",
    };
  }

  const result = await callCore(setStarterDeckSetMutation, {
    input: { revision, presetDeckIds: presetDeckIds as string[] },
  });
  if (!result.ok) {
    return {
      revision,
      error: "core に接続できません。時間をおいてもう一度操作してください",
    };
  }

  const set = result.data.setStarterDeckSet;
  switch (set.__typename) {
    case "SetStarterDeckSetSuccess":
      if ((await waitStarterDeckSet(set.revision)) === "timeout") {
        return {
          error:
            "設定しました。反映に時間がかかっています。しばらくしてからスターターデッキの画面を開いてください",
        };
      }
      return redirect("/starter-deck-set");
    case "ValidationErrors":
      return { revision, ...validationErrors(set.errors) };
    case "RevisionConflictError":
      refresh();
      return {
        error:
          "ほかの操作で変わっていたため、設定しませんでした。最新の状態を表示しています",
      };
    case "ForbiddenError":
      return { revision, error: "この操作をする権限がありません" };
  }
}

type FieldError = {
  __typename: string;
  field: string;
  min?: number;
  max?: number;
  required?: number;
};

// core の項目名は送った一覧の位置（presetDeckIds.<番号>）で返るため、位置ごとに分ける
function validationErrors(
  errors: FieldError[],
): Pick<SetStarterDeckSetState, "deckErrors" | "error"> {
  const deckErrors: Record<number, string> = {};
  const formErrors: string[] = [];
  for (const error of errors) {
    const index = /^presetDeckIds\.(\d+)$/.exec(error.field)?.[1];
    if (index === undefined) {
      formErrors.push(formErrorMessage(error));
    } else {
      deckErrors[Number(index)] = deckErrorMessage(error);
    }
  }
  return {
    deckErrors,
    ...(formErrors.length > 0 && { error: formErrors.join("。") }),
  };
}

function formErrorMessage(error: FieldError): string {
  if (error.__typename === "FieldOutOfRange") {
    return error.min === error.max
      ? `プリセットデッキをちょうど ${error.min} つ選んでください`
      : `プリセットデッキを ${error.min}〜${error.max} つ選んでください`;
  }
  return "選んだプリセットデッキが正しくありません";
}

function deckErrorMessage(error: FieldError): string {
  switch (error.__typename) {
    case "FieldTotalMismatch":
      return `合計がちょうど ${error.required} 枚のプリセットデッキを選んでください`;
    case "FieldDuplicated":
      return "同じプリセットデッキが 2 回選ばれています";
    case "FieldNotFound":
      return "このプリセットデッキは見つかりません";
    default:
      return "このプリセットデッキは選べません";
  }
}
