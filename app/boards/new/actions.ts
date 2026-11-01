"use server";

import { redirect } from "next/navigation";
import { graphql } from "@/graphql";
import { callCore } from "@/lib/core";
import {
  FORBIDDEN,
  NAME_ALREADY_IN_USE,
  nameErrorMessage,
} from "../../messages";
import { waitBoard } from "../wait-board";

const registerBoardMutation = graphql(`
  mutation RegisterBoard($input: RegisterBoardInput!) {
    registerBoard(input: $input) {
      __typename
      ... on RegisterBoardSuccess {
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

export type RegisterBoardState = {
  // 入力欄に入れておく値（誤りのときは入力した値を残す）
  value: string;
  // 登録できたが、詳細に反映されるのを待ちきれなかったときの、詳細の ID
  registeredId?: string;
  // 入力欄の誤り
  nameError?: string;
  // 入力欄に結びつかない誤り
  error?: string;
};

export async function registerBoard(
  _previous: RegisterBoardState,
  form: FormData,
): Promise<RegisterBoardState> {
  // 中身の正誤は core が判定するため、ここでは形（文字列であること）だけを確かめる
  const name = form.get("name");
  if (typeof name !== "string") {
    return { value: "", nameError: "名前を入力してください" };
  }

  const result = await callCore(registerBoardMutation, { input: { name } });
  if (!result.ok) {
    return {
      value: name,
      error: "core に接続できません。時間をおいてもう一度登録してください",
    };
  }

  const registered = result.data.registerBoard;
  switch (registered.__typename) {
    case "RegisterBoardSuccess":
      if ((await waitBoard(registered.id, registered.revision)) === "timeout") {
        return { value: "", registeredId: registered.id };
      }
      return redirect(`/boards/${registered.id}`);
    case "ValidationErrors":
      return { value: name, nameError: nameErrorMessage(registered.errors) };
    case "BoardNameAlreadyInUseError":
      return { value: name, nameError: NAME_ALREADY_IN_USE };
    case "ForbiddenError":
      return { value: name, error: FORBIDDEN };
  }
}
