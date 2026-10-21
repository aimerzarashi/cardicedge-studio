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
