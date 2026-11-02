"use server";

import { redirect } from "next/navigation";
import { graphql } from "@/graphql";
import { callCore } from "@/lib/core";
import {
  FORBIDDEN,
  NAME_ALREADY_IN_USE,
  nameErrorMessage,
} from "../../messages";
import { waitNpcAvatar } from "../wait-npc-avatar";

const registerNpcAvatarMutation = graphql(`
  mutation RegisterNpcAvatar($input: RegisterNpcAvatarInput!) {
    registerNpcAvatar(input: $input) {
      __typename
      ... on RegisterNpcAvatarSuccess {
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

export type RegisterNpcAvatarState = {
  // 入力欄に入れておく値（誤りのときは入力した値を残す）
  value: string;
  // 登録できたが、詳細に反映されるのを待ちきれなかったときの、詳細の ID
  registeredId?: string;
  // 入力欄の誤り
  nameError?: string;
  // 入力欄に結びつかない誤り
  error?: string;
};

export async function registerNpcAvatar(
  _previous: RegisterNpcAvatarState,
  form: FormData,
): Promise<RegisterNpcAvatarState> {
  // 中身の正誤は core が判定するため、ここでは形（文字列であること）だけを確かめる
  const name = form.get("name");
  if (typeof name !== "string") {
    return { value: "", nameError: "名前を入力してください" };
  }

  const result = await callCore(registerNpcAvatarMutation, {
    input: { name },
  });
  if (!result.ok) {
    return {
      value: name,
      error: "core に接続できません。時間をおいてもう一度登録してください",
    };
  }

  const registered = result.data.registerNpcAvatar;
  switch (registered.__typename) {
    case "RegisterNpcAvatarSuccess":
      if (
        (await waitNpcAvatar(registered.id, registered.revision)) === "timeout"
      ) {
        return { value: "", registeredId: registered.id };
      }
      return redirect(`/npc-avatars/${registered.id}`);
    case "ValidationErrors":
      return { value: name, nameError: nameErrorMessage(registered.errors) };
    case "NpcAvatarNameAlreadyInUseError":
      return { value: name, nameError: NAME_ALREADY_IN_USE };
    case "ForbiddenError":
      return { value: name, error: FORBIDDEN };
  }
}
