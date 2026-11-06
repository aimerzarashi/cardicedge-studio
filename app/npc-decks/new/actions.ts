"use server";

import { redirect } from "next/navigation";
import { registerNpcDeckMutation } from "@/app/npc-decks/operations";
import { graphql } from "@/graphql";
import { callCore } from "@/lib/core";
import type { RegisterFromPresetDeckState } from "../../deck-form";
import {
  CORE_UNAVAILABLE,
  FORBIDDEN,
  INVALID_TARGET,
  NAME_ALREADY_IN_USE,
  nameErrorMessage,
} from "../../messages";
import { waitNpcDeck } from "../wait-npc-deck";

export type RegisterNpcDeckState = {
  // 入力欄に入れておく値（誤りのときは入力した値を残す）
  value: string;
  // 登録できたが、詳細に反映されるのを待ちきれなかったときの、詳細の ID
  registeredId?: string;
  // 入力欄の誤り
  nameError?: string;
  // 入力欄に結びつかない誤り
  error?: string;
};

export async function registerNpcDeck(
  _previous: RegisterNpcDeckState,
  form: FormData,
): Promise<RegisterNpcDeckState> {
  // 中身の正誤は core が判定するため、ここでは形（文字列であること）だけを確かめる
  const name = form.get("name");
  if (typeof name !== "string") {
    return { value: "", nameError: "名前を入力してください" };
  }

  const result = await callCore(registerNpcDeckMutation, {
    input: { name },
  });
  if (!result.ok) {
    return {
      value: name,
      error: "core に接続できません。時間をおいてもう一度登録してください",
    };
  }

  const registered = result.data.registerNpcDeck;
  switch (registered.__typename) {
    case "RegisterNpcDeckSuccess":
      if (
        (await waitNpcDeck(registered.id, registered.revision)) === "timeout"
      ) {
        return { value: "", registeredId: registered.id };
      }
      return redirect(`/npc-decks/${registered.id}`);
    case "ValidationErrors":
      return { value: name, nameError: nameErrorMessage(registered.errors) };
    case "NpcDeckNameAlreadyInUseError":
      return {
        value: name,
        nameError: NAME_ALREADY_IN_USE,
      };
    case "ForbiddenError":
      return { value: name, error: FORBIDDEN };
  }
}

const registerNpcDeckFromPresetDeckMutation = graphql(`
  mutation RegisterNpcDeckFromPresetDeck(
    $input: RegisterNpcDeckFromPresetDeckInput!
  ) {
    registerNpcDeckFromPresetDeck(input: $input) {
      __typename
      ... on RegisterNpcDeckFromPresetDeckSuccess {
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

export async function registerNpcDeckFromPresetDeck(
  _previous: RegisterFromPresetDeckState,
  form: FormData,
): Promise<RegisterFromPresetDeckState> {
  // 中身の正誤は core が判定するため、ここでは形（文字列であること）だけを確かめる
  const presetDeckId = form.get("presetDeckId");
  const name = form.get("name");
  if (typeof presetDeckId !== "string" || typeof name !== "string") {
    return { error: INVALID_TARGET };
  }

  const result = await callCore(registerNpcDeckFromPresetDeckMutation, {
    input: { presetDeckId, name },
  });
  if (!result.ok) {
    return { value: name, error: CORE_UNAVAILABLE };
  }

  const registered = result.data.registerNpcDeckFromPresetDeck;
  switch (registered.__typename) {
    case "RegisterNpcDeckFromPresetDeckSuccess":
      if (
        (await waitNpcDeck(registered.id, registered.revision)) === "timeout"
      ) {
        return { registeredId: registered.id };
      }
      return redirect(`/npc-decks/${registered.id}`);
    case "ValidationErrors":
      return { value: name, nameError: nameErrorMessage(registered.errors) };
    case "NpcDeckNameAlreadyInUseError":
      return { value: name, nameError: NAME_ALREADY_IN_USE };
    case "PresetDeckNotFoundError":
      return { value: name, error: "このプリセットデッキは見つかりません" };
    case "ForbiddenError":
      return { value: name, error: FORBIDDEN };
  }
}
