"use server";

import { graphql } from "@/graphql";
import { callCore } from "@/lib/core";

const registerItemMutation = graphql(`
  mutation RegisterItem($input: RegisterItemInput!) {
    registerItem(input: $input) {
      __typename
      ... on RegisterItemSuccess {
        item {
          name
        }
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

export type RegisterItemState = {
  // 入力欄に入れておく値（誤りのときは入力した値を残し、登録できたら空にする）
  value: string;
  registeredName?: string;
  // 入力欄の誤り
  nameError?: string;
  // 入力欄に結びつかない誤り
  error?: string;
};

export async function registerItem(
  _previous: RegisterItemState,
  form: FormData,
): Promise<RegisterItemState> {
  // 中身の正誤は core が判定するため、ここでは形（文字列であること）だけを確かめる
  const name = form.get("name");
  if (typeof name !== "string") {
    return { value: "", nameError: "カード名を入力してください" };
  }

  const result = await callCore(registerItemMutation, {
    input: { name },
  });
  if (!result.ok) {
    return {
      value: name,
      error: "core に接続できません。時間をおいてもう一度登録してください",
    };
  }

  const registered = result.data.registerItem;
  switch (registered.__typename) {
    case "RegisterItemSuccess":
      return { value: "", registeredName: registered.item.name };
    case "ValidationErrors":
      return { value: name, nameError: nameErrorMessage(registered.errors) };
    case "CardNameAlreadyInUseError":
      return {
        value: name,
        nameError:
          "このカード名はすでに使われています。全角・半角や大文字・小文字の違いは、同じ名前とみなします",
      };
    case "ForbiddenError":
      return { value: name, error: "この操作をする権限がありません" };
  }
}

// core は文言を返さず、理由の型と値だけを返すため、文言はここで作る
function nameErrorMessage(
  errors: { __typename: string; max?: number }[],
): string {
  return errors
    .map((error) =>
      error.__typename === "FieldTooLong"
        ? `カード名は ${error.max} 文字以内で入力してください`
        : "カード名を入力してください",
    )
    .join("。");
}
