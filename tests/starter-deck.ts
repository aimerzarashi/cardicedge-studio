import type { Page } from "@playwright/test";
import { expect } from "./fixtures";
import { registerCreatures, searchCards, section } from "./preset-deck";

// 空から登録すると、詳細に反映されてから詳細の画面に移る
export async function registerStarterDeck(page: Page, name: string) {
  await page.goto("/starter-decks/new");
  const empty = section(page, "空から作る");
  await empty.getByLabel("名前").fill(name);
  await empty.getByRole("button", { name: "登録する" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(name);
}

// 合計がちょうど 40 枚のスターターデッキ（4 枚ずつ 10 種類の公開中のクリーチャー）を作り、詳細の URL とカード名を返す
export async function registerFullStarterDeck(
  page: Page,
  name: string,
): Promise<{ deckURL: string; cards: string[] }> {
  const id = crypto.randomUUID().slice(0, 8);
  const cards = Array.from({ length: 10 }, (_, i) => `c${i}-${id}`);
  await registerCreatures(page, cards);
  await registerStarterDeck(page, name);
  const deckURL = new URL(page.url()).pathname;
  await searchCards(page, deckURL, id, 10);
  const candidates = section(page, "カードを探す");
  for (const card of cards) {
    await candidates.getByLabel(`${card}の枚数`).fill("4");
  }
  await candidates.getByRole("button", { name: "枚数を保存" }).click();
  await expect(candidates.getByText("枚数を保存しました")).toBeVisible();
  return { deckURL, cards };
}
