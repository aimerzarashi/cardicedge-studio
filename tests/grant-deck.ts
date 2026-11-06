import type { Page } from "@playwright/test";
import {
  grantDeckRevisionQuery,
  publishGrantDeckMutation,
  registerGrantDeckMutation,
  setGrantDeckCardCountsMutation,
} from "@/app/grant-decks/operations";
import { createPublishedCreatures } from "./card";
import { callCore, expectSuccess, untilReached } from "./core";
import { expect } from "./fixtures";
import { section } from "./preset-deck";

// 空から登録すると、詳細に反映されてから詳細の画面に移る
export async function registerGrantDeck(page: Page, name: string) {
  await page.goto("/grant-decks/new");
  const empty = section(page, "空から作る");
  await empty.getByLabel("名前").fill(name);
  await empty.getByRole("button", { name: "登録する" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(name);
}

// ここから下は、確かめたいことの前準備として配布デッキを入れる道具。画面で空から登録する流れは grant-decks.spec.ts で確かめている。
// ログインしてから呼ぶ。投影に届くまで待つため、返した URL をすぐ開ける
async function untilGrantDeckReached(page: Page, id: string, revision: number) {
  await untilReached(`配布デッキ ${id} が詳細に届く`, async () => {
    const data = await callCore(page, grantDeckRevisionQuery, { id });
    return (
      data.grantDeck.__typename === "GrantDeck" &&
      data.grantDeck.revision >= revision
    );
  });
}

async function registerGrantDeckByCore(page: Page, name: string) {
  const data = await callCore(page, registerGrantDeckMutation, {
    input: { name },
  });
  expectSuccess(data.registerGrantDeck, "RegisterGrantDeckSuccess");
  return data.registerGrantDeck;
}

// 空の配布デッキ（準備中）を登録して、詳細の URL（パス）を返す
export async function createGrantDeck(
  page: Page,
  name: string,
): Promise<string> {
  const deck = await registerGrantDeckByCore(page, name);
  await untilGrantDeckReached(page, deck.id, deck.revision);
  return `/grant-decks/${deck.id}`;
}

// 4 枚ずつ 10 種類の公開中のクリーチャー（合計 40 枚）を作る。名前は共通の接尾辞 id を持つ
export async function createTenCreatures(page: Page) {
  const id = crypto.randomUUID().slice(0, 8);
  const names = Array.from({ length: 10 }, (_, i) => `c${i}-${id}`);
  const created = await createPublishedCreatures(page, names, id);
  return { id, names, cardIds: created.map((card) => card.id) };
}

// 合計がちょうど 40 枚の配布デッキ（4 枚ずつ 10 種類の公開中のクリーチャー）を入れ、詳細の URL とカード名を返す
export async function createFullGrantDeck(
  page: Page,
  name: string,
): Promise<{ deckURL: string; cards: string[] }> {
  const { names, cardIds } = await createTenCreatures(page);
  const deck = await registerGrantDeckByCore(page, name);
  const data = await callCore(page, setGrantDeckCardCountsMutation, {
    input: {
      id: deck.id,
      revision: deck.revision,
      cards: cardIds.map((cardId) => ({ cardId, count: 4 })),
    },
  });
  expectSuccess(data.setGrantDeckCardCounts, "SetGrantDeckCardCountsSuccess");
  await untilGrantDeckReached(
    page,
    deck.id,
    data.setGrantDeckCardCounts.revision,
  );
  return { deckURL: `/grant-decks/${deck.id}`, cards: names };
}

// 公開中の配布デッキ（40 枚）を入れ、公開用の ID を返す。スターターセットに割り当てる前準備に使う
export async function createPublishedGrantDeck(
  page: Page,
  name: string,
): Promise<string> {
  const { deckURL } = await createFullGrantDeck(page, name);
  const id = deckURL.replace("/grant-decks/", "");
  const detail = await callCore(page, grantDeckRevisionQuery, { id });
  expectSuccess(detail.grantDeck, "GrantDeck");
  const data = await callCore(page, publishGrantDeckMutation, {
    input: { id, revision: detail.grantDeck.revision },
  });
  expectSuccess(data.publishGrantDeck, "PublishGrantDeckSuccess");
  await untilGrantDeckReached(page, id, data.publishGrantDeck.revision);
  return id;
}
