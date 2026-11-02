import type { Page } from "@playwright/test";
import {
  presetDeckRevisionQuery,
  registerPresetDeckMutation,
  setPresetDeckCardCountsMutation,
} from "@/app/preset-decks/operations";
import { createPublishedCreatures } from "./card";
import { callCore, expectSuccess, untilReached } from "./core";
import { expect } from "./fixtures";

export async function registerPresetDeck(page: Page, name: string) {
  await page.goto("/preset-decks/new");
  await page.getByLabel("名前").fill(name);
  await page.getByRole("button", { name: "登録する" }).click();
}

// 登録すると、詳細に反映されてから詳細の画面に移る
export async function registerAndOpen(page: Page, name: string) {
  await registerPresetDeck(page, name);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(name);
}

export function section(page: Page, heading: string) {
  return page.getByRole("region", { name: heading });
}

// カードの一覧は投影されてから出るため、出るまで絞り込み直す
export async function searchCards(
  page: Page,
  deckURL: string,
  name: string,
  count: number,
) {
  await expect(async () => {
    await page.goto(`${deckURL}?name=${encodeURIComponent(name)}`);
    await expect(section(page, "カードを探す").locator("tbody tr")).toHaveCount(
      count,
    );
  }).toPass();
}

// ここから下は、確かめたいことの前準備としてプリセットデッキを入れる道具。画面で登録する流れは preset-decks.spec.ts で確かめている。
// ログインしてから呼ぶ。登録したデッキが投影に届くまで待つため、返した URL をすぐ開ける
async function untilPresetDeckReached(
  page: Page,
  id: string,
  revision: number,
) {
  await untilReached(`プリセットデッキ ${id} が詳細に届く`, async () => {
    const data = await callCore(page, presetDeckRevisionQuery, { id });
    return (
      data.presetDeck.__typename === "PresetDeck" &&
      data.presetDeck.revision >= revision
    );
  });
}

// 空のプリセットデッキを登録して、詳細の URL（パス）を返す
export async function createPresetDeck(
  page: Page,
  name: string,
): Promise<string> {
  const deck = await registerPresetDeckByCore(page, name);
  await untilPresetDeckReached(page, deck.id, deck.revision);
  return `/preset-decks/${deck.id}`;
}

async function registerPresetDeckByCore(page: Page, name: string) {
  const data = await callCore(page, registerPresetDeckMutation, {
    input: { name },
  });
  expectSuccess(data.registerPresetDeck, "RegisterPresetDeckSuccess");
  return data.registerPresetDeck;
}

// 合計がちょうど 40 枚のプリセットデッキ（4 枚ずつ 10 種類の公開中のクリーチャー）を入れ、詳細の URL を返す
export async function createFullPresetDeck(
  page: Page,
  name: string,
): Promise<string> {
  const id = crypto.randomUUID().slice(0, 8);
  const cards = await createPublishedCreatures(
    page,
    Array.from({ length: 10 }, (_, i) => `c${i}-${id}`),
    id,
  );
  const deck = await registerPresetDeckByCore(page, name);
  const data = await callCore(page, setPresetDeckCardCountsMutation, {
    input: {
      id: deck.id,
      revision: deck.revision,
      cards: cards.map(({ id: cardId }) => ({ cardId, count: 4 })),
    },
  });
  expectSuccess(data.setPresetDeckCardCounts, "SetPresetDeckCardCountsSuccess");
  await untilPresetDeckReached(
    page,
    deck.id,
    data.setPresetDeckCardCounts.revision,
  );
  return `/preset-decks/${deck.id}`;
}
