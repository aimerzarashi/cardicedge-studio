import type { Page } from "@playwright/test";
import {
  npcDeckRevisionQuery,
  publishNpcDeckMutation,
  registerNpcDeckMutation,
  setNpcDeckCardCountsMutation,
} from "@/app/npc-decks/operations";
import { callCore, expectSuccess, untilReached } from "./core";
import { createTenCreatures } from "./starter-deck";

// 確かめたいことの前準備として NPC のデッキを入れる道具。画面で空から登録する流れは npc-decks.spec.ts で確かめている。
// ログインしてから呼ぶ。投影に届くまで待つため、返した URL をすぐ開ける
async function untilNpcDeckReached(page: Page, id: string, revision: number) {
  await untilReached(`NPC のデッキ ${id} が詳細に届く`, async () => {
    const data = await callCore(page, npcDeckRevisionQuery, { id });
    return (
      data.npcDeck.__typename === "NpcDeck" && data.npcDeck.revision >= revision
    );
  });
}

async function registerNpcDeckByCore(page: Page, name: string) {
  const data = await callCore(page, registerNpcDeckMutation, {
    input: { name },
  });
  expectSuccess(data.registerNpcDeck, "RegisterNpcDeckSuccess");
  return data.registerNpcDeck;
}

// 空の NPC のデッキ（準備中）を登録して、詳細の URL（パス）を返す
export async function createNpcDeck(page: Page, name: string): Promise<string> {
  const deck = await registerNpcDeckByCore(page, name);
  await untilNpcDeckReached(page, deck.id, deck.revision);
  return `/npc-decks/${deck.id}`;
}

// 合計がちょうど 40 枚の NPC のデッキ（4 枚ずつ 10 種類の公開中のクリーチャー）を入れ、詳細の URL を返す
export async function createFullNpcDeck(
  page: Page,
  name: string,
): Promise<string> {
  const { cardIds } = await createTenCreatures(page);
  const deck = await registerNpcDeckByCore(page, name);
  const data = await callCore(page, setNpcDeckCardCountsMutation, {
    input: {
      id: deck.id,
      revision: deck.revision,
      cards: cardIds.map((cardId) => ({ cardId, count: 4 })),
    },
  });
  expectSuccess(data.setNpcDeckCardCounts, "SetNpcDeckCardCountsSuccess");
  await untilNpcDeckReached(page, deck.id, data.setNpcDeckCardCounts.revision);
  return `/npc-decks/${deck.id}`;
}

// 公開中の NPC のデッキ（40 枚）を入れ、公開用の ID を返す。NPC のアバターに割り当てる前準備に使う
export async function createPublishedNpcDeck(
  page: Page,
  name: string,
): Promise<string> {
  const id = (await createFullNpcDeck(page, name)).replace("/npc-decks/", "");
  const detail = await callCore(page, npcDeckRevisionQuery, { id });
  expectSuccess(detail.npcDeck, "NpcDeck");
  const data = await callCore(page, publishNpcDeckMutation, {
    input: { id, revision: detail.npcDeck.revision },
  });
  expectSuccess(data.publishNpcDeck, "PublishNpcDeckSuccess");
  await untilNpcDeckReached(page, id, data.publishNpcDeck.revision);
  return id;
}
