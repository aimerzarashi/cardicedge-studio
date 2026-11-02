import type { Page } from "@playwright/test";
import { callCore, expectSuccess, untilReached } from "./core";
import { createPublishedNpcDeck } from "./npc-deck";

// 確かめたいことの前準備として NPC のアバターを入れる道具。画面で登録する流れは npc-avatars.spec.ts で確かめている。
// ログインしてから呼ぶ。投影に届くまで待つため、返した URL をすぐ開ける

// NPC のアバター（準備中）を登録して、詳細の URL（パス）を返す
export async function createNpcAvatar(
  page: Page,
  name: string,
): Promise<string> {
  const data = await callCore(
    page,
    `mutation($input: RegisterNpcAvatarInput!) {
      registerNpcAvatar(input: $input) {
        __typename
        ... on RegisterNpcAvatarSuccess { id revision }
      }
    }`,
    { input: { name } },
  );
  expectSuccess(data.registerNpcAvatar, "RegisterNpcAvatarSuccess");
  const { id, revision } = data.registerNpcAvatar as {
    id: string;
    revision: number;
  };
  await untilReached(`NPC のアバター ${id} が詳細に届く`, async () => {
    const reached = await callCore(
      page,
      `query($id: UUID!) {
        npcAvatar(id: $id) { __typename ... on NpcAvatar { revision } }
      }`,
      { id },
    );
    return (
      reached.npcAvatar.__typename === "NpcAvatar" &&
      reached.npcAvatar.revision >= revision
    );
  });
  return `/npc-avatars/${id}`;
}

// 公開中の NPC のデッキを 1 つ割り当てた NPC のアバター（準備中。公開できる）を入れ、詳細の URL（パス）を返す
export async function createPublishableNpcAvatar(
  page: Page,
  name: string,
): Promise<string> {
  const deckId = await createPublishedNpcDeck(page, `${name}のデッキ`);
  const avatarURL = await createNpcAvatar(page, name);
  const id = avatarURL.replace("/npc-avatars/", "");
  const detail = await callCore(
    page,
    `query($id: UUID!) {
      npcAvatar(id: $id) { __typename ... on NpcAvatar { revision } }
    }`,
    { id },
  );
  const data = await callCore(
    page,
    `mutation($input: SetNpcAvatarDecksInput!) {
      setNpcAvatarDecks(input: $input) {
        __typename
        ... on SetNpcAvatarDecksSuccess { revision }
      }
    }`,
    { input: { id, revision: detail.npcAvatar.revision, deckIds: [deckId] } },
  );
  expectSuccess(data.setNpcAvatarDecks, "SetNpcAvatarDecksSuccess");
  const revision = data.setNpcAvatarDecks.revision;
  await untilReached(`NPC のアバター ${id} が詳細に届く`, async () => {
    const reached = await callCore(
      page,
      `query($id: UUID!) {
        npcAvatar(id: $id) { __typename ... on NpcAvatar { revision } }
      }`,
      { id },
    );
    return (
      reached.npcAvatar.__typename === "NpcAvatar" &&
      reached.npcAvatar.revision >= revision
    );
  });
  return avatarURL;
}
