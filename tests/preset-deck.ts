import type { Page } from "@playwright/test";
import { registerCreature } from "./card";
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

export async function registerCreatures(page: Page, names: string[]) {
  for (const name of names) {
    await registerCreature(page, name);
    await expect(page.getByText(`「${name}」を登録しました`)).toBeVisible();
  }
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

// 合計がちょうど 40 枚のプリセットデッキ（4 枚ずつ 10 種類のクリーチャー）を作り、詳細の URL を返す
export async function registerFullPresetDeck(
  page: Page,
  name: string,
): Promise<string> {
  const id = crypto.randomUUID().slice(0, 8);
  const cards = Array.from({ length: 10 }, (_, i) => `c${i}-${id}`);
  await registerCreatures(page, cards);
  await registerAndOpen(page, name);
  const deckURL = new URL(page.url()).pathname;
  await searchCards(page, deckURL, id, 10);
  const candidates = section(page, "カードを探す");
  for (const card of cards) {
    await candidates.getByLabel(`${card}の枚数`).fill("4");
  }
  await candidates.getByRole("button", { name: "枚数を保存" }).click();
  await expect(candidates.getByText("枚数を保存しました")).toBeVisible();
  return deckURL;
}
