import type { Page } from "@playwright/test";
import { createPublishedCreatures } from "./card";
import { callCore, expectSuccess, untilReached } from "./core";
import { expect } from "./fixtures";
import { section } from "./preset-deck";

// 空から登録すると、詳細に反映されてから詳細の画面に移る
export async function registerStarterDeck(page: Page, name: string) {
  await page.goto("/starter-decks/new");
  const empty = section(page, "空から作る");
  await empty.getByLabel("名前").fill(name);
  await empty.getByRole("button", { name: "登録する" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(name);
}

// ここから下は、確かめたいことの前準備としてスターターデッキを入れる道具。画面で空から登録する流れは starter-decks.spec.ts で確かめている。
// ログインしてから呼ぶ。投影に届くまで待つため、返した URL をすぐ開ける
async function untilStarterDeckReached(
  page: Page,
  id: string,
  revision: number,
) {
  await untilReached(`スターターデッキ ${id} が詳細に届く`, async () => {
    const data = await callCore(
      page,
      `query($id: UUID!) {
        starterDeck(id: $id) { __typename ... on StarterDeck { revision } }
      }`,
      { id },
    );
    return (
      data.starterDeck.__typename === "StarterDeck" &&
      data.starterDeck.revision >= revision
    );
  });
}

async function registerStarterDeckByCore(page: Page, name: string) {
  const data = await callCore(
    page,
    `mutation($input: RegisterStarterDeckInput!) {
      registerStarterDeck(input: $input) {
        __typename
        ... on RegisterStarterDeckSuccess { id revision }
      }
    }`,
    { input: { name } },
  );
  expectSuccess(data.registerStarterDeck, "RegisterStarterDeckSuccess");
  return data.registerStarterDeck as { id: string; revision: number };
}

// 空のスターターデッキ（準備中）を登録して、詳細の URL（パス）を返す
export async function createStarterDeck(
  page: Page,
  name: string,
): Promise<string> {
  const deck = await registerStarterDeckByCore(page, name);
  await untilStarterDeckReached(page, deck.id, deck.revision);
  return `/starter-decks/${deck.id}`;
}

// 4 枚ずつ 10 種類の公開中のクリーチャー（合計 40 枚）を作る。名前は共通の接尾辞 id を持つ
export async function createTenCreatures(page: Page) {
  const id = crypto.randomUUID().slice(0, 8);
  const names = Array.from({ length: 10 }, (_, i) => `c${i}-${id}`);
  const created = await createPublishedCreatures(page, names, id);
  return { id, names, cardIds: created.map((card) => card.id) };
}

// 合計がちょうど 40 枚のスターターデッキ（4 枚ずつ 10 種類の公開中のクリーチャー）を入れ、詳細の URL とカード名を返す
export async function createFullStarterDeck(
  page: Page,
  name: string,
): Promise<{ deckURL: string; cards: string[] }> {
  const { names, cardIds } = await createTenCreatures(page);
  const deck = await registerStarterDeckByCore(page, name);
  const data = await callCore(
    page,
    `mutation($input: SetStarterDeckCardCountsInput!) {
      setStarterDeckCardCounts(input: $input) {
        __typename
        ... on SetStarterDeckCardCountsSuccess { revision }
      }
    }`,
    {
      input: {
        id: deck.id,
        revision: deck.revision,
        cards: cardIds.map((cardId) => ({ cardId, count: 4 })),
      },
    },
  );
  expectSuccess(
    data.setStarterDeckCardCounts,
    "SetStarterDeckCardCountsSuccess",
  );
  await untilStarterDeckReached(
    page,
    deck.id,
    data.setStarterDeckCardCounts.revision,
  );
  return { deckURL: `/starter-decks/${deck.id}`, cards: names };
}
