import type { Page } from "@playwright/test";
import {
  cardRevisionQuery,
  publishCardMutation,
  registerCreatureMutation,
} from "@/app/cards/operations";
import { login, seedOperator } from "./account";
import { callCore, expectSuccess, untilReached } from "./core";
import { expect } from "./fixtures";

// テストは並列に動き、core の DB を共有するため、カード名・デッキ名にテストごとに一意の値を付ける
export function uniqueName(base: string): string {
  return `${base}-${crypto.randomUUID().slice(0, 8)}`;
}

export async function loginAsOperator(page: Page) {
  await login(page, seedOperator.email, seedOperator.password);
  await expect(page).toHaveURL(/\/$/);
}

export async function registerCreature(page: Page, name: string) {
  await page.goto("/creatures/new");
  await page.getByLabel("カード名").fill(name);
  await page.getByRole("button", { name: "登録する" }).click();
}

export async function registerItem(page: Page, name: string) {
  await page.goto("/items/new");
  await page.getByLabel("カード名").fill(name);
  await page.getByRole("button", { name: "登録する" }).click();
}

export async function registerSpell(page: Page, name: string) {
  await page.goto("/spells/new");
  await page.getByLabel("カード名").fill(name);
  await page.getByRole("button", { name: "登録する" }).click();
}

// カードの一覧は投影されてから出るため、出るまで開き直す
export async function openCardRow(page: Page, name: string) {
  await expect(async () => {
    await page.goto(`/cards?name=${encodeURIComponent(name)}`);
    await expect(page.locator("tbody tr", { hasText: name })).toHaveCount(1, {
      timeout: 1_000,
    });
  }).toPass();
  return page.locator("tbody tr", { hasText: name });
}

export async function publishCard(page: Page, name: string) {
  const row = await openCardRow(page, name);
  await row.getByRole("button", { name: `${name}を公開する` }).click();
  await expect(row.getByText("公開しました")).toBeVisible();
  await expect(row).toContainText("公開中");
}

export async function retireCard(page: Page, name: string) {
  const row = await openCardRow(page, name);
  await row.getByRole("button", { name: `${name}を使用不可にする` }).click();
  await expect(row.getByText("使用不可にしました")).toBeVisible();
  await expect(row).toContainText("使用不可");
}

// ここから下は、確かめたいことの前準備としてカードを入れる道具。画面で 1 枚ずつ登録・公開する流れは cards.spec.ts で確かめている。
// ログインしてから呼ぶ。名前はテストごとに一意にする（uniqueName か、共通の接尾辞）
export async function createCreature(
  page: Page,
  name: string,
): Promise<{ id: string; revision: number }> {
  const data = await callCore(page, registerCreatureMutation, {
    input: { name },
  });
  expectSuccess(data.registerCreature, "RegisterCreatureSuccess");
  return data.registerCreature.creature;
}

async function publishCardByCore(
  page: Page,
  card: { id: string; revision: number },
): Promise<number> {
  const data = await callCore(page, publishCardMutation, { input: card });
  expectSuccess(data.publishCard, "PublishCardSuccess");
  return data.publishCard.revision;
}

// カードの一覧に、カードが revision まで届くのを待つ。nameContains で絞るため、names は共通の部分を持たせる
async function untilCardsReached(
  page: Page,
  nameContains: string,
  expected: { id: string; revision: number }[],
) {
  await untilReached(`カード ${nameContains} が一覧に届く`, async () => {
    const data = await callCore(page, cardRevisionQuery, {
      name: nameContains,
    });
    if (data.cards.__typename !== "CardConnection") return false;
    const seen = new Map<string, number>(
      data.cards.edges.map(
        ({ node }: { node: { id: string; revision: number } }) => [
          node.id,
          node.revision,
        ],
      ),
    );
    return expected.every(
      ({ id, revision }) => (seen.get(id) ?? 0) >= revision,
    );
  });
}

// 準備中のクリーチャーを登録し、一覧に届くまで待つ。ids はカード名の共通の部分（絞り込み用）を含める
export async function createDraftCreatures(
  page: Page,
  names: string[],
  nameContains: string,
) {
  const created = await Promise.all(
    names.map((name) => createCreature(page, name)),
  );
  await untilCardsReached(page, nameContains, created);
  return created;
}

// 公開中のクリーチャーを登録する。デッキに入れられるのは公開中のカードだけのため、公開が一覧に届くまで待つ
export async function createPublishedCreatures(
  page: Page,
  names: string[],
  nameContains: string,
) {
  const created = await Promise.all(
    names.map((name) => createCreature(page, name)),
  );
  const published = await Promise.all(
    created.map(async ({ id, revision }) => ({
      id,
      revision: await publishCardByCore(page, { id, revision }),
    })),
  );
  await untilCardsReached(page, nameContains, published);
  return published;
}
