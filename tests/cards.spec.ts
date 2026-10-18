import type { Page } from "@playwright/test";
import { login, seedOperator, signUpAndVerify } from "./account";
import { expect, test } from "./fixtures";

// テストは並列に動き、core の DB を共有するため、カード名にテストごとに一意の値を付ける
function uniqueName(base: string): string {
  return `${base}-${crypto.randomUUID().slice(0, 8)}`;
}

async function loginAsOperator(page: Page) {
  await login(page, seedOperator.email, seedOperator.password);
  await expect(page).toHaveURL(/\/$/);
}

async function registerCreature(page: Page, name: string) {
  await page.goto("/creatures/new");
  await page.getByLabel("カード名").fill(name);
  await page.getByRole("button", { name: "登録する" }).click();
}

function cardRows(page: Page) {
  return page.locator("tbody tr");
}

test("登録したクリーチャーがカードの一覧に出る", async ({ page }) => {
  await loginAsOperator(page);
  const name = uniqueName("ドラゴン");

  await registerCreature(page, name);
  await expect(page.getByText(`「${name}」を登録しました`)).toBeVisible();
  await expect(page.getByLabel("カード名")).toHaveValue("");

  // 一覧は投影されてから出るため、出るまで開き直す
  await expect(async () => {
    await page.goto(`/cards?name=${encodeURIComponent(name)}`);
    await expect(cardRows(page)).toHaveCount(1);
  }).toPass();
  await expect(cardRows(page).first()).toContainText(name);
  await expect(cardRows(page).first()).toContainText("クリーチャー");
});

test("使われているカード名で登録すると名前の重複が表示され、入力した値が残る", async ({
  page,
}) => {
  await loginAsOperator(page);
  const name = uniqueName("ゴブリン");
  await registerCreature(page, name);
  await expect(page.getByText(`「${name}」を登録しました`)).toBeVisible();

  await registerCreature(page, name);

  // getByRole("alert") は Next.js のルート読み上げ用の要素にも一致するため、文言で探す
  await expect(
    page.getByText("このカード名はすでに使われています"),
  ).toBeVisible();
  await expect(page.getByLabel("カード名")).toHaveValue(name);
});

for (const { condition, value, message } of [
  {
    condition: "空白だけ",
    value: " ",
    message: "カード名を入力してください",
  },
  {
    condition: "51 文字",
    value: "あ".repeat(51),
    // 上限は cms に書き写さず、core が返した値を表示する
    message: "カード名は 50 文字以内で入力してください",
  },
]) {
  test(`カード名が${condition}だと入力の誤りが表示され、入力した値が残る`, async ({
    page,
  }) => {
    await loginAsOperator(page);

    await registerCreature(page, value);

    await expect(page.getByText(message)).toBeVisible();
    await expect(page.getByLabel("カード名")).toHaveValue(value);
  });
}

test("core に登録されていないアカウントでは、登録も一覧も権限がないと表示される", async ({
  page,
  request,
}) => {
  const email = `not-operator-${crypto.randomUUID()}@example.com`;
  const password = "not-operator-password";
  await signUpAndVerify(page, request, email, password);
  await login(page, email, password);
  await expect(page).toHaveURL(/\/$/);

  await registerCreature(page, uniqueName("スライム"));
  await expect(page.getByText("この操作をする権限がありません")).toBeVisible();

  await page.goto("/cards");
  await expect(page.getByText("この操作をする権限がありません")).toBeVisible();
});

test("名前で絞り込むと、その文字を含むカードだけが出る", async ({ page }) => {
  await loginAsOperator(page);
  const id = crypto.randomUUID().slice(0, 8);
  await registerCreature(page, `a-${id}`);
  await expect(page.getByText(`「a-${id}」を登録しました`)).toBeVisible();
  await registerCreature(page, `b-${id}`);
  await expect(page.getByText(`「b-${id}」を登録しました`)).toBeVisible();

  await expect(async () => {
    await page.goto("/cards");
    await page.getByLabel("名前").fill(id);
    await page.getByRole("button", { name: "絞り込む" }).click();
    await expect(cardRows(page)).toHaveCount(2);
  }).toPass();
  await expect(cardRows(page).nth(0)).toContainText(`a-${id}`);
  await expect(cardRows(page).nth(1)).toContainText(`b-${id}`);
  // 条件は URL に持つ
  await expect(page).toHaveURL(new RegExp(`name=${id}`));
});
