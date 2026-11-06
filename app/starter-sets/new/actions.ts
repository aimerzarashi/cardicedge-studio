"use server";

import { redirect } from "next/navigation";
import { registerStarterSetMutation } from "@/app/starter-sets/operations";
import { callCore } from "@/lib/core";
import {
  FORBIDDEN,
  NAME_ALREADY_IN_USE,
  nameErrorMessage,
} from "../../messages";
import { waitStarterSet } from "../wait-starter-set";

export type RegisterStarterSetState = {
  // 入力欄に入れておく値（誤りのときは入力した値を残す）
  value: string;
  // 登録できたが、詳細に反映されるのを待ちきれなかったときの、詳細の ID
  registeredId?: string;
  // 入力欄の誤り
  nameError?: string;
  // 入力欄に結びつかない誤り
  error?: string;
};

export async function registerStarterSet(
  _previous: RegisterStarterSetState,
  form: FormData,
): Promise<RegisterStarterSetState> {
  // 中身の正誤は core が判定するため、ここでは形（文字列であること）だけを確かめる
  const name = form.get("name");
  if (typeof name !== "string") {
    return { value: "", nameError: "名前を入力してください" };
  }

  const result = await callCore(registerStarterSetMutation, {
    input: { name },
  });
  if (!result.ok) {
    return {
      value: name,
      error: "core に接続できません。時間をおいてもう一度登録してください",
    };
  }

  const registered = result.data.registerStarterSet;
  switch (registered.__typename) {
    case "RegisterStarterSetSuccess":
      if (
        (await waitStarterSet(registered.id, registered.revision)) === "timeout"
      ) {
        return { value: "", registeredId: registered.id };
      }
      return redirect(`/starter-sets/${registered.id}`);
    case "ValidationErrors":
      return { value: name, nameError: nameErrorMessage(registered.errors) };
    case "StarterSetNameAlreadyInUseError":
      return { value: name, nameError: NAME_ALREADY_IN_USE };
    case "ForbiddenError":
      return { value: name, error: FORBIDDEN };
  }
}
