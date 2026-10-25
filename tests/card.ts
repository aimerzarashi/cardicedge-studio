import type { Page } from "@playwright/test";
import { login, seedOperator } from "./account";
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
